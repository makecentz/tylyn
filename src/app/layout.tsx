import type { Metadata } from "next";
import { Great_Vibes, Montserrat, Playfair_Display } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat" });
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-playfair" });
const greatVibes = Great_Vibes({ subsets: ["latin"], weight: "400", variable: "--font-great-vibes" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "Tylyn Tingz Creations | Custom Party Favors", template: "%s | Tylyn Tingz Creations" },
  description:
    "Custom party favors, party bundles, I'm Outside party packs and 1-on-1 craft classes, made to order by Tylyn Tingz Creations.",
  openGraph: { images: ["/logo.png"] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${montserrat.variable} ${playfair.variable} ${greatVibes.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
