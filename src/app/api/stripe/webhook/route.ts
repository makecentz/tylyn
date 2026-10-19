import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { settleStripeSession } from "@/lib/order-payment";
import { getPaymentSettings } from "@/lib/payment-settings";
import { stripe } from "@/lib/stripe";

/**
 * Stripe events, set up under Stripe Dashboard → Developers → Webhooks with this URL.
 * Confirms payments (including slower methods), drops abandoned checkouts and keeps refunds in sync.
 */
export async function POST(req: Request) {
  const settings = await getPaymentSettings();
  if (!settings.stripe.secretKey || !settings.stripe.webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe(settings).webhooks.constructEventAsync(raw, req.headers.get("stripe-signature") ?? "", settings.stripe.webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await settleStripeSession(event.data.object.id);
      break;
    case "checkout.session.async_payment_failed":
      await db.order.updateMany({ where: { stripeSessionId: event.data.object.id, paymentStatus: "PENDING" }, data: { paymentStatus: "FAILED" } });
      break;
    case "checkout.session.expired":
      // Never paid, so remove the placeholder order.
      await db.order.deleteMany({ where: { stripeSessionId: event.data.object.id, paymentStatus: "PENDING" } });
      break;
    case "charge.refunded": {
      const charge = event.data.object;
      const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      const order = pi ? await db.order.findUnique({ where: { stripePaymentIntentId: pi } }) : null;
      if (order) {
        const refunded = charge.amount_refunded;
        await db.order.update({
          where: { id: order.id },
          data: { refundedCents: refunded, paymentStatus: refunded >= order.totalCents ? "REFUNDED" : refunded > 0 ? "PARTIALLY_REFUNDED" : order.paymentStatus },
        });
      }
      break;
    }
  }
  return NextResponse.json({ received: true });
}
