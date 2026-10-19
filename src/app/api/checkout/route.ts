import { NextResponse } from "next/server";
import { z } from "zod";
import { cartItemSchema } from "@/lib/cart-types";
import { db } from "@/lib/db";
import { sendOrderEmails } from "@/lib/email";
import { PricingError, priceCart } from "@/lib/pricing";
import { money, square, squareConfigured, squareErrorMessage, squareLocationId } from "@/lib/square";

const bodySchema = z.object({
  sourceId: z.string().min(1),
  idempotencyKey: z.string().min(8).max(45),
  expectedSubtotalCents: z.number().int(),
  fulfillment: z.enum(["PICKUP", "SHIPPING"]),
  customer: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.email().max(200),
    phone: z.string().trim().min(7).max(40),
  }),
  note: z.string().max(1000).optional(),
  shippingAddress: z
    .object({
      address1: z.string().min(1).max(200),
      address2: z.string().max(200).optional(),
      city: z.string().min(1).max(100),
      state: z.string().min(2).max(40),
      zip: z.string().min(3).max(20),
    })
    .optional(),
  items: z.array(cartItemSchema).min(1).max(50),
});

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

export async function POST(req: Request) {
  if (!squareConfigured()) {
    return NextResponse.json({ error: "Online payments aren't set up yet." }, { status: 503 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Some checkout details are missing or invalid. Please check the form." }, { status: 400 });
  }
  const body = parsed.data;
  if (body.fulfillment === "SHIPPING" && !body.shippingAddress) {
    return NextResponse.json({ error: "Please enter your shipping address." }, { status: 400 });
  }

  // Re-price everything from the database; the browser's numbers are only used to catch stale carts.
  let priced;
  try {
    priced = await priceCart(body.items, body.fulfillment);
  } catch (e) {
    if (e instanceof PricingError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
  if (priced.subtotalCents !== body.expectedSubtotalCents) {
    return NextResponse.json(
      { error: "Some prices changed since you added items to your cart. Please remove and re-add them, then try again." },
      { status: 409 },
    );
  }

  // Reusing the key means the browser retried a request we already handled or are still handling.
  const already = await db.order.findUnique({ where: { checkoutKey: body.idempotencyKey } });
  if (already) {
    if (already.paymentStatus === "PAID") return NextResponse.json({ orderId: already.id });
    return NextResponse.json({ error: "Your payment is still processing. Please wait a moment." }, { status: 409 });
  }

  const order = await db.order.create({
    data: {
      customerName: body.customer.name,
      email: body.customer.email,
      phone: body.customer.phone,
      fulfillment: body.fulfillment,
      shippingAddress: body.shippingAddress ?? undefined,
      customerNote: body.note,
      subtotalCents: priced.subtotalCents,
      taxCents: priced.taxCents,
      shippingCents: priced.shippingCents,
      totalCents: priced.totalCents,
      checkoutKey: body.idempotencyKey,
      items: {
        create: priced.lines.map((l) => ({
          productId: l.productId,
          productName: l.productName,
          kind: l.kind,
          unitPriceCents: l.unitPriceCents,
          quantity: l.quantity,
          customization: l.customization,
          addOns: l.addOns,
          lineTotalCents: l.lineTotalCents,
        })),
      },
    },
  });

  try {
    const client = square();
    const locationId = squareLocationId();

    const lineItems = priced.lines.flatMap((l) => {
      const note = Object.entries(l.customization)
        .map(([k, v]) => `${k}: ${v}`)
        .join(" | ");
      return [
        { name: l.productName, quantity: String(l.quantity), basePriceMoney: money(l.unitPriceCents), note: note ? truncate(note, 2000) : undefined },
        ...l.addOns.map((a) => ({ name: truncate(`${a.name} (add-on for ${l.productName})`, 512), quantity: String(a.quantity), basePriceMoney: money(a.priceCents) })),
      ];
    });

    const created = await client.orders.create({
      idempotencyKey: `${body.idempotencyKey}-order`,
      order: {
        locationId,
        referenceId: `TT-${order.number}`,
        lineItems,
        taxes: priced.taxPercent > 0 ? [{ uid: "sales-tax", name: "Sales tax", percentage: String(priced.taxPercent), scope: "ORDER" }] : undefined,
        serviceCharges:
          priced.shippingCents > 0
            ? [{ name: "Shipping", amountMoney: money(priced.shippingCents), calculationPhase: "TOTAL_PHASE" }]
            : undefined,
      },
    });
    const sqOrder = created.order;
    if (!sqOrder?.id) throw new Error("Square did not return an order");
    const chargeCents = Number(sqOrder.totalMoney?.amount ?? BigInt(priced.totalCents));

    const payment = await client.payments.create({
      idempotencyKey: body.idempotencyKey,
      sourceId: body.sourceId,
      amountMoney: money(chargeCents),
      orderId: sqOrder.id,
      locationId,
      referenceId: `TT-${order.number}`,
      buyerEmailAddress: body.customer.email,
      note: truncate(`Tylyn Tingz order #${order.number} for ${body.customer.name}`, 500),
    });
    const p = payment.payment;
    if (!p?.id || (p.status !== "COMPLETED" && p.status !== "APPROVED")) {
      throw new Error("Payment was not completed");
    }

    const paid = await db.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "PAID",
        squareOrderId: sqOrder.id,
        squarePaymentId: p.id,
        receiptUrl: p.receiptUrl ?? null,
        totalCents: chargeCents,
        taxCents: chargeCents - priced.subtotalCents - priced.shippingCents,
      },
      include: { items: true },
    });
    await sendOrderEmails(paid);
    return NextResponse.json({ orderId: paid.id });
  } catch (err) {
    console.error("Checkout failed", err);
    // Nothing was charged, so drop the unpaid order to keep the admin list clean.
    await db.order.delete({ where: { id: order.id } }).catch(() => {});
    return NextResponse.json({ error: squareErrorMessage(err) }, { status: 402 });
  }
}
