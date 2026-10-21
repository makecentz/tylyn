import { cache } from "react";
import { db } from "./db";

export type SiteContentMap = {
  announcement: { enabled: boolean; text: string };
  hero: {
    script: string;
    headline: string;
    highlight: string;
    intro: string;
    primaryLabel: string;
    secondaryLabel: string;
    images: string[];
  };
  homeSections: {
    collections: boolean;
    bestSellers: boolean;
    howItWorks: boolean;
    classBanner: boolean;
    gallery: boolean;
  };
  howItWorks: { title: string; steps: { title: string; body: string }[] };
  classBanner: { script: string; title: string; body: string; topics: string[] };
  about: { title: string; body: string };
  gallery: { images: { src: string; alt: string }[] };
  policies: { sections: { title: string; body: string }[] };
  faqs: { items: { q: string; a: string }[] };
  contact: {
    phone: string;
    email: string;
    instagram: string;
    facebook: string;
    tiktok: string;
    pickupArea: string;
    hours: string;
    tagline: string;
  };
  shipping: {
    offerShipping: boolean;
    // Flat rate in dollars, e.g. "12.00"
    flatRate: string;
    pickupNote: string;
    shippingNote: string;
  };
};

export type ContentKey = keyof SiteContentMap;

export const defaultContent: SiteContentMap = {
  announcement: {
    enabled: true,
    text: "Custom party favors made to order · Please order at least 2 weeks before your event",
  },
  hero: {
    script: "Let's Get Creative",
    headline: "Custom party favors that",
    highlight: "steal the show.",
    intro:
      "Personalized chip bags, Capri Suns, gable boxes, cups and full party packages, designed around your theme and your guest of honor. Plus 1-on-1 classes to learn the craft yourself.",
    primaryLabel: "Shop packages",
    secondaryLabel: "Book a class",
    images: ["/images/party-bundle.jpg", "/images/classes.jpg"],
  },
  homeSections: { collections: true, bestSellers: true, howItWorks: true, classBanner: true, gallery: true },
  howItWorks: {
    title: "How ordering works",
    steps: [
      { title: "Pick your package", body: "Choose a bundle or build your own from single items and add-ons." },
      { title: "Tell us your theme", body: "Add the name, age, theme, event date and a photo right on the product page." },
      { title: "Pay securely", body: "Check out securely with card, Apple Pay or Google Pay, or pay over time with Klarna." },
      { title: "Proof, then party", body: "We send a design proof, make your order, and have it ready for pickup or shipping." },
    ],
  },
  classBanner: {
    script: "I'll teach it!",
    title: "1-on-1 classes",
    body: "Hands-on lessons customized to what you want to learn. Pick an open date and book your spot.",
    topics: ["Designing templates", "Printing techniques", "Vinyl projects", "Party favor creations", "Event graphics"],
  },
  about: {
    title: "About Tylyn Tingz Creations",
    body: "Every order is designed by hand for your celebration, from kids' birthday bundles to grown-up party packs.",
  },
  gallery: {
    images: [
      { src: "/images/party-bundle.jpg", alt: "Custom Spider-Man party bundle" },
      { src: "/images/im-outside.jpg", alt: "I'm Outside custom cups and party packs" },
      { src: "/images/classes.jpg", alt: "Craft studio for 1-on-1 classes" },
    ],
  },
  policies: {
    sections: [
      { title: "Order deadlines", body: "Please place orders at least 2 weeks before your event so there is time for a design proof and production." },
      { title: "Design proofs", body: "We email a design proof after you order. Production starts once you approve it." },
      { title: "Changes and refunds", body: "Because every item is custom, orders can't be refunded once production has started. Contact us right away if you need a change." },
      { title: "Pickup and shipping", body: "Local pickup is free and by appointment. Shipping is a flat rate you can choose in your cart." },
    ],
  },
  faqs: {
    items: [
      { q: "Can I get any design?", a: "Yes. Tell us your theme, colors and names and we will design it for you." },
      { q: "Can I buy items separately?", a: "Yes. Bundle items are also sold on their own in the shop." },
      { q: "Are substitutions allowed in bundles?", a: "Bundles are sold as listed. Add-ons can be added to any bundle." },
    ],
  },
  contact: {
    phone: "267-259-2414",
    email: "",
    instagram: "tylyntingzcreations",
    facebook: "",
    tiktok: "",
    pickupArea: "",
    hours: "",
    tagline: "It's not just a package, it's a lifestyle.",
  },
  shipping: {
    offerShipping: true,
    flatRate: process.env.SHIPPING_FLAT_RATE || "12.00",
    pickupNote: "We'll text you when your order is ready to pick up.",
    shippingNote: "Flat rate. Ships once your order is made.",
  },
};

/** Loads all content rows once per request, falling back to defaults key by key. */
export const getAllContent = cache(async (): Promise<SiteContentMap> => {
  const rows = await db.siteContent.findMany();
  const merged = structuredClone(defaultContent) as Record<string, unknown>;
  for (const row of rows) {
    if (row.key in merged && row.value && typeof row.value === "object") {
      merged[row.key] = { ...(merged[row.key] as object), ...(row.value as object) };
    }
  }
  return merged as SiteContentMap;
});

export async function saveContent<K extends ContentKey>(key: K, value: SiteContentMap[K]) {
  await db.siteContent.upsert({
    where: { key },
    create: { key, value: value as object },
    update: { value: value as object },
  });
}
