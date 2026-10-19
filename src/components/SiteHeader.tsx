import Image from "next/image";
import Link from "next/link";
import { CartButton } from "./CartButton";
import { MenuIcon, UserIcon } from "./icons";

const links = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/classes", label: "Classes" },
  { href: "/gallery", label: "Gallery" },
  { href: "/policies", label: "Policies" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader({ announcement }: { announcement?: string }) {
  return (
    <>
      {announcement ? (
        <div className="bg-pink px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-[0.08em] text-ink">{announcement}</div>
      ) : null}
      <header className="sticky top-0 z-40 border-b-[3px] border-gold bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-2 sm:px-6">
          <Link href="/" aria-label="Tylyn Tingz Creations, home" className="shrink-0">
            <Image src="/logo.png" alt="Tylyn Tingz Creations" width={900} height={311} priority className="h-14 w-auto sm:h-[72px]" />
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-7 text-sm font-semibold uppercase tracking-[0.06em] lg:flex">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="flex min-h-11 items-center hover:text-pink-deep">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/account" aria-label="My account" title="My account" className="hidden h-11 w-11 sm:flex items-center justify-center rounded-full border-[1.5px] border-ink hover:border-pink hover:text-pink-deep">
              <UserIcon className="h-5 w-5" />
            </Link>
            <CartButton />
            <details className="relative lg:hidden">
              <summary className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full border-[1.5px] border-ink" aria-label="Menu">
                <MenuIcon className="h-5 w-5" />
              </summary>
              <nav aria-label="Mobile" className="absolute right-0 mt-2 flex w-56 flex-col rounded-2xl border border-line bg-white p-2 shadow-xl">
                {links.map((l) => (
                  <Link key={l.href} href={l.href} className="rounded-lg px-4 py-3 text-sm font-semibold uppercase tracking-[0.06em] hover:bg-blush">
                    {l.label}
                  </Link>
                ))}
                <Link href="/account" className="rounded-lg px-4 py-3 text-sm font-semibold uppercase tracking-[0.06em] hover:bg-blush">My account</Link>
              </nav>
            </details>
          </div>
        </div>
      </header>
    </>
  );
}
