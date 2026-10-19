import { getAllContent } from "./content";
import { db } from "./db";
import { getPaymentSettings } from "./payment-settings";
import { parseCustomFields } from "./custom-fields";
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

  const lines: PricedLine[] = items.map((item) => {
    const product = products.find((p) => p.id === item.productId);
    if (!product || !product.active || !product.onlineCheckout) {
      throw new PricingError("An item in your cart is no longer available. Please remove it and try again.");
    }
    const fields = parseCustomFields(product.customFields);
    const customization: Record<string, string> = {};
    for (const field of fields) {
      const answer = (item.customization[field.key] ?? "").trim();
      if (field.required && !answer) throw new PricingError(`"${field.label}" is required for ${product.name}.`);
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
    return {
      productId: product.id,
      productName: product.name,
      kind: product.kind,
      unitPriceCents: product.priceCents,
      quantity: item.quantity,
      customization,
      addOns,
      lineTotalCents: product.priceCents * item.quantity + addOnTotal,
    };
  });

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
