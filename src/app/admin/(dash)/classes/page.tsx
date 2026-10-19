import Link from "next/link";
import type { ClassStatus, Prisma } from "@prisma/client";
import { classRequest, formatDay, formatTime, shopToday } from "@/lib/classes";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { ClassStatusPill, PageTitle, PaymentPill, classStatusLabels } from "../admin-ui";

const OPEN: ClassStatus[] = ["REQUESTED", "SCHEDULED"];

export default async function ClassBookingsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const { status = "open", q } = await searchParams;
  const today = shopToday();
  const weekEnd = new Date(today.getTime() + 7 * 86_400_000);

  const base: Prisma.OrderWhereInput = { paymentStatus: { not: "PENDING" }, items: { some: { kind: "SERVICE" } } };
  const where: Prisma.OrderWhereInput = {
    ...base,
    ...(status === "open" ? { classStatus: { in: OPEN } } : status === "all" ? {} : { classStatus: status as ClassStatus }),
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

  const [bookings, needsScheduling, thisWeek, upcoming, monthSales] = await Promise.all([
    db.order.findMany({
      where,
      include: { items: true },
      orderBy: [{ classDate: { sort: "asc", nulls: "first" } }, { classTime: "asc" }, { createdAt: "desc" }],
      take: 200,
    }),
    db.order.count({ where: { ...base, classStatus: "REQUESTED" } }),
    db.order.count({ where: { ...base, classStatus: "SCHEDULED", classDate: { gte: today, lt: weekEnd } } }),
    db.order.count({ where: { ...base, classStatus: "SCHEDULED", classDate: { gte: today } } }),
    db.orderItem.aggregate({
      where: { kind: "SERVICE", order: { paymentStatus: { in: ["PAID", "PARTIALLY_REFUNDED"] }, createdAt: { gte: monthStart } } },
      _sum: { lineTotalCents: true },
    }),
  ]);

  const filters = [
    { key: "open", label: "Upcoming" },
    ...(Object.keys(classStatusLabels) as ClassStatus[]).map((s) => ({ key: s, label: classStatusLabels[s] })),
    { key: "all", label: "All" },
  ];
  const qs = (s: string) => `/admin/classes?status=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <>
      <PageTitle
        actions={
          <form className="flex items-center gap-2" action="/admin/classes">
            <input type="hidden" name="status" value="all" />
            <label className="sr-only" htmlFor="q">Search class bookings</label>
            <input id="q" name="q" defaultValue={q} placeholder="Name, email, phone or booking #" className="input w-64" />
            <button className="btn btn-dark min-h-[46px] px-5">Search</button>
          </form>
        }
      >
        Class bookings
      </PageTitle>

      <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-4">
        <div className="card flex flex-col gap-1.5 py-4"><span className="text-sm text-mute">Needs scheduling</span><span className="font-serif text-3xl text-pink-deep">{needsScheduling}</span></div>
        <div className="card flex flex-col gap-1.5 py-4"><span className="text-sm text-mute">Classes in the next 7 days</span><span className="font-serif text-3xl">{thisWeek}</span></div>
        <div className="card flex flex-col gap-1.5 py-4"><span className="text-sm text-mute">All upcoming classes</span><span className="font-serif text-3xl">{upcoming}</span></div>
        <div className="flex flex-col gap-1.5 rounded-2xl bg-ink px-6 py-4"><span className="text-sm text-[#CFC6CB]">Class sales this month</span><span className="font-serif text-3xl text-gold">{formatCents(monthSales._sum.lineTotalCents ?? 0)}</span></div>
      </div>

      <nav aria-label="Filter class bookings" className="mb-4 flex flex-wrap gap-2">
        {filters.map((f) => (
          <Link key={f.key} href={qs(f.key)} aria-current={status === f.key ? "page" : undefined} className={`flex min-h-10 items-center rounded-full px-4 text-sm font-semibold ${status === f.key ? "bg-ink text-white" : "bg-white text-ink"}`}>
            {f.label}
          </Link>
        ))}
      </nav>

      <div className="overflow-x-auto rounded-2xl bg-white">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.08em] text-mute">
              <th scope="col" className="px-5 py-4 font-semibold">Booking</th>
              <th scope="col" className="px-3 py-4 font-semibold">Student</th>
              <th scope="col" className="px-3 py-4 font-semibold">Wants to learn</th>
              <th scope="col" className="px-3 py-4 font-semibold">They asked for</th>
              <th scope="col" className="px-3 py-4 font-semibold">Class date and time</th>
              <th scope="col" className="px-5 py-4 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((o) => {
              const req = classRequest(o.items);
              return (
                <tr key={o.id} className="border-t border-[#F0E7EB] align-top hover:bg-blush">
                  <td className="px-5 py-4 font-bold">
                    <Link href={`/admin/orders/${o.id}`} className="underline">#{o.number}</Link>
                    <div className="text-xs font-normal text-mute">Booked {o.createdAt.toLocaleDateString()}</div>
                    <PaymentPill status={o.paymentStatus} />
                  </td>
                  <td className="px-3 py-4">
                    <div className="font-semibold">{o.customerName}</div>
                    <a href={`tel:${o.phone}`} className="text-[13px] text-pink-deep underline">{o.phone}</a>
                  </td>
                  <td className="px-3 py-4 text-[#4A3F45]">{req.topic ?? "—"}</td>
                  <td className="px-3 py-4 text-[#4A3F45]">
                    {req.preferredDate ? <div>{formatDay(req.preferredDate)}</div> : "—"}
                    {req.preferredTime ? <div className="text-[13px]">{req.preferredTime}</div> : null}
                    {req.backupDate ? <div className="text-[13px] text-mute">Backup: {formatDay(req.backupDate)}</div> : null}
                  </td>
                  <td className="px-3 py-4">
                    {o.classDate ? (
                      <>
                        <div className="font-semibold">{formatDay(o.classDate)}</div>
                        {o.classTime ? <div>{formatTime(o.classTime)}</div> : null}
                        {o.classLocation ? <div className="text-[13px] text-mute">{o.classLocation}</div> : null}
                      </>
                    ) : (
                      <Link href={`/admin/orders/${o.id}#schedule`} className="font-semibold text-pink-deep underline">Set date and time</Link>
                    )}
                  </td>
                  <td className="px-5 py-4"><ClassStatusPill status={o.classStatus} /></td>
                </tr>
              );
            })}
            {bookings.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-mute">No class bookings here yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
