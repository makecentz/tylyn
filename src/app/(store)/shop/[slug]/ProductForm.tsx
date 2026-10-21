"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { formatSession } from "@/lib/classes";
import { formatFavors, MAX_FAVOR_QTY, sessionValue, type CustomField } from "@/lib/custom-fields";
import { formatCents } from "@/lib/money";

type Props = {
  product: { id: string; name: string; image?: string; priceCents: number; kind: "PRODUCT" | "SERVICE"; leadDays: number };
  fields: CustomField[];
  addOns: { id: string; name: string; priceCents: number; priceNote: string | null }[];
  /** "quote" sends the picks as a quote request instead of adding them to the cart. */
  mode?: "cart" | "quote";
  quoteService?: string;
};

function minDate(leadDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + leadDays);
  return d.toISOString().slice(0, 10);
}

export function ProductForm({ product, fields: allFields, addOns, mode = "cart", quoteService = "" }: Props) {
  const cart = useCart();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [addOnQty, setAddOnQty] = useState<Record<string, number>>({});
  const [quantity, setQuantity] = useState(1);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [favorQty, setFavorQty] = useState<Record<string, number>>({});
  const [contact, setContact] = useState({ name: "", email: "", phone: "", eventDate: "" });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const earliest = minDate(product.leadDays);

  const favors = allFields.find((f) => f.type === "favors");
  const fields = allFields.filter((f) => f.type !== "favors");
  // Each class time is a single booking, so there's no quantity to choose.
  const sessionKey = allFields.find((f) => f.type === "session")?.key;
  const hasSessions = Boolean(sessionKey);
  const favorMin = favors?.minQty ?? 1;
  const picks = (favors?.items ?? []).filter((i) => favorQty[i.name]).map((i) => ({ name: i.name, quantity: favorQty[i.name], priceCents: i.priceCents }));
  const favorsCents = picks.reduce((s, p) => s + (p.priceCents ?? 0) * p.quantity, 0);
  const favorCount = picks.reduce((s, p) => s + p.quantity, 0);
  const dateField = fields.find((f) => f.type === "date");

  const addOnTotal = addOns.reduce((s, a) => s + (addOnQty[a.id] ?? 0) * a.priceCents, 0);
  const total = (product.priceCents + favorsCents) * quantity + addOnTotal;

  const fieldLabels = useMemo(() => Object.fromEntries(allFields.map((f) => [f.key, f.label])), [allFields]);

  function setFavor(name: string, n: number) {
    setFavorQty((q) => {
      const next = { ...q };
      if (n <= 0) delete next[name];
      else next[name] = Math.min(MAX_FAVOR_QTY, n);
      return next;
    });
    setAdded(false);
  }

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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (favors) {
      if (favors.required && picks.length === 0) {
        setError(`Pick at least one favor.`);
        return;
      }
      const short = picks.find((p) => p.quantity < favorMin);
      if (short) {
        setError(`Favors are made in batches of at least ${favorMin}. Please raise ${short.name} to ${favorMin} or more.`);
        return;
      }
    }
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
    const customization = Object.fromEntries(
      Object.entries({ ...(favors ? { [favors.key]: formatFavors(picks) } : {}), ...answers }).filter(([, v]) => v.trim()),
    );

    if (mode === "quote") {
      const eventDate = (dateField ? answers[dateField.key] : contact.eventDate) ?? "";
      if (!contact.name.trim() || !contact.email.trim() || !contact.phone.trim()) {
        setError("Please add your name, email and phone so we can send your quote.");
        return;
      }
      if (!eventDate) {
        setError("Please pick your event date.");
        return;
      }
      const details = [
        product.name,
        ...Object.entries(customization).map(([k, v]) => `${fieldLabels[k] ?? k}: ${v}`),
      ].join("\n");
      setSending(true);
      try {
        const res = await fetch("/api/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...contact, eventDate, services: [quoteService], guestCount: null, details, website: "" }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
        setSent(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      } finally {
        setSending(false);
      }
      return;
    }

    cart.add({
      productId: product.id,
      name: product.name,
      kind: product.kind,
      image: product.image,
      unitPriceCents: product.priceCents + favorsCents,
      quantity,
      customization,
      fieldLabels,
      addOns: addOns.filter((a) => addOnQty[a.id]).map((a) => ({ id: a.id, quantity: addOnQty[a.id] })),
      addOnDetails: addOns.filter((a) => addOnQty[a.id]).map((a) => ({ id: a.id, name: a.name, priceCents: a.priceCents, quantity: addOnQty[a.id] })),
    });
    setAdded(true);
    setAnswers({});
    setAddOnQty({});
    setFavorQty({});
    setQuantity(1);
  }

  if (sent) {
    return (
      <div role="status" className="flex flex-col gap-2 rounded-2xl bg-ink p-6 text-white">
        <span className="font-serif text-2xl text-gold">Quote request sent</span>
        <p className="text-sm leading-relaxed text-[#E9E2E6]">Thank you! We'll look over your favors and get back to you with pricing, usually within a day.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      {favors ? (
        <fieldset className="flex flex-col gap-3 rounded-2xl border border-line px-5 pb-5 pt-4">
          <legend className="px-2 font-serif text-xl">Choose your favors</legend>
          <p className="text-sm text-mute">
            Tap the favors you want, then set how many of each. Every favor is dressed in your custom design
            {favorMin > 1 ? `, with a minimum of ${favorMin} per item` : ""}.
          </p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {(favors.items ?? []).map((item) => {
              const q = favorQty[item.name] ?? 0;
              return (
                <div key={item.name} className={`flex min-h-[56px] items-center justify-between gap-2 rounded-xl border-[1.5px] px-3 ${q ? "border-pink bg-blush" : "border-line"}`}>
                  <button type="button" onClick={() => setFavor(item.name, q ? 0 : favorMin)} aria-pressed={q > 0} className="flex min-h-11 flex-1 items-center gap-2.5 text-left">
                    <span aria-hidden className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-[1.5px] text-xs text-white ${q ? "border-pink bg-pink" : "border-[#B7ADB2]"}`}>{q ? "✓" : ""}</span>
                    <span className="flex flex-col">
                      <span className="text-[15px] font-semibold leading-tight">{item.name}</span>
                      {item.priceCents !== null && mode === "cart" ? <span className="text-[13px] text-mute">{formatCents(item.priceCents)} each</span> : null}
                    </span>
                  </button>
                  {q ? (
                    <input
                      type="number"
                      aria-label={`How many ${item.name}`}
                      min={favorMin}
                      max={MAX_FAVOR_QTY}
                      value={q}
                      onChange={(e) => setFavor(item.name, Math.max(1, Number(e.target.value) || 1))}
                      onBlur={() => q < favorMin && setFavor(item.name, favorMin)}
                      className="h-11 w-20 rounded-lg border-[1.5px] border-ink bg-white px-2 text-center font-bold"
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
          {picks.length ? (
            <p className="text-sm font-semibold" aria-live="polite">
              {picks.length} {picks.length === 1 ? "favor" : "favors"} picked, {favorCount} pieces in all
              {mode === "cart" ? `, ${formatCents(favorsCents)}` : ""}
            </p>
          ) : null}
        </fieldset>
      ) : null}

      {fields.length ? (
        <fieldset className="flex flex-col gap-4 rounded-2xl border border-line px-5 pb-5 pt-4">
          <legend className="px-2 font-serif text-xl">{product.kind === "SERVICE" ? "Book your class" : "Personalize it"}</legend>
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
              if (f.type === "session") {
                return (
                  <div key={f.key} role="radiogroup" aria-labelledby={id} className="field sm:col-span-2">
                    <span id={id}>{label}</span>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {(f.sessions ?? []).map((sess) => {
                        const v = sessionValue(sess);
                        const on = answers[f.key] === v;
                        return (
                          <label key={v} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border-[1.5px] px-3.5 text-[15px] font-semibold ${on ? "border-pink bg-blush" : "border-line"}`}>
                            <input type="radio" name={f.key} value={v} checked={on} onChange={() => set(f.key, v)} className="h-5 w-5 accent-pink" />
                            {formatSession(sess)}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              }
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
        {mode === "quote" ? (
          <>
            <span className="font-serif text-2xl text-gold">Where should we send your quote?</span>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {([
                ["name", "Your name", "text", "name"],
                ["phone", "Phone", "tel", "tel"],
                ["email", "Email", "email", "email"],
              ] as const).map(([k, label, type, auto]) => (
                <label key={k} className={`flex flex-col gap-1.5 text-sm text-[#CFC6CB] ${k === "email" ? "sm:col-span-2" : ""}`}>
                  {label}
                  <input type={type} autoComplete={auto} value={contact[k]} onChange={(e) => setContact((c) => ({ ...c, [k]: e.target.value }))} className="h-11 rounded-lg border border-[#4A3F45] bg-ink-soft px-3 text-white" />
                </label>
              ))}
              {dateField ? null : (
                <label className="flex flex-col gap-1.5 text-sm text-[#CFC6CB]">
                  Event date
                  <input type="date" min={earliest} value={contact.eventDate} onChange={(e) => setContact((c) => ({ ...c, eventDate: e.target.value }))} className="h-11 rounded-lg border border-[#4A3F45] bg-ink-soft px-3 text-white" />
                </label>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            {favors ? (
              <span className="text-sm text-[#CFC6CB]">{favorCount ? `${favorCount} favors` : "Pick your favors above"}</span>
            ) : hasSessions ? (
              <span className="text-sm text-[#CFC6CB]">{answers[sessionKey!] ? "1 class" : "Pick a class time above"}</span>
            ) : (
              <label className="flex items-center gap-3 text-sm text-[#CFC6CB]">
                Quantity
                <input type="number" min={1} max={50} value={quantity} onChange={(e) => setQuantity(Math.max(1, Math.min(50, Number(e.target.value) || 1)))} className="h-11 w-20 rounded-lg border border-[#4A3F45] bg-ink-soft px-3 text-white" />
              </label>
            )}
            <span className="font-serif text-[32px] text-gold">{formatCents(total)}</span>
          </div>
        )}
        {error ? <p role="alert" className="rounded-lg bg-[#3A1426] px-3 py-2 text-sm text-[#FFD1E8]">{error}</p> : null}
        <button type="submit" disabled={uploading !== null || sending} className="btn btn-pink min-h-[54px] text-base">
          {mode === "quote" ? (sending ? "Sending…" : "Request a quote") : product.kind === "SERVICE" ? "Book this class" : "Add to cart"}
        </button>
        {added ? (
          <p role="status" className="text-center text-sm text-[#FFD1E8]">
            Added to your cart. <Link href="/cart" className="font-bold text-white underline">View cart and check out</Link>
          </p>
        ) : (
          <p className="text-center text-xs text-[#A99FA5]">
            {product.kind === "SERVICE"
              ? hasSessions
                ? "Your class is booked for the time you pick. We'll reach out with the details."
                : "We'll confirm your class date by email or text."
              : mode === "quote"
              ? `We'll reply with pricing for your favors. Please reach out at least ${product.leadDays} days before your event.`
              : `Please order at least ${product.leadDays} days before your event. You'll get a design proof before we print.`}
          </p>
        )}
      </div>
    </form>
  );
}
