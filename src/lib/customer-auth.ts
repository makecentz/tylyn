import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "./db";

export const CUSTOMER_COOKIE = "tt_account";
const SESSION_DAYS = 30;

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET must be set to a long random string");
  return new TextEncoder().encode(s);
}

export const addressSchema = z.object({
  address1: z.string().trim().min(1, "Please enter your street address.").max(200),
  address2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1, "Please enter your city.").max(100),
  state: z.string().trim().min(2, "Please enter your state.").max(40),
  zip: z.string().trim().min(3, "Please enter your ZIP code.").max(20),
});
export type Address = z.infer<typeof addressSchema>;

export function parseAddress(value: unknown): Address | null {
  const parsed = addressSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function cookieForCustomer(customerId: string) {
  const token = await new SignJWT({ role: "customer" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(customerId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
  return {
    name: CUSTOMER_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  };
}

/** The signed-in shopper, or null. */
export async function getCustomer() {
  const token = (await cookies()).get(CUSTOMER_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.role !== "customer" || !payload.sub) return null;
    return await db.customer.findUnique({ where: { id: payload.sub } });
  } catch {
    return null;
  }
}

export async function requireCustomer() {
  const customer = await getCustomer();
  if (!customer) redirect("/account/login");
  return customer;
}
