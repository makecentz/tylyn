import type { ShippingOptions } from "@/components/FulfillmentChoice";
import { getAllContent } from "./content";
import { shippingRateCents } from "./pricing";

export async function getShippingOptions(): Promise<ShippingOptions> {
  const { contact, shipping } = await getAllContent();
  return {
    shippingCents: await shippingRateCents(),
    pickupArea: contact.pickupArea,
    pickupNote: shipping.pickupNote,
    shippingNote: shipping.shippingNote,
  };
}
