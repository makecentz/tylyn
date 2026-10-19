import { getPaymentSettings, readStoredPayments, siteUrl, squareReady, stripeReady } from "@/lib/payment-settings";
import { savePaymentSettings } from "../../payment-actions";
import { Flash, PageTitle } from "../admin-ui";

const errors: Record<string, string> = {
  tax: "Enter the sales tax as a number between 0 and 99, like 6 or 8.25.",
  pk: "The Stripe publishable key should start with pk_live_ or pk_test_.",
  sk: "The Stripe secret key should start with sk_live_ or sk_test_ (or rk_ for a restricted key).",
  mode: "One Stripe key is a test key and the other is live. Use both test keys or both live keys.",
  "sk-invalid": "Stripe didn't accept that secret key. Copy it again from Stripe → Developers → API keys. Nothing was saved.",
  whsec: "The Stripe webhook signing secret should start with whsec_.",
};

function mask(value: string) {
  return value ? `${value.slice(0, value.indexOf("_", 3) + 1)}…${value.slice(-4)}` : "";
}

function Status({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${ok ? "bg-[#D9F5E6] text-[#0F5132]" : "bg-[#FFF1C7] text-[#5C4500]"}`}>{children}</span>
  );
}

function Secret({ name, label, saved, help }: { name: string; label: string; saved: string; help?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="field">
        {label}
        {help ? <span className="text-xs font-normal text-mute">{help}</span> : null}
        <input name={name} type="password" autoComplete="off" spellCheck={false} className="input font-mono text-sm" placeholder={saved ? `Saved (${mask(saved)}). Leave blank to keep it.` : "Paste the key"} />
      </label>
      {saved ? (
        <label className="flex items-center gap-2 text-xs text-mute">
          <input type="checkbox" name={`${name}_clear`} className="h-4 w-4 accent-pink" /> Remove the saved key
        </label>
      ) : null}
    </div>
  );
}

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { saved, error } = await searchParams;
  const [s, stored] = await Promise.all([getPaymentSettings(), readStoredPayments()]);
  const stripeLive = s.stripe.secretKey.startsWith("sk_live_") || s.stripe.secretKey.startsWith("rk_live_");
  const webhookUrl = `${siteUrl()}/api/stripe/webhook`;

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <PageTitle>Payments</PageTitle>
      <Flash message={saved ? "Payment settings saved. Checkout uses them right away." : undefined} />
      {error ? <p role="alert" className="rounded-xl bg-[#FFE3F1] px-4 py-3 text-sm font-semibold text-[#8E0B50]">{errors[error] ?? "Couldn't save. Please try again."}</p> : null}

      <form action={savePaymentSettings} className="flex flex-col gap-5">
        <section className="card flex flex-col gap-4 border-t-4 border-pink">
          <h2 className="font-serif text-xl">Payment processor</h2>
          <p className="-mt-2 text-sm text-mute">Checkout uses the processor you pick here. Past orders keep refunding through the processor they were paid with.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {([
              ["stripe", "Stripe", "Cards, Apple Pay, Google Pay, Klarna and more on Stripe's checkout page", stripeReady(s)],
              ["square", "Square", "Cards, Apple Pay, Google Pay and Cash App Pay on this site", squareReady(s)],
            ] as const).map(([value, title, body, ready]) => (
              <label key={value} className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-line p-4 has-[:checked]:border-pink has-[:checked]:bg-blush">
                <input type="radio" name="provider" value={value} defaultChecked={s.provider === value} className="mt-1 h-5 w-5 accent-pink" />
                <span className="flex flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2 font-semibold">{title}<Status ok={ready}>{ready ? "Keys added" : "Needs keys"}</Status></span>
                  <span className="text-sm text-mute">{body}</span>
                </span>
              </label>
            ))}
          </div>
          <label className="field max-w-[220px]">Sales tax (%)
            <input name="taxPercent" inputMode="decimal" defaultValue={stored.taxPercent ?? (s.taxPercent ? String(s.taxPercent) : "")} placeholder="0" className="input" />
          </label>
        </section>

        <section className="card flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-serif text-xl">Stripe</h2>
            {stripeReady(s) ? <Status ok>{stripeLive ? "Live mode" : "Test mode"}</Status> : <Status ok={false}>Not set up</Status>}
          </div>
          <p className="-mt-2 text-sm text-mute">
            Find these in the Stripe Dashboard under Developers → API keys. Turn on Klarna, Afterpay, Cash App Pay and wallets under Settings → Payment methods; checkout shows whatever is turned on there.
          </p>
          <label className="field">Publishable key
            <input name="stripePublishableKey" autoComplete="off" spellCheck={false} defaultValue={s.stripe.publishableKey} placeholder="pk_live_…" className="input font-mono text-sm" />
          </label>
          <Secret name="stripeSecretKey" label="Secret key" saved={s.stripe.secretKey} help="Checked with Stripe before it's saved." />
          <div className="flex flex-col gap-2 rounded-xl bg-blush p-4 text-sm">
            <span className="font-semibold">Webhook</span>
            <span>In Stripe → Developers → Webhooks, add an endpoint with this URL:</span>
            <code className="select-all break-all rounded-lg bg-white px-3 py-2 font-mono text-[13px]">{webhookUrl}</code>
            <span>Send these events: <code className="font-mono text-[13px]">checkout.session.completed</code>, <code className="font-mono text-[13px]">checkout.session.async_payment_succeeded</code>, <code className="font-mono text-[13px]">checkout.session.async_payment_failed</code>, <code className="font-mono text-[13px]">checkout.session.expired</code> and <code className="font-mono text-[13px]">charge.refunded</code>. Then paste its signing secret below.</span>
          </div>
          <Secret name="stripeWebhookSecret" label="Webhook signing secret" saved={s.stripe.webhookSecret} />
        </section>

        <details className="card flex flex-col gap-4" open={s.provider === "square"}>
          <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
            <span className="font-serif text-xl">Square</span>
            {squareReady(s) ? <Status ok>{s.square.production ? "Live mode" : "Sandbox"}</Status> : <Status ok={false}>Not set up</Status>}
          </summary>
          <div className="mt-4 flex flex-col gap-4">
            <p className="text-sm text-mute">From the Square Developer Dashboard: your app&apos;s Credentials page and the Locations page.</p>
            <label className="field max-w-[260px]">Environment
              <select name="squareEnvironment" defaultValue={s.square.production ? "production" : "sandbox"} className="input">
                <option value="sandbox">Sandbox (test payments)</option>
                <option value="production">Production (live payments)</option>
              </select>
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="field">Application ID<input name="squareApplicationId" autoComplete="off" defaultValue={stored.square?.applicationId ?? s.square.applicationId} className="input font-mono text-sm" /></label>
              <label className="field">Location ID<input name="squareLocationId" autoComplete="off" defaultValue={stored.square?.locationId ?? s.square.locationId} className="input font-mono text-sm" /></label>
            </div>
            <Secret name="squareAccessToken" label="Access token" saved={s.square.accessToken} />
            <Secret name="squareWebhookSignatureKey" label="Webhook signature key" saved={s.square.webhookSignatureKey} help={`For refunds made in Square. Webhook URL: ${s.square.webhookUrl}`} />
          </div>
        </details>

        <button className="btn btn-pink min-h-[52px] self-start px-10">Save payment settings</button>
        <p className="text-xs text-mute">Secret keys are encrypted before they&apos;re stored and are never shown again in full. Values set as environment variables in Vercel are used when nothing is saved here.</p>
      </form>
    </div>
  );
}
