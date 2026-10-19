import type { Metadata } from "next";
import { getCustomer, parseAddress } from "@/lib/customer-auth";
import { getShippingOptions } from "@/lib/shipping";
import { getPaymentSettings, paymentsReady, testMode } from "@/lib/payment-settings";
import { CheckoutForm } from "./CheckoutForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const customer = await getCustomer();
  const payments = await getPaymentSettings();
  const [firstName, ...rest] = (customer?.name ?? "").split(" ");
  return (
    <div className="bg-blush">
      <CheckoutForm
        payments={{
          provider: payments.provider,
          configured: paymentsReady(payments),
          testMode: testMode(payments),
          // Only the public Square IDs go to the browser; secret keys stay on the server.
          squareApplicationId: payments.provider === "square" ? payments.square.applicationId : "",
          squareLocationId: payments.provider === "square" ? payments.square.locationId : "",
          squareProduction: payments.square.production,
        }}
        taxPercent={payments.taxPercent}
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
