import "server-only";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { cancelInShiprocket } from "./fulfilment";
import { adjustStock } from "./orders";
import { refundPayment } from "./razorpay";
import { getSettings } from "./settings";

/** Admin order operations: refunds, cancellation, COD collection and notes. Amounts are paise. */

export class OrderActionError extends Error {}

const inr = (p: number) => `₹${(p / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const event = (orderId: number, kind: string, message: string, staffId?: number | null) =>
  db.insert(schema.orderEvents).values({ orderId, kind, message, staffId: staffId ?? null });

async function load(orderId: number) {
  const o = await db.query.orders.findFirst({ where: eq(schema.orders.id, orderId), with: { items: true } });
  if (!o) throw new OrderActionError("Order not found.");
  return o;
}

/** Stock leaves inventory when a COD order is placed, or when an online order is paid. */
const stockWasTaken = (o: { paymentMethod: string; financialStatus: string }) =>
  o.paymentMethod === "cod" || ["paid", "partially_refunded", "refunded"].includes(o.financialStatus);

/**
 * Refunds money to the customer. Online orders go back through Razorpay (normal or instant);
 * COD orders are recorded only — you pay those back yourself (UPI / bank transfer).
 */
export async function refundOrder(orderId: number, input: { amount: number; reason: string; speed?: "normal" | "optimum" }, staffId?: number | null) {
  const o = await load(orderId);
  const refundable = o.total - o.refundedTotal;
  if (!["paid", "partially_refunded"].includes(o.financialStatus)) throw new OrderActionError("Only paid orders can be refunded.");
  if (input.amount <= 0) throw new OrderActionError("Enter an amount to refund.");
  if (input.amount > refundable) throw new OrderActionError(`You can refund up to ${inr(refundable)} on this order.`);

  let gatewayRefundId: string | null = null;
  let how = "recorded (pay the customer back yourself)";
  if (o.paymentMethod === "razorpay") {
    if (!o.paymentId) throw new OrderActionError("This order has no Razorpay payment id to refund.");
    const speed = input.speed ?? (await getSettings("payments")).refundSpeed;
    const r = await refundPayment(o.paymentId, input.amount, { speed, notes: { order: `TRM${o.number}`, reason: input.reason.slice(0, 200) }, receipt: `TRM${o.number}-R${Date.now() % 100000}` });
    gatewayRefundId = r.id;
    how = `via Razorpay (${r.id}, ${r.speed === "instant" ? "instant" : speed === "optimum" ? "instant if the bank supports it" : "5–7 working days"})`;
  }

  const refundedTotal = o.refundedTotal + input.amount;
  await db.transaction(async (tx) => {
    await tx.insert(schema.refunds).values({ orderId, amount: input.amount, reason: input.reason, restock: false, gatewayRefundId, staffId: staffId ?? null });
    await tx
      .update(schema.orders)
      .set({ refundedTotal, financialStatus: refundedTotal >= o.total ? "refunded" : "partially_refunded" })
      .where(eq(schema.orders.id, orderId));
    await tx.insert(schema.orderEvents).values({ orderId, kind: "refund", message: `Refund of ${inr(input.amount)} ${how}. Reason: ${input.reason}`, staffId: staffId ?? null });
  });
  return { refundedTotal, gatewayRefundId };
}

/**
 * Cancels an order that hasn't left the warehouse: removes it from Shiprocket, puts the stock
 * back, and (optionally) refunds whatever was paid online.
 */
export async function cancelOrder(orderId: number, input: { reason: string; refund: boolean; restock: boolean }, staffId?: number | null) {
  const o = await load(orderId);
  if (o.status === "cancelled") throw new OrderActionError("This order is already cancelled.");
  if (o.fulfillmentStatus === "fulfilled" && /transit|out for delivery|delivered/i.test(o.shippingMeta?.status ?? ""))
    throw new OrderActionError("This order is already on its way — use a return instead of cancelling.");

  await cancelInShiprocket(orderId, staffId);

  if (input.refund && ["paid", "partially_refunded"].includes(o.financialStatus) && o.total > o.refundedTotal) {
    await refundOrder(orderId, { amount: o.total - o.refundedTotal, reason: `Order cancelled — ${input.reason}` }, staffId);
  }

  await db.transaction(async (tx) => {
    if (input.restock && stockWasTaken(o)) await adjustStock(tx, o.items, 1, "cancel", orderId);
    const unpaidOnline = o.paymentMethod === "razorpay" && o.financialStatus === "pending";
    await tx
      .update(schema.orders)
      .set({ status: "cancelled", cancelledAt: new Date(), cancelReason: input.reason, ...(unpaidOnline ? { financialStatus: "voided" as const } : {}) })
      .where(eq(schema.orders.id, orderId));
    if (o.discountCode)
      await tx.update(schema.discounts).set({ usedCount: sql`greatest(${schema.discounts.usedCount} - 1, 0)` }).where(sql`upper(${schema.discounts.code}) = upper(${o.discountCode})`);
    await tx.insert(schema.orderEvents).values({
      orderId,
      kind: "cancelled",
      message: `Order cancelled. Reason: ${input.reason}${input.restock && stockWasTaken(o) ? " · stock returned to inventory" : ""}`,
      staffId: staffId ?? null,
    });
  });
}

/** COD money collected by the courier (or paid some other way) — marks the order paid. */
export async function markPaid(orderId: number, staffId?: number | null) {
  const o = await load(orderId);
  if (o.financialStatus === "paid") throw new OrderActionError("Already marked as paid.");
  if (o.paymentMethod !== "cod") throw new OrderActionError("Online orders are marked paid automatically when Razorpay confirms the payment.");
  if (o.status === "cancelled") throw new OrderActionError("This order is cancelled.");
  await db.update(schema.orders).set({ financialStatus: "paid", paidAt: new Date() }).where(eq(schema.orders.id, orderId));
  await event(orderId, "paid", `Marked as paid — COD ${inr(o.total)} collected`, staffId);
}

export async function addNote(orderId: number, text: string, staffId?: number | null) {
  const t = text.trim();
  if (!t) throw new OrderActionError("Write a note first.");
  await event(orderId, "comment", t.slice(0, 2000), staffId);
}
