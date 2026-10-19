import type { Metadata } from "next";
import { getCustomer, parseAddress } from "@/lib/customer-auth";
import { getShippingOptions } from "@/lib/shipping";
import { isSquareProduction, squareConfigured } from "@/lib/square";
import { CheckoutForm } from "./CheckoutForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const customer = await getCustomer();
  const [firstName, ...rest] = (customer?.name ?? "").split(" ");
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
        shipping={await getShippingOptions()}
        account={
          customer
            ? { email: customer.email, firstName, lastName: rest.join(" "), phone: customer.phone, address: parseAddress(customer.address) }
            : null
        }
      />
    </div>
  );
}
