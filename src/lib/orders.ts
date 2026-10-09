import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, schema } from "@/db";
import type { Address, Attribution } from "@/db/schema";
import { recordPurchase } from "./analytics/server";
import { loadLines, priceLines } from "./cart";
import { sendEmail, templates } from "./email";
import { autoPushIfEnabled } from "./fulfilment";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class CheckoutError extends Error {}

export async function nextOrderNumber(tx: Tx | typeof db = db) {
  const [{ n }] = await tx.select({ n: sql<number>`coalesce(max(${schema.orders.number}), 1000)::int` }).from(schema.orders);
  return n + 1;
}

export async function adjustStock(tx: Tx, items: { variantId: number | null; quantity: number }[], sign: -1 | 1, reason: string, orderId: number) {
  for (const it of items) {
    if (!it.variantId) continue;
    const [v] = await tx
      .update(schema.variants)
      .set({ inventoryQty: sql`${schema.variants.inventoryQty} + ${sign * it.quantity}` })
      .where(eq(schema.variants.id, it.variantId))
      .returning({ qty: schema.variants.inventoryQty, track: schema.variants.trackInventory });
    if (v?.track) await tx.insert(schema.inventoryAdjustments).values({ variantId: it.variantId, delta: sign * it.quantity, quantityAfter: v.qty, reason, orderId });
  }
}

/**
 * Turns the cart into an order. COD orders are confirmed immediately (stock deducted);
 * online orders stay `pending` until the payment is verified (see markOrderPaid).
 */
export async function createOrderFromCart(input: {
  cartId: string;
  email: string;
  phone: string;
  address: Address;
  paymentMethod: "razorpay" | "cod";
  acceptsMarketing: boolean;
  note?: string;
  customerId?: number | null;
  sessionId?: string | null;
  attribution?: Attribution | null;
}) {
  const cart = await db.query.carts.findFirst({ where: eq(schema.carts.id, input.cartId) });
  if (!cart || cart.completedOrderId) throw new CheckoutError("Your bag has expired — please add the items again.");
  const lines = await loadLines(cart.id);
  if (!lines.length) throw new CheckoutError("Your bag is empty.");

  const totals = await priceLines(lines, { code: cart.discountCode, email: input.email, paymentMethod: input.paymentMethod });

  return db.transaction(async (tx) => {
    // Lock the variants we're selling and re-check stock
    const stock = await tx
      .select({ id: schema.variants.id, qty: schema.variants.inventoryQty, track: schema.variants.trackInventory, backorder: schema.variants.allowBackorder })
      .from(schema.variants)
      .where(inArray(schema.variants.id, lines.map((l) => l.variantId)))
      .for("update");
    for (const l of lines) {
      const s = stock.find((x) => x.id === l.variantId);
      if (s?.track && !s.backorder && s.qty < l.quantity)
        throw new CheckoutError(`Only ${Math.max(0, s.qty)} left of “${l.title}” (${l.variantTitle}). Please update your bag.`);
    }

    // Customer: find or create by email
    const email = input.email.toLowerCase();
    let customer = input.customerId
      ? await tx.query.customers.findFirst({ where: eq(schema.customers.id, input.customerId) })
      : await tx.query.customers.findFirst({ where: sql`lower(${schema.customers.email}) = ${email}` });
    if (!customer) {
      const [first, ...rest] = input.address.name.trim().split(/\s+/);
      [customer] = await tx
        .insert(schema.customers)
        .values({ email, phone: input.phone, firstName: first, lastName: rest.join(" ") || null, acceptsMarketing: input.acceptsMarketing })
        .returning();
    } else if (input.acceptsMarketing && !customer.acceptsMarketing) {
      await tx.update(schema.customers).set({ acceptsMarketing: true }).where(eq(schema.customers.id, customer.id));
    }

    const number = await nextOrderNumber(tx);
    const isCod = input.paymentMethod === "cod";
    const [order] = await tx
      .insert(schema.orders)
      .values({
        number,
        token: nanoid(24),
        customerId: customer.id,
        email,
        phone: input.phone,
        paymentMethod: input.paymentMethod,
        financialStatus: "pending",
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        shippingTotal: totals.shipping,
        codFee: totals.codFee,
        prepaidDiscount: totals.prepaidDiscount,
        taxTotal: totals.tax,
        total: totals.total,
        discountCode: totals.discountApplied,
        shippingAddress: input.address,
        billingAddress: input.address,
        note: input.note || null,
        source: "web",
        attribution: input.attribution ?? cart.attribution ?? null,
        sessionId: input.sessionId ?? cart.sessionId ?? null,
        cartId: cart.id,
      })
      .returning();

    await tx.insert(schema.orderItems).values(
      totals.lines.map((pl) => {
        const l = lines.find((x) => x.variantId === pl.variantId)!;
        return {
          orderId: order.id,
          productId: l.productId,
          variantId: l.variantId,
          title: l.title,
          variantTitle: l.variantTitle,
          sku: l.sku,
          imageUrl: l.image,
          price: l.unitPrice,
          quantity: l.quantity,
          discount: pl.discount,
          taxRate: pl.taxRate,
        };
      }),
    );
    await tx.insert(schema.orderEvents).values({ orderId: order.id, kind: "placed", message: `Order placed on the online store (${isCod ? "Cash on delivery" : "online payment"})` });

    if (isCod) {
      await adjustStock(tx, lines, -1, "order", order.id);
      await tx.update(schema.carts).set({ completedOrderId: order.id, email }).where(eq(schema.carts.id, cart.id));
      if (totals.discountApplied)
        await tx.update(schema.discounts).set({ usedCount: sql`${schema.discounts.usedCount} + 1` }).where(sql`upper(${schema.discounts.code}) = upper(${totals.discountApplied})`);
    } else {
      await tx.update(schema.carts).set({ email, phone: input.phone, shippingAddress: input.address }).where(eq(schema.carts.id, cart.id));
    }
    return order;
  }).then(async (order) => {
    if (input.customerId) await rememberAddress(input.customerId, input.address).catch(() => {});
    if (order.paymentMethod === "cod") await afterConfirmed(order.id);
    return order;
  });
}

/** Adds a checkout address to the customer's address book (skips duplicates; the first one becomes default). */
export async function rememberAddress(customerId: number, a: Address) {
  const book = await db.query.addresses.findMany({ where: eq(schema.addresses.customerId, customerId) });
  const same = (b: Address) => b.pincode === a.pincode && b.line1.trim().toLowerCase() === a.line1.trim().toLowerCase();
  if (book.some((r) => same(r.data))) return;
  await db.insert(schema.addresses).values({ customerId, data: a, isDefault: book.length === 0 });
}

/** Payment verified (Razorpay handler, webhook, or simulated mode). Idempotent. */
export async function markOrderPaid(orderId: number, paymentId: string, gatewayOrderId?: string) {
  const confirmed = await db.transaction(async (tx) => {
    const [o] = await tx.select().from(schema.orders).where(eq(schema.orders.id, orderId)).for("update");
    if (!o || o.financialStatus === "paid") return false;
    await tx
      .update(schema.orders)
      .set({ financialStatus: "paid", paidAt: new Date(), paymentId, paymentGatewayOrderId: gatewayOrderId ?? o.paymentGatewayOrderId })
      .where(eq(schema.orders.id, o.id));
    const items = await tx.select({ variantId: schema.orderItems.variantId, quantity: schema.orderItems.quantity }).from(schema.orderItems).where(eq(schema.orderItems.orderId, o.id));
    await adjustStock(tx, items, -1, "order", o.id);
    if (o.cartId) await tx.update(schema.carts).set({ completedOrderId: o.id }).where(eq(schema.carts.id, o.cartId));
    if (o.discountCode)
      await tx.update(schema.discounts).set({ usedCount: sql`${schema.discounts.usedCount} + 1` }).where(sql`upper(${schema.discounts.code}) = upper(${o.discountCode})`);
    await tx.insert(schema.orderEvents).values({ orderId: o.id, kind: "paid", message: `Payment of ₹${(o.total / 100).toLocaleString("en-IN")} captured (${paymentId})` });
    return true;
  });
  if (confirmed) await afterConfirmed(orderId);
  return confirmed;
}

/** Side effects once an order is real: confirmation email + server-side purchase event. */
async function afterConfirmed(orderId: number) {
  const o = await db.query.orders.findFirst({ where: eq(schema.orders.id, orderId), with: { items: true } });
  if (!o) return;
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const mail = templates.orderConfirmation({
    number: o.number,
    name: o.shippingAddress.name,
    items: o.items.map((i) => ({ title: i.title, variantTitle: i.variantTitle, quantity: i.quantity, price: i.price })),
    total: o.total,
    paymentMethod: o.paymentMethod,
    url: `${site}/orders/${o.token}`,
  });
  await Promise.allSettled([
    sendEmail({ to: o.email, ...mail }),
    recordPurchase({ sessionId: o.sessionId, orderId: o.id, number: o.number, total: o.total, customerId: o.customerId }),
    autoPushIfEnabled(o.id),
  ]);
}

export async function getOrderByToken(token: string) {
  return db.query.orders.findFirst({
    where: eq(schema.orders.token, token),
    with: { items: true, fulfillments: true, events: true },
  });
}

export async function findOrderForTracking(number: number, emailOrPhone: string) {
  const v = emailOrPhone.trim().toLowerCase();
  const digits = v.replace(/\D/g, "");
  // Match on the email, or on the last 10 digits of the phone — never on a partial/empty value.
  const who = v.includes("@")
    ? sql`lower(${schema.orders.email}) = ${v}`
    : digits.length >= 10
      ? sql`right(regexp_replace(coalesce(${schema.orders.phone}, ''), '\\D', '', 'g'), 10) = ${digits.slice(-10)}`
      : null;
  if (!who) return null;
  return db.query.orders.findFirst({ where: and(eq(schema.orders.number, number), who), columns: { token: true } });
}
