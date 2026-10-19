import { SquareClient, SquareEnvironment } from "square";
import type { PaymentSettings } from "./payment-settings";

const clients = new Map<string, SquareClient>();

export function square(settings: PaymentSettings): SquareClient {
  const { accessToken, production } = settings.square;
  if (!accessToken) throw new Error("Square isn't set up");
  const cacheKey = `${production}:${accessToken}`;
  let client = clients.get(cacheKey);
  if (!client) {
    client = new SquareClient({ token: accessToken, environment: production ? SquareEnvironment.Production : SquareEnvironment.Sandbox });
    clients.set(cacheKey, client);
  }
  return client;
}

export function money(cents: number) {
  return { amount: BigInt(cents), currency: "USD" as const };
}

/** Pulls a readable message out of a Square API error. */
export function squareErrorMessage(err: unknown): string {
  const e = err as { errors?: { detail?: string; code?: string }[]; message?: string };
  const first = e?.errors?.[0];
  if (first?.code === "CARD_DECLINED" || first?.code === "GENERIC_DECLINE") return "Your card was declined. Please try another card.";
  if (first?.code === "CVV_FAILURE") return "The card's security code didn't match. Please check it and try again.";
  if (first?.code === "ADDRESS_VERIFICATION_FAILURE") return "The ZIP code didn't match the card. Please check it and try again.";
  if (first?.code === "INSUFFICIENT_FUNDS") return "The card has insufficient funds.";
  return first?.detail ?? e?.message ?? "Payment failed. Please try again.";
}
