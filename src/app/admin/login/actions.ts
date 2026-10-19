"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { setSessionCookie } from "@/lib/auth";

export async function login(_prev: { error?: string } | null, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const adminEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const hash = process.env.ADMIN_PASSWORD_HASH ?? "";
  if (!adminEmail || !hash) return { error: "Admin login isn't set up yet. Add ADMIN_EMAIL and ADMIN_PASSWORD_HASH." };

  // Always run the hash comparison so a wrong email and a wrong password take the same time.
  const passwordOk = await bcrypt.compare(password, hash);
  if (email !== adminEmail || !passwordOk) {
    await new Promise((r) => setTimeout(r, 400));
    return { error: "That email and password don't match." };
  }
  await setSessionCookie(adminEmail);
  redirect("/admin/orders");
}
