"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Stripe from "stripe";
import { requireAdmin } from "@/lib/auth";
import { encryptSecret, readStoredPayments, writeStoredPayments, type Provider } from "@/lib/payment-settings";

function back(params: Record<string, string>): never {
  redirect(`/admin/payments?${new URLSearchParams(params)}`);
}

export async function savePaymentSettings(formData: FormData) {
  await requireAdmin();
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const stored = await readStoredPayments();

  const provider: Provider = get("provider") === "square" ? "square" : "stripe";
  const taxPercent = get("taxPercent").replace("%", "");
  if (taxPercent && !(Number(taxPercent) >= 0 && Number(taxPercent) < 100)) back({ error: "tax" });

  // A blank secret field keeps the saved key; "Remove" clears it.
  const secret = (field: string, current: string | undefined) => {
    if (formData.get(`${field}_clear`) === "on") return undefined;
    const v = get(field);
    return v ? encryptSecret(v) : current;
  };

  const publishableKey = get("stripePublishableKey");
  const stripeSecret = get("stripeSecretKey");
  if (publishableKey && !publishableKey.startsWith("pk_")) back({ error: "pk" });
  if (stripeSecret && !/^(sk|rk)_/.test(stripeSecret)) back({ error: "sk" });
  if (stripeSecret && publishableKey && stripeSecret.includes("_test_") !== publishableKey.includes("_test_")) back({ error: "mode" });
  if (stripeSecret) {
    // Check the key works before saving it, so a typo can't break checkout.
    try {
      await new Stripe(stripeSecret).balance.retrieve();
    } catch {
      back({ error: "sk-invalid" });
    }
  }
  const webhookSecret = get("stripeWebhookSecret");
  if (webhookSecret && !webhookSecret.startsWith("whsec_")) back({ error: "whsec" });

  await writeStoredPayments({
    provider,
    taxPercent,
    stripe: {
      publishableKey: publishableKey || stored.stripe?.publishableKey,
      secretKey: secret("stripeSecretKey", stored.stripe?.secretKey),
      webhookSecret: secret("stripeWebhookSecret", stored.stripe?.webhookSecret),
    },
    square: {
      environment: get("squareEnvironment") === "production" ? "production" : "sandbox",
      applicationId: get("squareApplicationId") || undefined,
      locationId: get("squareLocationId") || undefined,
      accessToken: secret("squareAccessToken", stored.square?.accessToken),
      webhookSignatureKey: secret("squareWebhookSignatureKey", stored.square?.webhookSignatureKey),
    },
  });
  revalidatePath("/", "layout");
  back({ saved: "1" });
}
