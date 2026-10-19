import type { Metadata } from "next";
import { getAllContent } from "@/lib/content";
import { isSquareProduction, squareConfigured } from "@/lib/square";
import { shippingRateCents } from "@/lib/pricing";
import { CheckoutForm } from "./CheckoutForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const { contact } = await getAllContent();
  return (
    <div className="bg-blush">
      <CheckoutForm
        square={{
          configured: squareConfigured(),
          applicationId: process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID ?? "",
          locationId: process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID ?? "",
          production: isSquareProduction,
        }}
        taxPercent={parseFloat(process.env.SALES_TAX_PERCENT || "0") || 0}
        shippingCents={shippingRateCents()}
        pickupArea={contact.pickupArea}
      />
    </div>
  );
}
