import { NextResponse } from "next/server";
import { WebhooksHelper } from "square";
import { db } from "@/lib/db";

/**
 * Keeps payment status in sync when a payment or refund changes in Square
 * (for example a refund issued from the Square Dashboard).
 * Subscribe to payment.updated in the Square Developer portal; it carries refunded amounts too.
 */
export async function POST(req: Request) {
  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  const notificationUrl = process.env.SQUARE_WEBHOOK_URL;
  if (!signatureKey || !notificationUrl) return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });

  const raw = await req.text();
  const valid = await WebhooksHelper.verifySignature({
    requestBody: raw,
    signatureHeader: req.headers.get("x-square-hmacsha256-signature") ?? "",
    signatureKey,
    notificationUrl,
  });
  if (!valid) return NextResponse.json({ error: "Invalid signature" }, { status: 403 });

  const event = JSON.parse(raw) as {
    type?: string;
    data?: { object?: { payment?: { id: string; status: string; refunded_money?: { amount: number } }; refund?: { payment_id: string; status: string } } };
  };

  if (event.type === "payment.updated" && event.data?.object?.payment) {
    const p = event.data.object.payment;
    const order = await db.order.findUnique({ where: { squarePaymentId: p.id } });
    if (order) {
      const refunded = p.refunded_money?.amount ?? 0;
      await db.order.update({
        where: { id: order.id },
        data: {
          refundedCents: refunded,
          paymentStatus:
            p.status === "FAILED" || p.status === "CANCELED"
              ? "FAILED"
              : refunded >= order.totalCents
                ? "REFUNDED"
                : refunded > 0
                  ? "PARTIALLY_REFUNDED"
                  : order.paymentStatus,
        },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
