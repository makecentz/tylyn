"use client";

import { useActionState, useState } from "react";
import { refundOrder } from "../../../actions";

export function RefundForm({ orderId, maxCents }: { orderId: string; maxCents: number }) {
  const [state, action, pending] = useActionState(refundOrder, null);
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn min-h-11 border-[1.5px] border-[#B3124F] bg-white text-[#B3124F]">
        Refund through Square
      </button>
    );
  }
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Send this refund to the customer's card? This can't be undone.")) e.preventDefault();
      }}
      className="card flex flex-col gap-3 border-[1.5px] border-[#B3124F]"
    >
      <h2 className="font-serif text-xl">Refund</h2>
      <input type="hidden" name="id" value={orderId} />
      <label className="field">Amount (up to ${(maxCents / 100).toFixed(2)})
        <input name="amount" defaultValue={(maxCents / 100).toFixed(2)} className="input" inputMode="decimal" />
      </label>
      <label className="field">Reason (optional)<input name="reason" className="input" /></label>
      {state?.error ? <p role="alert" className="text-sm text-[#B3124F]">{state.error}</p> : null}
      {state?.ok ? <p role="status" className="text-sm font-semibold text-[#0F5132]">{state.ok}</p> : null}
      <div className="flex gap-2">
        <button disabled={pending} className="btn min-h-11 flex-1 bg-[#B3124F] text-white">{pending ? "Refunding…" : "Send refund"}</button>
        <button type="button" onClick={() => setOpen(false)} className="btn btn-outline min-h-11">Cancel</button>
      </div>
    </form>
  );
}
