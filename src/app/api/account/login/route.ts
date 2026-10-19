import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";
import { cookieForCustomer, normalizeEmail } from "@/lib/customer-auth";
import { db } from "@/lib/db";
import { redirectTo, safeNext } from "../shared";

// A hash of a random password, compared when the email has no account so both cases take the same time.
const DUMMY_HASH = "$2b$10$zrgJ/xc7uPsS6I33cH/Am.pSyzSnu.JreMGAgP6.r5AzeTzZfXj3C";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const email = normalizeEmail(String(form.get("email") ?? ""));
  const password = String(form.get("password") ?? "");
  const next = safeNext(form.get("next"));

  const customer = email ? await db.customer.findUnique({ where: { email } }) : null;
  const ok = await bcrypt.compare(password, customer?.passwordHash ?? DUMMY_HASH);
  if (!customer || !ok) {
    await new Promise((r) => setTimeout(r, 400));
    return redirectTo(req, "/account/login", { error: "invalid", email, next: next === "/account" ? "" : next });
  }
  const res = redirectTo(req, next);
  res.cookies.set(await cookieForCustomer(customer.id));
  return res;
}
