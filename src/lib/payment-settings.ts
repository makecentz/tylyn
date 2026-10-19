import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { db } from "./db";

/**
 * Payment processor settings, edited under Admin → Payments. Stored in SiteContent under a key the
 * public site never reads. Secret keys are encrypted with AUTH_SECRET; environment variables are the
 * fallback for anything not saved in the admin.
 */
const KEY = "system:payments";

export type Provider = "stripe" | "square";

type Stored = {
  provider?: Provider;
  taxPercent?: string;
  stripe?: { publishableKey?: string; secretKey?: string; webhookSecret?: string };
  square?: { environment?: "sandbox" | "production"; applicationId?: string; locationId?: string; accessToken?: string; webhookSignatureKey?: string };
};

export type PaymentSettings = {
  provider: Provider;
  taxPercent: number;
  stripe: { publishableKey: string; secretKey: string; webhookSecret: string };
  square: { production: boolean; applicationId: string; locationId: string; accessToken: string; webhookSignatureKey: string; webhookUrl: string };
};

/** Fields that hold secrets; they are encrypted at rest and never sent back to the browser. */
export const secretFields = ["stripe.secretKey", "stripe.webhookSecret", "square.accessToken", "square.webhookSignatureKey"] as const;

function cipherKey() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET must be set");
  return createHash("sha256").update(`payments:${s}`).digest();
}

export function encryptSecret(plain: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", cipherKey(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return `v1:${iv.toString("base64")}:${c.getAuthTag().toString("base64")}:${enc.toString("base64")}`;
}

function decryptSecret(value: string | undefined): string {
  if (!value) return "";
  const [v, iv, tag, data] = value.split(":");
  if (v !== "v1" || !iv || !tag || !data) return "";
  try {
    const d = createDecipheriv("aes-256-gcm", cipherKey(), Buffer.from(iv, "base64"));
    d.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([d.update(Buffer.from(data, "base64")), d.final()]).toString("utf8");
  } catch {
    // AUTH_SECRET changed since the key was saved; treat it as not set so the admin can re-enter it.
    return "";
  }
}

export async function readStoredPayments(): Promise<Stored> {
  const row = await db.siteContent.findUnique({ where: { key: KEY } });
  return (row?.value as Stored | null) ?? {};
}

export async function writeStoredPayments(value: Stored) {
  await db.siteContent.upsert({ where: { key: KEY }, create: { key: KEY, value }, update: { value } });
}

export const getPaymentSettings = cache(async (): Promise<PaymentSettings> => {
  const s = await readStoredPayments();
  const env = process.env;
  const tax = parseFloat(s.taxPercent || env.SALES_TAX_PERCENT || "0");
  return {
    provider: s.provider ?? (env.PAYMENT_PROVIDER === "square" ? "square" : "stripe"),
    taxPercent: Number.isFinite(tax) && tax >= 0 && tax < 100 ? tax : 0,
    stripe: {
      publishableKey: s.stripe?.publishableKey || env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
      secretKey: decryptSecret(s.stripe?.secretKey) || env.STRIPE_SECRET_KEY || "",
      webhookSecret: decryptSecret(s.stripe?.webhookSecret) || env.STRIPE_WEBHOOK_SECRET || "",
    },
    square: {
      production: (s.square?.environment ?? env.SQUARE_ENVIRONMENT) === "production",
      applicationId: s.square?.applicationId || env.NEXT_PUBLIC_SQUARE_APPLICATION_ID || "",
      locationId: s.square?.locationId || env.NEXT_PUBLIC_SQUARE_LOCATION_ID || "",
      accessToken: decryptSecret(s.square?.accessToken) || env.SQUARE_ACCESS_TOKEN || "",
      webhookSignatureKey: decryptSecret(s.square?.webhookSignatureKey) || env.SQUARE_WEBHOOK_SIGNATURE_KEY || "",
      webhookUrl: env.SQUARE_WEBHOOK_URL || `${siteUrl()}/api/square/webhook`,
    },
  };
});

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://tylyn.vercel.app").replace(/\/$/, "");
}

export function stripeReady(s: PaymentSettings) {
  return Boolean(s.stripe.secretKey);
}

export function squareReady(s: PaymentSettings) {
  return Boolean(s.square.accessToken && s.square.applicationId && s.square.locationId);
}

/** Whether the selected processor has what it needs to take payments. */
export function paymentsReady(s: PaymentSettings) {
  return s.provider === "stripe" ? stripeReady(s) : squareReady(s);
}

/** Test mode is what the shop shows a "test payments" note for. */
export function testMode(s: PaymentSettings) {
  return s.provider === "stripe" ? s.stripe.secretKey.startsWith("sk_test_") : !s.square.production;
}
