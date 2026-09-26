"use client";

/**
 * Browser-side event tracking. Every event goes to our own collector (/api/collect)
 * and — when the visitor consented — is mirrored to GA4 (gtag) and Meta Pixel (fbq)
 * using GA4's recommended e-commerce event names.
 */

type Item = { item_id: string | number; item_name: string; item_variant?: string; item_category?: string; price?: number; quantity?: number; index?: number };
export type TrackParams = {
  value?: number; // rupees
  currency?: string;
  items?: Item[];
  product_id?: number;
  search_term?: string;
  [k: string]: unknown;
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

const VID = "tm_vid";
const SID = "tm_sid";
const SESSION_MINUTES = 30;

function readCookie(name: string) {
  return document.cookie.split("; ").find((c) => c.startsWith(name + "="))?.split("=")[1];
}
function writeCookie(name: string, value: string, maxAgeSec: number) {
  document.cookie = `${name}=${value}; path=/; max-age=${maxAgeSec}; samesite=lax${location.protocol === "https:" ? "; secure" : ""}`;
}
function rid() {
  const a = new Uint8Array(12);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function ids() {
  let vid = readCookie(VID);
  const isNewVisitor = !vid;
  if (!vid) vid = rid();
  writeCookie(VID, vid, 60 * 60 * 24 * 400);
  let sid = readCookie(SID);
  const isNewSession = !sid;
  if (!sid) sid = rid();
  writeCookie(SID, sid, SESSION_MINUTES * 60); // sliding 30-minute session, like GA4
  return { vid, sid, isNewVisitor, isNewSession };
}

let engagementStart = typeof performance !== "undefined" ? performance.now() : 0;
let engagedMs = 0;
export function takeEngagement() {
  if (document.visibilityState === "visible") engagedMs += performance.now() - engagementStart;
  engagementStart = performance.now();
  const ms = Math.round(engagedMs);
  engagedMs = 0;
  return ms;
}

const META_MAP: Record<string, string> = {
  view_item: "ViewContent",
  add_to_cart: "AddToCart",
  begin_checkout: "InitiateCheckout",
  add_payment_info: "AddPaymentInfo",
  purchase: "Purchase",
  search: "Search",
  add_to_wishlist: "AddToWishlist",
  sign_up: "CompleteRegistration",
  generate_lead: "Lead",
};

const recent = new Map<string, number>();

/**
 * @param opts.thirdPartyOnly  send to GA4/Meta only — for events our server already
 *   records itself (purchase), so first-party numbers aren't double counted.
 */
export function track(name: string, params: TrackParams = {}, opts: { thirdPartyOnly?: boolean } = {}) {
  if (typeof window === "undefined") return;
  // Drop exact repeats within a second (React re-mounts, double clicks)
  const key = name + location.pathname + JSON.stringify(params);
  const now = Date.now();
  if (now - (recent.get(key) ?? 0) < 1000) return;
  recent.set(key, now);
  if (opts.thirdPartyOnly) return sendThirdParty(name, params);
  const { vid, sid, isNewVisitor, isNewSession } = ids();
  const url = new URL(location.href);
  const payload = {
    name,
    vid,
    sid,
    newVisitor: isNewVisitor,
    newSession: isNewSession,
    path: url.pathname + (url.search && name === "page_view" ? url.search : ""),
    title: document.title,
    referrer: isNewSession ? document.referrer : undefined,
    utm: isNewSession ? Object.fromEntries(["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"].map((k) => [k, url.searchParams.get(k)])) : undefined,
    screen: `${screen.width}x${screen.height}`,
    lang: navigator.language,
    engagementMs: takeEngagement(),
    value: params.value != null ? Math.round(params.value * 100) : undefined,
    productId: params.product_id,
    props: params,
  };
  const body = JSON.stringify(payload);
  if (!navigator.sendBeacon?.("/api/collect", new Blob([body], { type: "application/json" }))) {
    fetch("/api/collect", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => {});
  }

  if (name === "page_view") return; // GA4/Meta record page views on their own
  sendThirdParty(name, params);
}

function sendThirdParty(name: string, params: TrackParams) {
  window.gtag?.("event", name, { currency: "INR", ...params });
  const meta = META_MAP[name];
  if (meta && window.fbq) {
    window.fbq("track", meta, {
      currency: "INR",
      value: params.value,
      content_ids: params.items?.map((i) => String(i.item_id)),
      content_type: "product",
      search_string: params.search_term,
    });
  }
}
