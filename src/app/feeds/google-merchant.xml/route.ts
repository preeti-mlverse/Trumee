import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { colorOf, craftOf, dayRange, GOOGLE_CATEGORY, patternOf } from "@/lib/product-facts";
import { abs } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { stripHtml, truncate } from "@/lib/utils";

export const revalidate = 3600;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const money = (paise: number) => `${(paise / 100).toFixed(2)} INR`;

/**
 * Google Merchant Center product feed (RSS 2.0 + g: namespace) for free Shopping listings.
 * Add https://<domain>/feeds/google-merchant.xml as a scheduled fetch in Merchant Center;
 * Microsoft (Bing) Merchant Center — which also feeds Copilot shopping — accepts the same file.
 */
export async function GET() {
  const [products, shipping] = await Promise.all([
    db.query.products.findMany({
      where: eq(schema.products.status, "active"),
      with: { images: { orderBy: asc(schema.productImages.position) }, variants: { orderBy: asc(schema.variants.position) } },
    }),
    getSettings("shipping"),
  ]);

  const [hMin, hMax] = dayRange(shipping.processingDays, [1, 2]);
  const transit = shipping.deliveryEstimates.map((d) => dayRange(d.days, [2, 8]));
  const tMin = transit.length ? Math.min(...transit.map((t) => t[0])) : 2;
  const tMax = transit.length ? Math.max(...transit.map((t) => t[1])) : 8;

  const items = products.flatMap((p) =>
    p.variants
      .filter((v) => v.price > 0)
      .map((v) => {
        const onSale = v.compareAtPrice && v.compareAtPrice > v.price;
        const inStock = !v.trackInventory || v.allowBackorder || v.inventoryQty > 0;
        const fields: [string, string | undefined][] = [
          // Stable unique id per size (the legacy SKUs repeat across products, which Merchant Center rejects)
          ["g:id", `TRM-${v.id}`],
          ["g:item_group_id", p.handle],
          ["g:title", truncate(`${p.title} - ${v.title}`, 150)],
          ["g:description", truncate(stripHtml(p.descriptionHtml) || p.title, 4900)],
          ["g:link", abs(`/products/${p.handle}`)],
          ["g:image_link", p.images[0] ? abs(p.images[0].url) : undefined],
          ...p.images.slice(1, 10).map((i) => ["g:additional_image_link", abs(i.url)] as [string, string]),
          ["g:availability", inStock ? "in_stock" : "out_of_stock"],
          ["g:price", money(onSale ? v.compareAtPrice! : v.price)],
          ["g:sale_price", onSale ? money(v.price) : undefined],
          ["g:brand", "Trumee"],
          ["g:condition", "new"],
          ["g:identifier_exists", "no"],
          ["g:google_product_category", GOOGLE_CATEGORY[p.productType] ?? "Apparel & Accessories > Clothing"],
          ["g:product_type", p.productType || "Clothing"],
          ["g:gender", "female"],
          ["g:age_group", "adult"],
          ["g:size", v.option1 ?? undefined],
          ["g:size_system", "IN"],
          ["g:size_type", "regular"],
          ["g:color", colorOf(p.title, v.option2, p.tags)],
          ["g:pattern", patternOf(p.title, p.tags)],
          ["g:material", p.fabric ?? undefined],
          ...craftOf(p.title, p.tags).map((c) => ["g:product_highlight", c] as [string, string]),
        ];
        const ship = `<g:shipping><g:country>IN</g:country><g:service>Standard</g:service><g:price>${money(shipping.flatRate)}</g:price><g:min_handling_time>${hMin}</g:min_handling_time><g:max_handling_time>${hMax}</g:max_handling_time><g:min_transit_time>${tMin}</g:min_transit_time><g:max_transit_time>${tMax}</g:max_transit_time></g:shipping>`;
        return `<item>${fields.filter(([, val]) => val).map(([k, val]) => `<${k}>${esc(val!)}</${k}>`).join("")}${ship}</item>`;
      }),
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>Trumee</title><link>${abs("/")}</link><description>Trumee women’s western wear</description>
${items.join("\n")}
</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
