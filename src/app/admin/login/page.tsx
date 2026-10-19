import Image from "next/image";
import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false } };

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <Image src="/logo.png" alt="Tylyn Tingz Creations" width={900} height={311} className="h-24 w-auto" priority />
        <LoginForm />
      </div>
    </div>
  );
}
