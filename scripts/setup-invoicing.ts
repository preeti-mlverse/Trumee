/**
 * One-time setup for GST invoices (safe to re-run):
 *  - adds the `hsn` columns to products and order_items if missing
 *  - stores the GSTIN in the store settings when it isn't set yet
 *  - fills each product's HSN from its type, and backfills past order lines
 *
 *   npx tsx scripts/setup-invoicing.ts
 */
import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/db/schema";

const GSTIN = "06AAJCN9325R1ZN"; // Nirantaa Clothing Private Limited, Haryana
const HSN_BY_TYPE: Record<string, string> = { Dresses: "6204", Skirts: "6204", "Co-ord Sets": "6204", Tops: "6206", Shirts: "6206", Jumpsuits: "6211" };

const client = postgres(process.env.DATABASE_URL!, { max: 1, onnotice: () => {} });
const db = drizzle(client, { schema });

async function main() {
  await db.execute(sql`alter table products add column if not exists hsn varchar(10)`);
  await db.execute(sql`alter table order_items add column if not exists hsn varchar(10)`);
  console.log("✓ hsn columns");

  const store = await db.query.settings.findFirst({ where: eq(schema.settings.key, "store") });
  const value = (store?.value ?? {}) as Record<string, unknown>;
  if (!value.gstin) {
    await db
      .insert(schema.settings)
      .values({ key: "store", value: { ...value, gstin: GSTIN }, updatedAt: new Date() })
      .onConflictDoUpdate({ target: schema.settings.key, set: { value: { ...value, gstin: GSTIN }, updatedAt: new Date() } });
    console.log(`✓ GSTIN set to ${GSTIN}`);
  } else console.log(`• GSTIN already set (${value.gstin})`);

  for (const [type, hsn] of Object.entries(HSN_BY_TYPE)) {
    await db.execute(sql`update products set hsn = ${hsn} where product_type = ${type} and coalesce(hsn, '') = ''`);
  }
  await db.execute(sql`update products set hsn = '6204' where coalesce(hsn, '') = ''`);
  const r = await db.execute(sql`update order_items oi set hsn = p.hsn from products p where oi.product_id = p.id and coalesce(oi.hsn, '') = ''`);
  console.log(`✓ product HSN codes; ${r.count ?? 0} past order lines backfilled`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => client.end());
