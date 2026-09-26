import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

/** ₹ amount from paise, e.g. 149900 -> "₹1,499". Shows decimals only when needed. */
export function inr(paise: number | null | undefined, opts: { decimals?: boolean } = {}) {
  const v = (paise ?? 0) / 100;
  const decimals = opts.decimals ?? !Number.isInteger(v);
  return (
    "₹" +
    v.toLocaleString("en-IN", {
      minimumFractionDigits: decimals ? 2 : 0,
      maximumFractionDigits: decimals ? 2 : 0,
    })
  );
}

export const toPaise = (rupees: string | number) => Math.round(Number(rupees) * 100);

export function discountPercent(price: number, compareAt: number | null | undefined) {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

export function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}

export function formatDate(d: Date | string, withTime = false) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
    timeZone: "Asia/Kolkata",
  });
}

export function pct(n: number, d: number) {
  return d ? (n / d) * 100 : 0;
}

export function compact(n: number) {
  return Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function fullName(c: { firstName?: string | null; lastName?: string | null; email?: string | null }) {
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email || "Guest";
}
