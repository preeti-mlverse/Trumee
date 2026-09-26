import type { Metadata } from "next";
import { CollectionBanner } from "@/components/store/collection-banner";
import { CollectionGuide } from "@/components/store/collection-guide";
import { JsonLd } from "@/components/store/json-ld";
import { Listing } from "@/components/store/listing";
import { Container } from "@/components/store/ui";
import { getCollection, listProducts } from "@/lib/catalog";
import { redirectOrNotFound } from "@/lib/redirects";
import { breadcrumbLd, collectionLd, faqLd } from "@/lib/seo";
import { stripHtml, truncate } from "@/lib/utils";

const FILTER_KEYS = ["size", "type", "min", "max", "instock", "sort", "fabric", "occasion", "detail"];

async function load(handle: string) {
  if (handle === "all")
    return {
      id: undefined,
      title: "All clothing",
      descriptionHtml: "<p>Every Trumee piece — boho dresses, crochet tops, embroidered skirts, schiffli jumpsuits, shirts and co-ord sets.</p>",
      imageUrl: null,
      seoTitle: "Women’s Western Wear Online — Dresses, Tops & Co-ords",
      seoDescription: "Shop all Trumee women’s western wear: boho dresses, crochet tops, embroidered skirts, jumpsuits and co-ord sets. COD & 7-day returns across India.",
      guideHtml: null,
      faqs: [] as { q: string; a: string }[],
      handle,
      group: "all" as const,
    };
  return getCollection(handle);
}

export async function generateMetadata({ params, searchParams }: PageProps<"/collections/[handle]">): Promise<Metadata> {
  const { handle } = await params;
  const sp = await searchParams;
  const c = await load(handle);
  if (!c) return {};
  const title = c.seoTitle?.replace(/ \| Trumee$/, "") || `${c.title} for Women`;
  const description = c.seoDescription || truncate(stripHtml(c.descriptionHtml) || `Shop ${c.title} at Trumee.`, 160);
  // Filtered/sorted views are near-duplicates: keep them out of the index, follow their links.
  const filtered = FILTER_KEYS.some((k) => sp[k] != null);
  const page = Number(sp.page) || 1;
  return {
    title,
    description,
    alternates: { canonical: `/collections/${handle}${page > 1 && !filtered ? `?page=${page}` : ""}` },
    robots: filtered ? { index: false, follow: true } : undefined,
    openGraph: { title, description, url: `/collections/${handle}`, images: c.imageUrl ? [c.imageUrl] : undefined },
  };
}

export default async function CollectionPage({ params, searchParams }: PageProps<"/collections/[handle]">) {
  const { handle } = await params;
  const sp = await searchParams;
  const c = await load(handle);
  if (!c) return redirectOrNotFound(`/collections/${handle}`);
  const { items } = await listProducts({ collectionId: c.id, limit: 24 });
  const path = `/collections/${handle}`;

  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd([{ name: "Collections", path: "/collections" }, { name: c.title, path }]),
          collectionLd({ title: c.title, path, description: stripHtml(c.descriptionHtml) }, items),
          faqLd(c.faqs),
        ]}
      />
      <CollectionBanner
        collectionId={c.id}
        handle={handle}
        title={c.title}
        descriptionHtml={c.descriptionHtml}
        imageUrl={c.imageUrl}
        group={c.group === "category" || c.group === "all" ? c.group : "edit"}
      />
      <Container className="pt-2">
        <Listing sp={sp} collectionId={c.id} listName={`Collection – ${c.title}`} basePath={path} />
      </Container>
      <CollectionGuide handle={handle} title={c.title} guideHtml={c.guideHtml} faqs={c.faqs} />
    </>
  );
}
