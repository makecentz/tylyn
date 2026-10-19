import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendQuoteEmail } from "@/lib/email";
import { quoteSchema, quoteServiceOptions } from "@/lib/quote";

export async function POST(req: Request) {
  const parsed = quoteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Please check the form." }, { status: 400 });
  }
  const q = parsed.data;
  // Silently accept bot submissions without saving them.
  if (q.website) return NextResponse.json({ ok: true });

  const today = new Date().toISOString().slice(0, 10);
  if (q.eventDate < today) return NextResponse.json({ error: "The event date is in the past." }, { status: 400 });

  const allowed = new Set(await quoteServiceOptions());
  const services = q.services.filter((s) => allowed.has(s));
  if (services.length === 0) return NextResponse.json({ error: "Pick at least one service." }, { status: 400 });

  const quote = await db.quoteRequest.create({
    data: {
      name: q.name,
      email: q.email,
      phone: q.phone,
      eventDate: new Date(`${q.eventDate}T00:00:00Z`),
      services,
      guestCount: q.guestCount,
      details: q.details.trim(),
    },
  });
  await sendQuoteEmail(quote);
  return NextResponse.json({ ok: true });
}
