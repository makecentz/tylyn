import Image from "next/image";
import Link from "next/link";
import { formatCents } from "@/lib/money";

export type ProductCardData = {
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  priceNote: string | null;
  images: string[];
  onlineCheckout: boolean;
  collection: { name: string } | null;
};

export function ProductCard({ product, dark = false }: { product: ProductCardData; dark?: boolean }) {
  const img = product.images[0];
  return (
    <Link
      href={`/shop/${product.slug}`}
      className={`group flex flex-col overflow-hidden rounded-[18px] border ${dark ? "border-gold/40 bg-ink-soft text-white" : "border-line bg-white text-ink"}`}
    >
      {img ? (
        <div className="relative h-56 overflow-hidden bg-ink">
          <Image src={img} alt={product.name} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover object-top transition duration-300 group-hover:scale-105" />
        </div>
      ) : (
        <div className="flex h-56 items-center justify-center bg-[#FFE3F1] text-xs font-semibold uppercase tracking-[0.08em] text-pink-deep">Photo coming soon</div>
      )}
      <div className="flex flex-1 flex-col gap-2 px-5 pb-6 pt-5">
        {product.collection ? (
          <span className={`text-[11px] font-bold uppercase tracking-[0.14em] ${dark ? "text-gold" : "text-gold-deep"}`}>{product.collection.name}</span>
        ) : null}
        <span className="font-serif text-2xl">{product.name}</span>
        <span className={`line-clamp-2 text-sm leading-6 ${dark ? "text-[#CFC6CB]" : "text-mute"}`}>{product.description}</span>
        <span className="mt-auto flex items-center justify-between pt-3">
          <span className={`font-serif text-[26px] ${dark ? "text-gold" : ""}`}>
            {product.onlineCheckout ? formatCents(product.priceCents) : "Ask for a quote"}
            {product.onlineCheckout && product.priceNote ? <span className="ml-1 font-sans text-xs text-mute"> {product.priceNote}</span> : null}
          </span>
          <span className="rounded-full bg-pink px-4 py-2 text-[13px] font-bold text-ink">{product.onlineCheckout ? "Customize" : "Details"}</span>
        </span>
      </div>
    </Link>
  );
}
