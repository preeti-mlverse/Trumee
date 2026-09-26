import type { ShippingSettings, StoreSettings } from "./settings";
import { stripHtml } from "./utils";

/** schema.org JSON-LD builders. Rendered with <JsonLd/>. */

export const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
export const abs = (path: string) => (path.startsWith("http") ? path : SITE + path);

export function organizationLd(store: StoreSettings) {
  return {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    "@id": SITE + "/#organization",
    name: "Trumee",
    legalName: store.legalName,
    url: SITE,
    logo: abs("/favicon.svg"),
    description: store.tagline,
    email: store.email,
    telephone: store.phone.replace(/\s/g, ""),
    address: {
      "@type": "PostalAddress",
      streetAddress: "T-162, Ground Floor, Sector 109, New Palam Vihar, Carterpuri Road",
      addressLocality: "Gurgaon",
      addressRegion: "Haryana",
      postalCode: "122017",
      addressCountry: "IN",
    },
    sameAs: Object.values(store.social).filter(Boolean),
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      telephone: store.phone.replace(/\s/g, ""),
      email: store.email,
      areaServed: "IN",
      availableLanguage: ["en", "hi"],
    },
    hasMerchantReturnPolicy: returnPolicyLd(),
  };
}

export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": SITE + "/#website",
    url: SITE,
    name: "Trumee",
    inLanguage: "en-IN",
    publisher: { "@id": SITE + "/#organization" },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: SITE + "/search?q={search_term_string}" },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "/" }, ...items].map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: abs(it.path) })),
  };
}

export function faqLd(faqs: { q: string; a: string }[]) {
  if (!faqs.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

export function collectionLd(c: { title: string; path: string; description: string }, items: { handle: string; title: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: c.title,
    url: abs(c.path),
    description: c.description,
    isPartOf: { "@id": SITE + "/#website" },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: items.length,
      itemListElement: items.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: abs(`/products/${p.handle}`), name: p.title })),
    },
  };
}

export function returnPolicyLd() {
  return {
    "@type": "MerchantReturnPolicy",
    applicableCountry: "IN",
    returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
    merchantReturnDays: 7,
    returnMethod: "https://schema.org/ReturnByMail",
    returnFees: "https://schema.org/ReturnShippingFees",
  };
}

export function shippingLd(s: ShippingSettings) {
  return {
    "@type": "OfferShippingDetails",
    shippingRate: { "@type": "MonetaryAmount", value: (s.flatRate / 100).toFixed(2), currency: "INR" },
    shippingDestination: { "@type": "DefinedRegion", addressCountry: "IN" },
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      handlingTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 2, unitCode: "DAY" },
      transitTime: { "@type": "QuantitativeValue", minValue: 2, maxValue: 8, unitCode: "DAY" },
    },
  };
}

export function productLd(
  p: {
    title: string;
    handle: string;
    descriptionHtml: string;
    productType: string;
    fabric: string | null;
    images: { url: string }[];
    videoUrl?: string | null;
    videoPoster?: string | null;
    variants: { sku: string | null; price: number; title: string; inventoryQty: number; trackInventory: boolean; option1: string | null; option2: string | null }[];
    reviews: { rating: number; name: string; body: string; createdAt: Date }[];
    rating: number | null;
  },
  shipping: ShippingSettings,
) {
  const url = abs(`/products/${p.handle}`);
  const validUntil = new Date(Date.now() + 90 * 86400_000).toISOString().slice(0, 10);
  const color = p.variants.find((v) => v.option2)?.option2 ?? undefined;
  return {
    "@context": "https://schema.org",
    "@type": "ProductGroup",
    name: p.title,
    url,
    description: stripHtml(p.descriptionHtml).slice(0, 5000),
    image: p.images.map((i) => abs(i.url)),
    brand: { "@type": "Brand", name: "Trumee" },
    category: p.productType ? `Apparel & Accessories > Clothing > ${p.productType}` : undefined,
    material: p.fabric ?? undefined,
    color,
    productGroupID: p.handle,
    variesBy: ["https://schema.org/size"],
    audience: { "@type": "PeopleAudience", suggestedGender: "female" },
    ...(p.videoUrl
      ? { subjectOf: { "@type": "VideoObject", name: `${p.title} — catwalk video`, description: `See the ${p.title} in motion.`, contentUrl: abs(p.videoUrl), thumbnailUrl: abs(p.videoPoster ?? p.images[0]?.url ?? ""), uploadDate: "2025-07-08" } }
      : {}),
    hasVariant: p.variants.map((v) => ({
      "@type": "Product",
      name: `${p.title} — ${v.title}`,
      sku: v.sku ?? undefined,
      size: v.option1 ?? undefined,
      image: abs(p.images[0]?.url ?? ""),
      offers: {
        "@type": "Offer",
        url,
        priceCurrency: "INR",
        price: (v.price / 100).toFixed(2),
        priceValidUntil: validUntil,
        itemCondition: "https://schema.org/NewCondition",
        availability: !v.trackInventory || v.inventoryQty > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        shippingDetails: shippingLd(shipping),
        hasMerchantReturnPolicy: returnPolicyLd(),
        seller: { "@id": SITE + "/#organization" },
      },
    })),
    ...(p.reviews.length && p.rating
      ? {
          aggregateRating: { "@type": "AggregateRating", ratingValue: p.rating.toFixed(1), reviewCount: p.reviews.length, bestRating: 5 },
          review: p.reviews.slice(0, 10).map((r) => ({
            "@type": "Review",
            reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
            author: { "@type": "Person", name: r.name },
            reviewBody: r.body,
            datePublished: r.createdAt.toISOString().slice(0, 10),
          })),
        }
      : {}),
  };
}

export function articleLd(p: { title: string; handle: string; excerpt: string; coverUrl: string | null; author: string; publishedAt: Date | null; updatedAt: Date }) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: p.title,
    description: p.excerpt,
    image: p.coverUrl ? [abs(p.coverUrl)] : undefined,
    author: { "@type": "Organization", name: p.author, url: SITE },
    publisher: { "@id": SITE + "/#organization" },
    datePublished: p.publishedAt?.toISOString(),
    dateModified: p.updatedAt.toISOString(),
    mainEntityOfPage: abs(`/blogs/news/${p.handle}`),
  };
}

/** Extracts Q&A pairs from CMS HTML laid out as <h4>question</h4><p>answer</p>. */
export function faqsFromHtml(html: string) {
  return [...html.matchAll(/<h4>([\s\S]*?)<\/h4>\s*<p>([\s\S]*?)<\/p>/g)].map((m) => ({ q: stripHtml(m[1]), a: stripHtml(m[2]) }));
}
