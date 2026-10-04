import { colorOf, craftOf, dayRange, GOOGLE_CATEGORY, patternOf } from "./product-facts";
import type { ShippingSettings, StoreSettings } from "./settings";
import { stripHtml } from "./utils";

/** schema.org JSON-LD builders. Rendered with <JsonLd/>. */

export const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
export const abs = (path: string) => (path.startsWith("http") ? path : SITE + path);

export function organizationLd(store: StoreSettings) {
  return {
    "@context": "https://schema.org",
    "@type": ["OnlineStore", "ClothingStore"],
    "@id": SITE + "/#organization",
    name: "Trumee",
    legalName: store.legalName,
    alternateName: "Trumee Studio",
    url: SITE,
    logo: { "@type": "ImageObject", url: abs("/favicon.svg") },
    image: abs("/videos/hero-motion.webp"),
    slogan: store.tagline,
    description:
      "Trumee is an Indian women's western-wear brand from Gurgaon making breathable boho dresses, crochet and embroidered tops, shirts, skirts, schiffli jumpsuits and co-ord sets for women aged 20–48 — chic, comfortable and affordable everyday and vacation outfits.",
    foundingLocation: { "@type": "Place", name: "Gurgaon, Haryana, India" },
    areaServed: { "@type": "Country", name: "India" },
    knowsAbout: ["Boho dresses", "Crochet tops", "Schiffli embroidery", "Co-ord sets", "Women's western wear", "Vacation outfits", "Breathable cotton clothing"],
    priceRange: "₹549–₹2,499",
    currenciesAccepted: "INR",
    paymentAccepted: "UPI, Credit Card, Debit Card, Net Banking, Wallets, Cash on Delivery",
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
      hoursAvailable: "Mo-Sa 10:00-18:00",
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

export function collectionLd(
  c: { title: string; path: string; description: string },
  items: { handle: string; title: string; images?: { url: string }[] }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: c.title,
    url: abs(c.path),
    description: c.description,
    isPartOf: { "@id": SITE + "/#website" },
    about: { "@type": "Thing", name: `${c.title} for women` },
    audience: { "@type": "PeopleAudience", suggestedGender: "https://schema.org/Female", suggestedMinAge: 18 },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: items.length,
      itemListElement: items.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: abs(`/products/${p.handle}`),
        name: p.title,
        ...(p.images?.[0] ? { image: abs(p.images[0].url) } : {}),
      })),
    },
  };
}

/** Mirrors /pages/returns-policy: 7 days, buyer pays return postage unless we erred; refunds or exchanges. */
export function returnPolicyLd() {
  return {
    "@type": "MerchantReturnPolicy",
    applicableCountry: "IN",
    returnPolicyCountry: "IN",
    returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
    merchantReturnDays: 7,
    merchantReturnLink: abs("/pages/returns-policy"),
    returnMethod: "https://schema.org/ReturnByMail",
    returnFees: "https://schema.org/ReturnShippingFees",
    customerRemorseReturnFees: "https://schema.org/ReturnShippingFees",
    itemDefectReturnFees: "https://schema.org/FreeReturn",
    refundType: ["https://schema.org/FullRefund", "https://schema.org/ExchangeRefund"],
    itemCondition: "https://schema.org/NewCondition",
  };
}

/** Flat-rate pan-India shipping; handling and transit windows come from the shipping settings. */
export function shippingLd(s: ShippingSettings) {
  const [hMin, hMax] = dayRange(s.processingDays, [1, 2]);
  const transit = s.deliveryEstimates.map((d) => dayRange(d.days, [2, 8]));
  const tMin = transit.length ? Math.min(...transit.map((t) => t[0])) : 2;
  const tMax = transit.length ? Math.max(...transit.map((t) => t[1])) : 8;
  return {
    "@type": "OfferShippingDetails",
    shippingRate: { "@type": "MonetaryAmount", value: (s.flatRate / 100).toFixed(2), currency: "INR" },
    shippingDestination: { "@type": "DefinedRegion", addressCountry: "IN" },
    ...(s.freeShippingThreshold != null
      ? { freeShippingThreshold: { "@type": "MonetaryAmount", value: (s.freeShippingThreshold / 100).toFixed(2), currency: "INR" } }
      : {}),
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      handlingTime: { "@type": "QuantitativeValue", minValue: hMin, maxValue: hMax, unitCode: "DAY" },
      transitTime: { "@type": "QuantitativeValue", minValue: tMin, maxValue: tMax, unitCode: "DAY" },
    },
  };
}

/**
 * Product page markup as a ProductGroup (one per style) whose variants are the sizes, each with
 * its own Offer: price, sale/strikethrough price, stock, shipping and returns. Ratings and reviews
 * are only emitted when real approved reviews exist.
 */
export function productLd(
  p: {
    title: string;
    handle: string;
    descriptionHtml: string;
    productType: string;
    fabric: string | null;
    care?: string | null;
    tags?: string[];
    images: { url: string; alt?: string | null }[];
    videoUrl?: string | null;
    videoPoster?: string | null;
    variants: {
      sku: string | null;
      price: number;
      compareAtPrice?: number | null;
      title: string;
      inventoryQty: number;
      trackInventory: boolean;
      allowBackorder?: boolean;
      option1: string | null;
      option2: string | null;
    }[];
    reviews: { rating: number; name: string; body: string; title?: string | null; createdAt: Date }[];
    rating: number | null;
  },
  shipping: ShippingSettings,
) {
  const url = abs(`/products/${p.handle}`);
  const validUntil = new Date(Date.now() + 90 * 86400_000).toISOString().slice(0, 10);
  const color = colorOf(p.title, p.variants.find((v) => v.option2)?.option2, p.tags);
  const pattern = patternOf(p.title, p.tags);
  const craft = craftOf(p.title, p.tags);
  const audience = { "@type": "PeopleAudience", suggestedGender: "https://schema.org/Female", suggestedMinAge: 18 };
  const facts = [
    p.fabric && { "@type": "PropertyValue", name: "Fabric", value: p.fabric },
    { "@type": "PropertyValue", name: "Care", value: p.care ?? "Gentle hand wash in cold water. Dry in shade." },
    ...craft.map((c) => ({ "@type": "PropertyValue", name: "Detail", value: c })),
    { "@type": "PropertyValue", name: "Designed in", value: "Gurgaon, India" },
  ].filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": "ProductGroup",
    "@id": url + "#product",
    name: p.title,
    url,
    description: stripHtml(p.descriptionHtml).slice(0, 5000),
    image: p.images.map((i) => abs(i.url)),
    brand: { "@type": "Brand", name: "Trumee" },
    manufacturer: { "@id": SITE + "/#organization" },
    category: GOOGLE_CATEGORY[p.productType] ?? (p.productType ? `Apparel & Accessories > Clothing > ${p.productType}` : undefined),
    material: p.fabric ?? undefined,
    color,
    pattern,
    audience,
    additionalProperty: facts,
    productGroupID: p.handle,
    variesBy: ["https://schema.org/size"],
    ...(p.videoUrl
      ? {
          subjectOf: {
            "@type": "VideoObject",
            name: `${p.title} — catwalk video`,
            description: `See the ${p.title} by Trumee in motion: fit, fall and fabric.`,
            contentUrl: abs(p.videoUrl),
            thumbnailUrl: abs(p.videoPoster ?? p.images[0]?.url ?? ""),
            uploadDate: "2025-07-08",
          },
        }
      : {}),
    hasVariant: p.variants.map((v) => {
      const onSale = v.compareAtPrice != null && v.compareAtPrice > v.price;
      const inStock = !v.trackInventory || v.allowBackorder || v.inventoryQty > 0;
      return {
        "@type": "Product",
        name: `${p.title} — ${v.title}`,
        sku: v.sku ?? undefined,
        inProductGroupWithID: p.handle,
        size: v.option1 ? { "@type": "SizeSpecification", name: v.option1, sizeGroup: "https://schema.org/WearableSizeGroupRegular" } : undefined,
        color: colorOf(p.title, v.option2, p.tags),
        image: abs(p.images[0]?.url ?? ""),
        audience,
        offers: {
          "@type": "Offer",
          url,
          priceCurrency: "INR",
          price: (v.price / 100).toFixed(2),
          ...(onSale
            ? {
                priceSpecification: [
                  { "@type": "UnitPriceSpecification", price: (v.price / 100).toFixed(2), priceCurrency: "INR" },
                  { "@type": "UnitPriceSpecification", priceType: "https://schema.org/StrikethroughPrice", price: (v.compareAtPrice! / 100).toFixed(2), priceCurrency: "INR" },
                ],
              }
            : {}),
          priceValidUntil: validUntil,
          itemCondition: "https://schema.org/NewCondition",
          availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          shippingDetails: shippingLd(shipping),
          hasMerchantReturnPolicy: returnPolicyLd(),
          seller: { "@id": SITE + "/#organization" },
        },
      };
    }),
    ...(p.reviews.length && p.rating
      ? {
          aggregateRating: { "@type": "AggregateRating", ratingValue: p.rating.toFixed(1), reviewCount: p.reviews.length, bestRating: 5, worstRating: 1 },
          review: p.reviews.slice(0, 10).map((r) => ({
            "@type": "Review",
            name: r.title ?? undefined,
            reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5, worstRating: 1 },
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
