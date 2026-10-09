"use server";

import { eq } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { ADMIN_COOKIE, logAudit, requireOwner, requireStaff, startStaffSession, verifyPassword } from "@/lib/auth";
import { deliveryQuote } from "@/lib/delivery";
import { cancelShipment, pushOrderToShiprocket, refreshTracking, requestPickup, shippingDocument, shipWithShiprocket } from "@/lib/fulfilment";
import { addNote, cancelOrder, markPaid, OrderActionError, refundOrder } from "@/lib/order-admin";
import { testRazorpay } from "@/lib/razorpay";
import { DEFAULTS, getSettings, PAYMENT_METHODS, type SettingsMap } from "@/lib/settings";
import { serviceability, shiprocketConfigured } from "@/lib/shiprocket";

// ───────────────────────────── session

const failures = new Map<string, { n: number; until: number }>();

export async function adminLogin(_: unknown, form: FormData): Promise<{ error?: string }> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const f = failures.get(email);
  if (f && f.until > Date.now()) return { error: "Too many attempts — try again in a few minutes." };

  const staff = email ? await db.query.staff.findFirst({ where: eq(schema.staff.email, email) }) : null;
  const ok = !!staff?.active && (await verifyPassword(password, staff.passwordHash));
  if (!ok || !staff) {
    const n = (f?.n ?? 0) + 1;
    failures.set(email, { n, until: n >= 5 ? Date.now() + 10 * 60_000 : 0 });
    return { error: "Email or password is incorrect." };
  }
  failures.delete(email);
  await startStaffSession(staff.id);
  await db.update(schema.staff).set({ lastLoginAt: new Date() }).where(eq(schema.staff.id, staff.id));
  await logAudit(staff.id, "login", "staff", staff.id);
  const next = String(form.get("next") ?? "");
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function adminLogout() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

// ───────────────────────────── settings

const rupees = z.coerce.number().min(0).max(1_000_000).transform((v) => Math.round(v * 100));
const optRupees = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (v === "") return null;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) {
      ctx.addIssue({ code: "custom", message: "Enter an amount in ₹ or leave blank" });
      return z.NEVER;
    }
    return Math.round(n * 100);
  });
const checkbox = z.preprocess((v) => v === "on" || v === "true", z.boolean());

const SCHEMAS = {
  payments: z.object({
    prepaidDiscountPercent: z.coerce.number().min(0, "Can’t be negative").max(50, "Keep it at 50% or less"),
    prepaidDiscountMax: optRupees,
    prepaidDiscountMinOrder: rupees,
  }),
  cod: z.object({
    codEnabled: checkbox,
    codFee: rupees,
    codMaxOrder: optRupees,
  }),
  shipping: z.object({
    flatRate: rupees,
    freeShippingThreshold: optRupees,
    processingDays: z.string().trim().min(3).max(60),
    est0: z.string().trim().max(40),
    est1: z.string().trim().max(40),
    est2: z.string().trim().max(40),
  }),
  checkout: z.object({
    checkoutName: z.string().trim().min(1, "Enter the name shown in the payment window").max(40),
    refundSpeed: z.enum(["normal", "optimum"]),
    ...Object.fromEntries(PAYMENT_METHODS.map((m) => [`m_${m.key}`, checkbox])),
  }),
  store: z.object({
    name: z.string().trim().min(1).max(60),
    tagline: z.string().trim().max(120),
    legalName: z.string().trim().max(120),
    gstin: z
      .string()
      .trim()
      .toUpperCase()
      .refine((v) => v === "" || /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v), "That doesn’t look like a 15-character GSTIN"),
    email: z.string().trim().email("Enter a valid support email"),
    phone: z.string().trim().min(8).max(20),
    whatsapp: z.string().trim().regex(/^\d{10,13}$/, "WhatsApp: digits only with country code, e.g. 919986950695"),
    address: z.string().trim().min(10).max(300),
    supportHours: z.string().trim().max(80),
    instagram: z.string().trim().url().or(z.literal("")),
    youtube: z.string().trim().url().or(z.literal("")),
    facebook: z.string().trim().url().or(z.literal("")),
    pinterest: z.string().trim().url().or(z.literal("")),
  }),
  announcement: z.object({
    enabled: checkbox,
    text: z.string().trim().max(140),
    href: z.string().trim().max(200),
  }),
  tax: z.object({
    pricesIncludeTax: checkbox,
    threshold: rupees,
    lowRate: z.coerce.number().min(0).max(40),
    highRate: z.coerce.number().min(0).max(40),
  }),
  integrations: z.object({
    ga4MeasurementId: z.string().trim().regex(/^(G-[A-Z0-9]+)?$/i, "GA4 IDs look like G-XXXXXXX"),
    metaPixelId: z.string().trim().regex(/^\d*$/, "The Meta Pixel ID is a number"),
    clarityId: z.string().trim().regex(/^[a-z0-9]*$/i, "Clarity project IDs are letters and numbers"),
    googleSiteVerification: z.string().trim().max(100),
  }),
  shiprocket: z.object({
    liveEstimates: checkbox,
    autoCreateOrders: checkbox,
    autoPickup: checkbox,
    courierPreference: z.enum(["recommended", "cheapest", "fastest"]),
    pickupLocation: z.string().trim().min(1, "Enter the pickup nickname from Shiprocket").max(60),
    pickupPostcode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a 6-digit pincode"),
    weightKg: z.coerce.number().min(0.05).max(30),
    lengthCm: z.coerce.number().min(1).max(200),
    breadthCm: z.coerce.number().min(1).max(200),
    heightCm: z.coerce.number().min(0.5).max(200),
  }),
} as const;

export type SettingsSection = keyof typeof SCHEMAS;
export type SaveResult = { ok?: boolean; error?: string; at?: number };

async function writeSetting<K extends keyof SettingsMap>(key: K, value: SettingsMap[K]) {
  await db
    .insert(schema.settings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt: new Date() } });
}

export async function saveSettings(section: SettingsSection, _: unknown, form: FormData): Promise<SaveResult> {
  const staff = await requireOwner();
  const raw = Object.fromEntries(form);
  const parsed = SCHEMAS[section].safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data as Record<string, unknown>;

  if (section === "payments") {
    await writeSetting("payments", { ...(await getSettings("payments")), ...(d as SettingsMap["payments"]) });
  } else if (section === "checkout") {
    const methods = Object.fromEntries(PAYMENT_METHODS.map((m) => [m.key, !!d[`m_${m.key}`]])) as SettingsMap["payments"]["methods"];
    if (!Object.values(methods).some(Boolean)) return { error: "Keep at least one payment method switched on." };
    await writeSetting("payments", { ...(await getSettings("payments")), checkoutName: String(d.checkoutName), refundSpeed: d.refundSpeed as "normal" | "optimum", methods });
  } else if (section === "store") {
    const { instagram, youtube, facebook, pinterest, ...rest } = d as Record<string, string>;
    const social = Object.fromEntries(Object.entries({ instagram, youtube, facebook, pinterest }).filter(([, v]) => v));
    await writeSetting("store", { ...(await getSettings("store")), ...rest, social } as SettingsMap["store"]);
  } else if (section === "announcement") {
    const cur = await getSettings("store");
    await writeSetting("store", { ...cur, announcement: { enabled: !!d.enabled, text: String(d.text), href: String(d.href) || undefined } });
  } else if (section === "tax") {
    await writeSetting("tax", { ...(await getSettings("tax")), ...(d as SettingsMap["tax"]) });
  } else if (section === "integrations") {
    await writeSetting("integrations", { ...(await getSettings("integrations")), ...(d as SettingsMap["integrations"]) });
  } else if (section === "cod" || section === "shipping") {
    const cur = await getSettings("shipping");
    const next = { ...cur };
    if (section === "cod") Object.assign(next, d);
    else {
      const labels = DEFAULTS.shipping.deliveryEstimates.map((e) => e.label);
      Object.assign(next, {
        flatRate: d.flatRate,
        freeShippingThreshold: d.freeShippingThreshold,
        processingDays: d.processingDays,
        deliveryEstimates: [d.est0, d.est1, d.est2].map((days, i) => ({ label: cur.deliveryEstimates[i]?.label ?? labels[i], days: String(days) })).filter((e) => e.days),
      });
    }
    await writeSetting("shipping", next);
  } else {
    await writeSetting("shiprocket", { ...(await getSettings("shiprocket")), ...(d as SettingsMap["shiprocket"]) });
  }

  await logAudit(staff.id, "settings.update", "settings", section, d);
  updateTag("settings");
  revalidatePath("/", "layout");
  return { ok: true, at: Date.now() };
}

/** Admin → Settings → Shiprocket "Test": real login + serviceability for a pincode. */
export async function testShiprocket(_: unknown, form: FormData): Promise<{ ok?: string; error?: string }> {
  await requireOwner();
  const pin = String(form.get("pincode") ?? "").trim();
  if (!/^[1-9]\d{5}$/.test(pin)) return { error: "Enter a 6-digit pincode to test." };
  if (!shiprocketConfigured()) return { error: "Not connected — add SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD to the server environment, then restart." };
  try {
    const sr = await getSettings("shiprocket");
    const s = await serviceability(sr.pickupPostcode, pin, { weightKg: sr.weightKg, cod: false });
    if (!s.serviceable) return { ok: `Connected ✓ — but no courier serves ${pin} from ${sr.pickupPostcode}.` };
    const q = await deliveryQuote(pin);
    return { ok: `Connected ✓ — ${s.courier ?? "courier"} delivers to ${pin} in ~${s.days} days (customers see ${q?.from} – ${q?.to}); COD ${s.codAvailable ? "available" : "not available"}.` };
  } catch (e) {
    return { error: `Shiprocket said: ${e instanceof Error ? e.message : String(e)}` };
  }
}

export async function testRazorpayAction(): Promise<{ ok?: string; error?: string }> {
  await requireOwner();
  try {
    const mode = await testRazorpay();
    return { ok: `Connected ✓ — ${mode === "live" ? "LIVE mode: real payments" : "TEST mode: no real money moves"}.` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

// ───────────────────────────── orders

export type OrderOp = "refund" | "cancel" | "markPaid" | "note" | "label" | "invoice" | "cancelShipment" | "pickup";
export type OrderOpResult = { ok?: string; error?: string; url?: string; at?: number };

/** Everything the order detail page can do. Form fields depend on the op. */
export async function orderAction(orderId: number, op: OrderOp, _: unknown, form: FormData): Promise<OrderOpResult> {
  const staff = await requireStaff("orders");
  const f = (k: string) => String(form.get(k) ?? "").trim();
  try {
    switch (op) {
      case "refund": {
        const amount = Math.round(Number(f("amount")) * 100);
        if (!Number.isFinite(amount)) return { error: "Enter the refund amount in ₹." };
        const reason = f("reason") || "Refund";
        const speed = f("speed") === "optimum" ? "optimum" : "normal";
        const r = await refundOrder(orderId, { amount, reason, speed }, staff.id);
        await logAudit(staff.id, "order.refund", "order", orderId, { amount, reason, speed });
        return { ok: r.gatewayRefundId ? `Refund started on Razorpay (${r.gatewayRefundId}).` : "Refund recorded.", at: Date.now() };
      }
      case "cancel": {
        const reason = f("reason") || "Cancelled by store";
        await cancelOrder(orderId, { reason, refund: form.get("refund") === "on", restock: form.get("restock") === "on" }, staff.id);
        await logAudit(staff.id, "order.cancel", "order", orderId, { reason });
        return { ok: "Order cancelled.", at: Date.now() };
      }
      case "markPaid":
        await markPaid(orderId, staff.id);
        await logAudit(staff.id, "order.mark_paid", "order", orderId);
        return { ok: "Marked as paid.", at: Date.now() };
      case "note":
        await addNote(orderId, f("note"), staff.id);
        return { ok: "Note added.", at: Date.now() };
      case "label":
      case "invoice":
        return { ok: "Opening…", url: await shippingDocument(orderId, op), at: Date.now() };
      case "cancelShipment":
        await cancelShipment(orderId, staff.id);
        await logAudit(staff.id, "shiprocket.cancel_shipment", "order", orderId);
        return { ok: "Shipment cancelled — use Ship now to book a new courier.", at: Date.now() };
      case "pickup":
        await requestPickup(orderId, staff.id);
        return { ok: "Pickup requested.", at: Date.now() };
    }
  } catch (e) {
    return { error: e instanceof OrderActionError || e instanceof Error ? e.message : String(e) };
  } finally {
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/orders");
  }
}

export async function shiprocketOrderAction(orderId: number, op: "push" | "ship" | "track"): Promise<{ ok?: string; error?: string }> {
  const staff = await requireStaff("orders");
  try {
    if (op === "push") {
      const m = await pushOrderToShiprocket(orderId, staff.id);
      await logAudit(staff.id, "shiprocket.push", "order", orderId);
      return { ok: `Sent to Shiprocket (shipment ${m.shipmentId})` };
    }
    if (op === "ship") {
      const m = await shipWithShiprocket(orderId, staff.id);
      await logAudit(staff.id, "shiprocket.ship", "order", orderId);
      return { ok: `AWB ${m.awb}${m.courier ? ` · ${m.courier}` : ""} · pickup scheduled` };
    }
    const t = await refreshTracking(orderId);
    return { ok: `Latest: ${t.status ?? "no scans yet"}${t.etd ? ` · ETA ${t.etd}` : ""}` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  } finally {
    revalidatePath("/admin/orders");
  }
}
