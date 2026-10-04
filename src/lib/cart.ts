import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { cookies } from "next/headers";
import { db, schema } from "@/db";
import { priceCart, type PricingDiscount, type Totals } from "./pricing";
import { getSettings } from "./settings";

export const CART_COOKIE = "tm_cart";

export type CartLine = {
  variantId: number;
  productId: number;
  handle: string;
  title: string;
  variantTitle: string;
  sku: string | null;
  image: string | null;
  unitPrice: number;
  compareAtPrice: number | null;
  quantity: number;
  maxQty: number;
  collectionIds: number[];
};

export type CartState = {
  id: string | null;
  lines: CartLine[];
  count: number;
  discountCode: string | null;
  email: string | null;
  totals: Totals;
  /** Store policies the cart UI advertises (from settings, so copy never contradicts checkout). */
  perks: { codEnabled: boolean; prepaidPercent: number; processingDays: string };
};

export async function getCartId() {
  return (await cookies()).get(CART_COOKIE)?.value ?? null;
}

export async function ensureCartId() {
  const existing = await getCartId();
  if (existing) {
    const found = await db.query.carts.findFirst({ where: eq(schema.carts.id, existing), columns: { id: true, completedOrderId: true } });
    if (found && !found.completedOrderId) return existing;
  }
  const id = nanoid(24);
  await db.insert(schema.carts).values({ id });
  (await cookies()).set(CART_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 86400, secure: process.env.NODE_ENV === "production" });
  return id;
}

export async function loadLines(cartId: string): Promise<CartLine[]> {
  const rows = await db
    .select({
      variantId: schema.variants.id,
      productId: schema.products.id,
      handle: schema.products.handle,
      title: schema.products.title,
      status: schema.products.status,
      variantTitle: schema.variants.title,
      sku: schema.variants.sku,
      price: schema.variants.price,
      compareAt: schema.variants.compareAtPrice,
      qty: schema.cartItems.quantity,
      stock: schema.variants.inventoryQty,
      track: schema.variants.trackInventory,
      backorder: schema.variants.allowBackorder,
      image: sql<string | null>`(select url from product_images pi where pi.product_id = ${schema.products.id} order by position limit 1)`,
      collectionIds: sql<number[]>`coalesce((select array_agg(collection_id) from collection_products cp where cp.product_id = ${schema.products.id}), '{}')`,
    })
    .from(schema.cartItems)
    .innerJoin(schema.variants, eq(schema.variants.id, schema.cartItems.variantId))
    .innerJoin(schema.products, eq(schema.products.id, schema.variants.productId))
    .where(eq(schema.cartItems.cartId, cartId))
    .orderBy(schema.cartItems.addedAt);

  return rows
    .filter((r) => r.status === "active")
    .map((r) => {
      const maxQty = !r.track || r.backorder ? 20 : Math.max(0, Math.min(20, r.stock));
      return {
        variantId: r.variantId,
        productId: r.productId,
        handle: r.handle,
        title: r.title,
        variantTitle: r.variantTitle,
        sku: r.sku,
        image: r.image,
        unitPrice: r.price,
        compareAtPrice: r.compareAt,
        quantity: Math.min(r.qty, maxQty || r.qty),
        maxQty,
        collectionIds: r.collectionIds ?? [],
      };
    });
}

export type DiscountLookup = { discount: PricingDiscount | null; error: string | null };

/** Validates a code for this shopper (dates, usage limits, once-per-customer). */
export async function lookupDiscount(code: string | null | undefined, who: { email?: string | null } = {}): Promise<DiscountLookup> {
  if (!code) return { discount: null, error: null };
  const d = await db.query.discounts.findFirst({ where: sql`upper(${schema.discounts.code}) = upper(${code.trim()})` });
  const now = new Date();
  if (!d || !d.active) return { discount: null, error: "That code isn’t valid" };
  if (d.startsAt > now) return { discount: null, error: "That code isn’t active yet" };
  if (d.endsAt && d.endsAt < now) return { discount: null, error: "That code has expired" };
  if (d.usageLimit != null && d.usedCount >= d.usageLimit) return { discount: null, error: "That code has reached its usage limit" };
  if (d.oncePerCustomer && who.email) {
    const used = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.orders)
      .where(and(sql`lower(${schema.orders.email}) = lower(${who.email})`, sql`upper(${schema.orders.discountCode}) = upper(${d.code})`, sql`${schema.orders.status} <> 'cancelled'`));
    if (used[0].n > 0) return { discount: null, error: "You’ve already used this code" };
  }
  return {
    discount: {
      code: d.code,
      kind: d.kind,
      value: d.value,
      buyQty: d.buyQty,
      getQty: d.getQty,
      minSubtotal: d.minSubtotal,
      appliesTo: d.appliesTo,
      targetIds: d.targetIds,
    },
    error: null,
  };
}

/** Best automatic discount (no code needed) that applies to these lines, if any. */
async function automaticDiscount(lines: CartLine[], ctx: Parameters<typeof priceCart>[1]) {
  const now = new Date();
  const autos = await db.query.discounts.findMany({
    where: and(eq(schema.discounts.automatic, true), eq(schema.discounts.active, true)),
  });
  let best: { d: PricingDiscount; saved: number } | null = null;
  for (const a of autos) {
    if (a.startsAt > now || (a.endsAt && a.endsAt < now)) continue;
    if (a.usageLimit != null && a.usedCount >= a.usageLimit) continue;
    const d: PricingDiscount = { code: a.code, kind: a.kind, value: a.value, buyQty: a.buyQty, getQty: a.getQty, minSubtotal: a.minSubtotal, appliesTo: a.appliesTo, targetIds: a.targetIds };
    const t = priceCart(lines, { ...ctx, discount: d });
    const saved = t.discountTotal + (t.shipping === 0 && lines.length ? ctx.shipping.flatRate : 0);
    if (t.discountApplied && (!best || saved > best.saved)) best = { d, saved };
  }
  return best?.d ?? null;
}

export async function priceLines(
  lines: CartLine[],
  opts: { code?: string | null; email?: string | null; paymentMethod?: "razorpay" | "cod" },
) {
  const [shipping, tax, payments] = await Promise.all([getSettings("shipping"), getSettings("tax"), getSettings("payments")]);
  const prepaid = { percent: payments.prepaidDiscountPercent, max: payments.prepaidDiscountMax, minOrder: payments.prepaidDiscountMinOrder };
  const ctx = { shipping, tax, paymentMethod: opts.paymentMethod, prepaid };
  const { discount, error } = await lookupDiscount(opts.code, { email: opts.email });
  const chosen = discount ?? (opts.code ? null : await automaticDiscount(lines, ctx));
  const totals = priceCart(lines, { ...ctx, discount: chosen });
  if (error) totals.discountError = error;
  return totals;
}

export async function getCartState(opts: { paymentMethod?: "razorpay" | "cod" } = {}): Promise<CartState> {
  const [shippingS, paymentsS] = await Promise.all([getSettings("shipping"), getSettings("payments")]);
  const perks = { codEnabled: shippingS.codEnabled, prepaidPercent: paymentsS.prepaidDiscountPercent, processingDays: shippingS.processingDays };
  const id = await getCartId();
  const cart = id ? await db.query.carts.findFirst({ where: eq(schema.carts.id, id) }) : null;
  if (!cart || cart.completedOrderId) {
    const totals = await priceLines([], {});
    return { id: null, lines: [], count: 0, discountCode: null, email: null, totals, perks };
  }
  const lines = await loadLines(cart.id);
  const totals = await priceLines(lines, { code: cart.discountCode, email: cart.email, paymentMethod: opts.paymentMethod });
  return {
    id: cart.id,
    lines,
    count: lines.reduce((s, l) => s + l.quantity, 0),
    discountCode: cart.discountCode,
    email: cart.email,
    totals,
    perks,
  };
}

export async function setLineQty(cartId: string, variantId: number, quantity: number) {
  if (quantity <= 0) {
    await db.delete(schema.cartItems).where(and(eq(schema.cartItems.cartId, cartId), eq(schema.cartItems.variantId, variantId)));
  } else {
    await db
      .insert(schema.cartItems)
      .values({ cartId, variantId, quantity })
      .onConflictDoUpdate({ target: [schema.cartItems.cartId, schema.cartItems.variantId], set: { quantity } });
  }
  await db.update(schema.carts).set({ updatedAt: new Date() }).where(eq(schema.carts.id, cartId));
}

export async function variantStock(variantIds: number[]) {
  if (!variantIds.length) return [];
  return db
    .select({ id: schema.variants.id, qty: schema.variants.inventoryQty, track: schema.variants.trackInventory, backorder: schema.variants.allowBackorder })
    .from(schema.variants)
    .where(inArray(schema.variants.id, variantIds));
}
