import bcrypt from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";
import { getAdminPasswordHash, setAdminPasswordHash } from "@/lib/admin-password";
import { setSessionCookie } from "@/lib/auth";

// Plain form POST, like the login route, so it keeps working across deploys.
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const adminEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const hash = await getAdminPasswordHash();
  const back = (error: string) => NextResponse.redirect(new URL(`/admin/password?error=${error}`, req.url), 303);

  if (!adminEmail || !hash) return back("setup");
  const currentOk = await bcrypt.compare(current, hash);
  if (email !== adminEmail || !currentOk) {
    await new Promise((r) => setTimeout(r, 400));
    return back("invalid");
  }
  if (next.length < 8 || next.length > 200) return back("short");
  if (next !== confirm) return back("mismatch");

  await setAdminPasswordHash(await bcrypt.hash(next, 10));
  await setSessionCookie(adminEmail);
  return NextResponse.redirect(new URL("/admin/orders?password=changed", req.url), 303);
}
