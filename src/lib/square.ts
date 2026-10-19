import { SquareClient, SquareEnvironment } from "square";

export const isSquareProduction = process.env.SQUARE_ENVIRONMENT === "production";

export function squareConfigured(): boolean {
  return Boolean(
    process.env.SQUARE_ACCESS_TOKEN &&
      process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID &&
      process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID,
  );
}

let client: SquareClient | null = null;

export function square(): SquareClient {
  if (!process.env.SQUARE_ACCESS_TOKEN) throw new Error("SQUARE_ACCESS_TOKEN is not set");
  client ??= new SquareClient({
    token: process.env.SQUARE_ACCESS_TOKEN,
    environment: isSquareProduction ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
  });
  return client;
}

export function squareLocationId(): string {
  const id = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID;
  if (!id) throw new Error("NEXT_PUBLIC_SQUARE_LOCATION_ID is not set");
  return id;
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
