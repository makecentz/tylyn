"use client";

import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { lineTotal, useCart } from "@/components/CartProvider";
import { LockIcon } from "@/components/icons";
import { formatCents } from "@/lib/money";

/* Minimal types for the parts of Square's Web Payments SDK used here. */
type TokenResult = { status: string; token?: string; errors?: { message: string }[] };
type SqCard = { attach(sel: string): Promise<void>; tokenize(details?: unknown): Promise<TokenResult>; destroy(): Promise<void> };
type SqWallet = { attach?(sel: string, opts?: unknown): Promise<void>; tokenize(): Promise<TokenResult>; destroy?(): Promise<void>; addEventListener?(ev: string, cb: (e: CustomEvent) => void): void };
type SqPaymentRequest = { update(opts: unknown): void };
type SqPayments = {
  card(): Promise<SqCard>;
  paymentRequest(opts: unknown): SqPaymentRequest;
  applePay(req: SqPaymentRequest): Promise<SqWallet>;
  googlePay(req: SqPaymentRequest): Promise<SqWallet>;
  cashAppPay(req: SqPaymentRequest, opts: unknown): Promise<SqWallet>;
};
declare global {
  interface Window {
    Square?: { payments(appId: string, locationId: string): SqPayments };
  }
}

type Props = {
  square: { configured: boolean; applicationId: string; locationId: string; production: boolean };
  taxPercent: number;
  shippingCents: number | null;
  pickupArea: string;
};

export function CheckoutForm({ square, taxPercent, shippingCents, pickupArea }: Props) {
  const router = useRouter();
  const cart = useCart();
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [card, setCard] = useState<SqCard | null>(null);
  const [wallets, setWallets] = useState<{ apple?: SqWallet; google?: SqWallet; cashApp?: SqWallet }>({});
  const paymentRequestRef = useRef<SqPaymentRequest | null>(null);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", note: "", address1: "", address2: "", city: "", state: "", zip: "" });
  const [fulfillment, setFulfillment] = useState<"PICKUP" | "SHIPPING">("PICKUP");
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const idempotencyKey = useRef<string>("");

  const onlyServices = cart.items.length > 0 && cart.items.every((i) => i.kind === "SERVICE");
  const shipping = fulfillment === "SHIPPING" && shippingCents !== null ? shippingCents : 0;
  const tax = Math.round((cart.subtotalCents * taxPercent) / 100);
  const total = cart.subtotalCents + tax + shipping;

  // Payment form setup runs once the SDK script and the cart are ready.
  useEffect(() => {
    if (!sdkLoaded || !square.configured || !cart.ready || cart.items.length === 0 || !window.Square) return;
    let cancelled = false;
    let cardInstance: SqCard | null = null;
    (async () => {
      try {
        const payments = window.Square!.payments(square.applicationId, square.locationId);
        cardInstance = await payments.card();
        if (cancelled) return;
        await cardInstance.attach("#card-container");
        setCard(cardInstance);

        const req = payments.paymentRequest({
          countryCode: "US",
          currencyCode: "USD",
          total: { amount: (total / 100).toFixed(2), label: "Tylyn Tingz Creations" },
        });
        paymentRequestRef.current = req;
        const found: typeof wallets = {};
        try {
          found.apple = await payments.applePay(req);
        } catch {
          // Apple Pay is only offered in Safari on Apple devices with a verified domain.
        }
        try {
          const g = await payments.googlePay(req);
          await g.attach?.("#google-pay-button", { buttonColor: "black", buttonSizeMode: "fill", buttonType: "long" });
          found.google = g;
        } catch {}
        try {
          const c = await payments.cashAppPay(req, { redirectURL: window.location.href, referenceId: `tt-${Date.now()}` });
          await c.attach?.("#cash-app-pay", { shape: "semiround", width: "full" });
          found.cashApp = c;
        } catch {}
        if (!cancelled) setWallets(found);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("The payment form couldn't load. Please refresh the page.");
      }
    })();
    return () => {
      cancelled = true;
      cardInstance?.destroy().catch(() => {});
    };
    // Re-create only when the SDK or cart readiness changes; totals are pushed via paymentRequest.update below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdkLoaded, square.configured, cart.ready, cart.items.length > 0]);

  useEffect(() => {
    paymentRequestRef.current?.update({ total: { amount: (total / 100).toFixed(2), label: "Tylyn Tingz Creations" } });
  }, [total]);

  const validate = useCallback((): string | null => {
    if (!form.firstName.trim() || !form.lastName.trim()) return "Please enter your first and last name.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return "Please enter a valid email so we can send your proof and receipt.";
    if (form.phone.replace(/\D/g, "").length < 10) return "Please enter a phone number we can text or call.";
    if (fulfillment === "SHIPPING" && (!form.address1 || !form.city || !form.state || !form.zip)) return "Please enter your full shipping address.";
    return null;
  }, [form, fulfillment]);

  const pay = useCallback(
    async (method: "card" | "apple" | "google" | "cashApp", presetToken?: string) => {
      setError(null);
      const problem = validate();
      if (problem) {
        setError(problem);
        return;
      }
      setPaying(true);
      try {
        let token = presetToken;
        if (!token) {
          const source = method === "card" ? card : wallets[method];
          if (!source) throw new Error("That payment method isn't ready yet.");
          const result =
            method === "card"
              ? await (source as SqCard).tokenize({
                  amount: (total / 100).toFixed(2),
                  currencyCode: "USD",
                  intent: "CHARGE",
                  customerInitiated: true,
                  sellerKeyedIn: false,
                  billingContact: { givenName: form.firstName, familyName: form.lastName, email: form.email, phone: form.phone },
                })
              : await source.tokenize();
          if (result.status !== "OK" || !result.token) {
            if (result.status === "Cancel") return;
            throw new Error(result.errors?.[0]?.message ?? "Your payment details couldn't be verified.");
          }
          token = result.token;
        }
        idempotencyKey.current ||= crypto.randomUUID();
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceId: token,
            idempotencyKey: idempotencyKey.current,
            expectedSubtotalCents: cart.subtotalCents,
            fulfillment,
            customer: { name: `${form.firstName.trim()} ${form.lastName.trim()}`, email: form.email.trim(), phone: form.phone.trim() },
            note: form.note.trim() || undefined,
            shippingAddress:
              fulfillment === "SHIPPING"
                ? { address1: form.address1, address2: form.address2, city: form.city, state: form.state, zip: form.zip }
                : undefined,
            items: cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity, customization: i.customization, addOns: i.addOns })),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          // A declined card can be retried with a new token, so start a fresh attempt.
          idempotencyKey.current = "";
          throw new Error(data.error ?? "Payment failed. Please try again.");
        }
        cart.clear();
        router.push(`/order/${data.orderId}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Payment failed. Please try again.");
      } finally {
        setPaying(false);
      }
    },
    [card, wallets, validate, total, form, fulfillment, cart, router],
  );

  // Cash App Pay finishes through an event instead of a click handler.
  useEffect(() => {
    const c = wallets.cashApp;
    if (!c?.addEventListener) return;
    c.addEventListener("ontokenization", (event: CustomEvent) => {
      const { tokenResult, error: err } = event.detail as { tokenResult?: TokenResult; error?: { message: string } };
      if (err) setError(err.message);
      else if (tokenResult?.status === "OK" && tokenResult.token) pay("cashApp", tokenResult.token);
    });
  }, [wallets.cashApp, pay]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  if (cart.ready && cart.items.length === 0) {
    return (
      <div className="mx-auto flex max-w-[1200px] flex-col items-start gap-4 px-4 py-20 sm:px-6">
        <h1 className="font-serif text-4xl">Checkout</h1>
        <p>Your cart is empty.</p>
        <Link href="/shop" className="btn btn-pink">Shop packages</Link>
      </div>
    );
  }

  return (
    <>
      {square.configured ? (
        <Script
          src={square.production ? "https://web.squarecdn.com/v1/square.js" : "https://sandbox.web.squarecdn.com/v1/square.js"}
          onReady={() => setSdkLoaded(true)}
        />
      ) : null}
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-start gap-10 px-4 pb-24 pt-10 sm:px-6">
        <form onSubmit={(e) => { e.preventDefault(); pay("card"); }} className="flex min-w-[min(100%,560px)] flex-[999] flex-col gap-6" noValidate>
          <h1 className="font-serif text-4xl">Checkout</h1>

          <section aria-labelledby="c1" className="card flex flex-col gap-4">
            <h2 id="c1" className="font-serif text-[22px]">1. Your details</h2>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <label className="field">First name<input className="input" autoComplete="given-name" value={form.firstName} onChange={set("firstName")} /></label>
              <label className="field">Last name<input className="input" autoComplete="family-name" value={form.lastName} onChange={set("lastName")} /></label>
              <label className="field">Email (for your proof and receipt)<input className="input" type="email" autoComplete="email" value={form.email} onChange={set("email")} /></label>
              <label className="field">Phone<input className="input" type="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} /></label>
            </div>
            <label className="field">Order notes (optional)<textarea className="input" rows={2} value={form.note} onChange={set("note")} /></label>
          </section>

          {!onlyServices ? (
            <section aria-labelledby="c2" className="card flex flex-col gap-4">
              <h2 id="c2" className="font-serif text-[22px]">2. Pickup or shipping</h2>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <label className={`flex min-h-16 items-center gap-3 rounded-xl border-2 px-4 font-semibold ${fulfillment === "PICKUP" ? "border-pink bg-blush" : "border-line"}`}>
                  <input type="radio" name="ful" checked={fulfillment === "PICKUP"} onChange={() => setFulfillment("PICKUP")} className="h-5 w-5 accent-pink" />
                  <span className="flex flex-col">Local pickup<span className="text-[13px] font-normal text-mute">Free{pickupArea ? ` · ${pickupArea}` : ""}</span></span>
                </label>
                {shippingCents !== null ? (
                  <label className={`flex min-h-16 items-center gap-3 rounded-xl border-2 px-4 font-semibold ${fulfillment === "SHIPPING" ? "border-pink bg-blush" : "border-line"}`}>
                    <input type="radio" name="ful" checked={fulfillment === "SHIPPING"} onChange={() => setFulfillment("SHIPPING")} className="h-5 w-5 accent-pink" />
                    <span className="flex flex-col">Ship to me<span className="text-[13px] font-normal text-mute">{formatCents(shippingCents)}</span></span>
                  </label>
                ) : null}
              </div>
              {fulfillment === "SHIPPING" ? (
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-6">
                  <label className="field sm:col-span-4">Street address<input className="input" autoComplete="address-line1" value={form.address1} onChange={set("address1")} /></label>
                  <label className="field sm:col-span-2">Apt, suite<input className="input" autoComplete="address-line2" value={form.address2} onChange={set("address2")} /></label>
                  <label className="field sm:col-span-3">City<input className="input" autoComplete="address-level2" value={form.city} onChange={set("city")} /></label>
                  <label className="field sm:col-span-1">State<input className="input" autoComplete="address-level1" maxLength={2} value={form.state} onChange={set("state")} /></label>
                  <label className="field sm:col-span-2">ZIP<input className="input" autoComplete="postal-code" value={form.zip} onChange={set("zip")} /></label>
                </div>
              ) : null}
            </section>
          ) : null}

          <section aria-labelledby="c3" className="card flex flex-col gap-4">
            <h2 id="c3" className="font-serif text-[22px]">{onlyServices ? "2" : "3"}. Payment</h2>
            {!square.configured ? (
              <p role="alert" className="rounded-xl bg-[#FFF1C7] p-4 text-sm text-[#5C4500]">
                Online payments aren&apos;t switched on yet. Please contact us to place your order.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {wallets.apple ? (
                    <button type="button" onClick={() => pay("apple")} disabled={paying} className="min-h-[50px] rounded-[10px] bg-black font-semibold text-white" aria-label="Pay with Apple Pay">
                      Apple Pay
                    </button>
                  ) : null}
                  <div id="google-pay-button" onClickCapture={(e) => { e.preventDefault(); pay("google"); }} className={wallets.google ? "min-h-[50px]" : "hidden"} />
                  <div id="cash-app-pay" className={wallets.cashApp ? "min-h-[50px]" : "hidden"} />
                </div>
                {wallets.apple || wallets.google || wallets.cashApp ? (
                  <div className="flex items-center gap-3 text-[13px] text-mute">
                    <span className="h-px flex-1 bg-line" />or pay with card<span className="h-px flex-1 bg-line" />
                  </div>
                ) : null}
                <div id="card-container" className="min-h-[90px]" />
              </>
            )}
            {error ? <p role="alert" className="rounded-lg bg-[#FFE3F1] px-3 py-2 text-sm text-[#8E0B50]">{error}</p> : null}
            <button type="submit" disabled={!square.configured || !card || paying} className="btn btn-pink min-h-14 text-[17px]">
              {paying ? "Processing…" : `Pay ${formatCents(total)}`}
            </button>
            <span className="flex items-center justify-center gap-1.5 text-xs text-mute">
              <LockIcon className="h-3.5 w-3.5" />
              Card details go straight to Square and never touch our servers.
            </span>
          </section>
        </form>

        <aside aria-labelledby="sum" className="flex min-w-[min(100%,320px)] flex-1 flex-col gap-4 rounded-[18px] bg-ink p-6 text-white">
          <h2 id="sum" className="font-serif text-2xl text-gold">Order summary</h2>
          {cart.items.map((item) => (
            <div key={item.key} className="flex gap-3.5">
              {item.image ? (
                <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-[10px]">
                  <Image src={item.image} alt="" fill sizes="72px" className="object-cover object-top" />
                </div>
              ) : null}
              <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
                <span className="flex justify-between gap-2 font-semibold"><span>{item.quantity} × {item.name}</span><span>{formatCents(lineTotal(item))}</span></span>
                {item.addOnDetails.map((a) => (
                  <span key={a.id} className="text-[13px] text-[#CFC6CB]">+ {a.quantity} × {a.name}</span>
                ))}
              </div>
            </div>
          ))}
          <div className="flex flex-col gap-2.5 border-t border-white/15 pt-4 text-sm">
            <span className="flex justify-between"><span className="text-[#CFC6CB]">Subtotal</span><span>{formatCents(cart.subtotalCents)}</span></span>
            {!onlyServices ? (
              <span className="flex justify-between"><span className="text-[#CFC6CB]">{fulfillment === "SHIPPING" ? "Shipping" : "Pickup"}</span><span>{shipping ? formatCents(shipping) : "Free"}</span></span>
            ) : null}
            {taxPercent ? <span className="flex justify-between"><span className="text-[#CFC6CB]">Sales tax ({taxPercent}%)</span><span>{formatCents(tax)}</span></span> : null}
          </div>
          <div className="flex items-baseline justify-between border-t border-gold/50 pt-4">
            <span className="font-semibold">Total</span>
            <span className="font-serif text-[32px] text-gold">{formatCents(total)}</span>
          </div>
        </aside>
      </div>
    </>
  );
}
