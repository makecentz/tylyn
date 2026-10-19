import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCustomer } from "@/lib/customer-auth";
import { AuthCard, FormError } from "../AuthCard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function AccountLogin({ searchParams }: { searchParams: Promise<{ error?: string; email?: string; next?: string }> }) {
  const { error, email, next } = await searchParams;
  if (await getCustomer()) redirect(next?.startsWith("/") && !next.startsWith("//") ? next : "/account");
  const nextQs = next ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <AuthCard script="Welcome back" title="Sign in">
      <form method="post" action="/api/account/login" className="flex flex-col gap-4">
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <FormError message={error === "invalid" ? "That email and password don't match an account. Please try again." : undefined} />
        <label className="field">Email<input className="input" type="email" name="email" autoComplete="email" required defaultValue={email} /></label>
        <label className="field">Password<input className="input" type="password" name="password" autoComplete="current-password" required /></label>
        <button className="btn btn-pink min-h-[52px]">Sign in</button>
      </form>
      <p className="text-sm text-[#4A3F45]">
        New here? <Link href={`/account/register${nextQs}`} className="font-semibold text-pink-deep underline">Create an account</Link> to track your orders.
      </p>
      <p className="text-xs text-mute">Forgot your password? Call or text us from the Contact page and we&apos;ll help you get back in.</p>
    </AuthCard>
  );
}
