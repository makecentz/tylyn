import type { Metadata } from "next";
import { InstagramIcon, MailIcon, PhoneIcon, PinIcon, ClockIcon } from "@/components/icons";
import { getAllContent } from "@/lib/content";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Contact" };

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const { product } = await searchParams;
  const { contact } = await getAllContent();
  const digits = contact.phone.replace(/\D/g, "").slice(-10);
  const smsBody = product ? `?body=${encodeURIComponent(`Hi! I'd like to order the ${product} package.`)}` : "";
  const rows = [
    contact.phone && { Icon: PhoneIcon, label: "Call or text", value: contact.phone, href: `tel:+1${digits}` },
    contact.phone && { Icon: PhoneIcon, label: "Send a text", value: "Text us your order details", href: `sms:+1${digits}${smsBody}` },
    contact.email && { Icon: MailIcon, label: "Email", value: contact.email, href: `mailto:${contact.email}${product ? `?subject=${encodeURIComponent(`${product} order`)}` : ""}` },
    contact.instagram && { Icon: InstagramIcon, label: "Instagram DM", value: `@${contact.instagram}`, href: `https://instagram.com/${contact.instagram}` },
    contact.pickupArea && { Icon: PinIcon, label: "Pickup", value: `By appointment · ${contact.pickupArea}` },
    contact.hours && { Icon: ClockIcon, label: "Hours", value: contact.hours },
  ].filter(Boolean) as { Icon: typeof PhoneIcon; label: string; value: string; href?: string }[];

  return (
    <div className="mx-auto flex max-w-[820px] flex-col gap-8 px-4 pb-24 pt-12 sm:px-6">
      <div className="flex flex-col gap-2">
        <span className="font-script text-4xl text-pink-deep">Let&apos;s create something</span>
        <h1 className="font-serif text-5xl">Contact us</h1>
        {product ? <p className="text-[#4A3F45]">Interested in the <strong>{product}</strong> package? Reach out below and we&apos;ll send pricing.</p> : null}
      </div>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {rows.map(({ Icon, label, value, href }) => (
          <li key={label} className="flex items-start gap-4 rounded-2xl bg-ink p-5 text-white">
            <Icon className="mt-0.5 h-6 w-6 shrink-0 text-pink-light" />
            <span className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-gold">{label}</span>
              {href ? <a href={href} className="whitespace-pre-line font-semibold underline">{value}</a> : <span className="whitespace-pre-line">{value}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
