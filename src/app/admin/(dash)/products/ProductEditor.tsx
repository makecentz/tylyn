"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { customFieldTypes, defaultClassFields, defaultPartyFields, slugifyKey, type CustomField } from "@/lib/custom-fields";
import { formatCents } from "@/lib/money";
import { saveProduct, type ProductInput } from "../../actions";
import { ImageListEditor } from "../ImageListEditor";

type Initial = Omit<ProductInput, "customFields"> & { customFields: CustomField[] };

const fieldTypeLabels: Record<(typeof customFieldTypes)[number], string> = {
  text: "Short answer",
  textarea: "Long answer",
  number: "Number",
  date: "Date",
  photo: "Photo upload",
  select: "Dropdown",
};

function toSlug(name: string) {
  return name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function ProductEditor({
  initial,
  collections,
  addOns,
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
            <label className="field">Price
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
          {addOns.length === 0 ? <p className="text-sm text-mute">No add-ons yet. Create them under Add-ons and collections.</p> : null}
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
        </section>

        <section className="card flex flex-col gap-3 bg-ink text-white">
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
