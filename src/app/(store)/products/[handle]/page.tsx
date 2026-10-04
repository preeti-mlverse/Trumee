import { BadgeCheck, MessageCircle, Sparkles, Star } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/store/json-ld";
import { EventOnMount } from "@/components/store/list-tracker";
import { breadcrumbLd, productLd } from "@/lib/seo";
import { ProductGrid } from "@/components/store/product-card";
import { ProductForm } from "@/components/store/product-form";
import { ProductGallery } from "@/components/store/product-gallery";
import { ReviewForm } from "@/components/store/review-form";
import { StickyBuyBar } from "@/components/store/sticky-buy-bar";
import { DeliveryChecker, TrustBadges } from "@/components/store/trust";
import { colorOf, craftOf } from "@/lib/product-facts";
import { craftNotes } from "@/lib/trust";
import { Breadcrumbs, Container, SectionHeading } from "@/components/store/ui";
import { getProduct, listProducts } from "@/lib/catalog";
import { redirectOrNotFound } from "@/lib/redirects";
import { getSettings } from "@/lib/settings";
import { cn, formatDate, stripHtml, truncate } from "@/lib/utils";

export const revalidate = 120;

export async function generateMetadata({ params }: PageProps<"/products/[handle]">): Promise<Metadata> {
  const { handle } = await params;
  const p = await getProduct(handle);
  if (!p) return {};
  const min = Math.min(...p.variants.map((v) => v.price));
  const sizes = p.variants.map((v) => v.option1).filter(Boolean);
  const range = sizes.length > 1 ? `${sizes[0]}–${sizes[sizes.length - 1]}` : sizes[0];
  const kind = p.productType ? p.productType.toLowerCase().replace(/sses$/, "ss").replace(/(?<!s)s$/, "") : "piece";
  // Title: product name + intent keywords; description: facts shoppers compare on (price, fabric, sizes, COD, returns)
  const title = p.seoTitle && !p.seoTitle.endsWith("| Trumee") ? p.seoTitle : `${p.title} for Women`;
  const description =
    p.seoDescription ||
    truncate(
      `Shop the ${p.title}${p.fabric ? ` in ${p.fabric.toLowerCase()}` : ""} — a Trumee ${kind} at ₹${(min / 100).toLocaleString("en-IN")}${range ? `, sizes ${range}` : ""}. Cash on delivery, 7-day returns & fast shipping across India.`,
      160,
    );
  return {
    title,
    description,
    alternates: { canonical: `/products/${p.handle}` },
    openGraph: { type: "website", title: p.title, description, images: p.images.slice(0, 4).map((i) => ({ url: i.url, width: i.width ?? undefined, height: i.height ?? undefined, alt: i.alt || p.title })) },
    other: { "product:price:amount": (min / 100).toFixed(2), "product:price:currency": "INR" },
  };
}

export default async function ProductPage({ params }: PageProps<"/products/[handle]">) {
  const { handle } = await params;
  const p = await getProduct(handle);
  if (!p) return redirectOrNotFound(`/products/${handle}`);

  const [shipping, store, payments] = await Promise.all([getSettings("shipping"), getSettings("store"), getSettings("payments")]);
  const notes = craftNotes(p);
  const variants = p.variants.map((v) => {
    const available = !v.trackInventory || v.allowBackorder || v.inventoryQty > 0;
    return { id: v.id, title: v.title, option1: v.option1, option2: v.option2, price: v.price, compareAtPrice: v.compareAtPrice, available, lowStock: v.trackInventory && v.inventoryQty > 0 && v.inventoryQty <= 3 };
  });
  const category = p.collections.map((c) => c.collection).find((c) => c.group === "category");
  const related = await listProducts({ collectionId: category?.id, excludeId: p.id, limit: 4, sort: "best-selling" });
  const minPrice = Math.min(...p.variants.map((v) => v.price));
  const jsonLd = [
    productLd(p, shipping),
    breadcrumbLd([...(category ? [{ name: category.title, path: `/collections/${category.handle}` }] : []), { name: p.title, path: `/products/${p.handle}` }]),
  ];

  const sizeList = p.variants.map((v) => v.option1).filter(Boolean) as string[];
  const glance: [string, string][] = [
    ["Fabric", p.fabric ?? "Breathable woven fabric"],
    ["Sizes", sizeList.length > 1 ? `${sizeList[0]} – ${sizeList[sizeList.length - 1]}, true to size` : (sizeList[0] ?? "One size")],
    ...((colorOf(p.title, p.variants.find((v) => v.option2)?.option2, p.tags) ? [["Colour", colorOf(p.title, p.variants.find((v) => v.option2)?.option2, p.tags)!]] : []) as [string, string][]),
    ...((craftOf(p.title, p.tags).length ? [["Details", craftOf(p.title, p.tags).join(", ")]] : []) as [string, string][]),
    ["Care", p.care ?? "Gentle hand wash, dry in shade"],
    ["Dispatch", `Ships in ${shipping.processingDays}`],
    ["Returns", "7-day returns & exchanges"],
    ["Payment", shipping.codEnabled ? "Online or cash on delivery" : "UPI, cards, netbanking"],
  ];
  const details = [
    { title: "Description", html: p.descriptionHtml, open: true },
    { title: "Fabric & care", html: `${p.fabric ? `<p><strong>Fabric:</strong> ${p.fabric}</p>` : ""}<p>${p.care ?? "Gentle hand wash in cold water. Dry in shade."}</p>` },
    {
      title: "Shipping & returns",
      html: `<p>Ships in ${shipping.processingDays}. ${shipping.deliveryEstimates.map((d) => `${d.label}: ${d.days}`).join(" · ")}.</p><p>Easy returns and size exchanges within 7 days of delivery on unworn pieces with tags. <a href="/pages/returns-policy">Read the returns & exchange policy</a>.</p>`,
    },
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <StickyBuyBar title={p.title} price={minPrice} soldOut={!variants.some((v) => v.available)} />
      <EventOnMount
        name="view_item"
        params={{ value: minPrice / 100, product_id: p.id, items: [{ item_id: p.id, item_name: p.title, item_category: p.productType, price: minPrice / 100 }] }}
      />
      <Container className="pt-6">
        <Breadcrumbs items={[...(category ? [{ label: category.title, href: `/collections/${category.handle}` }] : []), { label: p.title }]} />
      </Container>
      <Container className="pt-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_1fr] gap-8 lg:gap-16 items-start">
        <div className="-mx-4 sm:mx-0">
          <ProductGallery images={p.images} title={p.title} video={p.videoUrl ? { url: p.videoUrl, poster: p.videoPoster } : null} />
        </div>
        <div className="lg:sticky lg:top-24">
          {p.productType && <p className="text-[11px] tracking-[0.26em] uppercase text-plum">{p.productType}</p>}
          <h1 className="font-display text-[34px] sm:text-[42px] leading-[1.08] mt-2">{p.title}</h1>
          {p.reviews.length > 0 && p.rating && (
            <a href="#reviews" className="mt-3 inline-flex items-center gap-2 text-sm text-muted">
              <Stars value={p.rating} /> {p.rating.toFixed(1)} · {p.reviews.length} review{p.reviews.length > 1 ? "s" : ""}
            </a>
          )}
          <div id="buy-box" className="mt-6 scroll-mt-24">
            <ProductForm productId={p.id} title={p.title} options={p.options} variants={variants} prepaidPercent={payments.prepaidDiscountPercent} />
          </div>
          <div className="mt-8 space-y-6">
            <DeliveryChecker prepaidPercent={payments.prepaidDiscountPercent} />
            <TrustBadges codEnabled={shipping.codEnabled} />
            <a
              href={`https://wa.me/${store.whatsapp}?text=${encodeURIComponent(`Hi Trumee! I have a question about “${p.title}”`)}`}
              target="_blank"
              rel="noopener"
              className="flex items-center gap-2 py-1.5 text-sm underline underline-offset-4"
            >
              <MessageCircle className="size-4" strokeWidth={1.5} /> Not sure about the fit? Ask our stylist on WhatsApp
            </a>
          </div>
          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3 rounded-3xl border border-line/70 bg-[#fffdf8]/60 p-5 text-sm">
            <p className="col-span-2 text-[11px] tracking-[0.24em] uppercase text-plum">At a glance</p>
            {glance.map(([k, v]) => (
              <div key={k}>
                <dt className="text-[11px] tracking-[0.12em] uppercase text-muted">{k}</dt>
                <dd className="mt-0.5 text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-2 divide-y divide-line">
            {details.map((d) => (
              <details key={d.title} open={d.open} className="group py-4">
                <summary className="py-2 -my-2 flex justify-between items-center cursor-pointer list-none text-xs tracking-[0.18em] uppercase">
                  {d.title}
                  <span className="text-lg leading-none transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="prose-trumee text-sm mt-4" dangerouslySetInnerHTML={{ __html: d.html }} />
              </details>
            ))}
          </div>
        </div>
      </Container>

      {notes.length > 0 && (
        <section className="mt-24 px-2 sm:px-4 lg:px-6">
          <div className="mx-auto max-w-[1400px] rounded-panel bg-[#fffdf8]/75 py-14 sm:py-16 px-4 sm:px-6 lg:px-10">
            <p className="flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase text-plum">
              <Sparkles className="size-3.5" /> Why you’ll love it
            </p>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {notes.map((n) => (
                <div key={n.title} className="rounded-3xl border border-ink/10 p-6">
                  <h3 className="font-display text-[28px] leading-tight">{n.title}</h3>
                  <p className="text-sm text-ink-soft mt-2 leading-relaxed">{n.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <Container className="pt-24">
        <div id="reviews" className="scroll-mt-28 grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-10">
          <div>
            <h2 className="font-display text-4xl">Reviews</h2>
            {p.rating ? (
              <div className="mt-4">
                <p className="font-display text-5xl">{p.rating.toFixed(1)}</p>
                <Stars value={p.rating} />
                <p className="text-sm text-muted mt-1">Based on {p.reviews.length} review{p.reviews.length > 1 ? "s" : ""}</p>
              </div>
            ) : (
              <p className="text-sm text-muted mt-3">No reviews yet — be the first to share how it fits.</p>
            )}
            <div className="mt-6">
              <ReviewForm productId={p.id} />
            </div>
          </div>
          <ul className="divide-y divide-line">
            {p.reviews.map((r) => (
              <li key={r.id} className="py-6 first:pt-0">
                <div className="flex items-center gap-3">
                  <Stars value={r.rating} />
                  {r.verified && (
                    <span className="flex items-center gap-1 text-xs text-sage">
                      <BadgeCheck className="size-3.5" /> Verified buyer
                    </span>
                  )}
                </div>
                {r.title && <p className="mt-2 font-medium">{r.title}</p>}
                <p className="mt-1 text-sm text-ink-soft leading-relaxed">{r.body}</p>
                <p className="mt-2 text-xs text-muted">
                  {r.name} · {formatDate(r.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </Container>

      <Container className="pt-16">
        <nav aria-label="Explore more" className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-[11px] tracking-[0.24em] uppercase text-muted mr-2">Explore</span>
          {p.collections.map(({ collection: c }) => (
            <Link key={c.id} href={`/collections/${c.handle}`} className="rounded-full border border-line px-4 py-2 hover:border-ink">
              {c.group === "category" ? `${c.title} for women` : c.title}
            </Link>
          ))}
          <Link href="/blogs/news" className="rounded-full border border-line px-4 py-2 hover:border-ink">Style guides</Link>
        </nav>
      </Container>

      {related.items.length > 0 && (
        <Container className="pt-24">
          <SectionHeading title="You may also like" href={category ? `/collections/${category.handle}` : undefined} />
          <ProductGrid items={related.items} list="Product – Related" />
        </Container>
      )}
    </>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn("size-4", n <= Math.round(value) ? "fill-marigold text-marigold" : "text-line")} strokeWidth={1.3} />
      ))}
    </span>
  );
}
