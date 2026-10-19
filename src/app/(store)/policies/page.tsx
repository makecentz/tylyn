import type { Metadata } from "next";
import { getAllContent } from "@/lib/content";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Policies and FAQs" };

export default async function PoliciesPage() {
  const { policies, faqs } = await getAllContent();
  return (
    <div className="mx-auto flex max-w-[820px] flex-col gap-12 px-4 pb-24 pt-12 sm:px-6">
      <section className="flex flex-col gap-6">
        <h1 className="font-serif text-5xl">Policies</h1>
        {policies.sections.map((s) => (
          <div key={s.title} id={s.title.toLowerCase().includes("privacy") ? "privacy" : s.title.toLowerCase().includes("terms") ? "terms" : undefined} className="flex flex-col gap-2 border-l-4 border-gold pl-5">
            <h2 className="font-serif text-2xl">{s.title}</h2>
            <p className="whitespace-pre-line leading-relaxed text-[#4A3F45]">{s.body}</p>
          </div>
        ))}
      </section>
      {faqs.items.length ? (
        <section id="faqs" className="flex flex-col gap-4">
          <h2 className="font-serif text-4xl">FAQs</h2>
          {faqs.items.map((f) => (
            <details key={f.q} className="group rounded-xl border border-line px-5 py-4 open:bg-blush">
              <summary className="cursor-pointer list-none font-semibold">{f.q}</summary>
              <p className="mt-2 whitespace-pre-line leading-relaxed text-[#4A3F45]">{f.a}</p>
            </details>
          ))}
        </section>
      ) : null}
    </div>
  );
}
