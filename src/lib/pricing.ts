import { getAllContent } from "./content";
import { db } from "./db";
import { getPaymentSettings } from "./payment-settings";
import { openSessions } from "./class-sessions";
import { formatSession } from "./classes";
import { MAX_FAVOR_QTY, parseCustomFields, parseFavors, parseSessionValue, sessionValue, type ClassSession } from "./custom-fields";
import type { CartItem } from "./cart-types";
import type { ProductKind } from "@prisma/client";

export type PricedLine = {
  productId: string;
  productName: string;
  kind: ProductKind;
  unitPriceCents: number;
  quantity: number;
  customization: Record<string, string>; // label -> answer
  addOns: { name: string; priceCents: number; quantity: number }[];
  lineTotalCents: number;
  // The class date and time the shopper picked, for products that offer set sessions
  session?: ClassSession;
};

export class PricingError extends Error {}

/** The flat shipping rate set under Site content, or null when the shop is pickup only. */
export async function shippingRateCents(): Promise<number | null> {
  const { shipping } = await getAllContent();
  if (!shipping.offerShipping) return null;
  const v = parseFloat(String(shipping.flatRate).replace(/[$,\s]/g, ""));
  return Number.isFinite(v) && v >= 0 ? Math.round(v * 100) : null;
}

/** Re-prices a cart from the database. Never trust prices sent by the browser. */
export async function priceCart(items: CartItem[], fulfillment: "PICKUP" | "SHIPPING" = "PICKUP") {
  if (items.length === 0) throw new PricingError("Your cart is empty.");
  const products = await db.product.findMany({
    where: { id: { in: items.map((i) => i.productId) } },
    include: { addOns: true },
  });

  const lines: PricedLine[] = await Promise.all(items.map(async (item) => {
    const product = products.find((p) => p.id === item.productId);
    if (!product || !product.active || !product.onlineCheckout) {
      throw new PricingError("An item in your cart is no longer available. Please remove it and try again.");
    }
    const fields = parseCustomFields(product.customFields);
    const customization: Record<string, string> = {};
    let favorsCents = 0;
    let session: ClassSession | undefined;
    for (const field of fields) {
      const answer = (item.customization[field.key] ?? "").trim();
      if (field.required && !answer) throw new PricingError(`"${field.label}" is required for ${product.name}.`);
      if (field.type === "session" && answer) {
        const picked = parseSessionValue(answer);
        const offered = picked && (field.sessions ?? []).some((s) => sessionValue(s) === sessionValue(picked));
        if (!picked || !offered) throw new PricingError(`That class time for ${product.name} isn't offered anymore. Please pick another.`);
        const open = await openSessions(product.id, field.sessions ?? []);
        if (!open.some((s) => sessionValue(s) === answer)) {
          throw new PricingError(`Sorry, ${formatSession(picked)} was just booked. Please pick another time for ${product.name}.`);
        }
        if (item.quantity !== 1) throw new PricingError(`Each ${product.name} time can be booked once.`);
        session = picked;
        customization[field.label] = formatSession(picked);
        continue;
      }
      if (field.type === "favors" && answer) {
        const picks = parseFavors(answer);
        if (!picks) throw new PricingError(`Please choose your ${field.label.toLowerCase()} again.`);
        const min = field.minQty ?? 1;
        for (const pick of picks) {
          const option = field.items?.find((o) => o.name === pick.name);
          if (!option) throw new PricingError(`"${pick.name}" is no longer offered. Please update ${product.name}.`);
          if (option.priceCents === null) throw new PricingError(`"${pick.name}" isn't priced yet. Please request a quote for ${product.name}.`);
          if (pick.quantity < min || pick.quantity > MAX_FAVOR_QTY) throw new PricingError(`Please order between ${min} and ${MAX_FAVOR_QTY} ${pick.name}.`);
          favorsCents += option.priceCents * pick.quantity;
        }
      }
      if (field.type === "select" && answer && field.options && !field.options.includes(answer)) {
        throw new PricingError(`Please choose a valid option for "${field.label}".`);
      }
      if (answer) customization[field.label] = answer;
    }
    const addOns = item.addOns.map((a) => {
      const addOn = product.addOns.find((x) => x.id === a.id && x.active);
      if (!addOn) throw new PricingError(`An add-on for ${product.name} is no longer available.`);
      return { name: addOn.name, priceCents: addOn.priceCents, quantity: a.quantity };
    });
    const addOnTotal = addOns.reduce((s, a) => s + a.priceCents * a.quantity, 0);
    const unitPriceCents = product.priceCents + favorsCents;
    if (unitPriceCents <= 0) throw new PricingError(`Please choose what you'd like in ${product.name}.`);
    return {
      productId: product.id,
      productName: product.name,
      kind: product.kind,
      unitPriceCents,
      quantity: item.quantity,
      customization,
      addOns,
      lineTotalCents: unitPriceCents * item.quantity + addOnTotal,
      session,
    };
  }));
  if (lines.filter((l) => l.session).length > 1) throw new PricingError("Please book one class per checkout.");

  const subtotalCents = lines.reduce((s, l) => s + l.lineTotalCents, 0);
  const { taxPercent } = await getPaymentSettings();
  const taxCents = Math.round((subtotalCents * taxPercent) / 100);
  let shippingCents = 0;
  if (fulfillment === "SHIPPING") {
    const rate = await shippingRateCents();
    if (rate === null) throw new PricingError("Shipping isn't available right now. Please choose pickup.");
    shippingCents = rate;
  }
  return { lines, subtotalCents, taxPercent, taxCents, shippingCents, totalCents: subtotalCents + taxCents + shippingCents };
}
