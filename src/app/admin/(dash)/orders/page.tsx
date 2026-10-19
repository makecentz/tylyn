import Link from "next/link";
import { redirect } from "next/navigation";
import type { OrderStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { PageTitle, PaymentPill, StatusPill, statusLabels } from "../admin-ui";

const OPEN: OrderStatus[] = ["NEW", "PROOF_SENT", "IN_PRODUCTION", "READY", "SHIPPED"];
// Class-only bookings live on the Class bookings page.
const PRODUCT_ORDERS: Prisma.OrderWhereInput = { paymentStatus: { not: "PENDING" }, items: { some: { kind: "PRODUCT" } } };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; type?: string }> }) {
  const { status, q, type } = await searchParams;
  if (type === "classes") redirect("/admin/classes");

  const where: Prisma.OrderWhereInput = {
    ...PRODUCT_ORDERS,
    ...(status === "open" || !status ? { status: { in: OPEN } } : status === "all" ? {} : { status: status as OrderStatus }),
    ...(q
      ? {
          OR: [
            { customerName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
            ...(Number.isInteger(Number(q)) ? [{ number: Number(q) }] : []),
          ],
        }
      : {}),
  };

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [orders, counts, monthSales] = await Promise.all([
    db.order.findMany({ where, include: { items: true }, orderBy: { createdAt: "desc" }, take: 200 }),
    db.order.groupBy({ by: ["status"], where: PRODUCT_ORDERS, _count: true }),
    db.order.aggregate({
      where: { paymentStatus: { in: ["PAID", "PARTIALLY_REFUNDED"] }, createdAt: { gte: monthStart } },
      _sum: { totalCents: true, refundedCents: true },
    }),
  ]);
  const count = (s: OrderStatus) => counts.find((c) => c.status === s)?._count ?? 0;
  const sales = (monthSales._sum.totalCents ?? 0) - (monthSales._sum.refundedCents ?? 0);

  const filters: { key: string; label: string }[] = [
    { key: "open", label: "Open" },
    ...(Object.keys(statusLabels) as OrderStatus[]).map((s) => ({ key: s, label: statusLabels[s] })),
    { key: "all", label: "All" },
  ];
  const current = status ?? "open";
  const qs = (s: string) => `/admin/orders?status=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <>
      <PageTitle
        actions={
          <form className="flex items-center gap-2" action="/admin/orders">
            <input type="hidden" name="status" value="all" />
            <label className="sr-only" htmlFor="q">Search orders</label>
            <input id="q" name="q" defaultValue={q} placeholder="Name, email, phone or order #" className="input w-64" />
            <button className="btn btn-dark min-h-[46px] px-5">Search</button>
          </form>
        }
      >
        Orders
      </PageTitle>

      <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-4">
        <div className="card flex flex-col gap-1.5 py-4"><span className="text-sm text-mute">New, needs proof</span><span className="font-serif text-3xl text-pink-deep">{count("NEW")}</span></div>
        <div className="card flex flex-col gap-1.5 py-4"><span className="text-sm text-mute">In production</span><span className="font-serif text-3xl">{count("IN_PRODUCTION") + count("PROOF_SENT")}</span></div>
        <div className="card flex flex-col gap-1.5 py-4"><span className="text-sm text-mute">Ready for pickup</span><span className="font-serif text-3xl">{count("READY")}</span></div>
        <div className="flex flex-col gap-1.5 rounded-2xl bg-ink px-6 py-4"><span className="text-sm text-[#CFC6CB]">Sales this month</span><span className="font-serif text-3xl text-gold">{formatCents(sales)}</span></div>
      </div>

      <nav aria-label="Filter orders" className="mb-4 flex flex-wrap gap-2">
        {filters.map((f) => (
          <Link key={f.key} href={qs(f.key)} aria-current={current === f.key ? "page" : undefined} className={`flex min-h-10 items-center rounded-full px-4 text-sm font-semibold ${current === f.key ? "bg-ink text-white" : "bg-white text-ink"}`}>
            {f.label}
          </Link>
        ))}
      </nav>

      <div className="overflow-x-auto rounded-2xl bg-white">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.08em] text-mute">
              <th scope="col" className="px-5 py-4 font-semibold">Order</th>
              <th scope="col" className="px-3 py-4 font-semibold">Customer</th>
              <th scope="col" className="px-3 py-4 font-semibold">Event date</th>
              <th scope="col" className="px-3 py-4 font-semibold">Total</th>
              <th scope="col" className="px-5 py-4 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const date = o.items
                .flatMap((i) => Object.entries(i.customization as Record<string, string>))
                .find(([k]) => /date/i.test(k))?.[1];
              return (
                <tr key={o.id} className="border-t border-[#F0E7EB] hover:bg-blush">
                  <td className="px-5 py-4 font-bold">
                    <Link href={`/admin/orders/${o.id}`} className="underline">#{o.number}</Link>
                    <div className="text-xs font-normal text-mute">{o.createdAt.toLocaleDateString()}</div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="font-semibold">{o.customerName}</div>
                    <div className="text-[13px] text-mute">{o.items.map((i) => i.productName).join(", ")}</div>
                  </td>
                  <td className="px-3 py-4 text-[#4A3F45]">{date ? new Date(date + "T12:00").toLocaleDateString() : "—"}</td>
                  <td className="px-3 py-4">
                    <div className="font-semibold">{formatCents(o.totalCents)}</div>
                    <PaymentPill status={o.paymentStatus} />
                  </td>
                  <td className="px-5 py-4"><StatusPill status={o.status} /></td>
                </tr>
              );
            })}
            {orders.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-mute">No orders here yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
