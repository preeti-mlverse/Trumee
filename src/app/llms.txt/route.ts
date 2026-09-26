import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { abs } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { stripHtml } from "@/lib/utils";

export const revalidate = 3600;

/** /llms.txt — a plain-language map of the store for AI assistants and answer engines. */
export async function GET() {
  const [store, shipping, collections, posts] = await Promise.all([
    getSettings("store"),
    getSettings("shipping"),
    db.select().from(schema.collections).where(eq(schema.collections.published, true)).orderBy(asc(schema.collections.position)),
    db.select({ handle: schema.blogPosts.handle, title: schema.blogPosts.title }).from(schema.blogPosts).where(eq(schema.blogPosts.published, true)),
  ]);
  const lines = [
    `# Trumee`,
    ``,
    `> ${store.tagline}. Trumee is an Indian women's western-wear label (${store.legalName}, Gurgaon) making boho dresses, crochet and embroidered tops, schiffli jumpsuits, skirts, shirts and co-ord sets in breathable fabrics, sold online across India.`,
    ``,
    `- Sizes: XS–2XL (see ${abs("/pages/sizing-chart")})`,
    `- Shipping: pan-India, ₹${shipping.flatRate / 100} flat; dispatched in ${shipping.processingDays}`,
    `- Payments: UPI, cards, netbanking, wallets (Razorpay) and cash on delivery`,
    `- Returns: 7 days from delivery, unworn with tags (${abs("/pages/returns-policy")})`,
    `- Contact: ${store.email}, ${store.phone}, WhatsApp https://wa.me/${store.whatsapp}`,
    ``,
    `## Collections`,
    ...collections.map((c) => `- [${c.title}](${abs(`/collections/${c.handle}`)}): ${stripHtml(c.descriptionHtml)}`),
    ``,
    `## Guides`,
    ...posts.map((p) => `- [${p.title}](${abs(`/blogs/news/${p.handle}`)})`),
    `- [FAQs](${abs("/pages/faqs")})`,
    ``,
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
