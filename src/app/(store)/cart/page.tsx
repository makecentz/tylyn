import type { Metadata } from "next";
import { getShippingOptions } from "@/lib/shipping";
import { CartView } from "./CartView";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your cart", robots: { index: false } };

export default async function CartPage() {
  return <CartView shipping={await getShippingOptions()} />;
}
