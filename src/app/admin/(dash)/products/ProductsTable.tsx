"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { bulkUpdateProducts, type BulkProductAction } from "../../actions";

export type ProductRow = {
  id: string;
  name: string;
  image?: string;
  collection: string | null;
  price: string | null; // formatted, or null when not set
  active: boolean;
  onlineCheckout: boolean;
  featured: boolean;
};

export function ProductsTable({ rows, collections }: { rows: ProductRow[]; collections: { id: string; name: string }[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [collectionId, setCollectionId] = useState("");
  const [message, setMessage] = useState<{ error?: string; ok?: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const allChecked = rows.length > 0 && selected.length === rows.length;

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  function run(action: BulkProductAction) {
    if (action === "delete" && !confirm(`Delete ${selected.length} ${selected.length === 1 ? "item" : "items"}? This can't be undone. Hiding is usually better for things on past orders.`)) return;
    startTransition(async () => {
      const res = await bulkUpdateProducts(selected, action, collectionId);
      setMessage(res);
      if (!res.error) {
        setSelected([]);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className={`sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-2xl px-4 py-3 ${selected.length ? "bg-ink text-white" : "bg-white text-mute"}`}>
        <span className="mr-2 text-sm font-semibold">{selected.length ? `${selected.length} selected` : "Tick products to edit several at once"}</span>
        {selected.length ? (
          <>
            <button type="button" disabled={pending} onClick={() => run("show")} className="btn min-h-10 bg-white px-4 text-[13px] text-ink">Show in shop</button>
            <button type="button" disabled={pending} onClick={() => run("hide")} className="btn min-h-10 bg-white px-4 text-[13px] text-ink">Hide</button>
            <button type="button" disabled={pending} onClick={() => run("feature")} className="btn min-h-10 bg-white px-4 text-[13px] text-ink">Feature</button>
            <button type="button" disabled={pending} onClick={() => run("unfeature")} className="btn min-h-10 bg-white px-4 text-[13px] text-ink">Unfeature</button>
            <span className="flex items-center gap-1.5">
              <label className="sr-only" htmlFor="bulk-collection">Move to collection</label>
              <select id="bulk-collection" value={collectionId} onChange={(e) => setCollectionId(e.target.value)} className="h-10 rounded-full bg-white px-3 text-[13px] text-ink">
                <option value="">No collection</option>
                {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button type="button" disabled={pending} onClick={() => run("collection")} className="btn min-h-10 bg-white px-4 text-[13px] text-ink">Move</button>
            </span>
            <button type="button" disabled={pending} onClick={() => run("delete")} className="btn ml-auto min-h-10 bg-[#B3124F] px-4 text-[13px] text-white">Delete</button>
          </>
        ) : null}
      </div>
      {message?.error ? <p role="alert" className="text-sm font-semibold text-[#B3124F]">{message.error}</p> : null}
      {message?.ok ? <p role="status" className="text-sm font-semibold text-[#0F5132]">{message.ok}</p> : null}

      <div className="overflow-x-auto rounded-2xl bg-white">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.08em] text-mute">
              <th scope="col" className="w-12 py-4 pl-5">
                <input type="checkbox" aria-label="Select all" checked={allChecked} onChange={() => setSelected(allChecked ? [] : rows.map((r) => r.id))} className="h-5 w-5 accent-pink" />
              </th>
              <th scope="col" className="px-3 py-4 font-semibold">Product</th>
              <th scope="col" className="px-3 py-4 font-semibold">Collection</th>
              <th scope="col" className="px-3 py-4 font-semibold">Price</th>
              <th scope="col" className="px-3 py-4 font-semibold">Visibility</th>
              <th scope="col" className="px-5 py-4 font-semibold"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const checked = selected.includes(p.id);
              return (
                <tr key={p.id} className={`border-t border-[#F0E7EB] ${checked ? "bg-blush" : "hover:bg-blush"}`}>
                  <td className="py-3 pl-5">
                    <input type="checkbox" aria-label={`Select ${p.name}`} checked={checked} onChange={() => toggle(p.id)} className="h-5 w-5 accent-pink" />
                  </td>
                  <td className="px-3 py-3">
                    <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3 font-semibold underline">
                      {p.image ? (
                        <Image src={p.image} alt="" width={48} height={48} className="h-12 w-12 rounded-lg object-cover object-top" />
                      ) : (
                        <span className="h-12 w-12 rounded-lg bg-[#FFE3F1]" />
                      )}
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-[#4A3F45]">{p.collection ?? "—"}</td>
                  <td className="px-3 py-3">{p.price ?? <span className="text-[#B3124F]">Not set</span>}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1.5 text-xs font-bold">
                      {p.active ? <span className="rounded-full bg-[#D9F5E6] px-2.5 py-1 text-[#0F5132]">In shop</span> : <span className="rounded-full bg-[#EEEAEC] px-2.5 py-1 text-[#4A3F45]">Hidden</span>}
                      {p.active && !p.onlineCheckout ? <span className="rounded-full bg-[#FFF1C7] px-2.5 py-1 text-[#5C4500]">Inquiry only</span> : null}
                      {p.featured ? <span className="rounded-full bg-ink px-2.5 py-1 text-gold">Featured</span> : null}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link href={`/admin/products/${p.id}`} className="btn btn-outline min-h-10 px-4 text-[13px]">Edit</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
