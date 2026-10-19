import type { Order, OrderItem } from "@prisma/client";
import { formatDay, formatTime } from "@/lib/classes";
import { customerClassLabels, customerStatusLabels, trackingUrl } from "@/lib/order-status";

type OrderWithItems = Order & { items: OrderItem[] };

export function orderKinds(order: OrderWithItems) {
  return {
    hasProducts: order.items.some((i) => i.kind === "PRODUCT"),
    hasClass: order.items.some((i) => i.kind === "SERVICE"),
  };
}

export function StatusBadges({ order }: { order: OrderWithItems }) {
  const { hasProducts, hasClass } = orderKinds(order);
  const done = (s: string) => s === "COMPLETED" || s === "CANCELLED";
  return (
    <span className="flex flex-wrap gap-2">
      {hasProducts ? (
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${done(order.status) ? "bg-[#EEEAEC] text-[#4A3F45]" : "bg-pink text-ink"}`}>{customerStatusLabels[order.status]}</span>
      ) : null}
      {hasClass ? (
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${order.classStatus === "SCHEDULED" ? "bg-gold text-ink" : done(order.classStatus) ? "bg-[#EEEAEC] text-[#4A3F45]" : "bg-pink text-ink"}`}>
          {customerClassLabels[order.classStatus]}
        </span>
      ) : null}
      {order.paymentStatus === "REFUNDED" || order.paymentStatus === "PARTIALLY_REFUNDED" ? (
        <span className="rounded-full bg-[#FFF1C7] px-3 py-1 text-xs font-bold text-[#5C4500]">{order.paymentStatus === "REFUNDED" ? "Refunded" : "Partly refunded"}</span>
      ) : null}
    </span>
  );
}

export function DeliveryLine({ order }: { order: OrderWithItems }) {
  const { hasProducts, hasClass } = orderKinds(order);
  const addr = order.shippingAddress as { city?: string; state?: string } | null;
  return (
    <div className="flex flex-col gap-1 text-sm text-[#4A3F45]">
      {hasProducts ? (
        <span>
          {order.fulfillment === "SHIPPING" ? `Shipping to ${addr?.city ?? ""}${addr?.state ? `, ${addr.state}` : ""}` : "Local pickup"}
          {order.trackingNumber ? (
            <>
              {" · "}
              <a href={trackingUrl(order.trackingNumber)} target="_blank" rel="noreferrer" className="font-semibold text-pink-deep underline">Track package {order.trackingNumber}</a>
            </>
          ) : null}
        </span>
      ) : null}
      {hasClass ? (
        order.classDate ? (
          <span>
            Class: <strong>{formatDay(order.classDate)}</strong>
            {order.classTime ? ` at ${formatTime(order.classTime)}` : ""}
            {order.classLocation ? ` · ${order.classLocation}` : ""}
          </span>
        ) : (
          <span>We&apos;ll reach out to confirm your class date and time.</span>
        )
      ) : null}
    </div>
  );
}
