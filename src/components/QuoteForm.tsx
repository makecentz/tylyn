"use client";

import { useState } from "react";

function localToday() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export function QuoteForm({ services, defaultService }: { services: string[]; defaultService?: string }) {
  const [picked, setPicked] = useState<string[]>(defaultService && services.includes(defaultService) ? [defaultService] : []);
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  function toggle(s: string) {
    setPicked((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (picked.length === 0) {
      setError("Pick at least one service.");
      return;
    }
    const f = new FormData(e.currentTarget);
    const guests = String(f.get("guestCount") ?? "").trim();
    setStatus("sending");
    setError(null);
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.get("name"),
          email: f.get("email"),
          phone: f.get("phone"),
          eventDate: f.get("eventDate"),
          services: picked,
          guestCount: guests ? Number(guests) : null,
          details: f.get("details") ?? "",
          website: f.get("website") ?? "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
      setStatus("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStatus("idle");
    }
  }

  if (status === "sent") {
    return (
      <div role="status" className="card flex flex-col items-center gap-3 border-t-4 border-pink py-12 text-center">
        <span className="font-script text-4xl text-pink-deep">Thank you!</span>
        <p className="max-w-sm text-[#4A3F45]">We got your quote request and will reach out within 1 to 2 business days with pricing and next steps.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card flex flex-col gap-4 border-t-4 border-pink text-ink">
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <label className="field">Your name<input name="name" required autoComplete="name" className="input" /></label>
        <label className="field">Phone<input name="phone" type="tel" required autoComplete="tel" className="input" /></label>
        <label className="field sm:col-span-2">Email<input name="email" type="email" required autoComplete="email" className="input" /></label>
        <label className="field">Event date<input name="eventDate" type="date" required min={localToday()} className="input" /></label>
        <label className="field">Number of guests <span className="font-normal text-mute">(optional)</span><input name="guestCount" type="number" min={1} max={10000} inputMode="numeric" className="input" /></label>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold">What are you interested in?</legend>
        <div className="flex flex-wrap gap-2">
          {services.map((s) => {
            const on = picked.includes(s);
            return (
              <label
                key={s}
                className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-[1.5px] px-4 text-sm font-semibold transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-pink ${
                  on ? "border-pink bg-pink text-white" : "border-line bg-white text-ink hover:border-pink"
                }`}
              >
                <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle(s)} />
                {on ? "✓ " : ""}
                {s}
              </label>
            );
          })}
        </div>
      </fieldset>

      <label className="field">Tell us about your event <span className="font-normal text-mute">(theme, colors, names, anything else)</span>
        <textarea name="details" rows={4} maxLength={5000} className="input" />
      </label>
      {/* Hidden from people; catches form-filling bots */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

      {error ? <p role="alert" className="text-sm font-semibold text-[#B3124F]">{error}</p> : null}
      <button className="btn btn-pink min-h-[52px]" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Request my quote"}
      </button>
    </form>
  );
}
