import { z } from "zod";

export const customFieldTypes = ["text", "textarea", "number", "date", "photo", "select", "favors"] as const;
export type CustomFieldType = (typeof customFieldTypes)[number];

export const customFieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(customFieldTypes),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
  placeholder: z.string().optional(),
  // Only for "favors": the items a shopper can pick, each priced per piece (null = not priced yet).
  items: z.array(z.object({ name: z.string().min(1).max(80), priceCents: z.number().int().min(0).nullable() })).optional(),
  minQty: z.number().int().min(1).max(500).optional(),
});

export type CustomField = z.infer<typeof customFieldSchema>;

export function parseCustomFields(value: unknown): CustomField[] {
  const parsed = z.array(customFieldSchema).safeParse(value);
  return parsed.success ? parsed.data : [];
}

export type FavorItem = NonNullable<CustomField["items"]>[number];
export type FavorPick = { name: string; quantity: number };

export const MAX_FAVOR_QTY = 1000;

/** A favors answer as it's stored on the order, e.g. "Capri Suns × 24, Ring Pops × 12". */
export function formatFavors(picks: FavorPick[]): string {
  return picks.filter((p) => p.quantity > 0).map((p) => `${p.name} × ${p.quantity}`).join(", ");
}

export function parseFavors(answer: string): FavorPick[] | null {
  if (!answer.trim()) return [];
  const picks: FavorPick[] = [];
  for (const part of answer.split(", ")) {
    const m = /^(.+) × (\d+)$/.exec(part.trim());
    if (!m) return null;
    picks.push({ name: m[1], quantity: Number(m[2]) });
  }
  return picks;
}

/** Every item has a price, so the favors can be bought online instead of quoted. */
export function favorsPriced(field: CustomField): boolean {
  const items = field.items ?? [];
  return items.length > 0 && items.every((i) => i.priceCents !== null);
}

export function favorsField(fields: CustomField[]): CustomField | undefined {
  return fields.find((f) => f.type === "favors");
}

export function slugifyKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40) || "field";
}

/** The fields most party favor products ask for. */
export const defaultPartyFields: CustomField[] = [
  { key: "name", label: "Name on design", type: "text", required: true },
  { key: "age", label: "Age", type: "text", required: false },
  { key: "theme", label: "Theme", type: "text", required: true, placeholder: "e.g. Spider-Man, pink and gold" },
  { key: "event_date", label: "Event date", type: "date", required: true },
  { key: "photo", label: "Photo for the design", type: "photo", required: false },
  { key: "notes", label: "Notes for the designer", type: "textarea", required: false },
];

export const defaultClassFields: CustomField[] = [
  { key: "preferred_date", label: "Preferred class date", type: "date", required: true },
  { key: "backup_date", label: "Backup date", type: "date", required: false },
  { key: "preferred_time", label: "Preferred time", type: "select", required: true, options: ["Morning (9am to 12pm)", "Afternoon (12pm to 4pm)", "Evening (4pm to 8pm)"] },
  { key: "topic", label: "What do you want to learn?", type: "select", required: true, options: ["Designing templates", "Printing techniques", "Vinyl projects", "Party favor creations", "Event graphics", "Something else"] },
  { key: "notes", label: "Anything else we should know?", type: "textarea", required: false },
];
