import type { NextRequest } from "next/server";
import { z } from "zod";
import { addressSchema, getCustomer } from "@/lib/customer-auth";
import { db } from "@/lib/db";
import { redirectTo } from "../shared";

const schema = z.object({ name: z.string().trim().min(2).max(120), phone: z.string().trim().max(40) });

export async function POST(req: NextRequest) {
  const customer = await getCustomer();
  if (!customer) return redirectTo(req, "/account/login");
  const form = await req.formData();
  const get = (k: string) => String(form.get(k) ?? "");

  const profile = schema.safeParse({ name: get("name"), phone: get("phone") });
  if (!profile.success) return redirectTo(req, "/account", { error: "name" }, "#details");

  // The address is optional here, but if any part is filled in it has to be complete.
  const raw = { address1: get("address1"), address2: get("address2") || undefined, city: get("city"), state: get("state"), zip: get("zip") };
  const anyAddress = Object.values(raw).some((v) => v && v.trim());
  const address = addressSchema.safeParse(raw);
  if (anyAddress && !address.success) return redirectTo(req, "/account", { error: "address" }, "#details");

  await db.customer.update({
    where: { id: customer.id },
    data: { ...profile.data, address: anyAddress && address.success ? address.data : undefined },
  });
  return redirectTo(req, "/account", { saved: "1" }, "#details");
}
