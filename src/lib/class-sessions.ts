import type { Prisma } from "@prisma/client";
import { formatSession, shopToday } from "./classes";
import { sessionValue, type ClassSession } from "./custom-fields";
import { db } from "./db";

// A slot is taken by any booking for it that hasn't been cancelled, failed or refunded.
// Pending online checkouts hold the slot until Stripe expires them (about an hour).
const holdsSlot: Prisma.OrderWhereInput = {
  classStatus: { not: "CANCELLED" },
  paymentStatus: { notIn: ["FAILED", "REFUNDED"] },
};

/** Sessions for a class product that are still in the future and not booked yet, soonest first. */
export async function openSessions(productId: string, sessions: ClassSession[], ignoreOrderId?: string): Promise<ClassSession[]> {
  const today = shopToday().toISOString().slice(0, 10);
  const future = sessions.filter((s) => s.date > today);
  if (future.length === 0) return [];
  const booked = await db.order.findMany({
    where: {
      ...holdsSlot,
      ...(ignoreOrderId ? { id: { not: ignoreOrderId } } : {}),
      classDate: { in: [...new Set(future.map((s) => new Date(`${s.date}T00:00:00Z`)))] },
      items: { some: { productId } },
    },
    select: { classDate: true, classTime: true },
  });
  const taken = new Set(booked.map((o) => `${o.classDate!.toISOString().slice(0, 10)} ${o.classTime ?? ""}`));
  return future
    .filter((s) => !taken.has(sessionValue(s)))
    .sort((a, b) => sessionValue(a).localeCompare(sessionValue(b)));
}

export { formatSession };
