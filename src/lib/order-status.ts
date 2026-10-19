import type { ClassStatus, OrderStatus } from "@prisma/client";

/** Order statuses as shoppers see them in My Account. */
export const customerStatusLabels: Record<OrderStatus, string> = {
  NEW: "Order received",
  PROOF_SENT: "Proof sent, waiting on your OK",
  IN_PRODUCTION: "Being made",
  READY: "Ready for pickup",
  SHIPPED: "Shipped",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const customerClassLabels: Record<ClassStatus, string> = {
  REQUESTED: "We'll confirm your class time",
  SCHEDULED: "Class scheduled",
  COMPLETED: "Class completed",
  NO_SHOW: "Missed",
  CANCELLED: "Cancelled",
};

/** Steps shown as a progress bar for favor orders. */
export function orderSteps(fulfillment: "PICKUP" | "SHIPPING") {
  return [
    { status: "NEW", label: "Received" },
    { status: "PROOF_SENT", label: "Proof" },
    { status: "IN_PRODUCTION", label: "Being made" },
    fulfillment === "SHIPPING" ? { status: "SHIPPED", label: "Shipped" } : { status: "READY", label: "Ready for pickup" },
    { status: "COMPLETED", label: "Done" },
  ] as { status: OrderStatus; label: string }[];
}

export function trackingUrl(tracking: string) {
  const t = tracking.replace(/\s/g, "");
  if (/^1Z/i.test(t)) return `https://www.ups.com/track?tracknum=${t}`;
  if (/^\d{20,22}$/.test(t) || /^(94|93|92|95)\d+/.test(t)) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${t}`;
  if (/^\d{12}$|^\d{15}$/.test(t)) return `https://www.fedex.com/fedextrack/?trknbr=${t}`;
  return `https://www.google.com/search?q=${encodeURIComponent(`track package ${t}`)}`;
}
