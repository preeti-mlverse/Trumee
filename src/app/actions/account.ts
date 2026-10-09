"use server";

import { and, desc, eq, gt, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { CUSTOMER_COOKIE, hashPassword, requireCustomer, startCustomerSession, verifyPassword } from "@/lib/auth";
import { listProducts } from "@/lib/catalog";
import { sendEmail, templates } from "@/lib/email";
import { checkOtp, customerFromPhone, isPlaceholderEmail, OtpError, sendOtp } from "@/lib/social-auth";

type State = { error?: string; ok?: string } | null;
const safeNext = (n: unknown) => (typeof n === "string" && n.startsWith("/") && !n.startsWith("//") ? n : "/account");

export async function login(_: State, form: FormData): Promise<State> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const c = await db.query.customers.findFirst({ where: sql`lower(${schema.customers.email}) = ${email}` });
  if (!c?.passwordHash || !(await verifyPassword(password, c.passwordHash))) return { error: "That email and password don’t match." };
  await startCustomerSession(c.id);
  await db.update(schema.customers).set({ lastLoginAt: new Date() }).where(eq(schema.customers.id, c.id));
  redirect(safeNext(form.get("next")));
}

const registerSchema = z.object({
  firstName: z.string().trim().min(1, "Please enter your first name").max(60),
  lastName: z.string().trim().max(60).optional(),
  email: z.string().trim().toLowerCase().email("Please enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters"),
  acceptsMarketing: z.string().optional(),
});

export async function register(_: State, form: FormData): Promise<State> {
  const p = registerSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0].message };
  const existing = await db.query.customers.findFirst({ where: sql`lower(${schema.customers.email}) = ${p.data.email}` });
  if (existing?.passwordHash) return { error: "An account with this email already exists — try signing in." };
  const passwordHash = await hashPassword(p.data.password);
  let id = existing?.id;
  // A guest who already ordered keeps their order history when they register
  if (existing) await db.update(schema.customers).set({ passwordHash, firstName: p.data.firstName, lastName: p.data.lastName || null }).where(eq(schema.customers.id, existing.id));
  else
    [{ id }] = await db
      .insert(schema.customers)
      .values({ email: p.data.email, firstName: p.data.firstName, lastName: p.data.lastName || null, passwordHash, acceptsMarketing: !!p.data.acceptsMarketing })
      .returning({ id: schema.customers.id });
  await startCustomerSession(id!);
  redirect(safeNext(form.get("next")) + "?welcome=1");
}

export async function logout() {
  (await cookies()).delete(CUSTOMER_COOKIE);
  redirect("/");
}

export async function forgotPassword(_: State, form: FormData): Promise<State> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const c = await db.query.customers.findFirst({ where: sql`lower(${schema.customers.email}) = ${email}` });
  if (c) {
    const token = nanoid(40);
    await db.update(schema.customers).set({ resetToken: token, resetTokenExpires: new Date(Date.now() + 3600_000) }).where(eq(schema.customers.id, c.id));
    const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    await sendEmail({ to: c.email, ...templates.passwordReset({ url: `${site}/account/reset?token=${token}` }) });
  }
  // Same message either way so the form can't be used to discover accounts
  return { ok: "If an account exists for that email, a reset link is on its way." };
}

export async function resetPassword(_: State, form: FormData): Promise<State> {
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  if (password.length < 8) return { error: "Use at least 8 characters." };
  const c = await db.query.customers.findFirst({ where: and(eq(schema.customers.resetToken, token), gt(schema.customers.resetTokenExpires, new Date())) });
  if (!c) return { error: "This reset link has expired. Please request a new one." };
  await db.update(schema.customers).set({ passwordHash: await hashPassword(password), resetToken: null, resetTokenExpires: null }).where(eq(schema.customers.id, c.id));
  await startCustomerSession(c.id);
  redirect("/account");
}

export async function updateProfile(_: State, form: FormData): Promise<State> {
  const c = await requireCustomer();
  const phone = String(form.get("phone") ?? "").replace(/\D/g, "").slice(-10);
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (email && isPlaceholderEmail(c.email)) {
    if (!z.string().email().safeParse(email).success) return { error: "Please enter a valid email." };
    const taken = await db.query.customers.findFirst({ where: sql`lower(${schema.customers.email}) = ${email}` });
    if (taken && taken.id !== c.id) return { error: "That email belongs to another account — sign in with it instead." };
    await db.update(schema.customers).set({ email }).where(eq(schema.customers.id, c.id));
  }
  await db
    .update(schema.customers)
    .set({
      firstName: String(form.get("firstName") ?? "").trim() || c.firstName,
      lastName: String(form.get("lastName") ?? "").trim() || null,
      phone: phone || null,
      acceptsMarketing: form.get("acceptsMarketing") === "on",
    })
    .where(eq(schema.customers.id, c.id));
  return { ok: "Saved." };
}

/** Products for the wishlist page (ids come from the device's saved list). */
export async function wishlistProducts(ids: number[]) {
  const clean = ids.filter((n) => Number.isInteger(n)).slice(0, 60);
  if (!clean.length) return [];
  const { items } = await listProducts({ ids: clean, limit: 60 });
  return items;
}

// ───────────────────────────── address book

const addressInput = z.object({
  name: z.string().trim().min(2, "Enter the full name"),
  phone: z
    .string()
    .transform((v) => v.replace(/\D/g, "").slice(-10))
    .refine((v) => /^[6-9]\d{9}$/.test(v), "Enter a 10-digit mobile number"),
  line1: z.string().trim().min(5, "Enter the house / flat and street"),
  line2: z.string().trim().max(120).optional(),
  city: z.string().trim().min(2, "Enter the city"),
  state: z.string().trim().min(2, "Choose the state"),
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a 6-digit pincode"),
});

/** Add (no id) or edit an address in the signed-in customer's book. */
export async function saveAddress(id: number | null, _: State, form: FormData): Promise<State> {
  const c = await requireCustomer();
  const parsed = addressInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = { ...parsed.data, line2: parsed.data.line2 || undefined, country: "India" };
  const makeDefault = form.get("isDefault") === "on";
  const count = (await db.query.addresses.findMany({ where: eq(schema.addresses.customerId, c.id), columns: { id: true } })).length;
  if (makeDefault) await db.update(schema.addresses).set({ isDefault: false }).where(eq(schema.addresses.customerId, c.id));
  if (id) {
    await db
      .update(schema.addresses)
      .set({ data, ...(makeDefault ? { isDefault: true } : {}) })
      .where(and(eq(schema.addresses.id, id), eq(schema.addresses.customerId, c.id)));
  } else {
    await db.insert(schema.addresses).values({ customerId: c.id, data, isDefault: makeDefault || count === 0 });
  }
  revalidatePath("/account");
  return { ok: "Address saved." };
}

export async function deleteAddress(id: number) {
  const c = await requireCustomer();
  const [gone] = await db
    .delete(schema.addresses)
    .where(and(eq(schema.addresses.id, id), eq(schema.addresses.customerId, c.id)))
    .returning({ isDefault: schema.addresses.isDefault });
  // Keep one default when the default is removed
  if (gone?.isDefault) {
    const next = await db.query.addresses.findFirst({ where: eq(schema.addresses.customerId, c.id), orderBy: desc(schema.addresses.createdAt) });
    if (next) await db.update(schema.addresses).set({ isDefault: true }).where(eq(schema.addresses.id, next.id));
  }
  revalidatePath("/account");
}

export async function setDefaultAddress(id: number) {
  const c = await requireCustomer();
  await db.update(schema.addresses).set({ isDefault: false }).where(eq(schema.addresses.customerId, c.id));
  await db.update(schema.addresses).set({ isDefault: true }).where(and(eq(schema.addresses.id, id), eq(schema.addresses.customerId, c.id)));
  revalidatePath("/account");
}

// ───────────────────────────── mobile OTP sign-in

type OtpState = { error?: string; sent?: string; phone?: string } | null;
const tenDigits = (v: unknown) => String(v ?? "").replace(/\D/g, "").slice(-10);

/** Step 1: text a 6-digit code to the number. */
export async function requestOtp(_: OtpState, form: FormData): Promise<OtpState> {
  const phone = tenDigits(form.get("phone"));
  if (!/^[6-9]\d{9}$/.test(phone)) return { error: "Enter your 10-digit mobile number." };
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  try {
    await sendOtp(phone, ip);
    return { sent: `We’ve sent a 6-digit code to +91 ${phone.slice(0, 5)} ${phone.slice(5)}.`, phone };
  } catch (e) {
    return { error: e instanceof OtpError ? e.message : "Couldn’t send the code — please try again.", phone };
  }
}

/** Step 2: check the code, then sign in (creating the account on first use). */
export async function verifyOtp(_: OtpState, form: FormData): Promise<OtpState> {
  const phone = tenDigits(form.get("phone"));
  const code = String(form.get("code") ?? "").replace(/\D/g, "");
  if (code.length !== 6) return { error: "Enter the 6-digit code.", sent: "", phone };
  try {
    checkOtp(phone, code);
  } catch (e) {
    return { error: e instanceof OtpError ? e.message : "That code isn’t right.", sent: "", phone };
  }
  const c = await customerFromPhone(phone);
  await startCustomerSession(c.id);
  redirect(safeNext(form.get("next")) + (c.created ? "?welcome=1" : ""));
}
