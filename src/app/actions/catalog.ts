"use server";

import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { logAudit, requireStaff } from "@/lib/auth";
import { removeUpload, saveImage } from "@/lib/uploads";
import { slugify } from "@/lib/utils";

export type CatalogResult = { ok?: string; error?: string; at?: number };

const paise = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : NaN;
};

/** Storefront pages cache for a few minutes — refresh them right after a catalog change. */
function refreshStore(handle?: string) {
  revalidatePath("/", "layout");
  if (handle) revalidatePath(`/products/${handle}`);
  revalidatePath("/admin/products");
  revalidatePath("/admin/inventory");
}

const productInput = z.object({
  title: z.string().trim().min(2, "Give the product a title"),
  handle: z.string().trim().max(120),
  status: z.enum(["active", "draft", "archived"]),
  productType: z.string().trim().max(60),
  tags: z.string().trim().max(500),
  descriptionHtml: z.string().max(20000),
  fabric: z.string().trim().max(200),
  care: z.string().trim().max(500),
  seoTitle: z.string().trim().max(80),
  seoDescription: z.string().trim().max(200),
  videoUrl: z.string().trim().max(300),
  videoPoster: z.string().trim().max(300),
});

/**
 * Creates or updates a product with its sizes (variants), stock and collections.
 * Variant rows arrive as parallel arrays: v_id, v_option1, v_sku, v_price, v_compare, v_cost, v_qty, v_track, v_backorder.
 */
export async function saveProduct(id: number | null, _: CatalogResult, form: FormData): Promise<CatalogResult> {
  const staff = await requireStaff("products");
  const parsed = productInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const handle = slugify(d.handle || d.title);
  if (!handle) return { error: "Enter a URL handle (letters and numbers)." };
  const clash = await db.query.products.findFirst({ where: eq(schema.products.handle, handle), columns: { id: true } });
  if (clash && clash.id !== id) return { error: `Another product already uses /products/${handle} — change the handle.` };

  // Variants
  const all = (k: string) => form.getAll(k).map(String);
  const ids = all("v_id");
  const rows = ids.map((vid, i) => ({
    id: Number(vid) || null,
    option1: all("v_option1")[i]?.trim() || "One size",
    sku: all("v_sku")[i]?.trim() || null,
    price: paise(all("v_price")[i]),
    compareAtPrice: paise(all("v_compare")[i]),
    costPrice: paise(all("v_cost")[i]),
    inventoryQty: Math.trunc(Number(all("v_qty")[i] || 0)),
    trackInventory: all("v_track")[i] === "1",
    allowBackorder: all("v_backorder")[i] === "1",
  }));
  if (!rows.length) return { error: "Add at least one size / variant." };
  for (const r of rows) {
    if (r.price == null || Number.isNaN(r.price) || r.price <= 0) return { error: `Enter a selling price for ${r.option1}.` };
    if (Number.isNaN(r.compareAtPrice) || Number.isNaN(r.costPrice)) return { error: `Check the prices for ${r.option1}.` };
    if (r.compareAtPrice != null && r.compareAtPrice <= r.price) r.compareAtPrice = null;
    if (!Number.isFinite(r.inventoryQty)) return { error: `Enter a stock number for ${r.option1}.` };
  }
  if (new Set(rows.map((r) => r.option1.toLowerCase())).size !== rows.length) return { error: "Two variants have the same size name." };

  const tags = d.tags.split(",").map((t) => t.trim()).filter(Boolean);
  const values = {
    title: d.title,
    handle,
    status: d.status,
    productType: d.productType,
    tags,
    descriptionHtml: d.descriptionHtml,
    fabric: d.fabric || null,
    care: d.care || null,
    seoTitle: d.seoTitle || null,
    seoDescription: d.seoDescription || null,
    videoUrl: d.videoUrl || null,
    videoPoster: d.videoPoster || null,
    options: [{ name: "Size", values: rows.map((r) => r.option1) }],
    updatedAt: new Date(),
  };
  const collectionIds = all("collections").map(Number).filter(Number.isInteger);

  const productId = await db.transaction(async (tx) => {
    let pid = id;
    if (pid) {
      const before = await tx.query.products.findFirst({ where: eq(schema.products.id, pid), columns: { status: true, publishedAt: true } });
      await tx
        .update(schema.products)
        .set({ ...values, publishedAt: d.status === "active" && !before?.publishedAt ? new Date() : before?.publishedAt })
        .where(eq(schema.products.id, pid));
    } else {
      const [p] = await tx.insert(schema.products).values({ ...values, publishedAt: d.status === "active" ? new Date() : null }).returning({ id: schema.products.id });
      pid = p.id;
    }

    // Variants: update existing, insert new, delete removed (stock changes are logged)
    const existing = await tx.query.variants.findMany({ where: eq(schema.variants.productId, pid) });
    const keep = rows.filter((r) => r.id && existing.some((e) => e.id === r.id)).map((r) => r.id!);
    if (existing.length) await tx.delete(schema.variants).where(and(eq(schema.variants.productId, pid), keep.length ? notInArray(schema.variants.id, keep) : sql`true`));
    for (const [pos, r] of rows.entries()) {
      const v = {
        title: r.option1,
        option1: r.option1,
        sku: r.sku,
        price: r.price!,
        compareAtPrice: r.compareAtPrice,
        costPrice: r.costPrice,
        inventoryQty: r.inventoryQty,
        trackInventory: r.trackInventory,
        allowBackorder: r.allowBackorder,
        position: pos,
        updatedAt: new Date(),
      };
      const prev = r.id ? existing.find((e) => e.id === r.id) : undefined;
      if (prev) {
        await tx.update(schema.variants).set(v).where(eq(schema.variants.id, prev.id));
        if (prev.inventoryQty !== r.inventoryQty)
          await tx.insert(schema.inventoryAdjustments).values({ variantId: prev.id, delta: r.inventoryQty - prev.inventoryQty, quantityAfter: r.inventoryQty, reason: "correction", staffId: staff.id });
      } else {
        const [nv] = await tx.insert(schema.variants).values({ productId: pid, ...v }).returning({ id: schema.variants.id });
        if (r.inventoryQty) await tx.insert(schema.inventoryAdjustments).values({ variantId: nv.id, delta: r.inventoryQty, quantityAfter: r.inventoryQty, reason: "restock", staffId: staff.id });
      }
    }

    // Collections (manual membership)
    await tx.delete(schema.collectionProducts).where(eq(schema.collectionProducts.productId, pid));
    if (collectionIds.length) await tx.insert(schema.collectionProducts).values(collectionIds.map((cid) => ({ collectionId: cid, productId: pid!, position: 999 })));
    return pid;
  });

  await logAudit(staff.id, id ? "product.update" : "product.create", "product", productId, { title: d.title, status: d.status });
  refreshStore(handle);
  if (!id) redirect(`/admin/products/${productId}?created=1`);
  return { ok: "Saved — live on the store.", at: Date.now() };
}

export async function deleteProduct(id: number) {
  const staff = await requireStaff("products");
  const images = await db.query.productImages.findMany({ where: eq(schema.productImages.productId, id) });
  await db.delete(schema.products).where(eq(schema.products.id, id));
  await Promise.all(images.map((i) => removeUpload(i.url)));
  await logAudit(staff.id, "product.delete", "product", id);
  refreshStore();
  redirect("/admin/products");
}

// ───────────────────────────── images

export async function uploadImages(productId: number, _: CatalogResult, form: FormData): Promise<CatalogResult> {
  await requireStaff("products");
  const p = await db.query.products.findFirst({ where: eq(schema.products.id, productId), columns: { handle: true, title: true } });
  if (!p) return { error: "Product not found." };
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return { error: "Choose one or more photos." };
  const [{ n }] = await db.select({ n: sql<number>`coalesce(max(${schema.productImages.position}), -1)::int` }).from(schema.productImages).where(eq(schema.productImages.productId, productId));
  try {
    for (const [i, f] of files.entries()) {
      const img = await saveImage(f, p.handle);
      await db.insert(schema.productImages).values({ productId, url: img.url, alt: p.title, width: img.width, height: img.height, position: n + 1 + i });
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
  refreshStore(p.handle);
  revalidatePath(`/admin/products/${productId}`);
  return { ok: `${files.length} photo${files.length > 1 ? "s" : ""} added.`, at: Date.now() };
}

/** move: -1 = earlier, 1 = later, 0 = make it the main photo. */
export async function moveImage(imageId: number, move: -1 | 0 | 1) {
  await requireStaff("products");
  const img = await db.query.productImages.findFirst({ where: eq(schema.productImages.id, imageId) });
  if (!img) return;
  const list = await db.query.productImages.findMany({ where: eq(schema.productImages.productId, img.productId), orderBy: schema.productImages.position });
  const from = list.findIndex((x) => x.id === imageId);
  const to = move === 0 ? 0 : Math.min(list.length - 1, Math.max(0, from + move));
  const [it] = list.splice(from, 1);
  list.splice(to, 0, it);
  await db.transaction(async (tx) => {
    for (const [pos, x] of list.entries()) await tx.update(schema.productImages).set({ position: pos }).where(eq(schema.productImages.id, x.id));
  });
  const p = await db.query.products.findFirst({ where: eq(schema.products.id, img.productId), columns: { handle: true } });
  refreshStore(p?.handle);
  revalidatePath(`/admin/products/${img.productId}`);
}

export async function deleteImage(imageId: number) {
  await requireStaff("products");
  const [img] = await db.delete(schema.productImages).where(eq(schema.productImages.id, imageId)).returning();
  if (!img) return;
  await removeUpload(img.url);
  const p = await db.query.products.findFirst({ where: eq(schema.products.id, img.productId), columns: { handle: true } });
  refreshStore(p?.handle);
  revalidatePath(`/admin/products/${img.productId}`);
}

export async function setImageAlt(imageId: number, alt: string) {
  await requireStaff("products");
  await db.update(schema.productImages).set({ alt: alt.trim().slice(0, 200) }).where(eq(schema.productImages.id, imageId));
}

// ───────────────────────────── inventory

/**
 * Inventory page: set new stock numbers for many variants at once.
 * Fields: q_<variantId> = new quantity; reason = restock | correction | damage | return.
 */
export async function updateStock(_: CatalogResult, form: FormData): Promise<CatalogResult> {
  const staff = await requireStaff("products");
  const reason = ["restock", "correction", "damage", "return"].includes(String(form.get("reason"))) ? String(form.get("reason")) : "correction";
  const changes = [...form.entries()]
    .filter(([k]) => k.startsWith("q_"))
    .map(([k, v]) => ({ id: Number(k.slice(2)), qty: Math.trunc(Number(v)) }))
    .filter((c) => Number.isInteger(c.id) && Number.isFinite(c.qty));
  if (!changes.length) return { error: "Nothing to save." };
  const current = await db.query.variants.findMany({ where: inArray(schema.variants.id, changes.map((c) => c.id)), columns: { id: true, inventoryQty: true } });
  let changed = 0;
  await db.transaction(async (tx) => {
    for (const c of changes) {
      const prev = current.find((v) => v.id === c.id);
      if (!prev || prev.inventoryQty === c.qty) continue;
      await tx.update(schema.variants).set({ inventoryQty: c.qty, updatedAt: new Date() }).where(eq(schema.variants.id, c.id));
      await tx.insert(schema.inventoryAdjustments).values({ variantId: c.id, delta: c.qty - prev.inventoryQty, quantityAfter: c.qty, reason, staffId: staff.id });
      changed++;
    }
  });
  if (!changed) return { ok: "No changes.", at: Date.now() };
  await logAudit(staff.id, "inventory.update", "variant", 0, { changed, reason });
  refreshStore();
  return { ok: `Updated ${changed} size${changed > 1 ? "s" : ""}.`, at: Date.now() };
}

// ───────────────────────────── customers

export async function saveCustomerNote(customerId: number, _: CatalogResult, form: FormData): Promise<CatalogResult> {
  await requireStaff("customers");
  const tags = String(form.get("tags") ?? "").split(",").map((t) => t.trim()).filter(Boolean);
  await db.update(schema.customers).set({ note: String(form.get("note") ?? "").trim() || null, tags, updatedAt: new Date() }).where(eq(schema.customers.id, customerId));
  revalidatePath(`/admin/customers/${customerId}`);
  return { ok: "Saved.", at: Date.now() };
}
