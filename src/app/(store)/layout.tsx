import { CartProvider } from "@/components/CartProvider";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getAllContent } from "@/lib/content";
import { getPaymentSettings } from "@/lib/payment-settings";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [content, payments] = await Promise.all([getAllContent(), getPaymentSettings()]);
  return (
    <CartProvider>
      <SiteHeader announcement={content.announcement.enabled ? content.announcement.text : undefined} />
      <main>{children}</main>
      <SiteFooter contact={content.contact} processor={payments.provider === "stripe" ? "Stripe" : "Square"} />
    </CartProvider>
  );
}
