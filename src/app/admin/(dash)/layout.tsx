import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const nav = [
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/classes", label: "Class bookings" },
  { href: "/admin/quotes", label: "Quote requests" },
  { href: "/admin/products", label: "Products and services" },
  { href: "/admin/addons", label: "Add-ons and collections" },
  { href: "/admin/content", label: "Site content" },
  { href: "/admin/settings", label: "Settings and Square" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const [newCount, newClasses, newQuotes] = await Promise.all([
    db.order.count({ where: { status: "NEW", paymentStatus: "PAID", items: { some: { kind: "PRODUCT" } } } }),
    db.order.count({ where: { classStatus: "REQUESTED", paymentStatus: "PAID", items: { some: { kind: "SERVICE" } } } }),
    db.quoteRequest.count({ where: { status: "NEW" } }),
  ]);
  const badges: Record<string, number> = { Orders: newCount, "Class bookings": newClasses, "Quote requests": newQuotes };

  return (
    <div className="flex min-h-screen flex-wrap bg-[#F7F3F5]">
      <aside className="flex w-full flex-col gap-1.5 bg-ink px-5 py-7 text-white md:sticky md:top-0 md:h-screen md:w-64">
        <Link href="/" aria-label="View website" className="flex justify-center">
          <Image src="/logo.png" alt="Tylyn Tingz Creations" width={900} height={311} className="h-16 w-auto" />
        </Link>
        <span className="mb-5 mt-2 text-center text-[11px] font-bold tracking-[0.3em] text-gold">ADMIN</span>
        <nav aria-label="Admin" className="flex flex-row flex-wrap gap-1.5 md:flex-col">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="flex min-h-11 items-center rounded-[10px] px-3.5 text-sm font-semibold hover:bg-white/10">
              {n.label}
              {badges[n.label] ? (
                <span className="ml-auto rounded-full bg-pink px-2 py-0.5 text-xs text-ink">{badges[n.label]}</span>
              ) : null}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-2 pt-6 text-xs text-[#A99FA5]">
          <span className="truncate">Signed in as {admin.email}</span>
          <form method="post" action="/api/admin/logout">
            <button className="min-h-10 font-semibold text-[#FFD1E8] underline">Sign out</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-5 md:p-8">{children}</main>
    </div>
  );
}
