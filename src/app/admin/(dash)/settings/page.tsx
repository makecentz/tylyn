import { isSquareProduction, squareConfigured } from "@/lib/square";
import { PageTitle } from "../admin-ui";

function Row({ ok, label, help }: { ok: boolean; label: string; help: string }) {
  return (
    <li className="flex items-start gap-3 border-b border-line py-3 last:border-0">
      <span className={`mt-0.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${ok ? "bg-[#D9F5E6] text-[#0F5132]" : "bg-[#FFF1C7] text-[#5C4500]"}`}>{ok ? "Ready" : "Not set"}</span>
      <span className="flex flex-col">
        <span className="font-semibold">{label}</span>
        <span className="text-sm text-mute">{help}</span>
      </span>
    </li>
  );
}

export default function SettingsPage() {
  const env = process.env;
  return (
    <>
      <PageTitle>Settings and Square</PageTitle>
      <div className="card max-w-3xl">
        <p className="mb-3 text-sm text-mute">These are set as environment variables in your hosting dashboard (Vercel → Project → Settings → Environment Variables). See the README for step-by-step setup.</p>
        <ul>
          <Row ok={squareConfigured()} label={`Square payments (${isSquareProduction ? "live" : "sandbox test mode"})`} help="SQUARE_ACCESS_TOKEN, NEXT_PUBLIC_SQUARE_APPLICATION_ID, NEXT_PUBLIC_SQUARE_LOCATION_ID, SQUARE_ENVIRONMENT" />
          <Row ok={Boolean(env.SQUARE_WEBHOOK_SIGNATURE_KEY && env.SQUARE_WEBHOOK_URL)} label="Square webhook (keeps refunds made in Square in sync)" help="SQUARE_WEBHOOK_SIGNATURE_KEY and SQUARE_WEBHOOK_URL" />
          <Row ok={Boolean(env.BLOB_READ_WRITE_TOKEN)} label="Photo uploads" help="BLOB_READ_WRITE_TOKEN from a Vercel Blob store" />
          <Row ok={Boolean(env.RESEND_API_KEY && env.EMAIL_FROM)} label="Order emails" help="RESEND_API_KEY, EMAIL_FROM and OWNER_NOTIFY_EMAIL" />
          <Row ok={Boolean(env.SALES_TAX_PERCENT)} label={`Sales tax${env.SALES_TAX_PERCENT ? ` (${env.SALES_TAX_PERCENT}%)` : ""}`} help="SALES_TAX_PERCENT, leave empty for no tax" />
        </ul>
      </div>
    </>
  );
}
