import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LoopVideo } from "@/components/store/loop-video";
import { db, schema } from "@/db";
import { Breadcrumbs, Container } from "@/components/store/ui";
import { JsonLd } from "@/components/store/json-ld";
import { redirectOrNotFound } from "@/lib/redirects";
import { breadcrumbLd, faqLd, faqsFromHtml } from "@/lib/seo";
import { stripHtml, truncate } from "@/lib/utils";

export const revalidate = 600;

const getPage = (handle: string) =>
  db.query.pages.findFirst({ where: and(eq(schema.pages.handle, handle), eq(schema.pages.published, true)) });

export async function generateMetadata({ params }: PageProps<"/pages/[handle]">): Promise<Metadata> {
  const p = await getPage((await params).handle);
  if (!p) return {};
  return { title: p.seoTitle || p.title, description: p.seoDescription || truncate(stripHtml(p.bodyHtml), 160), alternates: { canonical: `/pages/${p.handle}` } };
}

export default async function ContentPage({ params }: PageProps<"/pages/[handle]">) {
  const { handle } = await params;
  const page = await getPage(handle);
  if (!page) return redirectOrNotFound(`/pages/${handle}`);
  const isAbout = handle === "about-us";

  return (
    <>
      <JsonLd data={[breadcrumbLd([{ name: page.title, path: `/pages/${page.handle}` }]), handle === "faqs" ? faqLd(faqsFromHtml(page.bodyHtml)) : null]} />
      {isAbout && (
        <section className="bg-ink text-cream lg:grid lg:grid-cols-12 lg:h-[calc(100svh-108px)] lg:min-h-[560px] lg:max-h-[860px]">
          <div className="lg:col-span-5 flex flex-col justify-end px-4 sm:px-10 lg:px-14 pt-12 pb-10 lg:py-14">
            <p className="text-[11px] tracking-[0.3em] uppercase text-marigold">Our story</p>
            <h1 className="font-display text-[52px] sm:text-7xl xl:text-[88px] leading-[0.92] tracking-[-0.015em] mt-5">Style meets sense</h1>
            <p className="mt-6 max-w-md text-cream/75 leading-relaxed">
              A design-led label from Gurgaon, making easygoing, feel-good clothes for escape-seekers and life-lovers — with a little tech woven into every thread.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/collections/all" className="rounded-full bg-marigold text-ink px-7 py-3.5 text-[11px] font-semibold tracking-[0.22em] uppercase hover:bg-cream transition-colors">
                Shop the collection
              </Link>
              <Link href="/contact" className="rounded-full border border-cream/40 px-7 py-3.5 text-[11px] tracking-[0.22em] uppercase hover:bg-cream hover:text-ink transition-colors">
                Say hello
              </Link>
            </div>
          </div>
          <div className="lg:col-span-7 grid grid-cols-2 gap-px bg-ink h-[110vw] sm:h-[80vw] lg:h-auto">
            <div className="relative overflow-hidden">
              <LoopVideo src="/videos/trmd14.mp4" poster="/videos/trmd14.webp" priority className="absolute inset-0 size-full object-[50%_20%]" />
            </div>
            <div className="relative overflow-hidden">
              <Image src="/images/lifestyle/hero-pink-wall.webp" alt="Trumee floral bodice dress on a pink wall" fill priority sizes="(min-width:1024px) 30vw, 50vw" className="object-cover object-[50%_15%]" />
            </div>
          </div>
        </section>
      )}
      <Container className="pt-10 sm:pt-14">
        <div className="max-w-3xl mx-auto">
          {!isAbout && (
            <>
              <Breadcrumbs items={[{ label: page.title }]} />
              <h1 className="font-display text-5xl sm:text-6xl mt-4 mb-10">{page.title}</h1>
            </>
          )}
          <div className={isAbout ? "prose-trumee text-[17px]" : "prose-trumee"} dangerouslySetInnerHTML={{ __html: page.bodyHtml }} />
        </div>
      </Container>
    </>
  );
}
