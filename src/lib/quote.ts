import { z } from "zod";
import { db } from "./db";

export const OTHER_SERVICE = "Something else";

/** The service choices on the quote form: every collection, then a catch-all. */
export async function quoteServiceOptions() {
  const collections = await db.collection.findMany({ orderBy: { sortOrder: "asc" }, select: { name: true } });
  return [...collections.map((c) => c.name), OTHER_SERVICE];
}

export const quoteSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name.").max(120),
  email: z.email("Please enter a valid email.").max(200),
  phone: z.string().trim().min(7, "Please enter a phone number.").max(40),
  eventDate: z.iso.date("Please pick your event date."),
  services: z.array(z.string().max(120)).min(1, "Pick at least one service.").max(20),
  guestCount: z.number().int().min(1).max(10000).nullable(),
  details: z.string().max(5000),
  // Hidden field that people never fill in; bots usually do.
  website: z.string().max(0).optional(),
});
