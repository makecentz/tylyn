"use client";

import Image from "next/image";
import Link from "next/link";
import { lineTotal, useCart } from "@/components/CartProvider";
import { formatCents } from "@/lib/money";

export default function CartPage() {
  const { items, ready, remove, setQuantity, subtotalCents } = useCart();

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-8 px-4 pb-24 pt-10 sm:px-6">
      <h1 className="font-serif text-4xl">Your cart</h1>
      {!ready ? null : items.length === 0 ? (
        <div className="flex flex-col items-start gap-4 rounded-2xl bg-blush p-8">
          <p className="text-lg">Your cart is empty.</p>
          <Link href="/shop" className="btn btn-pink">Shop packages</Link>
        </div>
      ) : (
        <div className="flex flex-wrap items-start gap-8">
          <ul className="flex min-w-[min(100%,520px)] flex-[2] flex-col gap-4">
            {items.map((item) => (
              <li key={item.key} className="flex gap-4 rounded-2xl border border-line p-4">
                {item.image ? (
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-ink">
                    <Image src={item.image} alt="" fill sizes="96px" className="object-cover object-top" />
                  </div>
                ) : null}
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="font-serif text-xl">{item.name}</span>
                    <span className="font-semibold">{formatCents(lineTotal(item))}</span>
                  </div>
                  <dl className="text-[13px] text-mute">
                    {Object.entries(item.customization).map(([k, v]) => (
                      <div key={k} className="flex gap-1">
                        <dt>{item.fieldLabels[k] ?? k}:</dt>
                        <dd className="truncate">{v.startsWith("/uploads/") || v.startsWith("https://") ? "Photo added" : v}</dd>
                      </div>
                    ))}
                  </dl>
                  {item.addOnDetails.map((a) => (
                    <span key={a.id} className="text-[13px] text-mute">+ {a.quantity} × {a.name} ({formatCents(a.priceCents * a.quantity)})</span>
                  ))}
                  <div className="mt-1 flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      Qty
                      <input type="number" min={1} max={50} value={item.quantity} onChange={(e) => setQuantity(item.key, Number(e.target.value) || 1)} className="h-10 w-16 rounded-lg border border-line px-2" />
                    </label>
                    <button type="button" onClick={() => remove(item.key)} className="min-h-10 text-sm font-semibold text-pink-deep underline">Remove</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <aside className="flex min-w-[280px] flex-1 flex-col gap-4 rounded-2xl bg-ink p-6 text-white">
            <h2 className="font-serif text-2xl text-gold">Summary</h2>
            <div className="flex justify-between text-sm"><span className="text-[#CFC6CB]">Subtotal</span><span>{formatCents(subtotalCents)}</span></div>
            <p className="text-xs text-[#A99FA5]">Tax and pickup or shipping are shown at checkout.</p>
            <Link href="/checkout" className="btn btn-pink min-h-[52px]">Check out</Link>
            <Link href="/shop" className="text-center text-sm text-[#FFD1E8] underline">Keep shopping</Link>
          </aside>
        </div>
      )}
    </div>
  );
}
