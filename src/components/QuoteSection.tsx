import { quoteServiceOptions } from "@/lib/quote";
import { QuoteForm } from "./QuoteForm";

/** The "Get a quote" band: heading on the left, form on the right. */
export async function QuoteSection({ defaultService }: { defaultService?: string }) {
  const services = await quoteServiceOptions();
  return (
    <section id="quote" aria-labelledby="quote-title" className="bg-ink text-white">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-start gap-10 px-4 py-20 sm:px-6">
        <div className="flex min-w-[min(100%,300px)] flex-1 flex-col gap-4 lg:sticky lg:top-28">
          <span className="font-script text-4xl text-pink-light">Planning something special?</span>
          <h2 id="quote-title" className="font-serif text-4xl sm:text-[44px]">Get a custom quote</h2>
          <p className="max-w-md leading-relaxed text-[#CFC6CB]">
            Tell us your event date and what you have in mind. We&apos;ll reply with pricing and design ideas, usually within 1 to 2 business days.
          </p>
          <div className="h-px w-24 bg-gold" />
        </div>
        <div className="min-w-[min(100%,420px)] flex-[1.4]">
          <QuoteForm services={services} defaultService={defaultService} />
        </div>
      </div>
    </section>
  );
}
