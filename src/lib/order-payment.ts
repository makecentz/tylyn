import type Stripe from "stripe";
import { db } from "./db";
import { sendOrderEmails } from "./email";
import { getPaymentSettings } from "./payment-settings";
import { stripe } from "./stripe";

/**
 * Creates the shopper's account from the password they chose at checkout and links the order to it.
 * Returns the new customer's id, or null when there was nothing to do or the email already has an account.
 */
export async function createPendingAccount(orderId: string): Promise<string | null> {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order?.pendingAccountHash || order.customerId) return null;
  try {
    const customer = await db.customer.create({
      data: {
        email: order.email,
        name: order.customerName,
        phone: order.phone,
        address: order.shippingAddress ?? undefined,
        passwordHash: order.pendingAccountHash,
        orders: { connect: { id: order.id } },
      },
    });
    await db.order.update({ where: { id: order.id }, data: { pendingAccountHash: null } });
    return customer.id;
  } catch (e) {
    // Most likely the email signed up some other way in the meantime.
    console.error("Couldn't create the buyer's account", e);
    await db.order.update({ where: { id: order.id }, data: { pendingAccountHash: null } });
    return null;
  }
}

/**
 * Marks a Stripe Checkout order paid once Stripe says the money is in. Safe to call more than once
 * (from the return page and from the webhook); only the first call sends the emails.
 * Returns the order id and whether this call created an account.
 */
export async function settleStripeSession(sessionId: string): Promise<{ orderId: string; paid: boolean; customerId: string | null } | null> {
  const settings = await getPaymentSettings();
  const session = await stripe(settings).checkout.sessions.retrieve(sessionId, { expand: ["payment_intent.latest_charge"] });
  const orderId = session.metadata?.orderId;
  if (!orderId) return null;
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || order.stripeSessionId !== session.id) return null;

  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
    return { orderId, paid: order.paymentStatus === "PAID", customerId: null };
  }

  const pi = session.payment_intent as Stripe.PaymentIntent | null;
  const charge = pi?.latest_charge as Stripe.Charge | null | undefined;
  const total = session.amount_total ?? order.totalCents;
  // Only one caller wins this update, so emails go out once.
  const won = await db.order.updateMany({
    where: { id: orderId, paymentStatus: "PENDING" },
    data: {
      paymentStatus: "PAID",
      stripePaymentIntentId: pi?.id ?? null,
      receiptUrl: charge?.receipt_url ?? null,
      totalCents: total,
    },
  });
  let customerId: string | null = null;
  if (won.count === 1) {
    customerId = await createPendingAccount(orderId);
    const paid = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (paid) await sendOrderEmails(paid);
  }
  return { orderId, paid: true, customerId };
}
