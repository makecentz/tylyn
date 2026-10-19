"use client";

import { useActionState } from "react";
import { saveAddOn, saveCollection } from "../../actions";

function Result({ state }: { state: { error?: string; ok?: string } | null }) {
  if (state?.error) return <p role="alert" className="text-sm text-[#B3124F]">{state.error}</p>;
  if (state?.ok) return <p role="status" className="text-sm font-semibold text-[#0F5132]">{state.ok}</p>;
  return null;
}

export function AddOnForm({ addOn }: { addOn?: { id: string; name: string; price: string; priceNote: string; active: boolean; sortOrder: number } }) {
  const [state, action, pending] = useActionState(saveAddOn, null);
  return (
    <form action={action} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[2fr_1fr_1fr_80px_auto_auto]">
      <input type="hidden" name="id" value={addOn?.id ?? ""} />
      <label className="field">Name<input name="name" className="input" defaultValue={addOn?.name} required /></label>
      <label className="field">Price<input name="price" className="input" inputMode="decimal" defaultValue={addOn?.price} required /></label>
      <label className="field">Price label<input name="priceNote" className="input" placeholder="each" defaultValue={addOn?.priceNote} /></label>
      <label className="field">Order<input name="sortOrder" type="number" className="input" defaultValue={addOn?.sortOrder ?? 0} /></label>
      <label className="flex min-h-[46px] items-center gap-2 text-sm font-semibold">
        <input name="active" type="checkbox" defaultChecked={addOn?.active ?? true} className="h-5 w-5 accent-pink" />
        Available
      </label>
      <button className="btn btn-dark min-h-[46px]" disabled={pending}>{addOn ? "Save" : "Add"}</button>
      <div className="sm:col-span-6"><Result state={state} /></div>
    </form>
  );
}

export function CollectionForm({ collection }: { collection?: { id: string; name: string; slug: string; tagline: string; sortOrder: number } }) {
  const [state, action, pending] = useActionState(saveCollection, null);
  return (
    <form action={action} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[2fr_2fr_80px_auto]">
      <input type="hidden" name="id" value={collection?.id ?? ""} />
      <input type="hidden" name="slug" value={collection?.slug ?? ""} />
      <label className="field">Name<input name="name" className="input" defaultValue={collection?.name} required /></label>
      <label className="field">Tagline<input name="tagline" className="input" placeholder="e.g. Kids' birthdays" defaultValue={collection?.tagline} /></label>
      <label className="field">Order<input name="sortOrder" type="number" className="input" defaultValue={collection?.sortOrder ?? 0} /></label>
      <button className="btn btn-dark min-h-[46px]" disabled={pending}>{collection ? "Save" : "Add"}</button>
      <div className="sm:col-span-4"><Result state={state} /></div>
    </form>
  );
}
