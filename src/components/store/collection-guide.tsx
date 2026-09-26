import Link from "next/link";
import { listCollections } from "@/lib/catalog";
import { Container } from "./ui";

/**
 * Below-the-grid SEO content: styling/buying guide, FAQs (mirrored as FAQPage JSON-LD
 * by the page), and a contextual internal-link block to every other collection.
 */
export async function CollectionGuide({ handle, title, guideHtml, faqs }: { handle: string; title: string; guideHtml: string | null; faqs: { q: string; a: string }[] }) {
  const all = await listCollections();
  const others = all.filter((c) => c.handle !== handle);
  if (!guideHtml && !faqs.length) return <ExploreLinks others={others} />;

  return (
    <>
      <section className="mt-24 border-t border-line pt-16">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_1fr] gap-12 lg:gap-20">
            {guideHtml && (
              <article>
                <p className="text-[11px] tracking-[0.3em] uppercase text-plum mb-4">The {title} guide</p>
                <div className="prose-trumee max-w-2xl [&_h2]:text-[28px] [&_h2]:sm:text-[34px] [&_h2]:leading-tight" dangerouslySetInnerHTML={{ __html: guideHtml }} />
              </article>
            )}
            {faqs.length > 0 && (
              <aside>
                <h2 className="font-display text-[28px] sm:text-[34px] leading-tight">Frequently asked questions</h2>
                <div className="mt-6 divide-y divide-line border-y border-line">
                  {faqs.map((f, i) => (
                    <details key={f.q} className="group py-4" open={i === 0}>
                      <summary className="py-2 -my-2 flex justify-between gap-4 cursor-pointer list-none font-medium text-[15px]">
                        <h3>{f.q}</h3>
                        <span className="text-lg leading-none transition-transform group-open:rotate-45 shrink-0">+</span>
                      </summary>
                      <p className="text-sm text-ink-soft mt-3 leading-relaxed">{f.a}</p>
                    </details>
                  ))}
                </div>
                <p className="text-sm text-muted mt-6">
                  More questions? Read our <Link href="/pages/faqs" className="underline">FAQs</Link> or <Link href="/contact" className="underline">contact us</Link>.
                </p>
              </aside>
            )}
          </div>
        </Container>
      </section>
      <ExploreLinks others={others} />
    </>
  );
}

function ExploreLinks({ others }: { others: { handle: string; title: string; group: string }[] }) {
  const cats = others.filter((c) => c.group === "category");
  const edits = others.filter((c) => c.group !== "category");
  return (
    <Container className="mt-16">
      <nav aria-label="Explore more collections" className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-sm">
        <div>
          <p className="text-[11px] tracking-[0.24em] uppercase text-muted mb-3">Shop by category</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {cats.map((c) => (
              <li key={c.handle}>
                <Link href={`/collections/${c.handle}`} className="underline-offset-4 hover:underline">
                  {c.title} for women
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[11px] tracking-[0.24em] uppercase text-muted mb-3">Shop the edits</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {edits.map((c) => (
              <li key={c.handle}>
                <Link href={`/collections/${c.handle}`} className="underline-offset-4 hover:underline">
                  {c.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </Container>
  );
}
