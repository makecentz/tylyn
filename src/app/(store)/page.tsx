import Image from "next/image";
import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { QuoteSection } from "@/components/QuoteSection";
import { getAllContent } from "@/lib/content";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [content, featured, collections] = await Promise.all([
    getAllContent(),
    db.product.findMany({
      where: { active: true, featured: true },
      include: { collection: true },
      orderBy: [{ sortOrder: "asc" }],
      take: 8,
    }),
    db.collection.findMany({
      orderBy: { sortOrder: "asc" },
      include: { products: { where: { active: true }, orderBy: { priceCents: "asc" }, select: { images: true, priceCents: true, onlineCheckout: true } } },
    }),
  ]);
  const { hero, homeSections, howItWorks, classBanner, gallery, about, contact } = content;
  const visibleCollections = collections.filter((c) => c.products.length > 0);

  return (
    <>
      <section className="bg-ink text-white">
        <video
          className="block aspect-video w-full bg-ink object-cover"
          poster="/videos/hero-poster.jpg"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          aria-label="Tylyn Tingz custom party favors"
        >
          <source src="/videos/hero.mp4" type="video/mp4" />
          <source src="/videos/hero.webm" type="video/webm" />
        </video>
        <div className="mx-auto flex max-w-[1200px] flex-col gap-5 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          {contact.tagline ? <p className="font-script text-3xl leading-tight text-pink-light sm:text-4xl">{contact.tagline}</p> : <span />}
          <div className="flex flex-wrap gap-3.5 sm:shrink-0 sm:justify-end">
            <Link href="/shop" className="btn btn-pink min-h-[52px]">{hero.primaryLabel}</Link>
            <Link href="/classes" className="btn btn-outline-gold min-h-[52px]">{hero.secondaryLabel}</Link>
          </div>
        </div>
      </section>

      {homeSections.collections && visibleCollections.length ? (
        <section aria-labelledby="collections" className="bg-white">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-4 py-20 sm:px-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <span className="font-script text-4xl text-pink-deep">Something for every celebration</span>
              <h2 id="collections" className="font-serif text-4xl">Shop by collection</h2>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-7">
              {visibleCollections.map((c) => {
                const img = c.products.find((p) => p.images[0])?.images[0];
                const from = c.products.find((p) => p.onlineCheckout && p.priceCents > 0)?.priceCents;
                return (
                  <Link key={c.id} href={c.slug === "classes" ? "/classes" : `/shop?collection=${c.slug}`} className="group flex flex-col overflow-hidden rounded-[18px] bg-ink text-white shadow-lg">
                    {img ? (
                      <div className="relative h-64">
                        <Image src={img} alt="" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover object-top transition duration-300 group-hover:scale-105" />
                      </div>
                    ) : null}
                    <div className="flex flex-col gap-2 p-6">
                      {c.tagline ? <span className="text-xs font-bold uppercase tracking-[0.14em] text-gold">{c.tagline}</span> : null}
                      <span className="font-serif text-[26px]">{c.name}</span>
                      {from ? <span className="text-[15px] text-[#E9E2E6]">From ${(from / 100).toFixed(0)}</span> : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {homeSections.bestSellers && featured.length ? (
        <section aria-labelledby="best" className="bg-ink">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-4 py-20 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="font-script text-4xl text-pink">Customer favorites</span>
                <h2 id="best" className="font-serif text-4xl text-white">Best sellers</h2>
              </div>
              <Link href="/shop" className="flex min-h-11 items-center font-semibold text-gold">View all products →</Link>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-6">
              {featured.map((p) => (
                <ProductCard key={p.id} product={p} dark />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {homeSections.howItWorks ? (
        <section aria-labelledby="how" className="bg-blush">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-11 px-4 py-20 sm:px-6">
            <h2 id="how" className="text-center font-serif text-4xl">{howItWorks.title}</h2>
            <ol className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-7">
              {howItWorks.steps.map((s, i) => (
                <li key={i} className="flex flex-col items-start gap-3">
                  <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-ink font-serif text-2xl text-gold">{i + 1}</span>
                  <span className="font-serif text-[22px]">{s.title}</span>
                  <span className="text-[15px] leading-relaxed text-[#4A3F45]">{s.body}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      <QuoteSection />

      {about.body ? (
        <section id="about" aria-labelledby="about-title" className="bg-white">
          <div className="mx-auto flex max-w-[820px] flex-col items-center gap-4 px-4 py-20 text-center sm:px-6">
            <h2 id="about-title" className="font-serif text-4xl">{about.title}</h2>
            <p className="whitespace-pre-line text-lg leading-relaxed text-[#4A3F45]">{about.body}</p>
          </div>
        </section>
      ) : null}

      {homeSections.classBanner ? (
        <section aria-labelledby="classband" className="border-y border-gold/35 bg-ink text-white">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-12 px-4 py-20 sm:px-6">
            <div className="flex min-w-[min(100%,420px)] flex-1 flex-col gap-4">
              <span className="font-script text-[44px] leading-none text-pink">{classBanner.script}</span>
              <h2 id="classband" className="font-serif text-4xl sm:text-[44px]">{classBanner.title}</h2>
              <p className="text-[17px] leading-relaxed text-[#E9E2E6]">{classBanner.body}</p>
              <div className="flex flex-wrap gap-2.5">
                {classBanner.topics.map((t) => (
                  <span key={t} className="rounded-full bg-[#2A1D25] px-3.5 py-2 text-sm text-[#FFD1E8]">{t}</span>
                ))}
              </div>
            </div>
            <Link href="/classes" className="btn btn-gold min-h-14">Book a class</Link>
          </div>
        </section>
      ) : null}

      {homeSections.gallery && gallery.images.length ? (
        <section aria-labelledby="gal" className="bg-white">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-4 py-20 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 id="gal" className="font-serif text-4xl">From our gallery</h2>
              <Link href="/gallery" className="flex min-h-11 items-center font-semibold text-pink-deep">See the full gallery →</Link>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
              {gallery.images.slice(0, 4).map((g, i) => (
                <div key={g.src + i} className="relative aspect-square overflow-hidden rounded-[14px]">
                  <Image src={g.src} alt={g.alt} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover" />
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
