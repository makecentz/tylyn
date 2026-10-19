import Stripe from "stripe";
import type { PaymentSettings } from "./payment-settings";

const clients = new Map<string, Stripe>();

export function stripe(settings: PaymentSettings): Stripe {
  const key = settings.stripe.secretKey;
  if (!key) throw new Error("Stripe isn't set up");
  let client = clients.get(key);
  if (!client) {
    client = new Stripe(key, { appInfo: { name: "Tylyn Tingz Creations" } });
    clients.set(key, client);
  }
  return client;
}

export function stripeErrorMessage(err: unknown): string {
  const e = err as { type?: string; message?: string };
  if (e?.type === "StripeAuthenticationError") return "Online payments aren't set up correctly. Please contact us to place your order.";
  return e?.message ?? "Payment failed. Please try again.";
}
