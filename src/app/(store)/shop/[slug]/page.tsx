import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { favorsField, favorsPriced, parseCustomFields } from "@/lib/custom-fields";
import { OTHER_SERVICE } from "@/lib/quote";
import { formatCents } from "@/lib/money";
import { getAllContent } from "@/lib/content";
import { ProductForm } from "./ProductForm";

export const dynamic = "force-dynamic";

async function load(slug: string) {
  return db.product.findFirst({
    where: { slug, active: true },
    include: { collection: true, addOns: { where: { active: true }, orderBy: { sortOrder: "asc" } } },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const product = await load((await params).slug);
  return product ? { title: product.name, description: product.description } : {};
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const product = await load((await params).slug);
  if (!product) notFound();
  const { contact } = await getAllContent();
  const fields = parseCustomFields(product.customFields);
  // A favor picker always shows; it takes payment once every favor has a price, and asks for a quote until then.
  const favors = favorsField(fields);
  const checkout = product.onlineCheckout && (favors ? favorsPriced(favors) : product.priceCents > 0);
  const [main, ...rest] = product.images;

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-7 px-4 pb-24 pt-7 sm:px-6">
      <nav aria-label="Breadcrumb" className="flex flex-wrap gap-2 text-[13px] text-mute">
        <Link href="/shop" className="text-pink-deep underline">Shop</Link>
        {product.collection ? (
          <>
            <span aria-hidden>/</span>
            <Link href={`/shop?collection=${product.collection.slug}`} className="text-pink-deep underline">{product.collection.name}</Link>
          </>
        ) : null}
        <span aria-hidden>/</span>
        <span>{product.name}</span>
      </nav>

      <div className="flex flex-wrap items-start gap-14">
        <div className="flex min-w-[min(100%,420px)] flex-1 flex-col gap-3.5">
          {main ? (
            <div className="relative aspect-[4/5] overflow-hidden rounded-[18px] bg-ink">
              <Image src={main} alt={product.name} fill priority sizes="(max-width: 768px) 100vw, 50vw" className="object-cover object-top" />
            </div>
          ) : (
            <div className="flex aspect-[4/5] items-center justify-center rounded-[18px] bg-[#FFE3F1] text-sm font-semibold uppercase tracking-[0.08em] text-pink-deep">Photo coming soon</div>
          )}
          {rest.length ? (
            <div className="grid grid-cols-4 gap-3">
              {rest.slice(0, 8).map((src, i) => (
                <div key={src + i} className="relative aspect-square overflow-hidden rounded-[10px]">
                  <Image src={src} alt="" fill sizes="25vw" className="object-cover" />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex min-w-[min(100%,420px)] flex-1 flex-col gap-6">
          <div className="flex flex-col gap-2">
            {product.collection ? (
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-gold-deep">{product.collection.name} · Everything custom</span>
            ) : null}
            <h1 className="font-serif text-4xl leading-tight sm:text-[46px]">{product.name}</h1>
            {favors ? (
              <span className="text-sm font-semibold uppercase tracking-[0.08em] text-pink-deep">
                {checkout ? "Priced per favor · pick what you want below" : "Pick your favors and we'll send you a quote"}
              </span>
            ) : product.onlineCheckout ? (
              <span className="font-serif text-[34px] text-pink-deep">
                {formatCents(product.priceCents)}
                {product.priceNote ? <span className="ml-2 font-sans text-base text-mute">{product.priceNote}</span> : null}
              </span>
            ) : null}
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-[#4A3F45]">{product.description}</p>
            {product.includes.length ? (
              <div className="mt-2 flex flex-col gap-2">
                <span className="text-sm font-bold">{product.kind === "SERVICE" ? "What you can learn" : "What's included"}</span>
                <ul className="grid grid-cols-1 gap-1.5 text-[15px] sm:grid-cols-2">
                  {product.includes.map((inc) => (
                    <li key={inc} className="flex items-start gap-2">
                      <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-pink" />
                      {inc}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          {checkout || favors ? (
            <ProductForm
              product={{
                id: product.id,
                name: product.name,
                image: main,
                priceCents: product.priceCents,
                kind: product.kind,
                leadDays: product.leadDays,
              }}
              mode={checkout ? "cart" : "quote"}
              quoteService={product.collection?.name ?? OTHER_SERVICE}
              fields={fields}
              addOns={product.addOns.map((a) => ({ id: a.id, name: a.name, priceCents: a.priceCents, priceNote: a.priceNote }))}
            />
          ) : (
            <div className="flex flex-col gap-3 rounded-2xl bg-ink p-6 text-white">
              <span className="font-serif text-2xl text-gold">Request this package</span>
              <p className="text-sm leading-relaxed text-[#E9E2E6]">Contact us for pricing and to place this order.</p>
              <div className="flex flex-wrap gap-3">
                {contact.phone ? <a href={`tel:+1${contact.phone.replace(/\D/g, "").slice(-10)}`} className="btn btn-pink">Call or text {contact.phone}</a> : null}
                <Link href={`/contact?product=${encodeURIComponent(product.name)}`} className="btn btn-outline-gold">Other ways to reach us</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
