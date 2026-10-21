"use client";

import { useActionState, useState } from "react";
import { createManualClass } from "../../../actions";

type ClassOption = { id: string; name: string; price: string; topics: string[] };

export function ManualClassForm({ classes }: { classes: ClassOption[] }) {
  const [state, action, pending] = useActionState(createManualClass, null);
  const [productId, setProductId] = useState(classes[0].id);
  const selected = classes.find((c) => c.id === productId) ?? classes[0];

  return (
    <form action={action} className="flex max-w-3xl flex-col gap-5">
      <section className="card grid grid-cols-1 gap-4 sm:grid-cols-2">
        <h2 className="font-serif text-xl sm:col-span-2">Student</h2>
        <label className="field">Name<input name="customerName" className="input" required autoComplete="off" /></label>
        <label className="field">Phone<input name="phone" type="tel" className="input" required autoComplete="off" /></label>
        <label className="field sm:col-span-2">Email (optional)<input name="email" type="email" className="input" autoComplete="off" /></label>
      </section>

      <section className="card grid grid-cols-1 gap-4 sm:grid-cols-2">
        <h2 className="font-serif text-xl sm:col-span-2">Class</h2>
        <label className="field">Class
          <select name="productId" className="input" value={productId} onChange={(e) => setProductId(e.target.value)}>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="field">Price
          <input key={selected.id} name="price" className="input" inputMode="decimal" defaultValue={selected.price} />
        </label>
        <label className="field sm:col-span-2">What they want to learn (optional)
          {selected.topics.length ? (
            <select key={selected.id} name="topic" className="input" defaultValue="">
              <option value="">Not sure yet</option>
              {selected.topics.map((t) => <option key={t}>{t}</option>)}
            </select>
          ) : (
            <input name="topic" className="input" />
          )}
        </label>
        <label className="field">Class date (optional)<input name="classDate" type="date" className="input" /></label>
        <label className="field">Start time (optional)<input name="classTime" type="time" className="input" /></label>
        <label className="field sm:col-span-2">Location (optional)<input name="classLocation" className="input" placeholder="e.g. Studio, or the student's address" /></label>
        <p className="text-sm text-mute sm:col-span-2">Leave the date empty if you still need to schedule it. You can set it later from the booking.</p>
      </section>

      <section className="card flex flex-col gap-3">
        <h2 className="font-serif text-xl">Payment</h2>
        <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
          <input type="radio" name="paid" value="yes" defaultChecked className="h-5 w-5 accent-pink" />
          Paid already (cash, Cash App, Zelle and so on)
        </label>
        <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
          <input type="radio" name="paid" value="no" className="h-5 w-5 accent-pink" />
          Not paid yet
        </label>
        <label className="field">Private notes (optional)<textarea name="adminNotes" rows={3} className="input" /></label>
      </section>

      {state?.error ? <p role="alert" className="text-sm font-semibold text-[#B3124F]">{state.error}</p> : null}
      <button className="btn btn-pink min-h-[52px] self-start px-8" disabled={pending}>{pending ? "Saving…" : "Add class booking"}</button>
    </form>
  );
}
