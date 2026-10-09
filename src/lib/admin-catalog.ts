import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { EditorProduct } from "@/components/admin/product-editor";

const rupees = (p: number | null) => (p == null ? "" : String(p / 100));

/** Data the product editor needs: collections to tick and existing categories to suggest. */
export async function editorOptions() {
  const [collections, types] = await Promise.all([
    db.select({ id: schema.collections.id, title: schema.collections.title, group: schema.collections.group }).from(schema.collections).orderBy(asc(schema.collections.position), asc(schema.collections.title)),
    db.selectDistinct({ t: schema.products.productType }).from(schema.products).where(sql`${schema.products.productType} <> ''`),
  ]);
  return { collections, types: types.map((r) => r.t).sort() };
}

export async function loadEditorProduct(id: number) {
  const p = await db.query.products.findFirst({
    where: eq(schema.products.id, id),
    with: { variants: { orderBy: asc(schema.variants.position) }, images: { orderBy: asc(schema.productImages.position) } },
  });
  if (!p) return null;
  const links = await db.select({ id: schema.collectionProducts.collectionId }).from(schema.collectionProducts).where(eq(schema.collectionProducts.productId, id));
  const product: EditorProduct = {
    id: p.id,
    title: p.title,
    handle: p.handle,
    status: p.status,
    productType: p.productType,
    tags: p.tags.join(", "),
    descriptionHtml: p.descriptionHtml,
    fabric: p.fabric ?? "",
    care: p.care ?? "",
    seoTitle: p.seoTitle ?? "",
    seoDescription: p.seoDescription ?? "",
    videoUrl: p.videoUrl ?? "",
    videoPoster: p.videoPoster ?? "",
    collectionIds: links.map((l) => l.id),
    variants: p.variants.map((v) => ({
      id: v.id,
      option1: v.option1 ?? v.title,
      sku: v.sku ?? "",
      price: rupees(v.price),
      compare: rupees(v.compareAtPrice),
      cost: rupees(v.costPrice),
      qty: v.inventoryQty,
      track: v.trackInventory,
      backorder: v.allowBackorder,
    })),
  };
  return { product, images: p.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt })) };
}

export const emptyProduct = (): EditorProduct => ({
  id: null,
  title: "",
  handle: "",
  status: "draft",
  productType: "",
  tags: "",
  descriptionHtml: "",
  fabric: "",
  care: "",
  seoTitle: "",
  seoDescription: "",
  videoUrl: "",
  videoPoster: "",
  collectionIds: [],
  variants: ["S", "M", "L", "XL"].map((s) => ({ id: null, option1: s, sku: "", price: "", compare: "", cost: "", qty: 0, track: true, backorder: false })),
});
