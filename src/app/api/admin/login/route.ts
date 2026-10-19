import bcrypt from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";
import { setSessionCookie } from "@/lib/auth";

// A plain form POST instead of a server action, so a login page loaded before a
// redeploy still works (old server action IDs stop existing after each deploy).
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const adminEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const hash = process.env.ADMIN_PASSWORD_HASH ?? "";
  const back = (error: string) => NextResponse.redirect(new URL(`/admin/login?error=${error}`, req.url), 303);

  if (!adminEmail || !hash) return back("setup");
  // Always run the hash comparison so a wrong email and a wrong password take the same time.
  const passwordOk = await bcrypt.compare(password, hash);
  if (email !== adminEmail || !passwordOk) {
    await new Promise((r) => setTimeout(r, 400));
    return back("invalid");
  }
  await setSessionCookie(adminEmail);
  return NextResponse.redirect(new URL("/admin/orders", req.url), 303);
}
