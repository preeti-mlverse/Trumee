import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { ShippingMeta } from "@/db/schema";
import { getSettings } from "./settings";
import { assignAwb, createOrder, schedulePickup, shiprocketConfigured, ShiprocketError, trackAwb, trackingUrl } from "./shiprocket";

/** Our order reference on Shiprocket (also what its webhooks send back as `order_id`). */
export const shiprocketRef = (orderNumber: number) => `TRM${orderNumber}`;

async function saveMeta(orderId: number, patch: Partial<ShippingMeta>) {
  const o = await db.query.orders.findFirst({ where: eq(schema.orders.id, orderId), columns: { shippingMeta: true } });
  const next: ShippingMeta = { provider: "shiprocket", ...(o?.shippingMeta ?? {}), ...patch, updatedAt: new Date().toISOString() };
  await db.update(schema.orders).set({ shippingMeta: next }).where(eq(schema.orders.id, orderId));
  return next;
}

const event = (orderId: number, kind: string, message: string, staffId?: number | null) =>
  db.insert(schema.orderEvents).values({ orderId, kind, message, staffId: staffId ?? null });

/**
 * Creates the order in Shiprocket (status NEW there). Idempotent: an order that already has a
 * Shiprocket id is left alone. Amounts are rupees; COD collectable = sub_total + shipping +
 * transaction charges − total_discount, which equals our order total.
 */
export async function pushOrderToShiprocket(orderId: number, staffId?: number | null) {
  if (!shiprocketConfigured()) throw new ShiprocketError("Add SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD to connect Shiprocket.");
  const o = await db.query.orders.findFirst({ where: eq(schema.orders.id, orderId), with: { items: true } });
  if (!o) throw new ShiprocketError("Order not found");
  if (o.shippingMeta?.srOrderId) return o.shippingMeta;
  if (o.status === "cancelled") throw new ShiprocketError("Cancelled orders can’t be shipped.");
  if (o.paymentMethod !== "cod" && o.financialStatus !== "paid") throw new ShiprocketError("This prepaid order isn’t paid yet.");

  const sr = await getSettings("shiprocket");
  const a = o.shippingAddress;
  const [first, ...rest] = a.name.trim().split(/\s+/);
  const units = o.items.reduce((s, i) => s + i.quantity, 0);
  const ist = new Date(o.createdAt.getTime() + 330 * 60_000).toISOString();

  try {
    const r = await createOrder({
      order_id: shiprocketRef(o.number),
      order_date: `${ist.slice(0, 10)} ${ist.slice(11, 16)}`,
      pickup_location: sr.pickupLocation,
      billing_customer_name: first,
      billing_last_name: rest.join(" "),
      billing_address: a.line1,
      billing_address_2: a.line2 ?? "",
      billing_city: a.city,
      billing_pincode: a.pincode,
      billing_state: a.state,
      billing_country: "India",
      billing_email: o.email,
      billing_phone: (a.phone || o.phone || "").replace(/\D/g, "").slice(-10),
      shipping_is_billing: true,
      order_items: o.items.map((i) => ({
        name: i.variantTitle ? `${i.title} (${i.variantTitle})` : i.title,
        sku: i.sku || `TRM-${i.variantId ?? i.id}`,
        units: i.quantity,
        selling_price: i.price / 100,
        hsn: "6204",
      })),
      payment_method: o.paymentMethod === "cod" ? "COD" : "Prepaid",
      shipping_charges: o.shippingTotal / 100,
      transaction_charges: o.codFee / 100,
      total_discount: (o.discountTotal + o.prepaidDiscount) / 100,
      sub_total: o.subtotal / 100,
      length: sr.lengthCm,
      breadth: sr.breadthCm,
      height: sr.heightCm,
      weight: Math.max(0.1, Math.round(sr.weightKg * units * 100) / 100),
    });
    const meta = await saveMeta(orderId, { srOrderId: r.order_id, shipmentId: r.shipment_id, status: r.status, error: undefined });
    await event(orderId, "shipping", `Sent to Shiprocket (order ${r.order_id}, shipment ${r.shipment_id})`, staffId);
    return meta;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await saveMeta(orderId, { error: msg });
    await event(orderId, "shipping", `Shiprocket push failed: ${msg}`, staffId);
    throw e;
  }
}

/** Books the recommended courier (AWB) and schedules pickup — the "Ship now" button. */
export async function shipWithShiprocket(orderId: number, staffId?: number | null) {
  let meta = (await db.query.orders.findFirst({ where: eq(schema.orders.id, orderId), columns: { shippingMeta: true } }))?.shippingMeta;
  if (!meta?.shipmentId) meta = await pushOrderToShiprocket(orderId, staffId);
  const shipmentId = meta?.shipmentId;
  if (!meta || !shipmentId) throw new ShiprocketError("No Shiprocket shipment for this order.");
  if (!meta.awb) {
    const { awb, courier } = await assignAwb(shipmentId);
    meta = await saveMeta(orderId, { awb, courier: courier ?? undefined, status: "AWB ASSIGNED", error: undefined });
    await event(orderId, "shipping", `AWB ${awb} assigned${courier ? ` (${courier})` : ""}`, staffId);
  }
  if (!meta.pickupScheduled) {
    await schedulePickup(shipmentId);
    meta = await saveMeta(orderId, { pickupScheduled: true, status: "PICKUP SCHEDULED" });
    await event(orderId, "shipping", "Courier pickup scheduled", staffId);
  }
  await recordShipment(orderId, { awb: meta.awb!, courier: meta.courier ?? null, status: meta.status ?? null, delivered: false });
  return meta;
}

/** Pulls the latest tracking for an order with an AWB. */
export async function refreshTracking(orderId: number) {
  const o = await db.query.orders.findFirst({ where: eq(schema.orders.id, orderId), columns: { shippingMeta: true } });
  const awb = o?.shippingMeta?.awb;
  if (!awb) throw new ShiprocketError("This order has no AWB yet.");
  const t = await trackAwb(awb);
  await applyTrackingUpdate({ orderId, awb, courier: t.courier, status: t.status, etd: t.etd, delivered: t.delivered });
  return t;
}

/** Creates/updates the fulfillment row customers see on their order page. */
async function recordShipment(orderId: number, s: { awb: string; courier: string | null; status: string | null; delivered: boolean }) {
  const existing = await db.query.fulfillments.findFirst({ where: and(eq(schema.fulfillments.orderId, orderId), eq(schema.fulfillments.trackingNumber, s.awb)) });
  const status = s.delivered ? "delivered" : /rto|return/i.test(s.status ?? "") ? "returned" : "in_transit";
  if (existing) {
    await db
      .update(schema.fulfillments)
      .set({ status, carrier: s.courier ?? existing.carrier, deliveredAt: s.delivered ? (existing.deliveredAt ?? new Date()) : existing.deliveredAt })
      .where(eq(schema.fulfillments.id, existing.id));
  } else {
    const items = await db.select({ id: schema.orderItems.id, quantity: schema.orderItems.quantity }).from(schema.orderItems).where(eq(schema.orderItems.orderId, orderId));
    await db.insert(schema.fulfillments).values({
      orderId,
      status,
      carrier: s.courier,
      trackingNumber: s.awb,
      trackingUrl: trackingUrl(s.awb),
      items: items.map((i) => ({ orderItemId: i.id, quantity: i.quantity })),
      deliveredAt: s.delivered ? new Date() : null,
    });
  }
  await db
    .update(schema.orders)
    .set({ fulfillmentStatus: status === "returned" ? "returned" : "fulfilled" })
    .where(eq(schema.orders.id, orderId));
}

/** Shared by the webhook and manual refresh. Only logs an event when the status actually changes. */
export async function applyTrackingUpdate(u: { orderId: number; awb: string; courier?: string | null; status?: string | null; etd?: string | null; delivered?: boolean }) {
  const o = await db.query.orders.findFirst({ where: eq(schema.orders.id, u.orderId), columns: { shippingMeta: true } });
  const prev = o?.shippingMeta?.status;
  await saveMeta(u.orderId, { awb: u.awb, courier: u.courier ?? undefined, status: u.status ?? prev, etd: u.etd ?? undefined });
  const shipped = /pick|ship|transit|out for delivery|delivered|reached|rto/i.test(u.status ?? "");
  if (shipped || u.delivered) await recordShipment(u.orderId, { awb: u.awb, courier: u.courier ?? null, status: u.status ?? null, delivered: !!u.delivered });
  if (u.status && u.status !== prev) await event(u.orderId, "shipping", `Courier update: ${u.status}`);
}

/** Auto-push after confirmation when enabled in Admin → Settings → Shipping. Never throws. */
export async function autoPushIfEnabled(orderId: number) {
  try {
    const sr = await getSettings("shiprocket");
    if (sr.autoCreateOrders && shiprocketConfigured()) await pushOrderToShiprocket(orderId);
  } catch (e) {
    console.error("[shiprocket] auto push failed for order", orderId, e instanceof Error ? e.message : e);
  }
}
