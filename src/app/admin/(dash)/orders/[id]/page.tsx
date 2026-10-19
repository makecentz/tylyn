import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { classStatuses } from "@/lib/classes";
import { updateClassBooking, updateOrder } from "../../../actions";
import { ClassStatusPill, Flash, PaymentPill, StatusPill, classStatusLabels, statusLabels } from "../../admin-ui";
import { RefundForm } from "./RefundForm";

function isImageUrl(v: string) {
  return /^(\/uploads\/|https:\/\/)\S+\.(png|jpe?g|webp|gif|heic|heif)$/i.test(v);
}

export default async function OrderDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const order = await db.order.findUnique({ where: { id: (await params).id }, include: { items: true } });
  if (!order) notFound();
  const { saved } = await searchParams;
  const hasClass = order.items.some((i) => i.kind === "SERVICE");
  const hasProducts = order.items.some((i) => i.kind === "PRODUCT");
  const addr = order.shippingAddress as { address1: string; address2?: string; city: string; state: string; zip: string } | null;

  return (
    <div className="flex flex-col gap-6">
      <Link href={hasProducts ? "/admin/orders" : "/admin/classes"} className="text-sm font-semibold text-pink-deep">
        {hasProducts ? "← All orders" : "← All class bookings"}
      </Link>
      <Flash message={saved ? (hasProducts ? "Order updated." : "Booking updated.") : undefined} />
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="font-serif text-3xl">{hasProducts ? "Order" : "Class booking"} #{order.number}</h1>
        {hasProducts ? <StatusPill status={order.status} /> : null}
        {hasClass ? <ClassStatusPill status={order.classStatus} /> : null}
        <PaymentPill status={order.paymentStatus} />
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-[min(100%,480px)] flex-[2] flex-col gap-5">
          {order.items.map((item) => (
            <section key={item.id} className="card flex flex-col gap-3">
              <div className="flex flex-wrap justify-between gap-2">
                <h2 className="font-serif text-xl">{item.quantity} × {item.productName}</h2>
                <span className="font-semibold">{formatCents(item.lineTotalCents)}</span>
              </div>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-2 rounded-xl bg-blush p-4 text-sm sm:grid-cols-2">
                {Object.entries(item.customization as Record<string, string>).map(([k, v]) => (
                  <div key={k} className={isImageUrl(v) ? "sm:col-span-2" : ""}>
                    <dt className="font-semibold">{k}</dt>
                    <dd className="whitespace-pre-line text-[#4A3F45]">
                      {isImageUrl(v) ? (
                        <a href={v} target="_blank" rel="noreferrer" className="mt-1 inline-flex flex-col gap-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={v} alt={`Customer upload for ${k}`} className="max-h-48 rounded-lg border border-line" />
                          <span className="font-semibold text-pink-deep underline">Open full size</span>
                        </a>
                      ) : (
                        v
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
              {(item.addOns as { name: string; priceCents: number; quantity: number }[]).map((a) => (
                <div key={a.name} className="flex justify-between text-sm text-[#4A3F45]">
                  <span>+ {a.quantity} × {a.name}</span>
                  <span>{formatCents(a.priceCents * a.quantity)}</span>
                </div>
              ))}
            </section>
          ))}
          <section className="card flex flex-col gap-2 text-sm">
            <div className="flex justify-between"><span className="text-mute">Subtotal</span><span>{formatCents(order.subtotalCents)}</span></div>
            {order.shippingCents ? <div className="flex justify-between"><span className="text-mute">Shipping</span><span>{formatCents(order.shippingCents)}</span></div> : null}
            {order.taxCents ? <div className="flex justify-between"><span className="text-mute">Tax</span><span>{formatCents(order.taxCents)}</span></div> : null}
            <div className="flex justify-between border-t border-line pt-2 text-base font-bold"><span>Total</span><span>{formatCents(order.totalCents)}</span></div>
            {order.refundedCents ? <div className="flex justify-between text-[#B3124F]"><span>Refunded</span><span>−{formatCents(order.refundedCents)}</span></div> : null}
          </section>
        </div>

        <div className="flex min-w-[min(100%,300px)] flex-1 flex-col gap-5">
          <section className="card flex flex-col gap-1 border-t-4 border-pink text-sm">
            <h2 className="mb-1 font-serif text-xl">Customer</h2>
            <span className="font-semibold">{order.customerName}</span>
            <a href={`mailto:${order.email}?subject=${encodeURIComponent(`Your Tylyn Tingz order #${order.number}`)}`} className="text-pink-deep underline">{order.email}</a>
            <a href={`tel:${order.phone}`} className="text-pink-deep underline">{order.phone}</a>
            {hasProducts ? <span className="mt-2 font-semibold">{order.fulfillment === "SHIPPING" ? "Ship to" : "Local pickup"}</span> : null}
            {addr ? <span className="whitespace-pre-line">{`${addr.address1}${addr.address2 ? `, ${addr.address2}` : ""}\n${addr.city}, ${addr.state} ${addr.zip}`}</span> : null}
            {order.customerNote ? <p className="mt-2 rounded-lg bg-blush p-3"><strong>Note:</strong> {order.customerNote}</p> : null}
            <span className="mt-2 text-xs text-mute">Placed {order.createdAt.toLocaleString()}</span>
            {order.receiptUrl ? <a href={order.receiptUrl} target="_blank" rel="noreferrer" className="text-xs text-pink-deep underline">Square receipt</a> : null}
          </section>

{hasClass ? (
            <form id="schedule" action={updateClassBooking} className="card flex scroll-mt-6 flex-col gap-3 border-t-4 border-gold">
              <h2 className="font-serif text-xl">Class schedule</h2>
              <input type="hidden" name="id" value={order.id} />
              <label className="field">Class date
                <input type="date" name="classDate" defaultValue={order.classDate?.toISOString().slice(0, 10) ?? ""} className="input" />
              </label>
              <label className="field">Start time
                <input type="time" name="classTime" step={900} defaultValue={order.classTime ?? ""} className="input" />
              </label>
              <label className="field">Where
                <input name="classLocation" defaultValue={order.classLocation ?? ""} className="input" placeholder="e.g. My studio, their home, Zoom link" />
              </label>
              <label className="field">Status
                <select name="classStatus" defaultValue={order.classStatus} className="input">
                  {classStatuses.map((k) => <option key={k} value={k}>{classStatusLabels[k]}</option>)}
                </select>
              </label>
              {hasProducts ? null : (
                <label className="field">Private notes
                  <textarea name="adminNotes" defaultValue={order.adminNotes ?? ""} rows={3} className="input" placeholder="Only you can see these" />
                </label>
              )}
              <button className="btn btn-pink">Save class details</button>
            </form>
          ) : null}

          {hasProducts ? (
                      <form action={updateOrder} className="card flex flex-col gap-3">
              <input type="hidden" name="id" value={order.id} />
              <label className="field">Status
                <select name="status" defaultValue={order.status} className="input">
                  {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <label className="field">Private notes
                <textarea name="adminNotes" defaultValue={order.adminNotes ?? ""} rows={3} className="input" placeholder="Only you can see these" />
              </label>
              <button className="btn btn-pink">Save</button>
            </form>
          ) : null}

          {order.squarePaymentId && order.refundedCents < order.totalCents ? (
            <RefundForm orderId={order.id} maxCents={order.totalCents - order.refundedCents} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
