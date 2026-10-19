import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ClearCart } from "@/components/ClearCart";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Order confirmed", robots: { index: false } };

export default async function OrderConfirmation({ params }: { params: Promise<{ id: string }> }) {
  const order = await db.order.findUnique({ where: { id: (await params).id }, include: { items: true } });
  if (!order) notFound();
  if (order.paymentStatus === "PENDING" || order.paymentStatus === "FAILED") {
    // A Stripe payment that hasn't cleared yet (some methods take a moment), or one that failed.
    if (!order.stripeSessionId) notFound();
    const failed = order.paymentStatus === "FAILED";
    return (
      <div className="mx-auto flex max-w-[760px] flex-col gap-4 px-4 pb-24 pt-14 sm:px-6">
        {failed ? null : <meta httpEquiv="refresh" content="5" />}
        <span className="font-script text-5xl text-pink">{failed ? "Oh no" : "Almost there"}</span>
        <h1 className="font-serif text-4xl">{failed ? "Your payment didn't go through" : "We're confirming your payment"}</h1>
        <p className="text-[#4A3F45]">
          {failed
            ? "You haven't been charged. Your cart is still saved, so you can try again with another payment method."
            : "This page will update on its own in a few seconds. You'll also get an email once your order is confirmed."}
        </p>
        {failed ? <Link href="/checkout" className="btn btn-pink self-start">Try again</Link> : null}
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-7 px-4 pb-24 pt-14 sm:px-6">
      <ClearCart />
      <div className="flex flex-col gap-2">
        <span className="font-script text-5xl text-pink">Thank you!</span>
        <h1 className="font-serif text-4xl">Order #{order.number} is confirmed</h1>
        <p className="text-[#4A3F45]">
          We sent a receipt to <strong>{order.email}</strong>. We&apos;ll reach out with a design proof before we start making your items.
        </p>
      </div>
      <div className="flex flex-col gap-4 rounded-2xl border border-line p-6">
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
        <div className="flex justify-between border-t border-line pt-4 font-serif text-2xl">
          <span>Total paid</span>
          <span className="text-pink-deep">{formatCents(order.totalCents)}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        {order.receiptUrl ? <a href={order.receiptUrl} target="_blank" rel="noreferrer" className="btn btn-dark">View receipt</a> : null}
        {order.customerId ? <Link href="/account" className="btn btn-pink">Track it in My account</Link> : null}
        <Link href="/shop" className="btn btn-outline">Keep shopping</Link>
      </div>
    </div>
  );
}
