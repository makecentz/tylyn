import { NextResponse, type NextRequest } from "next/server";
import { cookieForCustomer } from "@/lib/customer-auth";
import { settleStripeSession } from "@/lib/order-payment";

/** Where Stripe sends the shopper after paying: settle the order, sign in a new account, show the confirmation. */
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id") ?? "";
  if (!sessionId.startsWith("cs_")) return NextResponse.redirect(new URL("/cart", req.url), 303);
  let result: Awaited<ReturnType<typeof settleStripeSession>> = null;
  try {
    result = await settleStripeSession(sessionId);
  } catch (e) {
    console.error("Couldn't confirm the Stripe payment", e);
  }
  if (!result) return NextResponse.redirect(new URL("/checkout?canceled=1", req.url), 303);
  const res = NextResponse.redirect(new URL(`/order/${result.orderId}`, req.url), 303);
  if (result.customerId) res.cookies.set(await cookieForCustomer(result.customerId));
  return res;
}
