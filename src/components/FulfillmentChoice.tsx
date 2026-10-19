"use client";

import type { Fulfillment } from "./CartProvider";
import { formatCents } from "@/lib/money";

export type ShippingOptions = { shippingCents: number | null; pickupArea: string; pickupNote: string; shippingNote: string };

/** Local pickup or shipping, as two big radio cards. */
export function FulfillmentChoice({ options, value, onChange, dark }: { options: ShippingOptions; value: Fulfillment; onChange: (f: Fulfillment) => void; dark?: boolean }) {
  const choices = [
    {
      id: "PICKUP" as const,
      title: "Local pickup",
      price: "Free",
      note: [options.pickupArea, options.pickupNote].filter(Boolean).join(" · "),
    },
    ...(options.shippingCents !== null
      ? [{ id: "SHIPPING" as const, title: "Ship to me", price: formatCents(options.shippingCents), note: options.shippingNote }]
      : []),
  ];
  return (
    <fieldset className="flex flex-col gap-2.5">
      <legend className={`mb-2.5 text-sm font-semibold ${dark ? "text-white" : ""}`}>How do you want to get your order?</legend>
      {choices.map((c) => {
        const on = value === c.id;
        return (
          <label
            key={c.id}
            className={`flex min-h-16 cursor-pointer items-start gap-3 rounded-xl border-2 px-4 py-3 ${
              on ? (dark ? "border-pink bg-white/10" : "border-pink bg-blush") : dark ? "border-white/20" : "border-line bg-white"
            }`}
          >
            <input type="radio" name="fulfillment" value={c.id} checked={on} onChange={() => onChange(c.id)} className="mt-0.5 h-5 w-5 shrink-0 accent-pink" />
            <span className="flex flex-1 flex-col gap-0.5">
              <span className="flex justify-between gap-2 font-semibold">
                {c.title}
                <span className={dark ? "text-gold" : "text-pink-deep"}>{c.price}</span>
              </span>
              {c.note ? <span className={`text-[13px] ${dark ? "text-[#CFC6CB]" : "text-mute"}`}>{c.note}</span> : null}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
