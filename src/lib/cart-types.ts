import { z } from "zod";

export const cartItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(50),
  customization: z.record(z.string(), z.string().max(2000)).default({}),
  addOns: z.array(z.object({ id: z.string().min(1), quantity: z.number().int().min(1).max(50) })).default([]),
});

export type CartItem = z.infer<typeof cartItemSchema>;

/** What the browser keeps in localStorage: the item plus display info captured when it was added. */
export type StoredCartItem = CartItem & {
  key: string;
  name: string;
  kind: "PRODUCT" | "SERVICE";
  image?: string;
  unitPriceCents: number;
  addOnDetails: { id: string; name: string; priceCents: number; quantity: number }[];
  fieldLabels: Record<string, string>;
};
