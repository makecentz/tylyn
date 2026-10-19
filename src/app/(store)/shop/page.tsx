import Link from "next/link";
import type { Metadata } from "next";
import { ProductCard } from "@/components/ProductCard";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Shop" };

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ collection?: string }> }) {
  const { collection } = await searchParams;
  const [collections, products] = await Promise.all([
    db.collection.findMany({ orderBy: { sortOrder: "asc" }, where: { products: { some: { active: true } } } }),
    db.product.findMany({
      where: { active: true, ...(collection ? { collection: { slug: collection } } : {}) },
      include: { collection: true },
      orderBy: [{ collection: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    }),
  ]);

  const chip = (active: boolean) =>
    `flex min-h-11 items-center rounded-full border-[1.5px] border-ink px-5 text-sm font-semibold ${active ? "bg-ink text-white" : "bg-white text-ink hover:bg-blush"}`;

  return (
    <>
      <section className="bg-ink text-white">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-2.5 px-4 pb-16 pt-14 sm:px-6">
          <span className="font-script text-[42px] leading-none text-pink">Everything custom</span>
          <h1 className="font-serif text-5xl">The Shop</h1>
          <p className="max-w-[620px] text-[17px] leading-relaxed text-[#E9E2E6]">
            Every item is designed for your event. Pick a package, then add your name, theme and photo on the next page.
          </p>
        </div>
      </section>
      <div className="mx-auto flex max-w-[1200px] flex-col gap-9 px-4 pb-24 pt-10 sm:px-6">
        <nav aria-label="Filter by collection" className="flex flex-wrap gap-2.5">
          <Link href="/shop" className={chip(!collection)} aria-current={!collection ? "page" : undefined}>All</Link>
          {collections.map((c) => (
            <Link key={c.id} href={`/shop?collection=${c.slug}`} className={chip(collection === c.slug)} aria-current={collection === c.slug ? "page" : undefined}>
              {c.name}
            </Link>
          ))}
        </nav>
        {products.length ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-7">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <p className="text-mute">Nothing here yet. Check back soon!</p>
        )}
      </div>
    </>
  );
}
