import { CartProvider } from "@/components/CartProvider";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getAllContent } from "@/lib/content";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const content = await getAllContent();
  return (
    <CartProvider>
      <SiteHeader announcement={content.announcement.enabled ? content.announcement.text : undefined} />
      <main>{children}</main>
      <SiteFooter contact={content.contact} />
    </CartProvider>
  );
}
