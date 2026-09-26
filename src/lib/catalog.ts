import "server-only";
import { and, asc, desc, eq, exists, gte, ilike, inArray, lte, max, min, or, sql, sum } from "drizzle-orm";
import { db, schema } from "@/db";

const { products, variants, productImages, collections, collectionProducts, orderItems, reviews } = schema;

export type CardProduct = {
  id: number;
  handle: string;
  title: string;
  productType: string;
  price: number;
  compareAtPrice: number | null;
  soldOut: boolean;
  images: { url: string; alt: string }[];
  video: { url: string; poster: string | null } | null;
  sizes: { value: string; available: boolean }[];
  rating: number | null;
  reviewCount: number;
  createdAt: Date;
};

import type { SortKey } from "./sorts";
export type { SortKey };

export type ListParams = {
  collectionId?: number;
  q?: string;
  sizes?: string[];
  types?: string[];
  /** Fabric families, e.g. "Cotton" matches Cotton Slub / Cotton Flex too */
  fabrics?: string[];
  /** Tag groups: any tag within a group, all groups must match */
  tagGroups?: string[][];
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort?: SortKey;
  ids?: number[];
  excludeId?: number;
  featured?: boolean;
  withVideo?: boolean;
  limit?: number;
  offset?: number;
};

export async function listProducts(p: ListParams = {}): Promise<{ items: CardProduct[]; total: number }> {
  const agg = db
    .select({
      productId: variants.productId,
      minPrice: min(variants.price).as("min_price"),
      compareAt: max(variants.compareAtPrice).as("compare_at"),
      stock: sum(variants.inventoryQty).as("stock"),
    })
    .from(variants)
    .groupBy(variants.productId)
    .as("agg");

  const sales = db
    .select({ productId: orderItems.productId, sold: sum(orderItems.quantity).as("sold") })
    .from(orderItems)
    .groupBy(orderItems.productId)
    .as("sales");

  const rating = db
    .select({
      productId: reviews.productId,
      avg: sql<number>`avg(${reviews.rating})::float`.as("avg"),
      n: sql<number>`count(*)::int`.as("n"),
    })
    .from(reviews)
    .where(eq(reviews.status, "approved"))
    .groupBy(reviews.productId)
    .as("rating");

  const where = [eq(products.status, "active")];
  if (p.collectionId)
    where.push(
      exists(
        db
          .select({ x: sql`1` })
          .from(collectionProducts)
          .where(and(eq(collectionProducts.productId, products.id), eq(collectionProducts.collectionId, p.collectionId))),
      ),
    );
  if (p.q) {
    const term = `%${p.q.trim()}%`;
    where.push(
      or(
        ilike(products.title, term),
        ilike(products.productType, term),
        sql`array_to_string(${products.tags}, ' ') ilike ${term}`,
        ilike(products.descriptionHtml, term),
      )!,
    );
  }
  if (p.sizes?.length)
    where.push(
      exists(
        db
          .select({ x: sql`1` })
          .from(variants)
          .where(
            and(eq(variants.productId, products.id), inArray(variants.option1, p.sizes), sql`${variants.inventoryQty} > 0`),
          ),
      ),
    );
  if (p.types?.length) where.push(inArray(products.productType, p.types));
  if (p.fabrics?.length) where.push(or(...p.fabrics.map((f) => ilike(products.fabric, `${f}%`)))!);
  for (const g of p.tagGroups ?? []) if (g.length) where.push(sql`${products.tags} && ${sql.raw(`ARRAY[${g.map((t) => `'${t.replace(/'/g, "''")}'`).join(",")}]::text[]`)}`);
  if (p.minPrice != null) where.push(gte(agg.minPrice, p.minPrice));
  if (p.maxPrice != null) where.push(lte(agg.minPrice, p.maxPrice));
  if (p.inStock) where.push(sql`${agg.stock} > 0`);
  if (p.ids?.length) where.push(inArray(products.id, p.ids));
  if (p.excludeId) where.push(sql`${products.id} <> ${p.excludeId}`);
  if (p.featured) where.push(eq(products.featured, true));
  if (p.withVideo) where.push(sql`${products.videoUrl} is not null`);

  const collectionPos = p.collectionId
    ? [asc(sql`(select position from collection_products cp where cp.product_id = ${products.id} and cp.collection_id = ${p.collectionId})`)]
    : [];

  const order = (() => {
    switch (p.sort) {
      case "price-asc":
        return [asc(agg.minPrice)];
      case "price-desc":
        return [desc(agg.minPrice)];
      case "newest":
        return [desc(products.createdAt)];
      case "title":
        return [asc(products.title)];
      case "best-selling":
        return [sql`coalesce(${sales.sold}, 0) desc`, desc(products.featured)];
      default:
        return [desc(products.featured), ...collectionPos, desc(products.createdAt)];
    }
  })();

  const base = db
    .select({
      id: products.id,
      handle: products.handle,
      title: products.title,
      productType: products.productType,
      createdAt: products.createdAt,
      videoUrl: products.videoUrl,
      videoPoster: products.videoPoster,
      price: agg.minPrice,
      compareAtPrice: agg.compareAt,
      stock: agg.stock,
      rating: rating.avg,
      reviewCount: rating.n,
      total: sql<number>`count(*) over()::int`,
    })
    .from(products)
    .innerJoin(agg, eq(agg.productId, products.id))
    .leftJoin(sales, eq(sales.productId, products.id))
    .leftJoin(rating, eq(rating.productId, products.id))
    .where(and(...where))
    .orderBy(...order)
    .limit(p.limit ?? 48)
    .offset(p.offset ?? 0);

  const rows = await base;
  if (!rows.length) return { items: [], total: 0 };
  const ids = rows.map((r) => r.id);

  const [imgs, vars] = await Promise.all([
    db
      .select({ productId: productImages.productId, url: productImages.url, alt: productImages.alt })
      .from(productImages)
      .where(and(inArray(productImages.productId, ids), lte(productImages.position, 1)))
      .orderBy(asc(productImages.position)),
    db
      .select({ productId: variants.productId, size: variants.option1, qty: variants.inventoryQty, backorder: variants.allowBackorder, track: variants.trackInventory })
      .from(variants)
      .where(inArray(variants.productId, ids))
      .orderBy(asc(variants.position)),
  ]);

  return {
    total: rows[0].total,
    items: rows.map((r) => ({
      id: r.id,
      handle: r.handle,
      title: r.title,
      productType: r.productType,
      createdAt: r.createdAt,
      price: Number(r.price),
      compareAtPrice: r.compareAtPrice ? Number(r.compareAtPrice) : null,
      soldOut: !vars.some((v) => v.productId === r.id && (v.qty > 0 || v.backorder || !v.track)),
      images: imgs.filter((i) => i.productId === r.id).map(({ url, alt }) => ({ url, alt })),
      video: r.videoUrl ? { url: r.videoUrl, poster: r.videoPoster } : null,
      sizes: vars
        .filter((v) => v.productId === r.id && v.size)
        .map((v) => ({ value: v.size!, available: v.qty > 0 || v.backorder || !v.track })),
      rating: r.rating,
      reviewCount: r.reviewCount ?? 0,
    })),
  };
}

export async function getProduct(handle: string) {
  const product = await db.query.products.findFirst({
    where: and(eq(products.handle, handle), eq(products.status, "active")),
    with: {
      images: { orderBy: asc(productImages.position) },
      variants: { orderBy: asc(variants.position) },
      collections: { with: { collection: true } },
    },
  });
  if (!product) return null;
  const reviewRows = await db
    .select()
    .from(reviews)
    .where(and(eq(reviews.productId, product.id), eq(reviews.status, "approved")))
    .orderBy(desc(reviews.createdAt))
    .limit(50);
  const avg = reviewRows.length ? reviewRows.reduce((s, r) => s + r.rating, 0) / reviewRows.length : null;
  return { ...product, reviews: reviewRows, rating: avg };
}

export type FullProduct = NonNullable<Awaited<ReturnType<typeof getProduct>>>;

export async function getCollection(handle: string) {
  return db.query.collections.findFirst({
    where: and(eq(collections.handle, handle), eq(collections.published, true)),
  });
}

export async function listCollections(group?: "category" | "edit") {
  return db
    .select()
    .from(collections)
    .where(and(eq(collections.published, true), group ? eq(collections.group, group) : undefined))
    .orderBy(asc(collections.position));
}

export const OCCASIONS: Record<string, string> = { vacation: "Vacation", casuals: "Casual", office: "Office" };
export const DETAILS: Record<string, string> = { crochet: "Crochet", embroidery: "Embroidery", schiffli: "Schiffli" };
const FABRIC_FAMILIES = ["Cotton", "Rayon", "Georgette", "Denim", "Viscose"];

/** Facets for the filter sidebar: sizes, types, fabric families, occasions and craft details present in a listing. */
export async function getFacets(collectionId?: number) {
  const inCollection = collectionId
    ? exists(
        db
          .select({ x: sql`1` })
          .from(collectionProducts)
          .where(and(eq(collectionProducts.productId, products.id), eq(collectionProducts.collectionId, collectionId))),
      )
    : undefined;
  const [rows, prod] = await Promise.all([
    db
      .selectDistinct({ size: variants.option1, type: products.productType })
      .from(variants)
      .innerJoin(products, eq(products.id, variants.productId))
      .where(and(eq(products.status, "active"), inCollection)),
    db.select({ fabric: products.fabric, tags: products.tags }).from(products).where(and(eq(products.status, "active"), inCollection)),
  ]);
  const ORDER = ["XS", "S", "M", "L", "XL", "2XL", "XXL", "3XL"];
  const tags = new Set(prod.flatMap((p) => p.tags));
  const present = (map: Record<string, string>) => Object.entries(map).filter(([k]) => tags.has(k)).map(([value, label]) => ({ value, label }));
  return {
    sizes: [...new Set(rows.map((r) => r.size).filter(Boolean) as string[])].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)),
    types: [...new Set(rows.map((r) => r.type).filter(Boolean))].sort(),
    fabrics: FABRIC_FAMILIES.filter((f) => prod.some((p) => p.fabric?.toLowerCase().startsWith(f.toLowerCase()))),
    occasions: present(OCCASIONS),
    details: present(DETAILS),
  };
}
