import "server-only";
import crypto from "node:crypto";

/**
 * Razorpay Orders API. Without RAZORPAY_KEY_ID/SECRET the store runs in "simulated"
 * mode: checkout shows a test-payment step instead of the real Razorpay popup.
 */
export const razorpayEnabled = () => !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
export const razorpayKeyId = () => process.env.RAZORPAY_KEY_ID ?? "";
/** "test" for rzp_test_ keys, "live" for rzp_live_, null when not configured. */
export const razorpayMode = () => (!razorpayEnabled() ? null : razorpayKeyId().startsWith("rzp_live_") ? "live" : "test");
export const razorpayWebhookConfigured = () => !!process.env.RAZORPAY_WEBHOOK_SECRET;
/**
 * Without keys, a developer machine gets a "simulated payment" step. Never on a real server
 * (that would let anyone mark an order paid for free) unless ALLOW_SIMULATED_PAYMENTS=1 is set.
 */
export const simulatedPaymentsAllowed = () => !razorpayEnabled() && (process.env.NODE_ENV !== "production" || process.env.ALLOW_SIMULATED_PAYMENTS === "1");
/** Can shoppers pay online right now (real Razorpay, or simulation on a dev machine)? */
export const onlinePaymentsAvailable = () => razorpayEnabled() || simulatedPaymentsAllowed();

const authHeader = () => `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64")}`;

/** Admin "Test connection": a harmless read that only succeeds with a valid key pair. */
export async function testRazorpay() {
  if (!razorpayEnabled()) throw new Error("Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to the server .env, then restart.");
  const res = await fetch("https://api.razorpay.com/v1/payments?count=1", { headers: { Authorization: authHeader() }, cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (res.status === 401) throw new Error("Razorpay rejected the keys — check the Key ID and Key Secret (and that both are test or both live).");
  if (!res.ok) throw new Error(`Razorpay answered ${res.status}`);
  return razorpayMode();
}

export async function createRazorpayOrder(amountPaise: number, receipt: string, notes: Record<string, string>) {
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt, notes }),
  });
  if (!res.ok) throw new Error(`Razorpay order failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as { id: string; amount: number };
}

export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string) {
  const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqual(expected, signature);
}

export function verifyWebhookSignature(body: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return safeEqual(expected, signature);
}

/**
 * Refunds a captured payment (partial when `amountPaise` < payment). `optimum` = instant where the
 * bank supports it (small Razorpay fee), otherwise normal 5–7 working days.
 */
export async function refundPayment(paymentId: string, amountPaise: number, opts: { speed?: "normal" | "optimum"; notes?: Record<string, string>; receipt?: string } = {}) {
  const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({ amount: amountPaise, speed: opts.speed ?? "normal", notes: opts.notes, receipt: opts.receipt }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await res.json().catch(() => ({}))) as { id?: string; status?: string; speed_processed?: string; error?: { description?: string } };
  if (!res.ok || !body.id) throw new Error(body.error?.description || `Razorpay refund failed (${res.status})`);
  return { id: body.id, status: body.status ?? "pending", speed: body.speed_processed ?? null };
}

function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}
