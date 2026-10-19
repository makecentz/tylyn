import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { cookieForCustomer, normalizeEmail } from "@/lib/customer-auth";
import { db } from "@/lib/db";
import { redirectTo, safeNext } from "../shared";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().max(200),
  phone: z.string().trim().max(40),
  password: z.string().min(8).max(200),
});

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const next = safeNext(form.get("next"));
  const input = {
    name: String(form.get("name") ?? ""),
    email: normalizeEmail(String(form.get("email") ?? "")),
    phone: String(form.get("phone") ?? ""),
    password: String(form.get("password") ?? ""),
  };
  const back = (error: string) =>
    redirectTo(req, "/account/register", { error, name: input.name, email: input.email, phone: input.phone, next: next === "/account" ? "" : next });

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return back(field === "password" ? "password" : field === "email" ? "email" : "name");
  }
  if (await db.customer.findUnique({ where: { email: parsed.data.email } })) return back("exists");

  const customer = await db.customer.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      passwordHash: await bcrypt.hash(parsed.data.password, 10),
    },
  });
  const res = redirectTo(req, next, next === "/account" ? { welcome: "1" } : {});
  res.cookies.set(await cookieForCustomer(customer.id));
  return res;
}
