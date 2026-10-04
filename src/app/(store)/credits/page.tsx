import type { Metadata } from "next";
import { Breadcrumbs, Container } from "@/components/store/ui";
import { CRAFT_IMAGES } from "@/lib/trust";

export const metadata: Metadata = { title: "Image credits", robots: { index: false, follow: true }, alternates: { canonical: "/credits" } };

/** Attribution for openly licensed photography used on the site (required by CC BY / CC BY-SA). */
export default function CreditsPage() {
  return (
    <Container className="pt-12 sm:pt-16 max-w-3xl">
      <Breadcrumbs items={[{ label: "Image credits" }]} />
      <h1 className="font-display text-5xl mt-4">Image credits</h1>
      <p className="text-ink-soft mt-4">
        Product and lifestyle photography is © Trumee. The craft photographs below are used under open licences from Wikimedia Commons and were resized for the web.
      </p>
      <ul className="mt-10 divide-y divide-line border-y border-line text-sm">
        {CRAFT_IMAGES.map((c) => (
          <li key={c.src} className="py-4 flex flex-wrap gap-x-2">
            <a href={c.href} target="_blank" rel="noopener" className="underline underline-offset-4">
              {c.credit}
            </a>
            <span className="text-muted">
              ·{" "}
              {c.license.url ? (
                <a href={c.license.url} target="_blank" rel="noopener license" className="underline underline-offset-4">
                  {c.license.name}
                </a>
              ) : (
                c.license.name
              )}
            </span>
          </li>
        ))}
      </ul>
    </Container>
  );
}
