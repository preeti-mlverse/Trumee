import "server-only";
import crypto from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";

/**
 * Passwordless sign-in for shoppers: Google (OAuth 2.0 / OpenID) and mobile OTP by SMS.
 *
 * Google: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET from Google Cloud → APIs & Services → Credentials
 *   (OAuth client, type "Web application"; authorised redirect URI = <site>/api/auth/google/callback).
 * SMS OTP: SMS_PROVIDER = "2factor" (TWOFACTOR_API_KEY, optional TWOFACTOR_TEMPLATE) or
 *   "msg91" (MSG91_AUTH_KEY, MSG91_TEMPLATE_ID — a DLT-approved OTP template with ##OTP##).
 *   Without a provider, a dev machine prints the code to the server log; production shows no OTP option.
 */

export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

// ───────────────────────────── Google

export const googleConfigured = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
export const googleRedirectUri = () => `${siteUrl()}/api/auth/google/callback`;

export function googleAuthUrl(state: string) {
  const q = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

/** Exchanges the callback code for the shopper's verified Google profile. */
export async function googleProfile(code: string) {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const tok = (await tokenRes.json().catch(() => ({}))) as { access_token?: string; error_description?: string };
  if (!tok.access_token) throw new Error(tok.error_description || "Google sign-in failed");
  const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${tok.access_token}` }, signal: AbortSignal.timeout(10_000) });
  const info = (await infoRes.json().catch(() => ({}))) as { email?: string; email_verified?: boolean; given_name?: string; family_name?: string };
  if (!info.email || !info.email_verified) throw new Error("Your Google account’s email isn’t verified.");
  return { email: info.email.toLowerCase(), firstName: info.given_name ?? null, lastName: info.family_name ?? null };
}

/** Signs in an existing shopper by email (guest orders under that email stay linked) or creates one. */
export async function customerFromGoogle(p: { email: string; firstName: string | null; lastName: string | null }) {
  const existing = await db.query.customers.findFirst({ where: sql`lower(${schema.customers.email}) = ${p.email}` });
  if (existing) {
    await db
      .update(schema.customers)
      .set({ firstName: existing.firstName || p.firstName, lastName: existing.lastName || p.lastName, lastLoginAt: new Date() })
      .where(eq(schema.customers.id, existing.id));
    return { id: existing.id, created: false };
  }
  const [c] = await db.insert(schema.customers).values({ email: p.email, firstName: p.firstName, lastName: p.lastName, lastLoginAt: new Date() }).returning({ id: schema.customers.id });
  return { id: c.id, created: true };
}

// ───────────────────────────── Mobile OTP

/** Accounts created by phone get a placeholder email until the shopper adds a real one. */
export const PHONE_EMAIL_DOMAIN = "phone.trumee.in";
export const isPlaceholderEmail = (email: string | null | undefined) => !!email?.endsWith(`@${PHONE_EMAIL_DOMAIN}`);

type Provider = "2factor" | "msg91" | "log";
function smsProvider(): Provider | null {
  const p = (process.env.SMS_PROVIDER || "").toLowerCase();
  if (p === "2factor" && process.env.TWOFACTOR_API_KEY) return "2factor";
  if (p === "msg91" && process.env.MSG91_AUTH_KEY && process.env.MSG91_TEMPLATE_ID) return "msg91";
  // "log" = print codes to the server log instead of texting them (testing only; nobody can receive them)
  if (p === "log" || process.env.NODE_ENV !== "production") return "log";
  return null;
}
export const otpConfigured = () => smsProvider() !== null;

const TTL = 10 * 60_000;
const pending = new Map<string, { hash: string; exp: number; tries: number }>();
const sends = new Map<string, number[]>();
const hashOtp = (phone: string, code: string) => crypto.createHmac("sha256", process.env.AUTH_SECRET || "dev-secret-change-me").update(`${phone}:${code}`).digest("hex");

/** Rate limit: 1 code per 30 s and 5 per hour for each number (and each IP). */
function allowSend(key: string) {
  const now = Date.now();
  const recent = (sends.get(key) ?? []).filter((t) => now - t < 3600_000);
  if (recent.length >= 5 || (recent.length && now - recent[recent.length - 1] < 30_000)) return false;
  sends.set(key, [...recent, now]);
  return true;
}

export class OtpError extends Error {}

export async function sendOtp(phone: string, ip: string) {
  const provider = smsProvider();
  if (!provider) throw new OtpError("Login by mobile number isn’t available right now.");
  if (!allowSend(`p:${phone}`) || !allowSend(`ip:${ip}`)) throw new OtpError("Please wait a moment before asking for another code.");
  const code = String(crypto.randomInt(100000, 1000000));
  pending.set(phone, { hash: hashOtp(phone, code), exp: Date.now() + TTL, tries: 0 });

  if (provider === "log") {
    console.log(`[otp] code for +91${phone}: ${code} (dev only — set SMS_PROVIDER to send real SMS)`);
    return;
  }
  const res =
    provider === "2factor"
      ? await fetch(
          `https://2factor.in/API/V1/${encodeURIComponent(process.env.TWOFACTOR_API_KEY!)}/SMS/+91${phone}/${code}${process.env.TWOFACTOR_TEMPLATE ? `/${encodeURIComponent(process.env.TWOFACTOR_TEMPLATE)}` : ""}`,
          { signal: AbortSignal.timeout(10_000) },
        )
      : await fetch(`https://control.msg91.com/api/v5/otp?${new URLSearchParams({ template_id: process.env.MSG91_TEMPLATE_ID!, mobile: `91${phone}`, otp: code })}`, {
          method: "POST",
          headers: { authkey: process.env.MSG91_AUTH_KEY!, "Content-Type": "application/json" },
          body: "{}",
          signal: AbortSignal.timeout(10_000),
        });
  const body = (await res.json().catch(() => ({}))) as { Status?: string; type?: string; Details?: string; message?: string };
  const ok = provider === "2factor" ? body.Status === "Success" : body.type === "success";
  if (!res.ok || !ok) {
    pending.delete(phone);
    console.error("[otp] provider error", provider, res.status, body);
    throw new OtpError("We couldn’t send the code. Check the number and try again.");
  }
}

export function checkOtp(phone: string, code: string) {
  const p = pending.get(phone);
  if (!p || p.exp < Date.now()) throw new OtpError("That code has expired — ask for a new one.");
  if (p.tries >= 5) {
    pending.delete(phone);
    throw new OtpError("Too many wrong tries — ask for a new code.");
  }
  const a = Buffer.from(hashOtp(phone, code.trim()));
  const b = Buffer.from(p.hash);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    p.tries++;
    throw new OtpError("That code isn’t right.");
  }
  pending.delete(phone);
}

/** Finds the shopper by mobile number (most recent account wins) or creates one. */
export async function customerFromPhone(phone: string) {
  const existing = await db.query.customers.findFirst({
    where: sql`right(regexp_replace(coalesce(${schema.customers.phone}, ''), '\\D', '', 'g'), 10) = ${phone}`,
    orderBy: (c, { desc }) => [desc(c.lastLoginAt)],
  });
  if (existing) {
    await db.update(schema.customers).set({ lastLoginAt: new Date() }).where(eq(schema.customers.id, existing.id));
    return { id: existing.id, created: false };
  }
  const [c] = await db.insert(schema.customers).values({ email: `${phone}@${PHONE_EMAIL_DOMAIN}`, phone, lastLoginAt: new Date() }).returning({ id: schema.customers.id });
  return { id: c.id, created: true };
}
