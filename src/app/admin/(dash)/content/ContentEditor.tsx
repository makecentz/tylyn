"use client";

import { useState } from "react";
import type { ContentKey, SiteContentMap } from "@/lib/content";
import { saveContentSection } from "../../actions";
import { ImageListEditor } from "../ImageListEditor";

const tabs = [
  { id: "home", label: "Home page" },
  { id: "gallery", label: "Gallery" },
  { id: "policies", label: "Policies and FAQs" },
  { id: "contact", label: "Contact and social" },
  { id: "shipping", label: "Pickup and shipping" },
] as const;

function useSection<K extends ContentKey>(key: K, initial: SiteContentMap[K]) {
  const [value, setValue] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const save = async () => {
    setStatus("saving");
    const res = await saveContentSection(key, value);
    setStatus(res.ok ? "saved" : "error");
  };
  const update = (patch: Partial<SiteContentMap[K]>) => {
    setValue((v) => ({ ...v, ...patch }));
    setStatus("idle");
  };
  return { value, update, save, status };
}

function Section({ title, children, onSave, status }: { title: string; children: React.ReactNode; onSave: () => void; status: string }) {
  return (
    <section className="card flex flex-col gap-4">
      <h2 className="font-serif text-xl">{title}</h2>
      {children}
      <div className="flex items-center gap-3">
        <button type="button" onClick={onSave} disabled={status === "saving"} className="btn btn-pink min-h-11">
          {status === "saving" ? "Saving…" : "Save"}
        </button>
        {status === "saved" ? <span role="status" className="text-sm font-semibold text-[#0F5132]">Saved. It&apos;s live on the site.</span> : null}
        {status === "error" ? <span role="alert" className="text-sm text-[#B3124F]">Couldn&apos;t save. Please try again.</span> : null}
      </div>
    </section>
  );
}

function Text({ label, value, onChange, long, placeholder }: { label: string; value: string; onChange: (v: string) => void; long?: boolean; placeholder?: string }) {
  return (
    <label className="field">
      {label}
      {long ? (
        <textarea className="input" rows={4} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className="input" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

/** Edits a list of objects with the same text fields, e.g. FAQ questions and answers. */
function ListEditor<T extends Record<string, string>>({
  items,
  onChange,
  fields,
  blank,
  addLabel,
}: {
  items: T[];
  onChange: (v: T[]) => void;
  fields: { key: keyof T & string; label: string; long?: boolean }[];
  blank: T;
  addLabel: string;
}) {
  const move = (i: number, d: number) => {
    const next = [...items];
    const [x] = next.splice(i, 1);
    next.splice(Math.max(0, Math.min(next.length, i + d)), 0, x);
    onChange(next);
  };
  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-xl border border-line p-3">
          {fields.map((f) => (
            <Text key={f.key} label={f.label} long={f.long} value={item[f.key]} onChange={(v) => onChange(items.map((x, j) => (j === i ? { ...x, [f.key]: v } : x)))} />
          ))}
          <div className="flex gap-3 text-sm">
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="min-h-10 font-semibold disabled:opacity-30">Move up</button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} className="min-h-10 font-semibold disabled:opacity-30">Move down</button>
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="ml-auto min-h-10 font-semibold text-[#B3124F]">Remove</button>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, { ...blank }])} className="btn btn-outline min-h-11 self-start">{addLabel}</button>
    </div>
  );
}

export function ContentEditor({ initial }: { initial: SiteContentMap }) {
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("home");
  const announcement = useSection("announcement", initial.announcement);
  const hero = useSection("hero", initial.hero);
  const homeSections = useSection("homeSections", initial.homeSections);
  const how = useSection("howItWorks", initial.howItWorks);
  const about = useSection("about", initial.about);
  const classBanner = useSection("classBanner", initial.classBanner);
  const gallery = useSection("gallery", initial.gallery);
  const policies = useSection("policies", initial.policies);
  const faqs = useSection("faqs", initial.faqs);
  const contact = useSection("contact", initial.contact);
  const shipping = useSection("shipping", initial.shipping);

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label="Content sections" className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`min-h-11 rounded-full px-5 text-sm font-semibold ${tab === t.id ? "bg-ink text-white" : "border-[1.5px] border-[#D9C7D0] bg-white"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "home" ? (
        <div className="flex max-w-4xl flex-col gap-5">
          <Section title="Announcement bar" onSave={announcement.save} status={announcement.status}>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" className="h-5 w-5 accent-pink" checked={announcement.value.enabled} onChange={(e) => announcement.update({ enabled: e.target.checked })} />
              Show the pink bar at the top of every page
            </label>
            <Text label="Text" value={announcement.value.text} onChange={(text) => announcement.update({ text })} />
          </Section>

          <Section title="Hero (top of the home page)" onSave={hero.save} status={hero.status}>
            <p className="text-sm text-[#5A5257]">This text sits on the left side of the home page video.</p>
            <Text label="Script line" value={hero.value.script} onChange={(script) => hero.update({ script })} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Text label="Headline" value={hero.value.headline} onChange={(headline) => hero.update({ headline })} />
              <Text label="Gold highlight at the end of the headline" value={hero.value.highlight} onChange={(highlight) => hero.update({ highlight })} />
            </div>
            <Text label="Intro paragraph" long value={hero.value.intro} onChange={(intro) => hero.update({ intro })} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Text label="Pink button (goes to the shop)" value={hero.value.primaryLabel} onChange={(primaryLabel) => hero.update({ primaryLabel })} />
              <Text label="Gold button (goes to classes)" value={hero.value.secondaryLabel} onChange={(secondaryLabel) => hero.update({ secondaryLabel })} />
            </div>
          </Section>

          <Section title="Which sections show on the home page" onSave={homeSections.save} status={homeSections.status}>
            {([
              ["collections", "Shop by collection"],
              ["bestSellers", "Best sellers (products marked Featured)"],
              ["howItWorks", "How ordering works"],
              ["classBanner", "1-on-1 classes banner"],
              ["gallery", "Gallery preview"],
            ] as const).map(([k, label]) => (
              <label key={k} className="flex min-h-10 items-center gap-2 text-sm font-semibold">
                <input type="checkbox" className="h-5 w-5 accent-pink" checked={homeSections.value[k]} onChange={(e) => homeSections.update({ [k]: e.target.checked })} />
                {label}
              </label>
            ))}
          </Section>

          <Section title="How ordering works" onSave={how.save} status={how.status}>
            <Text label="Title" value={how.value.title} onChange={(title) => how.update({ title })} />
            <ListEditor items={how.value.steps} onChange={(steps) => how.update({ steps })} fields={[{ key: "title", label: "Step" }, { key: "body", label: "Description", long: true }]} blank={{ title: "", body: "" }} addLabel="+ Add a step" />
          </Section>

          <Section title="About us" onSave={about.save} status={about.status}>
            <Text label="Title" value={about.value.title} onChange={(title) => about.update({ title })} />
            <Text label="Text (leave empty to hide this section)" long value={about.value.body} onChange={(body) => about.update({ body })} />
          </Section>

          <Section title="1-on-1 classes banner" onSave={classBanner.save} status={classBanner.status}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Text label="Script line" value={classBanner.value.script} onChange={(script) => classBanner.update({ script })} />
              <Text label="Title" value={classBanner.value.title} onChange={(title) => classBanner.update({ title })} />
            </div>
            <Text label="Text" long value={classBanner.value.body} onChange={(body) => classBanner.update({ body })} />
            <Text label="Topics (separate with commas)" value={classBanner.value.topics.join(", ")} onChange={(v) => classBanner.update({ topics: v.split(",").map((s) => s.trim()).filter(Boolean) })} />
          </Section>
        </div>
      ) : null}

      {tab === "gallery" ? (
        <div className="max-w-4xl">
          <Section title="Gallery photos" onSave={gallery.save} status={gallery.status}>
            <ImageListEditor
              value={gallery.value.images.map((g) => g.src)}
              max={60}
              onChange={(srcs) =>
                gallery.update({ images: srcs.map((src) => gallery.value.images.find((g) => g.src === src) ?? { src, alt: "Tylyn Tingz Creations custom party favors" }) })
              }
            />
            <p className="text-sm text-mute">The first four photos also show on the home page.</p>
          </Section>
        </div>
      ) : null}

      {tab === "policies" ? (
        <div className="flex max-w-4xl flex-col gap-5">
          <Section title="Policies" onSave={policies.save} status={policies.status}>
            <p className="text-sm text-mute">Sections titled &ldquo;Privacy policy&rdquo; and &ldquo;Terms of service&rdquo; are linked from the footer.</p>
            <ListEditor items={policies.value.sections} onChange={(sections) => policies.update({ sections })} fields={[{ key: "title", label: "Title" }, { key: "body", label: "Text", long: true }]} blank={{ title: "", body: "" }} addLabel="+ Add a policy" />
          </Section>
          <Section title="FAQs" onSave={faqs.save} status={faqs.status}>
            <ListEditor items={faqs.value.items} onChange={(items) => faqs.update({ items })} fields={[{ key: "q", label: "Question" }, { key: "a", label: "Answer", long: true }]} blank={{ q: "", a: "" }} addLabel="+ Add a question" />
          </Section>
        </div>
      ) : null}

      {tab === "contact" ? (
        <div className="max-w-4xl">
          <Section title="Contact and social" onSave={contact.save} status={contact.status}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Text label="Phone" value={contact.value.phone} onChange={(phone) => contact.update({ phone })} />
              <Text label="Email" value={contact.value.email} onChange={(email) => contact.update({ email })} />
              <Text label="Instagram handle" placeholder="tylyntingzcreations" value={contact.value.instagram} onChange={(instagram) => contact.update({ instagram: instagram.replace(/^@/, "") })} />
              <Text label="Facebook page (name or link)" value={contact.value.facebook} onChange={(facebook) => contact.update({ facebook })} />
              <Text label="TikTok handle" value={contact.value.tiktok} onChange={(tiktok) => contact.update({ tiktok })} />
              <Text label="Pickup area" placeholder="e.g. Philadelphia, PA" value={contact.value.pickupArea} onChange={(pickupArea) => contact.update({ pickupArea })} />
            </div>
            <Text label="Business hours" long placeholder={"Mon–Fri 10am–6pm\nSat by appointment"} value={contact.value.hours} onChange={(hours) => contact.update({ hours })} />
            <Text label="Footer tagline" value={contact.value.tagline} onChange={(tagline) => contact.update({ tagline })} />
          </Section>
        </div>
      ) : null}

      {tab === "shipping" ? (
        <div className="max-w-4xl">
          <Section title="Pickup and shipping" onSave={shipping.save} status={shipping.status}>
            <p className="text-sm text-mute">Customers choose one of these in their cart. Local pickup is always offered. Set the pickup area under Contact and social.</p>
            <Text label="Local pickup note" value={shipping.value.pickupNote} onChange={(pickupNote) => shipping.update({ pickupNote })} />
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" className="h-5 w-5 accent-pink" checked={shipping.value.offerShipping} onChange={(e) => shipping.update({ offerShipping: e.target.checked })} />
              Offer shipping
            </label>
            {shipping.value.offerShipping ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[180px_1fr]">
                <Text label="Flat shipping rate ($)" placeholder="12.00" value={shipping.value.flatRate} onChange={(flatRate) => shipping.update({ flatRate })} />
                <Text label="Shipping note" value={shipping.value.shippingNote} onChange={(shippingNote) => shipping.update({ shippingNote })} />
              </div>
            ) : null}
          </Section>
        </div>
      ) : null}
    </div>
  );
}
