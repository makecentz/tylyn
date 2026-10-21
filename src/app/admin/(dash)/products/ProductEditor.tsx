"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { customFieldTypes, defaultClassFields, defaultPartyFields, slugifyKey, type CustomField } from "@/lib/custom-fields";
import { formatCents } from "@/lib/money";
import Link from "next/link";
import { quickAddAddOn, saveProduct, type ProductInput } from "../../actions";
import { ImageListEditor } from "../ImageListEditor";

type Initial = Omit<ProductInput, "customFields"> & { customFields: CustomField[] };

const fieldTypeLabels: Record<(typeof customFieldTypes)[number], string> = {
  text: "Short answer",
  textarea: "Long answer",
  number: "Number",
  date: "Date",
  photo: "Photo upload",
  select: "Dropdown",
  favors: "Favor picker",
  session: "Class dates you offer",
};

/** The class dates and start times the owner offers; shoppers pick one and it's booked for them. */
function SessionsEditor({ field, onChange }: { field: CustomField; onChange: (patch: Partial<CustomField>) => void }) {
  const sessions = field.sessions ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const set = (next: NonNullable<CustomField["sessions"]>) => onChange({ sessions: next });
  return (
    <div className="flex flex-col gap-2.5 sm:col-span-4">
      <span className="text-[13px] font-semibold">Class dates and start times customers can book</span>
      {sessions.map((s, j) => (
        <div key={j} className={`flex flex-wrap items-center gap-2 ${s.date && s.date <= today ? "opacity-60" : ""}`}>
          <input type="date" aria-label="Class date" className="input w-44" value={s.date} onChange={(e) => set(sessions.map((x, k) => (k === j ? { ...x, date: e.target.value } : x)))} />
          <input type="time" aria-label="Start time" className="input w-36" value={s.time} onChange={(e) => set(sessions.map((x, k) => (k === j ? { ...x, time: e.target.value } : x)))} />
          <button type="button" onClick={() => set(sessions.filter((_, k) => k !== j))} className="min-h-11 px-2 text-sm font-semibold text-[#B3124F]">Remove</button>
          {s.date && s.date <= today ? <span className="text-xs text-mute">Past, hidden from customers</span> : null}
        </div>
      ))}
      <button
        type="button"
        className="btn btn-outline min-h-11 self-start"
        onClick={() => {
          const last = sessions[sessions.length - 1];
          const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
          set([...sessions, { date: last && last.date > today ? last.date : tomorrow, time: last?.time ?? "10:00" }]);
        }}
      >
        + Add a date
      </button>
      <p className="text-sm text-mute">Each time can be booked once. Once someone books it, it disappears from the shop and the booking shows on Class bookings with that date and time.</p>
    </div>
  );
}

function itemsToText(items: CustomField["items"]) {
  return (items ?? []).map((i) => (i.priceCents === null ? i.name : `${i.name} - ${(i.priceCents / 100).toFixed(2)}`)).join("\n");
}

function textToItems(text: string): NonNullable<CustomField["items"]> {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const m = /^(.*?)\s*[-–]\s*\$?(\d+(?:\.\d{1,2})?)$/.exec(line);
      return m ? { name: m[1].trim(), priceCents: Math.round(parseFloat(m[2]) * 100) } : { name: line, priceCents: null };
    })
    .filter((i) => i.name);
}

/** Favor list as plain text, one per line with an optional price per piece: "Capri Suns - 1.50". */
function FavorItemsEditor({ field, onChange }: { field: CustomField; onChange: (patch: Partial<CustomField>) => void }) {
  const [text, setText] = useState(() => itemsToText(field.items));
  const items = field.items ?? [];
  const unpriced = items.filter((i) => i.priceCents === null).length;
  return (
    <div className="flex flex-col gap-3 sm:col-span-4">
      <label className="field">Favor items (one per line, price per piece after a dash)
        <textarea
          className="input font-mono text-sm"
          rows={10}
          value={text}
          placeholder={"Capri Suns - 1.50\nRing Pops - 1.25"}
          onChange={(e) => {
            setText(e.target.value);
            onChange({ items: textToItems(e.target.value) });
          }}
        />
      </label>
      <label className="field max-w-[220px]">Minimum per item
        <input className="input" type="number" min={1} max={500} value={field.minQty ?? 10} onChange={(e) => onChange({ minQty: Math.max(1, Math.min(500, Number(e.target.value) || 1)) })} />
      </label>
      <p className="text-sm text-mute">
        {items.length} items.{" "}
        {unpriced
          ? `${unpriced} still need a price, so shoppers send a quote request instead of paying online.`
          : "Every item has a price, so shoppers can add their picks to the cart and pay online."}
      </p>
    </div>
  );
}

function toSlug(name: string) {
  return name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function ProductEditor({
  initial,
  collections,
  addOns: initialAddOns,
}: {
  initial: Initial;
  collections: { id: string; name: string }[];
  addOns: { id: string; name: string; priceCents: number }[];
}) {
  const router = useRouter();
  const [p, setP] = useState<Initial>(initial);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id));
  const [newInclude, setNewInclude] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addOns, setAddOns] = useState(initialAddOns);
  const [newAddOn, setNewAddOn] = useState({ name: "", price: "" });
  const [addOnError, setAddOnError] = useState<string | null>(null);
  const [addingAddOn, setAddingAddOn] = useState(false);

  async function createAddOn() {
    setAddOnError(null);
    setAddingAddOn(true);
    const res = await quickAddAddOn(newAddOn.name, newAddOn.price);
    setAddingAddOn(false);
    if (!res.addOn) {
      setAddOnError(res.error ?? "Couldn't add that add-on.");
      return;
    }
    const created = res.addOn;
    setAddOns((list) => [...list, created]);
    setP((x) => ({ ...x, addOnIds: [...x.addOnIds, created.id] }));
    setNewAddOn({ name: "", price: "" });
  }

  const set = <K extends keyof Initial>(k: K, v: Initial[K]) => setP((x) => ({ ...x, [k]: v }));

  function setField(i: number, patch: Partial<CustomField>) {
    set(
      "customFields",
      p.customFields.map((f, j) => (j === i ? { ...f, ...patch, ...(patch.label !== undefined ? { key: slugifyKey(patch.label) } : {}) } : f)),
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await saveProduct(p);
    setSaving(false);
    if (res.error) {
      setError(res.error);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    router.push(`/admin/products/${res.id}?saved=1`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-start gap-6">
      <div className="flex min-w-[min(100%,520px)] flex-[2] flex-col gap-5">
        {error ? <p role="alert" className="rounded-xl bg-[#FFE3F1] px-4 py-3 text-sm font-semibold text-[#8E0B50]">{error}</p> : null}

        <section className="card flex flex-col gap-4">
          <h2 className="font-serif text-xl">Basics</h2>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <label className="field">Name
              <input className="input" value={p.name} required onChange={(e) => { set("name", e.target.value); if (!slugTouched) set("slug", toSlug(e.target.value)); }} />
            </label>
            <label className="field">Web address
              <span className="flex items-center gap-1 font-normal text-mute">
                /shop/
                <input className="input" value={p.slug} onChange={(e) => { setSlugTouched(true); set("slug", toSlug(e.target.value)); }} />
              </span>
            </label>
            <label className="field">Collection
              <select className="input" value={p.collectionId ?? ""} onChange={(e) => set("collectionId", e.target.value)}>
                <option value="">None</option>
                {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="field">Type
              <select
                className="input"
                value={p.kind}
                onChange={(e) => {
                  const kind = e.target.value as "PRODUCT" | "SERVICE";
                  set("kind", kind);
                  if (!initial.id && kind === "SERVICE") set("customFields", defaultClassFields);
                  if (!initial.id && kind === "PRODUCT") set("customFields", defaultPartyFields);
                }}
              >
                <option value="PRODUCT">Product (made to order)</option>
                <option value="SERVICE">Service or class (booked by date)</option>
              </select>
            </label>
            <label className="field">{p.customFields.some((f) => f.type === "favors") ? "Design fee (added to the favors, 0 for none)" : "Price"}
              <input className="input" inputMode="decimal" placeholder="125.00" value={p.price} onChange={(e) => set("price", e.target.value)} />
            </label>
            <label className="field">Price label (optional)
              <input className="input" placeholder="per dozen" value={p.priceNote ?? ""} onChange={(e) => set("priceNote", e.target.value)} />
            </label>
          </div>
          <label className="field">Description
            <textarea className="input" rows={4} value={p.description} onChange={(e) => set("description", e.target.value)} />
          </label>
        </section>

        <section className="card flex flex-col gap-3">
          <h2 className="font-serif text-xl">{p.kind === "SERVICE" ? "What you can learn" : "What's included"}</h2>
          <ul className="flex flex-col gap-2">
            {p.includes.map((inc, i) => (
              <li key={i} className="flex items-center gap-2">
                <input className="input" value={inc} aria-label={`Included item ${i + 1}`} onChange={(e) => set("includes", p.includes.map((x, j) => (j === i ? e.target.value : x)))} />
                <button type="button" aria-label={`Remove ${inc}`} onClick={() => set("includes", p.includes.filter((_, j) => j !== i))} className="h-11 w-11 shrink-0 rounded-full border border-line text-lg">×</button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <input
              className="input"
              placeholder="e.g. 12 custom chip bags"
              value={newInclude}
              aria-label="New included item"
              onChange={(e) => setNewInclude(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (newInclude.trim()) { set("includes", [...p.includes, newInclude.trim()]); setNewInclude(""); }
                }
              }}
            />
            <button type="button" className="btn btn-outline min-h-[46px] shrink-0" onClick={() => { if (newInclude.trim()) { set("includes", [...p.includes, newInclude.trim()]); setNewInclude(""); } }}>Add</button>
          </div>
        </section>

        <section className="card flex flex-col gap-3">
          <h2 className="font-serif text-xl">Photos</h2>
          <p className="text-sm text-mute">The first photo is the main one shown in the shop.</p>
          <ImageListEditor value={p.images} onChange={(v) => set("images", v)} />
        </section>

        <section className="card flex flex-col gap-3">
          <div>
            <h2 className="font-serif text-xl">Ask the customer for</h2>
            <p className="text-sm text-mute">These questions show on the product page and the answers come through on the order.</p>
          </div>
          {p.customFields.map((f, i) => (
            <div key={i} className="grid grid-cols-1 items-end gap-3 rounded-xl border border-line p-3 sm:grid-cols-[2fr_1.2fr_auto_auto]">
              <label className="field">Question
                <input className="input" value={f.label} onChange={(e) => setField(i, { label: e.target.value })} />
              </label>
              <label className="field">Answer type
                <select className="input" value={f.type} onChange={(e) => setField(i, { type: e.target.value as CustomField["type"] })}>
                  {customFieldTypes.map((t) => <option key={t} value={t}>{fieldTypeLabels[t]}</option>)}
                </select>
              </label>
              <label className="flex min-h-[46px] items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={f.required} onChange={(e) => setField(i, { required: e.target.checked })} className="h-5 w-5 accent-pink" />
                Required
              </label>
              <button type="button" onClick={() => set("customFields", p.customFields.filter((_, j) => j !== i))} className="min-h-[46px] px-2 text-sm font-semibold text-[#B3124F]">Remove</button>
              {f.type === "session" ? <SessionsEditor field={f} onChange={(patch) => setField(i, patch)} /> : null}
              {f.type === "favors" ? <FavorItemsEditor field={f} onChange={(patch) => setField(i, patch)} /> : null}
              {f.type === "select" ? (
                <label className="field sm:col-span-4">Choices (one per line)
                  <textarea className="input" rows={3} value={(f.options ?? []).join("\n")} onChange={(e) => setField(i, { options: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })} />
                </label>
              ) : null}
            </div>
          ))}
          <button
            type="button"
            className="btn btn-outline min-h-11 self-start"
            onClick={() => set("customFields", [...p.customFields, { key: `question_${p.customFields.length + 1}`, label: `Question ${p.customFields.length + 1}`, type: "text", required: false }])}
          >
            + Add a question
          </button>
        </section>
      </div>

      <div className="flex min-w-[min(100%,280px)] flex-1 flex-col gap-5 lg:sticky lg:top-6">
        <section className="card flex flex-col gap-1">
          <h2 className="mb-1 font-serif text-xl">Visibility</h2>
          {([
            ["active", "Show in shop"],
            ["featured", "Feature on home page"],
            ["onlineCheckout", "Online checkout"],
          ] as const).map(([k, label]) => (
            <label key={k} className="flex min-h-11 items-center justify-between text-sm font-semibold">
              {label}
              <input type="checkbox" checked={Boolean(p[k])} onChange={(e) => set(k, e.target.checked)} className="h-5 w-5 accent-pink" />
            </label>
          ))}
          <p className="text-xs leading-5 text-mute">With online checkout off, the product shows a &ldquo;Request this package&rdquo; button with your contact info instead of Add to cart.</p>
        </section>

        <section className="card flex flex-col gap-1">
          <h2 className="mb-1 font-serif text-xl">Add-ons offered</h2>
          {addOns.length === 0 ? <p className="text-sm text-mute">No add-ons yet. Add one below.</p> : null}
          {addOns.map((a) => (
            <label key={a.id} className="flex min-h-11 items-center justify-between gap-3 text-sm">
              <span>{a.name} · {formatCents(a.priceCents)}</span>
              <input
                type="checkbox"
                className="h-5 w-5 accent-pink"
                checked={p.addOnIds.includes(a.id)}
                onChange={(e) => set("addOnIds", e.target.checked ? [...p.addOnIds, a.id] : p.addOnIds.filter((x) => x !== a.id))}
              />
            </label>
          ))}
          <div className="mt-2 flex flex-col gap-2 border-t border-line pt-3">
            <span className="text-sm font-semibold">New add-on</span>
            <div className="grid grid-cols-[1fr_90px] gap-2">
              <input className="input" aria-label="New add-on name" placeholder="e.g. Balloon garland" value={newAddOn.name} onChange={(e) => setNewAddOn((a) => ({ ...a, name: e.target.value }))} />
              <input className="input" aria-label="New add-on price" inputMode="decimal" placeholder="25.00" value={newAddOn.price} onChange={(e) => setNewAddOn((a) => ({ ...a, price: e.target.value }))} />
            </div>
            {addOnError ? <p role="alert" className="text-sm text-[#B3124F]">{addOnError}</p> : null}
            <button type="button" onClick={createAddOn} disabled={addingAddOn} className="btn btn-outline min-h-11">{addingAddOn ? "Adding…" : "+ Add and offer it here"}</button>
            <Link href="/admin/addons" target="_blank" className="text-sm font-semibold text-pink-deep underline">Edit prices or remove add-ons</Link>
          </div>
        </section>

        <section className="card flex flex-col gap-3">
          <label className="field">Minimum days before the event or class
            <input type="number" min={0} max={365} className="input" value={p.leadDays} onChange={(e) => set("leadDays", Number(e.target.value) || 0)} />
          </label>
          <label className="field">Sort order (lower shows first)
            <input type="number" className="input" value={p.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value) || 0)} />
          </label>
        </section>

        <button className="btn btn-pink min-h-[52px]" disabled={saving}>{saving ? "Saving…" : "Save product"}</button>
      </div>
    </form>
  );
}
