import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { parseAddress, requireCustomer } from "@/lib/customer-auth";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { orderSteps } from "@/lib/order-status";
import { DeliveryLine, StatusBadges, orderKinds } from "../../OrderBits";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Order details", robots: { index: false } };

export default async function AccountOrder({ params }: { params: Promise<{ id: string }> }) {
  const customer = await requireCustomer();
  const order = await db.order.findUnique({ where: { id: (await params).id }, include: { items: true } });
  if (!order || order.customerId !== customer.id || order.paymentStatus === "PENDING") notFound();
  const { hasProducts } = orderKinds(order);
  const steps = orderSteps(order.fulfillment);
  const reached = steps.findIndex((s) => s.status === order.status);
  // Ready and Shipped are interchangeable steps, so an order marked with the other one still counts as past "Being made".
  const current = reached >= 0 ? reached : order.status === "READY" || order.status === "SHIPPED" ? 3 : -1;
  const addr = parseAddress(order.shippingAddress);

  return (
    <div className="bg-blush">
      <div className="mx-auto flex max-w-[900px] flex-col gap-6 px-4 pb-24 pt-10 sm:px-6">
        <Link href="/account" className="text-sm font-semibold text-pink-deep">← My account</Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col">
            <h1 className="font-serif text-4xl">Order #{order.number}</h1>
            <span className="text-sm text-mute">Placed {order.createdAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
          </div>
          <StatusBadges order={order} />
        </div>

        {hasProducts && order.status !== "CANCELLED" ? (
          <ol aria-label="Order progress" className="grid grid-cols-5 gap-1.5 rounded-2xl bg-ink p-4 sm:p-5">
            {steps.map((s, i) => (
              <li key={s.status} className="flex flex-col gap-2" aria-current={i === current ? "step" : undefined}>
                <span className={`h-1.5 rounded-full ${i <= current ? "bg-pink" : "bg-white/20"}`} />
                <span className={`text-[11px] font-semibold leading-tight sm:text-xs ${i === current ? "text-gold" : i < current ? "text-white" : "text-[#A99FA5]"}`}>{s.label}</span>
              </li>
            ))}
          </ol>
        ) : null}

        <section className="flex flex-col gap-3 rounded-2xl bg-white p-6">
          <DeliveryLine order={order} />
          {addr ? (
            <p className="text-sm text-[#4A3F45]">
              <span className="font-semibold">{order.fulfillment === "SHIPPING" && hasProducts ? "Ship to" : "Address on file"}:</span>{" "}
              {addr.address1}{addr.address2 ? `, ${addr.address2}` : ""}, {addr.city}, {addr.state} {addr.zip}
            </p>
          ) : null}
        </section>

        <section className="flex flex-col gap-4 rounded-2xl bg-white p-6">
          {order.items.map((i) => (
            <div key={i.id} className="flex flex-col gap-1 border-b border-line pb-4 last:border-0 last:pb-0">
              <div className="flex justify-between gap-3 font-semibold">
                <span>{i.quantity} × {i.productName}</span>
                <span>{formatCents(i.lineTotalCents)}</span>
              </div>
              {Object.entries(i.customization as Record<string, string>).map(([k, v]) => (
                <span key={k} className="text-sm text-mute">{k}: {v.startsWith("http") || v.startsWith("/uploads/") ? "Photo received" : v}</span>
              ))}
              {(i.addOns as { name: string; quantity: number }[]).map((a) => (
                <span key={a.name} className="text-sm text-mute">+ {a.quantity} × {a.name}</span>
              ))}
            </div>
          ))}
          <div className="flex flex-col gap-1.5 border-t border-line pt-4 text-sm">
            <span className="flex justify-between"><span className="text-mute">Subtotal</span><span>{formatCents(order.subtotalCents)}</span></span>
            {hasProducts ? <span className="flex justify-between"><span className="text-mute">{order.fulfillment === "SHIPPING" ? "Shipping" : "Pickup"}</span><span>{order.shippingCents ? formatCents(order.shippingCents) : "Free"}</span></span> : null}
            {order.taxCents ? <span className="flex justify-between"><span className="text-mute">Tax</span><span>{formatCents(order.taxCents)}</span></span> : null}
            <span className="flex justify-between font-serif text-2xl"><span>Total</span><span className="text-pink-deep">{formatCents(order.totalCents)}</span></span>
            {order.refundedCents ? <span className="flex justify-between text-[#B3124F]"><span>Refunded</span><span>−{formatCents(order.refundedCents)}</span></span> : null}
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          {order.receiptUrl ? <a href={order.receiptUrl} target="_blank" rel="noreferrer" className="btn btn-dark">View Square receipt</a> : null}
          <Link href="/contact" className="btn btn-outline">Questions? Contact us</Link>
        </div>
      </div>
    </div>
  );
}
