import "server-only";
import { eq, sql } from "drizzle-orm";
import { notFound, permanentRedirect } from "next/navigation";
import { db, schema } from "@/db";

/** Category collections a retired product/collection URL can fall back to, by the words in its handle. */
const CATEGORY_WORDS: [RegExp, string][] = [
  [/co-?ords?|cord-set|coord|matching-set/, "co-ord-sets"],
  [/jumpsuit|dungaree|playsuit|romper/, "jumpsuit"],
  [/skirt/, "skirts"],
  [/shirt/, "shirts"],
  [/dress|frock|maxi|midi/, "dresses"],
  [/top|blouse|peplum|cami|tee|crop/, "tops"],
];

const words = (s: string) => new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !["and", "with", "for", "the", "women"].includes(w)));

/**
 * Where a retired Shopify product URL should go: the live product whose handle shares most words with it
 * (at least 60% of the old handle's words), else the matching category. Keeps old Google results and
 * links useful instead of 404ing.
 */
async function bestMatch(path: string): Promise<string | null> {
  const [, kind, handle] = path.split("/");
  if (!handle || (kind !== "products" && kind !== "collections")) return null;
  const old = words(handle);
  if (kind === "products" && old.size) {
    const live = await db.select({ handle: schema.products.handle }).from(schema.products).where(eq(schema.products.status, "active"));
    let best: { handle: string; score: number } | null = null;
    for (const p of live) {
      const w = words(p.handle);
      const shared = [...old].filter((x) => w.has(x)).length;
      const score = shared / old.size;
      if (!best || score > best.score) best = { handle: p.handle, score };
    }
    if (best && best.score >= 0.6) return `/products/${best.handle}`;
  }
  const cat = CATEGORY_WORDS.find(([re]) => re.test(handle))?.[1];
  if (cat) return `/collections/${cat}`;
  return kind === "products" ? "/collections/all" : null;
}

/** Call when a page can't find its record: follows an admin-defined 301, then a best-match 301, else 404s. */
export async function redirectOrNotFound(path: string): Promise<never> {
  const r = await db.query.redirects.findFirst({ where: eq(schema.redirects.fromPath, path) });
  if (r) {
    await db.update(schema.redirects).set({ hits: sql`${schema.redirects.hits} + 1` }).where(eq(schema.redirects.id, r.id));
    permanentRedirect(r.toPath);
  }
  const guess = await bestMatch(path);
  if (guess && guess !== path) permanentRedirect(guess);
  notFound();
}
