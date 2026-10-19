import Link from "next/link";
import type { Prisma, QuoteStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { updateQuote } from "../../actions";
import { Flash, PageTitle } from "../admin-ui";

const labels: Record<QuoteStatus, string> = { NEW: "New", CONTACTED: "Contacted", BOOKED: "Booked", CLOSED: "Closed" };
const colors: Record<QuoteStatus, string> = {
  NEW: "bg-pink text-ink",
  CONTACTED: "bg-[#FFF1C7] text-[#5C4500]",
  BOOKED: "bg-[#D9F5E6] text-[#0F5132]",
  CLOSED: "bg-[#EEEAEC] text-[#4A3F45]",
};
const filters = [
  { key: "open", label: "Open" },
  { key: "BOOKED", label: "Booked" },
  { key: "CLOSED", label: "Closed" },
  { key: "all", label: "All" },
];

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

export default async function QuotesPage({ searchParams }: { searchParams: Promise<{ status?: string; saved?: string }> }) {
  const { status = "open", saved } = await searchParams;
  const where: Prisma.QuoteRequestWhereInput =
    status === "all" ? {} : status === "open" ? { status: { in: ["NEW", "CONTACTED"] } } : { status: status as QuoteStatus };
  const quotes = await db.quoteRequest.findMany({ where, orderBy: [{ eventDate: "asc" }, { createdAt: "desc" }], take: 200 });

  return (
    <div className="flex flex-col gap-5">
      <PageTitle>Quote requests</PageTitle>
      <Flash message={saved ? "Quote updated." : undefined} />
      <nav aria-label="Filter quotes" className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <Link
            key={f.key}
            href={`/admin/quotes?status=${f.key}`}
            className={`flex min-h-10 items-center rounded-full px-4 text-sm font-semibold ${status === f.key ? "bg-ink text-white" : "border border-line bg-white"}`}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {quotes.length === 0 ? <p className="card text-mute">No quote requests here yet.</p> : null}

      {quotes.map((q) => (
        <article key={q.id} className="card flex flex-wrap gap-6">
          <div className="flex min-w-[min(100%,320px)] flex-[2] flex-col gap-2 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-serif text-xl">{q.name}</h2>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${colors[q.status]}`}>{labels[q.status]}</span>
            </div>
            <p>
              <strong>Event:</strong> {q.eventDate ? formatDate(q.eventDate) : "No date given"}
              {q.guestCount ? ` · ${q.guestCount} guests` : ""}
            </p>
            <p><strong>Interested in:</strong> {q.services.join(", ")}</p>
            {q.details ? <p className="whitespace-pre-line rounded-lg bg-blush p-3">{q.details}</p> : null}
            <p className="flex flex-wrap gap-x-4 gap-y-1">
              <a href={`mailto:${q.email}?subject=${encodeURIComponent("Your Tylyn Tingz Creations quote")}`} className="text-pink-deep underline">{q.email}</a>
              <a href={`tel:${q.phone}`} className="text-pink-deep underline">{q.phone}</a>
            </p>
            <span className="text-xs text-mute">Received {q.createdAt.toLocaleString("en-US")}</span>
          </div>
          <form action={updateQuote} className="flex min-w-[min(100%,240px)] flex-1 flex-col gap-3">
            <input type="hidden" name="id" value={q.id} />
            <input type="hidden" name="back" value={status} />
            <label className="field">Status
              <select name="status" defaultValue={q.status} className="input">
                {Object.entries(labels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label className="field">Private notes
              <textarea name="adminNotes" defaultValue={q.adminNotes ?? ""} rows={2} className="input" placeholder="Price quoted, follow-up date…" />
            </label>
            <button className="btn btn-pink">Save</button>
          </form>
        </article>
      ))}
    </div>
  );
}
