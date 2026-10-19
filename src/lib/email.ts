import { Resend } from "resend";
import { formatCents } from "./money";
import type { Order, OrderItem, QuoteRequest } from "@prisma/client";

type OrderWithItems = Order & { items: OrderItem[] };

function itemsHtml(order: OrderWithItems) {
  return order.items
    .map((i) => {
      const custom = Object.entries(i.customization as Record<string, string>)
        .map(([k, v]) => `<div style="color:#555;font-size:13px">${escapeHtml(k)}: ${escapeHtml(v)}</div>`)
        .join("");
      const addOns = (i.addOns as { name: string; quantity: number }[])
        .map((a) => `<div style="color:#555;font-size:13px">+ ${a.quantity} × ${escapeHtml(a.name)}</div>`)
        .join("");
      return `<tr><td style="padding:8px 0"><strong>${i.quantity} × ${escapeHtml(i.productName)}</strong>${custom}${addOns}</td><td style="text-align:right;vertical-align:top;padding:8px 0">${formatCents(i.lineTotalCents)}</td></tr>`;
    })
    .join("");
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Sends the customer receipt and the owner alert. Silently skips when email isn't configured. */
export async function sendOrderEmails(order: OrderWithItems) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return;
  const resend = new Resend(key);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const body = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
      <h2 style="color:#C2106D">Thank you for your order!</h2>
      <p>Order #${order.number}. We'll email a design proof before we start making your items.</p>
      <table style="width:100%;border-collapse:collapse">${itemsHtml(order)}</table>
      <p style="text-align:right"><strong>Total: ${formatCents(order.totalCents)}</strong></p>
      ${order.receiptUrl ? `<p><a href="${order.receiptUrl}">View your Square receipt</a></p>` : ""}
    </div>`;
  try {
    await resend.emails.send({ from, to: order.email, subject: `Your Tylyn Tingz Creations order #${order.number}`, html: body });
    if (process.env.OWNER_NOTIFY_EMAIL) {
      await resend.emails.send({
        from,
        to: process.env.OWNER_NOTIFY_EMAIL,
        subject: `New order #${order.number} from ${order.customerName} (${formatCents(order.totalCents)})`,
        html: `${body}<p><a href="${site}/admin/orders/${order.id}">Open in admin</a></p>`,
      });
    }
  } catch (err) {
    console.error("Order email failed", err);
  }
}

/** Tells the owner about a new quote request. Silently skips when email isn't configured. */
export async function sendQuoteEmail(q: QuoteRequest) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const to = process.env.OWNER_NOTIFY_EMAIL;
  if (!key || !from || !to) return;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const rows = [
    ["Name", q.name],
    ["Email", q.email],
    ["Phone", q.phone],
    ["Event date", q.eventDate ? q.eventDate.toISOString().slice(0, 10) : "Not given"],
    ["Services", q.services.join(", ")],
    ["Guests", q.guestCount ? String(q.guestCount) : "Not given"],
    ["Details", q.details || "None"],
  ]
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#555;vertical-align:top">${k}</td><td style="padding:4px 0;white-space:pre-line">${escapeHtml(v)}</td></tr>`)
    .join("");
  try {
    await new Resend(key).emails.send({
      from,
      to,
      replyTo: q.email,
      subject: `New quote request from ${q.name}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h2 style="color:#C2106D">New quote request</h2><table>${rows}</table><p><a href="${site}/admin/quotes">Open quotes in admin</a></p></div>`,
    });
  } catch (err) {
    console.error("Quote email failed", err);
  }
}
