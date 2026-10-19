"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useCart } from "@/components/CartProvider";
import type { CustomField } from "@/lib/custom-fields";
import { formatCents } from "@/lib/money";

type Props = {
  product: { id: string; name: string; image?: string; priceCents: number; kind: "PRODUCT" | "SERVICE"; leadDays: number };
  fields: CustomField[];
  addOns: { id: string; name: string; priceCents: number; priceNote: string | null }[];
};

function minDate(leadDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + leadDays);
  return d.toISOString().slice(0, 10);
}

export function ProductForm({ product, fields, addOns }: Props) {
  const cart = useCart();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [addOnQty, setAddOnQty] = useState<Record<string, number>>({});
  const [quantity, setQuantity] = useState(1);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const earliest = minDate(product.leadDays);

  const addOnTotal = addOns.reduce((s, a) => s + (addOnQty[a.id] ?? 0) * a.priceCents, 0);
  const total = product.priceCents * quantity + addOnTotal;

  const fieldLabels = useMemo(() => Object.fromEntries(fields.map((f) => [f.key, f.label])), [fields]);

  function set(key: string, value: string) {
    setAnswers((a) => ({ ...a, [key]: value }));
    setAdded(false);
  }

  async function upload(key: string, file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploading(key);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      set(key, data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    for (const f of fields) {
      const v = (answers[f.key] ?? "").trim();
      if (f.required && !v) {
        setError(`Please fill in "${f.label}".`);
        return;
      }
      if (f.type === "date" && v && v < earliest) {
        setError(`"${f.label}" needs to be on or after ${new Date(earliest + "T12:00").toLocaleDateString()} so we have time to make your order.`);
        return;
      }
    }
    cart.add({
      productId: product.id,
      name: product.name,
      kind: product.kind,
      image: product.image,
      unitPriceCents: product.priceCents,
      quantity,
      customization: Object.fromEntries(Object.entries(answers).filter(([, v]) => v.trim())),
      fieldLabels,
      addOns: addOns.filter((a) => addOnQty[a.id]).map((a) => ({ id: a.id, quantity: addOnQty[a.id] })),
      addOnDetails: addOns.filter((a) => addOnQty[a.id]).map((a) => ({ id: a.id, name: a.name, priceCents: a.priceCents, quantity: addOnQty[a.id] })),
    });
    setAdded(true);
    setAnswers({});
    setAddOnQty({});
    setQuantity(1);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      {fields.length ? (
        <fieldset className="flex flex-col gap-4 rounded-2xl border border-line px-5 pb-5 pt-4">
          <legend className="px-2 font-serif text-xl">{product.kind === "SERVICE" ? "Request your class" : "Personalize it"}</legend>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {fields.map((f) => {
              const id = `f_${f.key}`;
              const wide = f.type === "textarea" || f.type === "photo";
              const label = (
                <>
                  {f.label}
                  {f.required ? <span className="text-pink-deep"> *</span> : <span className="font-normal text-mute"> (optional)</span>}
                </>
              );
              if (f.type === "photo") {
                const url = answers[f.key];
                return (
                  <div key={f.key} className={`field ${wide ? "sm:col-span-2" : ""}`}>
                    <label htmlFor={id}>{label}</label>
                    <div className="flex min-h-14 items-center justify-between gap-3 rounded-[10px] border-[1.5px] border-dashed border-pink bg-blush px-4 text-sm font-normal text-mute">
                      <span className="truncate">{uploading === f.key ? "Uploading…" : url ? "Photo added ✓" : "JPG, PNG or HEIC up to 8 MB"}</span>
                      <input id={id} type="file" accept="image/*" className="max-w-[210px] text-xs file:mr-2 file:rounded-full file:border-0 file:bg-ink file:px-3 file:py-2 file:text-white" onChange={(e) => upload(f.key, e.target.files?.[0])} />
                    </div>
                  </div>
                );
              }
              return (
                <div key={f.key} className={`field ${wide ? "sm:col-span-2" : ""}`}>
                  <label htmlFor={id}>{label}</label>
                  {f.type === "textarea" ? (
                    <textarea id={id} className="input" rows={3} value={answers[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} />
                  ) : f.type === "select" ? (
                    <select id={id} className="input" value={answers[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)}>
                      <option value="">Choose one</option>
                      {(f.options ?? []).map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={id}
                      className="input"
                      type={f.type === "date" ? "date" : f.type === "number" ? "number" : "text"}
                      min={f.type === "date" ? earliest : undefined}
                      value={answers[f.key] ?? ""}
                      placeholder={f.placeholder}
                      onChange={(e) => set(f.key, e.target.value)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      {addOns.length ? (
        <fieldset className="flex flex-col gap-3 rounded-2xl border border-line px-5 pb-5 pt-4">
          <legend className="px-2 font-serif text-xl">Add-ons</legend>
          {addOns.map((a) => {
            const q = addOnQty[a.id] ?? 0;
            const setQ = (n: number) => {
              setAddOnQty((s) => ({ ...s, [a.id]: Math.max(0, Math.min(50, n)) }));
              setAdded(false);
            };
            return (
              <div key={a.id} className={`flex min-h-[52px] items-center justify-between gap-3 rounded-xl border-[1.5px] px-3.5 ${q ? "border-pink bg-blush" : "border-line"}`}>
                <span className="flex flex-col">
                  <span className="text-[15px] font-semibold">{a.name}</span>
                  <span className="text-[13px] text-mute">{formatCents(a.priceCents)}{a.priceNote ? ` ${a.priceNote}` : ""}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <button type="button" aria-label={`Remove one ${a.name}`} onClick={() => setQ(q - 1)} className="h-11 w-11 rounded-full border-[1.5px] border-ink text-xl">−</button>
                  <span className="min-w-7 text-center font-bold" aria-live="polite">{q}</span>
                  <button type="button" aria-label={`Add one ${a.name}`} onClick={() => setQ(q + 1)} className="h-11 w-11 rounded-full bg-ink text-xl text-white">+</button>
                </span>
              </div>
            );
          })}
        </fieldset>
      ) : null}

      <div className="flex flex-col gap-3.5 rounded-2xl bg-ink p-5 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-3 text-sm text-[#CFC6CB]">
            Quantity
            <input type="number" min={1} max={50} value={quantity} onChange={(e) => setQuantity(Math.max(1, Math.min(50, Number(e.target.value) || 1)))} className="h-11 w-20 rounded-lg border border-[#4A3F45] bg-ink-soft px-3 text-white" />
          </label>
          <span className="font-serif text-[32px] text-gold">{formatCents(total)}</span>
        </div>
        {error ? <p role="alert" className="rounded-lg bg-[#3A1426] px-3 py-2 text-sm text-[#FFD1E8]">{error}</p> : null}
        <button type="submit" disabled={uploading !== null} className="btn btn-pink min-h-[54px] text-base">
          {product.kind === "SERVICE" ? "Add class to cart" : "Add to cart"}
        </button>
        {added ? (
          <p role="status" className="text-center text-sm text-[#FFD1E8]">
            Added to your cart. <Link href="/cart" className="font-bold text-white underline">View cart and check out</Link>
          </p>
        ) : (
          <p className="text-center text-xs text-[#A99FA5]">
            {product.kind === "SERVICE"
              ? "We'll confirm your class date by email or text."
              : `Please order at least ${product.leadDays} days before your event. You'll get a design proof before we print.`}
          </p>
        )}
      </div>
    </form>
  );
}
