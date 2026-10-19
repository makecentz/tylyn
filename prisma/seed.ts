import { PrismaClient, ProductKind } from "@prisma/client";
import { defaultClassFields, defaultPartyFields, type CustomField } from "../src/lib/custom-fields";

const db = new PrismaClient();

// Fields for the adult I'm Outside packs: no age, custom text instead of a child's name.
const imOutsideFields: CustomField[] = [
  { key: "text", label: "Text on design", type: "text", required: true, placeholder: "e.g. Jasmine's 30th" },
  { key: "theme", label: "Colors or theme", type: "text", required: true, placeholder: "e.g. pink and gold" },
  { key: "event_date", label: "Event date", type: "date", required: true },
  { key: "photo", label: "Photo or logo for the design", type: "photo", required: false },
  { key: "notes", label: "Notes for the designer", type: "textarea", required: false },
];

// Marks the database as seeded, so deploys that run `db:seed --once` never bring back
// products the owner has since deleted.
const SEEDED_KEY = "system:seeded";

async function main() {
  if (process.argv.includes("--once") && (await db.siteContent.findUnique({ where: { key: SEEDED_KEY } }))) {
    console.log("Starter products were already added; skipping.");
    return;
  }
  const collections = [
    { slug: "im-outside", name: "I'm Outside Packages", tagline: "Adult party packs", sortOrder: 1 },
    { slug: "party-bundles", name: "Party Bundles", tagline: "Kids' birthdays", sortOrder: 2 },
    { slug: "a-la-carte", name: "À la carte", tagline: "Single items by the dozen", sortOrder: 3 },
    { slug: "classes", name: "1-on-1 Classes", tagline: "Learn the craft", sortOrder: 4 },
  ];
  const col: Record<string, string> = {};
  for (const c of collections) {
    const row = await db.collection.upsert({ where: { slug: c.slug }, create: c, update: {} });
    col[c.slug] = row.id;
  }

  const addOnDefs = [
    { name: "Small centerpiece", priceCents: 2500, priceNote: "each", sortOrder: 1 },
    { name: "Custom birthday hats (1 dozen)", priceCents: 5200, priceNote: "per dozen", sortOrder: 2 },
    { name: "Custom ice bucket", priceCents: 2800, priceNote: "each", sortOrder: 3 },
  ];
  const addOn: Record<string, string> = {};
  for (const a of addOnDefs) {
    const existing = await db.addOn.findFirst({ where: { name: a.name } });
    const row = existing ?? (await db.addOn.create({ data: a }));
    addOn[a.name] = row.id;
  }
  const centerpiece = addOn["Small centerpiece"];
  const hats = addOn["Custom birthday hats (1 dozen)"];
  const bucket = addOn["Custom ice bucket"];

  type Seed = {
    slug: string;
    name: string;
    collection: string;
    priceCents: number;
    priceNote?: string;
    description: string;
    includes: string[];
    images: string[];
    customFields: CustomField[];
    addOns: string[];
    kind?: ProductKind;
    featured?: boolean;
    active?: boolean;
    onlineCheckout?: boolean;
    leadDays?: number;
    sortOrder: number;
  };

  const outside = "/images/im-outside.jpg";
  const bundle = "/images/party-bundle.jpg";

  const products: Seed[] = [
    {
      slug: "sip-pretty", name: "Sip Pretty", collection: "im-outside", priceCents: 6000, sortOrder: 1, featured: true,
      description: "Custom shot cups and clear cocktail cups designed for your celebration.",
      includes: ["12 shot cups", "12 clear cocktail cups"], images: [outside], customFields: imOutsideFields, addOns: [bucket, hats],
    },
    {
      slug: "handle-with-care", name: "Handle With Care", collection: "im-outside", priceCents: 8500, sortOrder: 2, featured: true,
      description: "Shot cups, styrofoam cups and customized fans to keep the party cool.",
      includes: ["12 shot cups", "12 styrofoam cups", "6 customized fans"], images: [outside], customFields: imOutsideFields, addOns: [bucket, hats],
    },
    // The next four packages originally included tobacco items, which are not sold on this site.
    // They start as inquiry-only until the owner sets new prices and turns online checkout on.
    {
      slug: "pour-decisions", name: "Pour Decisions", collection: "im-outside", priceCents: 12500, sortOrder: 3, onlineCheckout: false,
      description: "Shot cups, styrofoam cups and lighters, all with your custom design.",
      includes: ["12 shot cups", "12 styrofoam cups", "12 lighters"], images: [outside], customFields: imOutsideFields, addOns: [bucket, hats],
    },
    {
      slug: "lets-get-lit", name: "Let's Get Lit", collection: "im-outside", priceCents: 20000, sortOrder: 4, onlineCheckout: false,
      description: "Three cup sets, lighters and custom mylar bags for the full I'm Outside look.",
      includes: ["12 shot cups", "12 styrofoam cups", "12 clear cocktail cups", "12 lighters", "6 custom mylar bags"], images: [outside], customFields: imOutsideFields, addOns: [bucket, hats],
    },
    {
      slug: "vibes-in-the-air", name: "Vibes In The Air", collection: "im-outside", priceCents: 25000, sortOrder: 5, onlineCheckout: false,
      description: "Custom lighters and mylar bags.",
      includes: ["12 lighters", "6 custom mylar bags"], images: [outside], customFields: imOutsideFields, addOns: [bucket, hats],
    },
    {
      slug: "premium-pack", name: "Premium Pack", collection: "im-outside", priceCents: 36000, sortOrder: 6, onlineCheckout: false,
      description: "Everything in one pack: all three cup sets, custom lighters, mylar bags and fans.",
      includes: ["12 shot cups", "12 styrofoam cups", "12 clear cocktail cups", "12 custom lighters", "6 custom mylar bags", "6 customized fans"], images: [outside], customFields: imOutsideFields, addOns: [bucket, hats],
    },
    {
      slug: "party-bundle", name: "Party Bundle", collection: "party-bundles", priceCents: 12500, sortOrder: 1, featured: true,
      description: "One dozen each of simple gable boxes, custom chip bags, custom Capri Suns and activity sheets. Any design. No substitutions; items can also be purchased separately.",
      includes: ["12 simple gable boxes", "12 custom chip bags", "12 custom Capri Suns", "12 activity sheets"], images: [bundle], customFields: defaultPartyFields, addOns: [centerpiece, hats],
    },
    // À la carte prices weren't on the flyers, so these start hidden until the owner adds prices.
    { slug: "custom-chip-bags", name: "Custom Chip Bags", collection: "a-la-carte", priceCents: 0, priceNote: "per dozen", sortOrder: 1, active: false, description: "Chip bags printed with your theme, name and photo.", includes: ["12 custom chip bags"], images: [bundle], customFields: defaultPartyFields, addOns: [] },
    { slug: "custom-capri-suns", name: "Custom Capri Suns", collection: "a-la-carte", priceCents: 0, priceNote: "per dozen", sortOrder: 2, active: false, description: "Personalized pouch wraps to match your party.", includes: ["12 custom Capri Suns"], images: [bundle], customFields: defaultPartyFields, addOns: [] },
    { slug: "gable-boxes", name: "Gable Boxes", collection: "a-la-carte", priceCents: 0, priceNote: "per dozen", sortOrder: 3, active: false, description: "Treat boxes wrapped in your custom design.", includes: ["12 gable boxes"], images: [bundle], customFields: defaultPartyFields, addOns: [] },
    { slug: "activity-sheets", name: "Activity Sheets", collection: "a-la-carte", priceCents: 0, priceNote: "per dozen", sortOrder: 4, active: false, description: "Mazes, word searches and games with your theme.", includes: ["12 activity sheets"], images: [bundle], customFields: defaultPartyFields, addOns: [] },
    {
      slug: "one-on-one-class", name: "1-on-1 Class", collection: "classes", kind: ProductKind.SERVICE, priceCents: 25000, priceNote: "per class", sortOrder: 1, featured: true, leadDays: 3,
      description: "Whatever you want to learn, I'll teach it! Hands-on, one-on-one lessons customized to your needs, with flexible scheduling.",
      includes: ["Designing templates", "Printing techniques", "Vinyl projects", "Party favor creations", "Event graphics", "And more"], images: ["/images/classes.jpg"], customFields: defaultClassFields, addOns: [],
    },
  ];

  for (const p of products) {
    const data = {
      name: p.name,
      kind: p.kind ?? ProductKind.PRODUCT,
      priceCents: p.priceCents,
      priceNote: p.priceNote ?? null,
      description: p.description,
      includes: p.includes,
      images: p.images,
      customFields: p.customFields,
      featured: p.featured ?? false,
      active: p.active ?? true,
      onlineCheckout: p.onlineCheckout ?? true,
      leadDays: p.leadDays ?? 14,
      sortOrder: p.sortOrder,
      collection: { connect: { id: col[p.collection] } },
      addOns: { set: p.addOns.map((id) => ({ id })) },
    };
    // Only create missing products so re-running the seed never overwrites the owner's edits.
    const existing = await db.product.findUnique({ where: { slug: p.slug } });
    if (!existing) await db.product.create({ data: { slug: p.slug, ...data, addOns: { connect: p.addOns.map((id) => ({ id })) } } });
  }

  await db.siteContent.upsert({
    where: { key: SEEDED_KEY },
    create: { key: SEEDED_KEY, value: { at: new Date().toISOString() } },
    update: {},
  });
  console.log("Seeded collections, add-ons and products.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
