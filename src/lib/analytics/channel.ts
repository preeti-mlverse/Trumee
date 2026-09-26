/** GA4-style default channel grouping from UTM params / click ids / referrer. */

const SEARCH = ["google.", "bing.", "yahoo.", "duckduckgo.", "yandex.", "baidu.", "ecosia.", "search.brave.", "startpage."];
const SOCIAL = [
  "facebook.", "fb.", "instagram.", "t.co", "twitter.", "x.com", "linkedin.", "lnkd.in", "pinterest.", "pin.it",
  "youtube.", "youtu.be", "whatsapp.", "wa.me", "reddit.", "snapchat.", "threads.net", "quora.", "tiktok.",
];
const EMAIL = ["mail.google.", "outlook.", "mail.yahoo.", "mail."];
const PAID_MEDIUMS = /^(cpc|ppc|paid|paidsearch|paid_search|cpm|cpv|cpa|display|banner|retargeting|paid_social|paidsocial|ads?)$/i;

const matches = (host: string, list: string[]) => list.some((d) => host.includes(d));

export function sourceFromHost(host: string) {
  const h = host.replace(/^www\./, "").replace(/^m\./, "").replace(/^l\./, "").replace(/^lm\./, "");
  if (h.includes("instagram")) return "instagram";
  if (h.includes("facebook") || h.startsWith("fb.")) return "facebook";
  if (h === "t.co" || h.includes("twitter") || h === "x.com") return "twitter";
  if (h.includes("youtube") || h.includes("youtu.be")) return "youtube";
  if (h.includes("pinterest") || h.includes("pin.it")) return "pinterest";
  if (h.includes("whatsapp") || h === "wa.me") return "whatsapp";
  if (h.includes("google.")) return "google";
  if (h.includes("bing.")) return "bing";
  return h;
}

export type Attribution = {
  source: string;
  medium: string;
  campaign: string | null;
  term: string | null;
  content: string | null;
  channel: string;
  referrerHost: string | null;
};

export function attribute(params: {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  gclid?: string | null;
  fbclid?: string | null;
  referrer?: string | null;
  siteHost?: string | null;
}): Attribution {
  let refHost: string | null = null;
  try {
    refHost = params.referrer ? new URL(params.referrer).hostname.toLowerCase() : null;
  } catch {}
  if (refHost && params.siteHost && refHost.endsWith(params.siteHost.replace(/^www\./, ""))) refHost = null; // internal

  const campaign = params.utm_campaign || null;
  const term = params.utm_term || null;
  const content = params.utm_content || null;

  // 1. Explicit UTM tagging
  if (params.utm_source || params.utm_medium) {
    const source = (params.utm_source || (refHost ? sourceFromHost(refHost) : "(direct)")).toLowerCase();
    const medium = (params.utm_medium || "(none)").toLowerCase();
    const isSearch = matches(source + ".", SEARCH) || ["google", "bing", "yahoo"].includes(source);
    const isSocial = matches(source + ".", SOCIAL) || ["instagram", "facebook", "ig", "fb", "whatsapp", "youtube", "pinterest", "twitter"].includes(source);
    let channel = "Referral";
    if (PAID_MEDIUMS.test(medium)) channel = isSocial ? "Paid Social" : isSearch ? "Paid Search" : medium === "display" || medium === "banner" ? "Display" : "Paid Other";
    else if (medium === "email" || medium === "newsletter") channel = "Email";
    else if (medium === "sms") channel = "SMS";
    else if (medium === "affiliate") channel = "Affiliates";
    else if (medium === "influencer" || medium === "creator") channel = "Influencer";
    else if (medium === "organic") channel = isSearch ? "Organic Search" : isSocial ? "Organic Social" : "Referral";
    else if (medium === "social" || isSocial) channel = "Organic Social";
    else if (medium === "referral") channel = "Referral";
    else if (isSearch) channel = "Organic Search";
    return { source, medium, campaign, term, content, channel, referrerHost: refHost };
  }

  // 2. Ad click ids
  if (params.gclid) return { source: "google", medium: "cpc", campaign, term, content, channel: "Paid Search", referrerHost: refHost };

  // 3. Referrer
  if (refHost) {
    const source = sourceFromHost(refHost);
    if (matches(refHost, SEARCH)) return { source, medium: "organic", campaign, term, content, channel: "Organic Search", referrerHost: refHost };
    if (matches(refHost, SOCIAL) || params.fbclid) return { source, medium: "social", campaign, term, content, channel: "Organic Social", referrerHost: refHost };
    if (matches(refHost, EMAIL)) return { source, medium: "email", campaign, term, content, channel: "Email", referrerHost: refHost };
    return { source, medium: "referral", campaign, term, content, channel: "Referral", referrerHost: refHost };
  }
  if (params.fbclid) return { source: "facebook", medium: "social", campaign, term, content, channel: "Organic Social", referrerHost: null };

  return { source: "(direct)", medium: "(none)", campaign, term, content, channel: "Direct", referrerHost: null };
}

export const CHANNELS = [
  "Direct", "Organic Search", "Paid Search", "Organic Social", "Paid Social", "Email", "SMS",
  "Referral", "Influencer", "Affiliates", "Display", "Paid Other",
];
