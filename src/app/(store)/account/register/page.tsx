import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCustomer } from "@/lib/customer-auth";
import { AuthCard, FormError } from "../AuthCard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

const errors: Record<string, string> = {
  exists: "There's already an account with that email. Please sign in instead.",
  password: "Please choose a password with at least 8 characters.",
  email: "Please enter a valid email address.",
  name: "Please enter your name.",
};

export default async function AccountRegister({ searchParams }: { searchParams: Promise<{ error?: string; name?: string; email?: string; phone?: string; next?: string }> }) {
  const { error, name, email, phone, next } = await searchParams;
  if (await getCustomer()) redirect("/account");
  const nextQs = next ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <AuthCard script="Join the party" title="Create an account">
      <p className="-mt-2 text-[#4A3F45]">See every order, its status and your class times in one place, and check out faster next time.</p>
      <form method="post" action="/api/account/register" className="flex flex-col gap-4">
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <FormError message={error ? errors[error] ?? "Something went wrong. Please try again." : undefined} />
        <label className="field">Full name<input className="input" name="name" autoComplete="name" required defaultValue={name} /></label>
        <label className="field">Email<input className="input" type="email" name="email" autoComplete="email" required defaultValue={email} /></label>
        <label className="field">Phone<input className="input" type="tel" name="phone" autoComplete="tel" defaultValue={phone} /></label>
        <label className="field">Password<span className="text-xs font-normal text-mute">At least 8 characters</span><input className="input" type="password" name="password" autoComplete="new-password" minLength={8} required /></label>
        <button className="btn btn-pink min-h-[52px]">Create my account</button>
      </form>
      <p className="text-sm text-[#4A3F45]">
        Already have an account? <Link href={`/account/login${nextQs}`} className="font-semibold text-pink-deep underline">Sign in</Link>
      </p>
    </AuthCard>
  );
}
