import { z } from "zod";

export const customFieldTypes = ["text", "textarea", "number", "date", "photo", "select"] as const;
export type CustomFieldType = (typeof customFieldTypes)[number];

export const customFieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(customFieldTypes),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
  placeholder: z.string().optional(),
});

export type CustomField = z.infer<typeof customFieldSchema>;

export function parseCustomFields(value: unknown): CustomField[] {
  const parsed = z.array(customFieldSchema).safeParse(value);
  return parsed.success ? parsed.data : [];
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
