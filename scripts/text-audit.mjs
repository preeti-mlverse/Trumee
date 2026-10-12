// Text audit: loads every sitemap URL plus the key app pages and flags copy that shouldn't be
// there — stale prices/policies, placeholder or debug text, broken values, empty headings.
// Usage: node scripts/text-audit.mjs [baseUrl]
import { chromium } from "playwright-core";

const base = process.argv[2] || "http://localhost:3000";
const xml = await (await fetch(`${base}/sitemap.xml`)).text();
const fromSitemap = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
const urls = [...new Set(["/", ...fromSitemap, "/collections", "/cart", "/search?q=dress", "/track-order", "/contact", "/wishlist", "/account/login", "/llms.txt", "/llms-full.txt"])];

/** [label, pattern] — anything matching is reported with its surrounding text. */
const RULES = [
  ["old ₹29 shipping", /₹\s?29\b|29 rupees|flat rate of 29/i],
  ["broken value", /\bundefined\b|\bNaN\b|\[object Object\]|(^|\s)null(\s|$)/],
  ["placeholder", /lorem ipsum|TODO|FIXME|placeholder|xxx/i],
  ["zero price", /₹\s?0(\.00)?(?![\d,])/],
  ["empty count", /\b0 (styles|pieces|items)\b/i],
  ["removed copy", /Six moods, one wardrobe|Words from our girls|Love notes|Sunlit Wardrobe|See it move|Discover signature collections|Just dropped|Most-wanted/i],
  ["test/debug text", /simulated payment|test mode|lorem|debug/i],
  ["doubled word", /\b(\w{3,}) \1\b/],
];
const SKIP_DOUBLED = new Set(["that", "very", "had"]);

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const findings = [];
let n = 0;
for (const path of urls) {
  const page = await ctx.newPage();
  try {
    const res = await page.goto(base + path, { waitUntil: "domcontentloaded", timeout: 90_000 });
    if (!res || res.status() >= 400) findings.push({ path, label: "HTTP", text: String(res?.status()) });
    await page.waitForTimeout(400);
    const text = path.endsWith(".txt")
      ? await page.evaluate(() => document.body.innerText)
      : await page.evaluate(() => {
          // Visible copy only (skip the Next.js dev badge)
          document.querySelectorAll("nextjs-portal, script, style, noscript").forEach((e) => e.remove());
          return document.body.innerText;
        });
    for (const [label, re] of RULES) {
      const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
      for (const m of text.matchAll(g)) {
        if (label === "doubled word" && SKIP_DOUBLED.has(m[1].toLowerCase())) continue;
        const i = m.index ?? 0;
        findings.push({ path, label, text: text.slice(Math.max(0, i - 50), i + m[0].length + 50).replace(/\s+/g, " ").trim() });
      }
    }
    const emptyHeadings = await page.evaluate(() => [...document.querySelectorAll("h1,h2,h3")].filter((h) => !h.textContent.trim()).length);
    if (emptyHeadings) findings.push({ path, label: "empty heading", text: `${emptyHeadings} empty h1–h3` });
    n++;
  } catch (e) {
    findings.push({ path, label: "load error", text: String(e).split("\n")[0] });
  }
  await page.close();
}
await browser.close();

console.log(`Checked ${n}/${urls.length} pages.`);
const seen = new Set();
for (const f of findings) {
  const key = `${f.path}|${f.label}|${f.text}`;
  if (seen.has(key)) continue;
  seen.add(key);
  console.log(`[${f.label}] ${f.path}\n    …${f.text}…`);
}
if (!findings.length) console.log("No unwanted text found.");
