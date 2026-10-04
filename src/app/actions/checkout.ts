"use server";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { z } from "zod";
import { db, schema } from "@/db";
import { getCustomer } from "@/lib/auth";
import { getCartId } from "@/lib/cart";
import { CheckoutError, createOrderFromCart, findOrderForTracking, markOrderPaid } from "@/lib/orders";
import { createRazorpayOrder, razorpayEnabled, razorpayKeyId, verifyPaymentSignature } from "@/lib/razorpay";
import { getCartState } from "@/lib/cart";
import { INDIAN_STATES } from "@/lib/india";
import { deliveryQuote, lookupPincode as lookupPin } from "@/lib/delivery";
import { getSettings } from "@/lib/settings";



/** City/state autofill from India Post's public pincode directory. */
export async function lookupPincode(pin: string): Promise<{ city: string; state: string } | null> {
  return lookupPin(pin);
}

/** Product-page delivery checker: delivery window + COD availability (live Shiprocket data when connected). */
export async function checkDelivery(pin: string) {
  return deliveryQuote(pin);
}

/** Checkout pincode step: autofill city/state and show the delivery date + COD availability together. */
export async function checkoutPincode(pin: string) {
  const [place, quote] = await Promise.all([lookupPin(pin), deliveryQuote(pin)]);
  return { place, quote };
}

/** Marks the cart as an started checkout (feeds abandoned-checkout recovery). */
export async function checkoutStarted(email: string) {
  const cartId = await getCartId();
  if (!cartId || !z.string().email().safeParse(email).success) return;
  await db.update(schema.carts).set({ email: email.toLowerCase(), checkoutStartedAt: new Date() }).where(eq(schema.carts.id, cartId));
}

const phoneRe = /^(?:\+?91[\s-]?)?[6-9]\d{9}$/;
const input = z.object({
  email: z.string().trim().email("Please enter a valid email"),
  phone: z.string().trim().regex(phoneRe, "Enter a 10-digit Indian mobile number"),
  name: z.string().trim().min(2, "Please enter your full name").max(80),
  line1: z.string().trim().min(4, "Please enter your house/flat and street").max(160),
  line2: z.string().trim().max(160).optional(),
  city: z.string().trim().min(2, "Please enter your city").max(60),
  state: z.enum(INDIAN_STATES as [string, ...string[]], { message: "Please choose your state" }),
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit pincode"),
  paymentMethod: z.enum(["razorpay", "cod"]),
  acceptsMarketing: z.string().optional(),
  note: z.string().trim().max(500).optional(),
});

export type PlaceOrderResult =
  | { ok: false; error: string; field?: string }
  | { ok: true; kind: "done"; url: string }
  | { ok: true; kind: "razorpay"; token: string; key: string; gatewayOrderId: string; amount: number; prefill: { name: string; email: string; contact: string } }
  | { ok: true; kind: "simulate"; token: string; amount: number };

export async function placeOrder(form: FormData): Promise<PlaceOrderResult> {
  const parsed = input.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue.message, field: String(issue.path[0]) };
  }
  const d = parsed.data;
  const cartId = await getCartId();
  if (!cartId) return { ok: false, error: "Your bag is empty." };

  const shipping = await getSettings("shipping");
  // Real courier coverage (only when Shiprocket is connected): block undeliverable pincodes and COD where couriers can't collect cash.
  const quote = await deliveryQuote(d.pincode);
  if (quote?.source === "live" && !quote.serviceable)
    return { ok: false, error: "Sorry — our couriers don’t deliver to this pincode yet. Please use another address or WhatsApp us.", field: "pincode" };
  if (d.paymentMethod === "cod" && quote?.source === "live" && !quote.codAvailable)
    return { ok: false, error: "Cash on delivery isn’t available for this pincode. Please pay online — you’ll also get the prepaid discount." };
  if (d.paymentMethod === "cod") {
    if (!shipping.codEnabled) return { ok: false, error: "Cash on delivery isn’t available right now." };
    const { totals } = await getCartState({ paymentMethod: "cod" });
    if (shipping.codMaxOrder && totals.total > shipping.codMaxOrder)
      return { ok: false, error: `Cash on delivery is available on orders up to ₹${shipping.codMaxOrder / 100}. Please pay online.` };
  }

  const customer = await getCustomer();
  const sid = (await cookies()).get("tm_sid")?.value ?? null;
  const phone = d.phone.replace(/\D/g, "").slice(-10);

  try {
    const order = await createOrderFromCart({
      cartId,
      email: d.email,
      phone,
      address: { name: d.name, phone, line1: d.line1, line2: d.line2, city: d.city, state: d.state, pincode: d.pincode, country: "India" },
      paymentMethod: d.paymentMethod,
      acceptsMarketing: !!d.acceptsMarketing,
      note: d.note,
      customerId: customer?.id,
      sessionId: sid,
    });
    if (order.paymentMethod === "cod") return { ok: true, kind: "done", url: `/orders/${order.token}?new=1` };

    if (!razorpayEnabled()) return { ok: true, kind: "simulate", token: order.token, amount: order.total };
    const rzp = await createRazorpayOrder(order.total, `TRM${order.number}`, { order_number: String(order.number) });
    await db.update(schema.orders).set({ paymentGatewayOrderId: rzp.id }).where(eq(schema.orders.id, order.id));
    return {
      ok: true,
      kind: "razorpay",
      token: order.token,
      key: razorpayKeyId(),
      gatewayOrderId: rzp.id,
      amount: order.total,
      prefill: { name: d.name, email: d.email, contact: phone },
    };
  } catch (e) {
    if (e instanceof CheckoutError) return { ok: false, error: e.message };
    console.error("[checkout]", e);
    return { ok: false, error: "Something went wrong placing your order. Please try again — you haven’t been charged." };
  }
}

export async function verifyPayment(token: string, p: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) {
  const order = await db.query.orders.findFirst({ where: eq(schema.orders.token, token) });
  if (!order || order.paymentGatewayOrderId !== p.razorpay_order_id) return { ok: false as const, error: "Order not found" };
  if (!verifyPaymentSignature(p.razorpay_order_id, p.razorpay_payment_id, p.razorpay_signature)) return { ok: false as const, error: "Payment verification failed" };
  await markOrderPaid(order.id, p.razorpay_payment_id, p.razorpay_order_id);
  return { ok: true as const, url: `/orders/${token}?new=1` };
}

/** Test mode only (no Razorpay keys configured): completes the payment step. */
export async function simulatePayment(token: string) {
  if (razorpayEnabled()) return { ok: false as const, error: "Not available" };
  const order = await db.query.orders.findFirst({ where: eq(schema.orders.token, token) });
  if (!order) return { ok: false as const, error: "Order not found" };
  await markOrderPaid(order.id, `test_${Date.now()}`);
  return { ok: true as const, url: `/orders/${token}?new=1` };
}

export async function trackOrder(_: unknown, form: FormData): Promise<{ error?: string; url?: string }> {
  const number = Number(String(form.get("order") ?? "").replace(/\D/g, ""));
  const who = String(form.get("contact") ?? "");
  if (!number || !who.trim()) return { error: "Enter your order number and the email or phone used to order." };
  const found = await findOrderForTracking(number, who);
  if (!found) return { error: "We couldn’t find an order with those details. Check the number in your confirmation email." };
  return { url: `/orders/${found.token}` };
}
