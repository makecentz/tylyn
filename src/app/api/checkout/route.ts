import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { cartItemSchema } from "@/lib/cart-types";
import { addressSchema, cookieForCustomer, getCustomer, normalizeEmail } from "@/lib/customer-auth";
import { db } from "@/lib/db";
import { sendOrderEmails } from "@/lib/email";
import { createPendingAccount } from "@/lib/order-payment";
import { getPaymentSettings, paymentsReady, siteUrl, type PaymentSettings } from "@/lib/payment-settings";
import { PricingError, priceCart } from "@/lib/pricing";
import { money, square, squareErrorMessage } from "@/lib/square";
import { stripe, stripeErrorMessage } from "@/lib/stripe";

const bodySchema = z.object({
  // Square only: the card or wallet token from Square's payment form
  sourceId: z.string().min(1).optional(),
  idempotencyKey: z.string().min(8).max(45),
  expectedSubtotalCents: z.number().int(),
  fulfillment: z.enum(["PICKUP", "SHIPPING"]),
  customer: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.email().max(200),
    phone: z.string().trim().min(7).max(40),
  }),
  note: z.string().max(1000).optional(),
  // Collected for every order: the shipping address, or the buyer's address for pickup orders and classes.
  shippingAddress: addressSchema,
  // When set, creates an account for the buyer once the payment goes through.
  accountPassword: z.string().min(8).max(200).optional(),
  items: z.array(cartItemSchema).min(1).max(50),
});
type Body = z.infer<typeof bodySchema>;
type Priced = Awaited<ReturnType<typeof priceCart>>;

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

export async function POST(req: Request) {
  const settings = await getPaymentSettings();
  if (!paymentsReady(settings)) {
    return NextResponse.json({ error: "Online payments aren't set up yet." }, { status: 503 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Some checkout details are missing or invalid. Please check the form." }, { status: 400 });
  }
  const body = parsed.data;
  if (settings.provider === "square" && !body.sourceId) {
    return NextResponse.json({ error: "Please enter your payment details." }, { status: 400 });
  }
  const signedIn = await getCustomer();
  const email = signedIn?.email ?? normalizeEmail(body.customer.email);
  if (!signedIn && body.accountPassword && (await db.customer.findUnique({ where: { email } }))) {
    return NextResponse.json(
      { error: "There's already an account with this email. Sign in first, or uncheck \"Create an account\"." },
      { status: 409 },
    );
  }

  // Re-price everything from the database; the browser's numbers are only used to catch stale carts.
  let priced: Priced;
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
    if (already.stripeSessionId) {
      const session = await stripe(settings).checkout.sessions.retrieve(already.stripeSessionId);
      if (session.status === "open" && session.url) return NextResponse.json({ redirectUrl: session.url });
    }
    return NextResponse.json({ error: "Your payment is still processing. Please wait a moment." }, { status: 409 });
  }

  const order = await db.order.create({
    data: {
      customerName: body.customer.name,
      email,
      phone: body.customer.phone,
      fulfillment: body.fulfillment,
      shippingAddress: body.shippingAddress,
      customerId: signedIn?.id,
      pendingAccountHash: !signedIn && body.accountPassword ? await bcrypt.hash(body.accountPassword, 10) : null,
      customerNote: body.note,
      paymentProvider: settings.provider === "stripe" ? "STRIPE" : "SQUARE",
      subtotalCents: priced.subtotalCents,
      taxCents: priced.taxCents,
      shippingCents: priced.shippingCents,
      totalCents: priced.totalCents,
      checkoutKey: body.idempotencyKey,
      // A class booked into one of the owner's set times is scheduled right away.
      ...(() => {
        const session = priced.lines.find((l) => l.session)?.session;
        return session ? { classStatus: "SCHEDULED" as const, classDate: new Date(`${session.date}T00:00:00Z`), classTime: session.time } : {};
      })(),
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

  if (signedIn) {
    // Remember their details for next time if the account doesn't have them yet.
    await db.customer
      .update({ where: { id: signedIn.id }, data: { phone: signedIn.phone || body.customer.phone, address: signedIn.address ?? body.shippingAddress } })
      .catch(() => {});
  }

  return settings.provider === "stripe"
    ? startStripeCheckout(req, settings, body, priced, order.id, order.number, email)
    : chargeWithSquare(settings, body, priced, order.id, order.number);
}

/** Sends the shopper to Stripe's hosted checkout page, which offers card, wallets, Klarna and the rest. */
async function startStripeCheckout(req: Request, settings: PaymentSettings, body: Body, priced: Priced, orderId: string, orderNumber: number, email: string) {
  const origin = new URL(req.url).origin || siteUrl();
  const lineItems = priced.lines.flatMap((l) => {
    const description = Object.entries(l.customization)
      .filter(([, v]) => !/^(https?:\/\/|\/uploads\/)/.test(v))
      .map(([k, v]) => `${k}: ${v}`)
      .join(" · ");
    return [
      {
        quantity: l.quantity,
        price_data: {
          currency: "usd",
          unit_amount: l.unitPriceCents,
          product_data: { name: truncate(l.productName, 250), ...(description ? { description: truncate(description, 500) } : {}) },
        },
      },
      ...l.addOns.map((a) => ({
        quantity: a.quantity,
        price_data: { currency: "usd", unit_amount: a.priceCents, product_data: { name: truncate(`${a.name} (add-on for ${l.productName})`, 250) } },
      })),
    ];
  });
  if (priced.shippingCents > 0) {
    lineItems.push({ quantity: 1, price_data: { currency: "usd", unit_amount: priced.shippingCents, product_data: { name: "Shipping" } } });
  }
  if (priced.taxCents > 0) {
    lineItems.push({ quantity: 1, price_data: { currency: "usd", unit_amount: priced.taxCents, product_data: { name: `Sales tax (${priced.taxPercent}%)` } } });
  }

  try {
    const session = await stripe(settings).checkout.sessions.create(
      {
        mode: "payment",
        line_items: lineItems,
        customer_email: email,
        client_reference_id: orderId,
        metadata: { orderId, orderNumber: String(orderNumber) },
        payment_intent_data: {
          description: `Tylyn Tingz order #${orderNumber}`,
          metadata: { orderId, orderNumber: String(orderNumber) },
        },
        // Stripe checks back here first so the order shows as paid right away, even before the webhook lands.
        success_url: `${origin}/api/stripe/return?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/checkout?canceled=1`,
        expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
      },
      { idempotencyKey: `${body.idempotencyKey}-session` },
    );
    await db.order.update({ where: { id: orderId }, data: { stripeSessionId: session.id } });
    return NextResponse.json({ redirectUrl: session.url });
  } catch (err) {
    console.error("Stripe checkout failed", err);
    await db.order.delete({ where: { id: orderId } }).catch(() => {});
    return NextResponse.json({ error: stripeErrorMessage(err) }, { status: 402 });
  }
}

async function chargeWithSquare(settings: PaymentSettings, body: Body, priced: Priced, orderId: string, orderNumber: number) {
  try {
    const client = square(settings);
    const locationId = settings.square.locationId;

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
        referenceId: `TT-${orderNumber}`,
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
      sourceId: body.sourceId!,
      amountMoney: money(chargeCents),
      orderId: sqOrder.id,
      locationId,
      referenceId: `TT-${orderNumber}`,
      buyerEmailAddress: body.customer.email,
      note: truncate(`Tylyn Tingz order #${orderNumber} for ${body.customer.name}`, 500),
    });
    const p = payment.payment;
    if (!p?.id || (p.status !== "COMPLETED" && p.status !== "APPROVED")) {
      throw new Error("Payment was not completed");
    }

    const paid = await db.order.update({
      where: { id: orderId },
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
    const customerId = await createPendingAccount(paid.id);
    await sendOrderEmails(paid);

    const res = NextResponse.json({ orderId: paid.id });
    if (customerId) res.cookies.set(await cookieForCustomer(customerId));
    return res;
  } catch (err) {
    console.error("Checkout failed", err);
    // Nothing was charged, so drop the unpaid order to keep the admin list clean.
    await db.order.delete({ where: { id: orderId } }).catch(() => {});
    return NextResponse.json({ error: squareErrorMessage(err) }, { status: 402 });
  }
}
