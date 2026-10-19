import type { ClassStatus, OrderStatus, PaymentStatus } from "@prisma/client";

export const statusLabels: Record<OrderStatus, string> = {
  NEW: "New, needs proof",
  PROOF_SENT: "Proof sent",
  IN_PRODUCTION: "In production",
  READY: "Ready for pickup",
  SHIPPED: "Shipped",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const statusColors: Record<OrderStatus, string> = {
  NEW: "bg-pink text-ink",
  PROOF_SENT: "bg-[#FFE3F1] text-[#8E0B50]",
  IN_PRODUCTION: "bg-[#FFF1C7] text-[#5C4500]",
  READY: "bg-[#D9F5E6] text-[#0F5132]",
  SHIPPED: "bg-[#DCEBFF] text-[#123A6B]",
  COMPLETED: "bg-[#EEEAEC] text-[#4A3F45]",
  CANCELLED: "bg-[#EEEAEC] text-[#4A3F45] line-through",
};

export function StatusPill({ status }: { status: OrderStatus }) {
  return <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${statusColors[status]}`}>{statusLabels[status]}</span>;
}

export const classStatusLabels: Record<ClassStatus, string> = {
  REQUESTED: "Needs scheduling",
  SCHEDULED: "Scheduled",
  COMPLETED: "Class completed",
  NO_SHOW: "No-show",
  CANCELLED: "Cancelled",
};

const classStatusColors: Record<ClassStatus, string> = {
  REQUESTED: "bg-pink text-ink",
  SCHEDULED: "bg-[#D9F5E6] text-[#0F5132]",
  COMPLETED: "bg-[#EEEAEC] text-[#4A3F45]",
  NO_SHOW: "bg-[#FFF1C7] text-[#5C4500]",
  CANCELLED: "bg-[#EEEAEC] text-[#4A3F45] line-through",
};

export function ClassStatusPill({ status }: { status: ClassStatus }) {
  return <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${classStatusColors[status]}`}>{classStatusLabels[status]}</span>;
}

const paymentLabels: Record<PaymentStatus, string> = {
  PENDING: "Unpaid",
  PAID: "Paid",
  FAILED: "Payment failed",
  REFUNDED: "Refunded",
  PARTIALLY_REFUNDED: "Partly refunded",
};

export function PaymentPill({ status }: { status: PaymentStatus }) {
  const color = status === "PAID" ? "text-[#0F5132]" : status === "PENDING" ? "text-mute" : "text-[#B3124F]";
  return <span className={`text-xs font-bold ${color}`}>{paymentLabels[status]}</span>;
}

export function PageTitle({ children, actions }: { children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h1 className="font-serif text-3xl">{children}</h1>
      {actions}
    </div>
  );
}

export function Flash({ message }: { message?: string }) {
  if (!message) return null;
  return <p role="status" className="mb-5 rounded-xl bg-[#D9F5E6] px-4 py-3 text-sm font-semibold text-[#0F5132]">{message}</p>;
}
