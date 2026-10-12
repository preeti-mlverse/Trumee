/**
 * Applies the store pricing policy to the database: free shipping across India, a ₹100 fee on
 * cash-on-delivery orders, 5% off prepaid orders — plus the matching announcement bar, Shipping
 * Policy and FAQ wording. Safe to re-run. Values can be changed later in Admin → Settings.
 *
 *   npx tsx scripts/apply-pricing-policy.ts
 */
import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/db/schema";

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client, { schema });

const COD_FEE = 10000; // paise
const OLD_COPY = "flat ₹29 shipping and easy 7-day returns";
const NEW_COPY = "free shipping and easy 7-day returns";
const PREPAID = 5; // percent
const COD_NOTE = "Easy 7-day returns & size exchanges on COD orders too — refunds go straight to your UPI or bank account.";

async function mergeSetting(key: string, patch: Record<string, unknown>) {
  const row = await db.query.settings.findFirst({ where: eq(schema.settings.key, key) });
  const value = { ...((row?.value as Record<string, unknown>) ?? {}), ...patch };
  await db
    .insert(schema.settings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt: new Date() } });
  console.log(`✓ settings.${key}`);
}

async function main() {
  await mergeSetting("shipping", { flatRate: 0, freeShippingThreshold: null, codEnabled: true, codFee: COD_FEE, codNote: COD_NOTE });
  await mergeSetting("payments", { prepaidDiscountPercent: PREPAID });
  const store = await db.query.settings.findFirst({ where: eq(schema.settings.key, "store") });
  const ann = ((store?.value as { announcement?: Record<string, unknown> })?.announcement ?? {}) as Record<string, unknown>;
  await mergeSetting("store", { announcement: { enabled: true, href: "/pages/shipping-policy", ...ann, text: "Free shipping across India · 5% off when you pay online · Easy 7-day returns" } });

  // Shipping Policy: replace the flat-rate block
  const ship = await db.query.pages.findFirst({ where: eq(schema.pages.handle, "shipping-policy") });
  if (ship) {
    const html = ship.bodyHtml.replace(
      /<li>\s*<strong>Flat Rate On Shipping<\/strong>:[\s\S]*?<\/ul>\s*<\/li>/,
      `<li>
<strong>Free Shipping</strong>:
<ul>
<li>Shipping is free on every order, to every serviceable pin code in India.</li>
<li>Pay online (UPI, cards, net banking, wallets) and get 5% off your order.</li>
<li>Cash on Delivery orders carry a ₹100 COD fee, shown at checkout before you place the order.</li>
</ul>
</li>`,
    );
    if (html !== ship.bodyHtml) {
      await db.update(schema.pages).set({ bodyHtml: html, updatedAt: new Date() }).where(eq(schema.pages.id, ship.id));
      console.log("✓ pages.shipping-policy");
    } else console.log("• pages.shipping-policy already updated (or block not found)");
  }

  // FAQs: add the pricing questions once
  const faqs = await db.query.pages.findFirst({ where: eq(schema.pages.handle, "faqs") });
  if (faqs && !faqs.bodyHtml.includes("Is shipping free?")) {
    const add = `<h4>Is shipping free?</h4><p>Yes — shipping is free on every order across India.</p>
<h4>Is there a charge for Cash on Delivery?</h4><p>COD orders carry a ₹100 fee, shown at checkout. Pay online instead and you save that fee and get 5% off.</p>
<h4>Can I return a Cash on Delivery order?</h4><p>Yes. COD orders get the same easy 7-day returns and size exchanges; refunds go to your UPI or bank account within 7–10 working days of the quality check.</p>`;
    await db.update(schema.pages).set({ bodyHtml: faqs.bodyHtml + "\n" + add, updatedAt: new Date() }).where(eq(schema.pages.id, faqs.id));
    console.log("✓ pages.faqs");
  }
  // Any remaining "₹29 shipping" wording in collection guides / FAQs
  const fixed = await db.execute(
    sql`update collections set faqs = replace(faqs::text, ${OLD_COPY}, ${NEW_COPY})::jsonb, guide_html = replace(guide_html, ${OLD_COPY}, ${NEW_COPY}) where faqs::text like '%₹29%' or guide_html like '%₹29%'`,
  );
  console.log(`✓ collections copy (${fixed.count ?? 0} updated)`);
  await db.execute(sql`update pages set seo_title = 'About Trumee — Boho Western Wear Designed in Gurgaon' where handle = 'about-us' and coalesce(seo_title, '') = ''`);
  console.log("Done. Restart the app so cached settings refresh.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => client.end());
