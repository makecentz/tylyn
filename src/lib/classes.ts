import type { ClassStatus, OrderItem } from "@prisma/client";

export const classStatuses = ["REQUESTED", "SCHEDULED", "COMPLETED", "NO_SHOW", "CANCELLED"] as const satisfies readonly ClassStatus[];

/** What the customer asked for when booking, read from their answers on the class product. */
export function classRequest(items: Pick<OrderItem, "kind" | "customization">[]) {
  const answers = items
    .filter((i) => i.kind === "SERVICE")
    .flatMap((i) => Object.entries(i.customization as Record<string, string>));
  const find = (re: RegExp) => answers.find(([k]) => re.test(k))?.[1];
  return {
    preferredDate: find(/^(?!.*backup).*date/i),
    backupDate: find(/backup/i),
    preferredTime: find(/time/i),
    topic: find(/learn|topic/i),
  };
}

/** "2026-11-03" → "Tue, Nov 3, 2026" */
export function formatDay(value: Date | string) {
  const d = typeof value === "string" ? new Date(`${value}T00:00:00Z`) : value;
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

/** "14:30" → "2:30 PM" */
export function formatTime(value: string) {
  const m = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!m) return value;
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
}

/** Today's date in the shop's time zone, as a UTC midnight Date for comparing with @db.Date columns. */
export function shopToday() {
  const ymd = new Date().toLocaleDateString("en-CA", { timeZone: process.env.SHOP_TIME_ZONE || "America/New_York" });
  return new Date(`${ymd}T00:00:00Z`);
}

/** "Sat, Nov 8, 2026 at 2:00 PM" */
export function formatSession(s: { date: string; time: string }) {
  return `${formatDay(s.date)} at ${formatTime(s.time)}`;
}
