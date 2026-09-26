import "server-only";
import { eq, sql } from "drizzle-orm";
import { UAParser } from "ua-parser-js";
import { db, schema } from "@/db";
import { attribute } from "./channel";

const REGION_NAMES = new Intl.DisplayNames(["en"], { type: "region" });

export type CollectPayload = {
  name: string;
  vid: string;
  sid: string;
  newVisitor?: boolean;
  newSession?: boolean;
  path?: string;
  title?: string;
  referrer?: string;
  utm?: Record<string, string | null>;
  screen?: string;
  lang?: string;
  engagementMs?: number;
  value?: number;
  productId?: number;
  props?: Record<string, unknown>;
};

const ID_RE = /^[a-f0-9]{16,32}$/;
const NAME_RE = /^[a-z_]{2,40}$/;

function geo(headers: Headers, lang?: string) {
  const code = headers.get("x-vercel-ip-country") || headers.get("cf-ipcountry") || headers.get("x-country-code");
  const city = headers.get("x-vercel-ip-city");
  const region = headers.get("x-vercel-ip-country-region");
  let country: string | null = null;
  try {
    country = code && code !== "XX" ? REGION_NAMES.of(code.toUpperCase()) ?? code : null;
  } catch {}
  // Local/dev fallback: infer country from browser locale (en-IN → India)
  if (!country && lang?.includes("-")) {
    try {
      country = REGION_NAMES.of(lang.split("-")[1].toUpperCase()) ?? null;
    } catch {}
  }
  return { country, city: city ? decodeURIComponent(city) : null, region };
}

export async function ingest(p: CollectPayload, headers: Headers) {
  if (!ID_RE.test(p.vid) || !ID_RE.test(p.sid) || !NAME_RE.test(p.name)) return { ok: false as const, reason: "invalid" };
  const ua = headers.get("user-agent") || "";
  const parsed = new UAParser(ua).getResult();
  if (/bot|crawler|spider|crawling|headless|lighthouse|preview/i.test(ua)) return { ok: false as const, reason: "bot" };

  const now = new Date();
  const engagement = Math.max(0, Math.min(p.engagementMs ?? 0, 30 * 60 * 1000));
  const isPageView = p.name === "page_view";

  const existing = await db.query.analyticsSessions.findFirst({ where: eq(schema.analyticsSessions.id, p.sid), columns: { id: true } });
  if (!existing) {
    const host = headers.get("host");
    const a = attribute({ ...(p.utm ?? {}), referrer: p.referrer, siteHost: host });
    const g = geo(headers, p.lang);
    const device = parsed.device.type === "mobile" ? "mobile" : parsed.device.type === "tablet" ? "tablet" : "desktop";
    const prior = p.newVisitor
      ? null
      : await db.query.analyticsSessions.findFirst({ where: eq(schema.analyticsSessions.visitorId, p.vid), columns: { id: true } });
    await db
      .insert(schema.analyticsSessions)
      .values({
        id: p.sid,
        visitorId: p.vid,
        isNewVisitor: !prior,
        startedAt: now,
        lastSeenAt: now,
        landingPath: p.path?.split("?")[0] ?? null,
        exitPath: p.path?.split("?")[0] ?? null,
        referrer: p.referrer?.slice(0, 500) || null,
        referrerHost: a.referrerHost,
        source: a.source,
        medium: a.medium,
        campaign: a.campaign,
        term: a.term,
        content: a.content,
        channel: a.channel,
        deviceType: device,
        browser: parsed.browser.name ?? null,
        os: parsed.os.name ?? null,
        screen: p.screen?.slice(0, 20) ?? null,
        language: p.lang?.slice(0, 20) ?? null,
        country: g.country,
        region: g.region,
        city: g.city,
        pageviews: isPageView ? 1 : 0,
        events: 1,
        engagementMs: engagement,
      })
      .onConflictDoNothing();
  } else {
    await db
      .update(schema.analyticsSessions)
      .set({
        lastSeenAt: now,
        exitPath: isPageView ? p.path?.split("?")[0] : undefined,
        pageviews: isPageView ? sql`${schema.analyticsSessions.pageviews} + 1` : undefined,
        events: sql`${schema.analyticsSessions.events} + 1`,
        engagementMs: sql`${schema.analyticsSessions.engagementMs} + ${engagement}`,
        // GA4: engaged = >10s, or 2+ page views, or a key event
        engaged: sql`${schema.analyticsSessions.engaged} or ${schema.analyticsSessions.engagementMs} + ${engagement} > 10000 or ${schema.analyticsSessions.pageviews} + ${isPageView ? 1 : 0} >= 2 or ${["add_to_cart", "begin_checkout", "purchase", "sign_up", "generate_lead"].includes(p.name)}`,
      })
      .where(eq(schema.analyticsSessions.id, p.sid));
  }

  if (p.name !== "user_engagement") {
    // Cap stored props at ~4KB: drop the bulky items array first, then give up on the rest.
    let props = p.props ?? null;
    if (props && JSON.stringify(props).length > 4000) {
      const { items: _items, ...rest } = props;
      props = JSON.stringify(rest).length > 4000 ? null : rest;
    }
    await db.insert(schema.analyticsEvents).values({
      sessionId: p.sid,
      visitorId: p.vid,
      name: p.name,
      path: p.path?.slice(0, 500) ?? null,
      title: p.title?.slice(0, 300) ?? null,
      productId: Number.isInteger(p.productId) ? p.productId : null,
      value: Number.isInteger(p.value) ? p.value : null,
      props,
      ts: now,
    });
  }
  return { ok: true as const };
}

/** Server-side purchase event (can't be blocked by ad-blockers, unlike the browser tag). */
export async function recordPurchase(o: { sessionId: string | null; visitorId?: string | null; orderId: number; number: number; total: number; customerId: number | null }) {
  if (!o.sessionId) return;
  const s = await db.query.analyticsSessions.findFirst({ where: eq(schema.analyticsSessions.id, o.sessionId) });
  if (!s) return;
  await db
    .update(schema.analyticsSessions)
    .set({ converted: true, engaged: true, revenue: sql`${schema.analyticsSessions.revenue} + ${o.total}`, customerId: o.customerId ?? s.customerId })
    .where(eq(schema.analyticsSessions.id, s.id));
  await db.insert(schema.analyticsEvents).values({
    sessionId: s.id,
    visitorId: s.visitorId,
    name: "purchase",
    path: "/checkout",
    value: o.total,
    props: { transaction_id: String(o.number), order_id: o.orderId },
  });
}
