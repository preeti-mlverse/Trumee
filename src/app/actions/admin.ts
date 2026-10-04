"use server";

import { eq } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { ADMIN_COOKIE, logAudit, requireOwner, requireStaff, startStaffSession, verifyPassword } from "@/lib/auth";
import { deliveryQuote } from "@/lib/delivery";
import { pushOrderToShiprocket, refreshTracking, shipWithShiprocket } from "@/lib/fulfilment";
import { DEFAULTS, getSettings, type SettingsMap } from "@/lib/settings";
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
  shiprocket: z.object({
    liveEstimates: checkbox,
    autoCreateOrders: checkbox,
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

// ───────────────────────────── orders

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
