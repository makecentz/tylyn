import Link from "next/link";
import type { Metadata } from "next";
import { parseAddress, requireCustomer } from "@/lib/customer-auth";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { FormError } from "./AuthCard";
import { DeliveryLine, StatusBadges } from "./OrderBits";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My account", robots: { index: false } };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; welcome?: string }> }) {
  const customer = await requireCustomer();
  const { saved, error, welcome } = await searchParams;
  const orders = await db.order.findMany({
    where: { customerId: customer.id, paymentStatus: { not: "PENDING" } },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
  const addr = parseAddress(customer.address);
  const firstName = customer.name.split(" ")[0];
  const open = orders.filter((o) => o.status !== "COMPLETED" && o.status !== "CANCELLED").length;

  return (
    <>
      <section className="bg-ink text-white">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-end justify-between gap-6 px-4 py-12 sm:px-6">
          <div className="flex flex-col gap-1">
            <span className="font-script text-4xl text-pink sm:text-5xl">{welcome ? "Welcome" : "Hi"}, {firstName}!</span>
            <h1 className="font-serif text-4xl sm:text-5xl">My account</h1>
            <span className="mt-3 block h-[3px] w-20 bg-gold" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col rounded-2xl border border-white/15 px-5 py-3">
              <span className="text-xs uppercase tracking-[0.12em] text-[#CFC6CB]">Orders in progress</span>
              <span className="font-serif text-3xl text-gold">{open}</span>
            </div>
            <form method="post" action="/api/account/logout">
              <button className="btn btn-outline-gold min-h-11">Sign out</button>
            </form>
          </div>
        </div>
      </section>

      <div className="bg-blush">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-start gap-8 px-4 pb-24 pt-10 sm:px-6">
          <section aria-labelledby="orders" className="flex min-w-[min(100%,560px)] flex-[2] flex-col gap-4">
            <h2 id="orders" className="font-serif text-3xl">Your orders</h2>
            {orders.length === 0 ? (
              <div className="flex flex-col items-start gap-4 rounded-2xl bg-white p-7">
                <p className="text-[#4A3F45]">You haven&apos;t placed an order with this account yet. Orders you place while signed in show up here.</p>
                <Link href="/shop" className="btn btn-pink">Shop packages</Link>
              </div>
            ) : (
              orders.map((o) => (
                <article key={o.id} className="flex flex-col gap-3 rounded-2xl bg-white p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-col">
                      <span className="font-serif text-2xl">Order #{o.number}</span>
                      <span className="text-sm text-mute">Placed {o.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                    </div>
                    <StatusBadges order={o} />
                  </div>
                  <p className="text-[15px]">{o.items.map((i) => `${i.quantity} × ${i.productName}`).join(", ")}</p>
                  <DeliveryLine order={o} />
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                    <span className="font-semibold">{formatCents(o.totalCents)}</span>
                    <Link href={`/account/orders/${o.id}`} className="btn btn-dark min-h-10 px-5 text-sm">View order</Link>
                  </div>
                </article>
              ))
            )}
          </section>

          <section id="details" aria-labelledby="details-h" className="flex min-w-[min(100%,320px)] flex-1 scroll-mt-28 flex-col gap-4 rounded-2xl border-t-4 border-pink bg-white p-6">
            <h2 id="details-h" className="font-serif text-2xl">Your details</h2>
            <p className="-mt-2 text-sm text-mute">We fill these in for you at checkout.</p>
            {saved ? <p role="status" className="rounded-lg bg-[#D9F5E6] px-3 py-2 text-sm font-semibold text-[#0F5132]">Saved.</p> : null}
            <FormError message={error === "address" ? "Please fill in the whole address, or leave it all blank." : error === "name" ? "Please enter your name." : undefined} />
            <form method="post" action="/api/account/profile" className="flex flex-col gap-3">
              <label className="field">Full name<input className="input" name="name" autoComplete="name" required defaultValue={customer.name} /></label>
              <label className="field">Email<input className="input bg-[#F7F3F5]" value={customer.email} readOnly aria-readonly /></label>
              <label className="field">Phone<input className="input" type="tel" name="phone" autoComplete="tel" defaultValue={customer.phone} /></label>
              <label className="field">Street address<input className="input" name="address1" autoComplete="address-line1" defaultValue={addr?.address1} /></label>
              <label className="field">Apt, suite<input className="input" name="address2" autoComplete="address-line2" defaultValue={addr?.address2} /></label>
              <div className="grid grid-cols-[1fr_72px_100px] gap-2">
                <label className="field">City<input className="input" name="city" autoComplete="address-level2" defaultValue={addr?.city} /></label>
                <label className="field">State<input className="input" name="state" autoComplete="address-level1" maxLength={2} defaultValue={addr?.state} /></label>
                <label className="field">ZIP<input className="input" name="zip" autoComplete="postal-code" defaultValue={addr?.zip} /></label>
              </div>
              <button className="btn btn-pink min-h-11">Save my details</button>
            </form>
          </section>
        </div>
      </div>
    </>
  );
}
