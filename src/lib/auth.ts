import "server-only";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db, schema } from "@/db";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret-change-me");

export const ADMIN_COOKIE = "tm_admin";
export const CUSTOMER_COOKIE = "tm_customer";

type TokenPayload = { sub: string; kind: "staff" | "customer" };

export const hashPassword = (pw: string) => bcrypt.hash(pw, 11);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

async function sign(payload: TokenPayload, days: number) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${days}d`)
    .sign(secret);
}

export async function readToken(token: string | undefined, kind: TokenPayload["kind"]) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify<TokenPayload>(token, secret);
    return payload.kind === kind ? Number(payload.sub) : null;
  } catch {
    return null;
  }
}

async function setCookie(name: string, token: string, days: number) {
  (await cookies()).set(name, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: days * 86400,
  });
}

// ─────────────────────────────── staff

export const SECTIONS = [
  "orders",
  "products",
  "customers",
  "discounts",
  "analytics",
  "marketing",
  "content",
  "settings",
] as const;
export type Section = (typeof SECTIONS)[number];

export async function startStaffSession(id: number) {
  await setCookie(ADMIN_COOKIE, await sign({ sub: String(id), kind: "staff" }, 7), 7);
}

export const getStaff = cache(async () => {
  const id = await readToken((await cookies()).get(ADMIN_COOKIE)?.value, "staff");
  if (!id) return null;
  const s = await db.query.staff.findFirst({ where: eq(schema.staff.id, id) });
  return s?.active ? s : null;
});

export function canAccess(s: { role: string; permissions: string[] }, section: Section) {
  return s.role === "owner" || s.role === "admin" || s.permissions.includes(section);
}

/** Use at the top of every admin page and admin server action. */
export async function requireStaff(section?: Section) {
  const s = await getStaff();
  if (!s) redirect("/admin/login");
  if (section && !canAccess(s, section)) redirect("/admin?denied=" + section);
  return s;
}

export async function requireOwner() {
  const s = await requireStaff();
  if (s.role !== "owner" && s.role !== "admin") redirect("/admin?denied=settings");
  return s;
}

// ─────────────────────────────── customers

export async function startCustomerSession(id: number) {
  await setCookie(CUSTOMER_COOKIE, await sign({ sub: String(id), kind: "customer" }, 30), 30);
}

export const getCustomer = cache(async () => {
  const id = await readToken((await cookies()).get(CUSTOMER_COOKIE)?.value, "customer");
  if (!id) return null;
  return (await db.query.customers.findFirst({ where: eq(schema.customers.id, id) })) ?? null;
});

export async function requireCustomer(next = "/account") {
  const c = await getCustomer();
  if (!c) redirect(`/account/login?next=${encodeURIComponent(next)}`);
  return c;
}

export async function logAudit(
  staffId: number | null,
  action: string,
  entity: string,
  entityId?: string | number,
  meta?: Record<string, unknown>,
) {
  await db.insert(schema.auditLog).values({
    staffId,
    action,
    entity,
    entityId: entityId != null ? String(entityId) : null,
    meta,
  });
}
