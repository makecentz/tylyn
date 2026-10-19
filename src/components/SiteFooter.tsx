import Image from "next/image";
import Link from "next/link";
import type { SiteContentMap } from "@/lib/content";
import { ClockIcon, FacebookIcon, InstagramIcon, LockIcon, MailIcon, PhoneIcon, PinIcon, TikTokIcon } from "./icons";

function telHref(phone: string) {
  return `tel:+1${phone.replace(/\D/g, "").slice(-10)}`;
}

function Column({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <nav aria-label={title} className="flex flex-col gap-3 text-sm">
      <span className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-gold">{title}</span>
      {links.map((l) => (
        <Link key={l.label} href={l.href} className="text-[#F3EDF0] hover:text-pink-light">
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

export function SiteFooter({ contact, processor }: { contact: SiteContentMap["contact"]; processor: string }) {
  const socials = [
    contact.instagram && { href: `https://instagram.com/${contact.instagram}`, label: "Instagram", Icon: InstagramIcon },
    contact.facebook && { href: contact.facebook.startsWith("http") ? contact.facebook : `https://facebook.com/${contact.facebook}`, label: "Facebook", Icon: FacebookIcon },
    contact.tiktok && { href: `https://tiktok.com/@${contact.tiktok.replace(/^@/, "")}`, label: "TikTok", Icon: TikTokIcon },
  ].filter(Boolean) as { href: string; label: string; Icon: typeof InstagramIcon }[];

  return (
    <footer id="footer" className="border-t-4 border-pink bg-ink text-white">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-10 px-4 pb-12 pt-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.35fr_1fr_1fr_1fr_1.25fr] lg:gap-8">
        <div className="flex flex-col gap-4 sm:col-span-2 lg:col-span-1">
          <Link href="/" aria-label="Tylyn Tingz Creations, home" className="self-start">
            <Image src="/logo.png" alt="Tylyn Tingz Creations" width={900} height={311} className="h-16 w-auto" />
          </Link>
          {contact.tagline ? <p className="font-script text-2xl leading-tight text-pink-light">{contact.tagline}</p> : null}
          <p className="max-w-xs text-[13px] leading-6 text-[#CFC6CB]">
            Custom party favors, party packages and 1-on-1 craft classes, all made to order for your celebration.
          </p>
          {socials.length ? (
            <div className="flex gap-3">
              {socials.map(({ href, label, Icon }) => (
                <a key={label} href={href} aria-label={label} target="_blank" rel="noreferrer" className="flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-gold text-gold hover:bg-gold hover:text-ink">
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          ) : null}
        </div>

        <Column
          title="Shop"
          links={[
            { href: "/shop", label: "All products" },
            { href: "/shop?collection=im-outside", label: "I'm Outside packages" },
            { href: "/shop?collection=party-bundles", label: "Party bundles" },
            { href: "/shop?collection=a-la-carte", label: "À la carte favors" },
            { href: "/classes", label: "1-on-1 classes" },
          ]}
        />
        <Column
          title="Company"
          links={[
            { href: "/", label: "Home" },
            { href: "/#about", label: "About us" },
            { href: "/gallery", label: "Gallery" },
            { href: "/classes", label: "Book a class" },
            { href: "/contact", label: "Contact" },
          ]}
        />
        <Column
          title="Customer care"
          links={[
            { href: "/policies#faqs", label: "FAQs" },
            { href: "/policies", label: "Order deadlines" },
            { href: "/policies", label: "Pickup and shipping" },
            { href: "/policies", label: "Refunds and changes" },
            { href: "/cart", label: "Your cart" },
            { href: "/account", label: "My account" },
          ]}
        />

        <div className="flex min-w-0 flex-col gap-3.5 text-sm">
          <span className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-gold">Contact us</span>
          {contact.phone ? (
            <a href={telHref(contact.phone)} className="flex items-center gap-2.5 text-[#F3EDF0] hover:text-pink-light">
              <PhoneIcon className="h-[18px] w-[18px] text-pink-light" />
              {contact.phone}
            </a>
          ) : null}
          {contact.email ? (
            <a href={`mailto:${contact.email}`} className="flex items-center gap-2.5 break-all text-[#F3EDF0] hover:text-pink-light">
              <MailIcon className="h-[18px] w-[18px] text-pink-light" />
              {contact.email}
            </a>
          ) : null}
          {contact.instagram ? (
            <a href={`https://instagram.com/${contact.instagram}`} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 text-[#F3EDF0] hover:text-pink-light">
              <InstagramIcon className="h-[18px] w-[18px] text-pink-light" />@{contact.instagram}
            </a>
          ) : null}
          {contact.pickupArea ? (
            <span className="flex items-start gap-2.5 leading-6 text-[#F3EDF0]">
              <PinIcon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-pink-light" />
              <span>Pickup by appointment<br />{contact.pickupArea}</span>
            </span>
          ) : null}
          {contact.hours ? (
            <span className="flex items-start gap-2.5 whitespace-pre-line leading-6 text-[#F3EDF0]">
              <ClockIcon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-pink-light" />
              {contact.hours}
            </span>
          ) : null}
        </div>
      </div>

      <div className="border-t border-gold/35">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-7 gap-y-3 px-4 pb-8 pt-5 text-[13px] text-[#B7ADB2] sm:px-6">
          <span>© {new Date().getFullYear()} Tylyn Tingz Creations. All rights reserved.</span>
          <nav aria-label="Legal" className="flex flex-wrap gap-5">
            <Link href="/policies#privacy" className="underline hover:text-white">Privacy policy</Link>
            <Link href="/policies#terms" className="underline hover:text-white">Terms of service</Link>
            <Link href="/policies" className="underline hover:text-white">Refund policy</Link>
          </nav>
          <span className="flex items-center gap-1.5">
            <LockIcon className="h-3.5 w-3.5 text-gold" />
            Secure payments by {processor}
          </span>
        </div>
      </div>
    </footer>
  );
}
