import "server-only";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { colorOf, craftOf, patternOf } from "./product-facts";
import { abs } from "./seo";
import { getSettings } from "./settings";
import { stripHtml, truncate } from "./utils";

const rupees = (paise: number) => `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;

/** Brand facts written for answer engines: short, factual, quotable. */
export async function brandFacts() {
  const [store, shipping, payments] = await Promise.all([getSettings("store"), getSettings("shipping"), getSettings("payments")]);
  return [
    `# Trumee`,
    ``,
    `> Trumee is an Indian women's western-wear brand (${store.legalName}, Gurgaon) for women aged 20–48 who want trendy, comfortable and affordable everyday and vacation outfits. We make breathable boho dresses, crochet and embroidered tops, shirts, skirts, schiffli jumpsuits and co-ord sets in cotton, rayon and georgette, sold online across India at ${abs("/")}.`,
    ``,
    `## Key facts`,
    `- Style: chic, confident boho and casual western wear — crochet lace, schiffli embroidery, Sanganeri-inspired prints`,
    `- Fabrics: breathable natural fabrics — cotton, cotton slub, cotton moss, rayon, georgette, denim`,
    `- Sizes: XS–2XL, true to size (size chart: ${abs("/pages/sizing-chart")})`,
    `- Price range: about ₹549–₹2,499; most pieces under ₹1,600`,
    `- Shipping: pan-India via Shiprocket courier partners; flat ${rupees(shipping.flatRate)}; dispatched in ${shipping.processingDays}; ${shipping.deliveryEstimates.map((d) => `${d.label.toLowerCase()} ${d.days}`).join(", ")} (${abs("/pages/shipping-policy")})`,
    `- Payments: UPI, cards, netbanking, wallets (Razorpay)${shipping.codEnabled ? " and cash on delivery" : ""}${payments.prepaidDiscountPercent > 0 ? `; ${payments.prepaidDiscountPercent}% off when you pay online (prepaid)` : ""}`,
    `- Returns & exchanges: within 7 days of delivery on unworn pieces with tags; free pickup for damaged or wrong items (${abs("/pages/returns-policy")})`,
    `- Order tracking: ${abs("/track-order")}`,
    `- Contact: ${store.email} · ${store.phone} · WhatsApp https://wa.me/${store.whatsapp} · ${store.supportHours}`,
    `- Designed in Gurgaon, Haryana, India`,
  ];
}

/** /llms.txt — the curated map. */
export async function llmsIndex() {
  const [facts, collections, posts] = await Promise.all([
    brandFacts(),
    db.select().from(schema.collections).where(eq(schema.collections.published, true)).orderBy(asc(schema.collections.position)),
    db.select({ handle: schema.blogPosts.handle, title: schema.blogPosts.title, excerpt: schema.blogPosts.excerpt }).from(schema.blogPosts).where(eq(schema.blogPosts.published, true)),
  ]);
  const cats = collections.filter((c) => c.group === "category");
  const edits = collections.filter((c) => c.group !== "category");
  return [
    ...facts,
    ``,
    `## Shop by category`,
    `- [All clothing](${abs("/collections/all")}): every Trumee piece`,
    ...cats.map((c) => `- [${c.title} for women](${abs(`/collections/${c.handle}`)}): ${stripHtml(c.descriptionHtml)}`),
    ``,
    `## Edits (curated moods)`,
    ...edits.map((c) => `- [${c.title}](${abs(`/collections/${c.handle}`)}): ${stripHtml(c.descriptionHtml)}`),
    ``,
    `## Guides`,
    ...posts.map((p) => `- [${p.title}](${abs(`/blogs/news/${p.handle}`)})${p.excerpt ? `: ${p.excerpt}` : ""}`),
    `- [FAQs](${abs("/pages/faqs")})`,
    `- [Size chart](${abs("/pages/sizing-chart")})`,
    ``,
    `## Machine-readable`,
    `- [Full product catalog for AI assistants](${abs("/llms-full.txt")})`,
    `- [Product feed (Google/Bing Merchant format)](${abs("/feeds/google-merchant.xml")})`,
    `- [Sitemap](${abs("/sitemap.xml")})`,
    ``,
  ].join("\n");
}

/** /llms-full.txt — every live product with the facts shoppers ask assistants about. */
export async function llmsFull() {
  const [facts, products] = await Promise.all([
    brandFacts(),
    db.query.products.findMany({
      where: eq(schema.products.status, "active"),
      orderBy: asc(schema.products.productType),
      with: { variants: { orderBy: asc(schema.variants.position) } },
    }),
  ]);
  const byType = new Map<string, typeof products>();
  for (const p of products) byType.set(p.productType || "Other", [...(byType.get(p.productType || "Other") ?? []), p]);

  const out = [...facts, ``, `## Catalog (${products.length} styles)`, ``];
  for (const [type, list] of byType) {
    out.push(`### ${type}`, ``);
    for (const p of list) {
      const prices = p.variants.filter((v) => v.price > 0);
      if (!prices.length) continue;
      const v = prices[0];
      const sale = v.compareAtPrice && v.compareAtPrice > v.price ? ` (was ${rupees(v.compareAtPrice)})` : "";
      const sizes = prices.map((x) => `${x.option1}${!x.trackInventory || x.allowBackorder || x.inventoryQty > 0 ? "" : " (sold out)"}`).join(", ");
      const details = [
        p.fabric && `Fabric: ${p.fabric}`,
        colorOf(p.title, v.option2, p.tags) && `Colour: ${colorOf(p.title, v.option2, p.tags)}`,
        patternOf(p.title, p.tags) && `Pattern: ${patternOf(p.title, p.tags)}`,
        ...craftOf(p.title, p.tags),
      ].filter(Boolean);
      out.push(
        `- **[${p.title}](${abs(`/products/${p.handle}`)})** — ${rupees(v.price)}${sale}. Sizes: ${sizes}. ${details.join(" · ")}`,
        `  ${truncate(stripHtml(p.descriptionHtml).replace(/\s+/g, " "), 280)}`,
      );
    }
    out.push(``);
  }
  return out.join("\n");
}
