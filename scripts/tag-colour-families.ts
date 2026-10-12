/**
 * Tags every product with its colour family (`colour-red`, `colour-blue`, …) so the store can
 * filter and link by colour. Colour comes from the variant option, a `colour:<Name>` tag, or the
 * product name. Safe to re-run — run again after adding products.
 *
 *   npx tsx scripts/tag-colour-families.ts
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/db/schema";
import { colorOf, colourFamily, colourTag } from "../src/lib/product-facts";

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client, { schema });

async function main() {
  const products = await db.query.products.findMany({ with: { variants: true } });
  const counts: Record<string, number> = {};
  const untagged: string[] = [];
  for (const p of products) {
    const fam = colourFamily(colorOf(p.title, p.variants.find((v) => v.option2)?.option2, p.tags));
    const tags = p.tags.filter((t) => !/^colour-[a-z]+$/.test(t));
    if (fam) {
      tags.push(colourTag(fam.key));
      counts[fam.key] = (counts[fam.key] ?? 0) + 1;
    } else if (p.status === "active") untagged.push(p.title);
    await db.update(schema.products).set({ tags }).where(eq(schema.products.id, p.id));
  }
  console.log("Tagged by colour:", counts);
  if (untagged.length) console.log("No colour found (add a `colour:<Name>` tag in Admin):", untagged);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => client.end());
