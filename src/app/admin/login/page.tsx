import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false } };

const errors: Record<string, string> = {
  invalid: "That email and password don't match.",
  setup: "Admin login isn't set up yet. Add ADMIN_EMAIL and ADMIN_PASSWORD_HASH.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <Image src="/logo.png" alt="Tylyn Tingz Creations" width={900} height={311} className="h-24 w-auto" priority />
        <form method="post" action="/api/admin/login" className="card flex w-full flex-col gap-4">
          <h1 className="font-serif text-2xl">Admin sign in</h1>
          <label className="field">Email<input name="email" type="email" autoComplete="username" required className="input" /></label>
          <label className="field">Password<input name="password" type="password" autoComplete="current-password" required className="input" /></label>
          {error && errors[error] ? <p role="alert" className="text-sm text-[#B3124F]">{errors[error]}</p> : null}
          <button className="btn btn-pink">Sign in</button>
        </form>
      </div>
    </div>
  );
}
