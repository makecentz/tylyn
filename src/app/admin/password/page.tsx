import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Change admin password", robots: { index: false } };

const errors: Record<string, string> = {
  invalid: "That email and current password don't match.",
  short: "Your new password needs at least 8 characters.",
  mismatch: "The two new passwords don't match.",
  setup: "Admin login isn't set up yet. Add ADMIN_EMAIL and ADMIN_PASSWORD_HASH.",
};

export default async function ChangePasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4 py-10">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <Link href="/" aria-label="Back to the website">
          <Image src="/logo.png" alt="Tylyn Tingz Creations" width={900} height={311} className="h-24 w-auto" priority />
        </Link>
        <form method="post" action="/api/admin/password" className="card flex w-full flex-col gap-4">
          <h1 className="font-serif text-2xl">Change password</h1>
          <label className="field">Admin email<input name="email" type="email" autoComplete="username" required className="input" /></label>
          <label className="field">Current password<input name="current" type="password" autoComplete="current-password" required className="input" /></label>
          <label className="field">New password<input name="password" type="password" autoComplete="new-password" minLength={8} required className="input" /></label>
          <label className="field">New password again<input name="confirm" type="password" autoComplete="new-password" minLength={8} required className="input" /></label>
          {error && errors[error] ? <p role="alert" className="text-sm text-[#B3124F]">{errors[error]}</p> : null}
          <button className="btn btn-pink">Save new password</button>
          <Link href="/admin/login" className="text-center text-sm font-semibold text-pink-deep underline">Back to sign in</Link>
        </form>
        <Link href="/" className="text-sm font-semibold text-white underline">← Back to the website</Link>
      </div>
    </div>
  );
}
