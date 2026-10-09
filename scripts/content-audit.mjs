// Content audit: loads every sitemap URL (plus key app pages), scrolls through so lazy
// content loads, and reports what failed to load or rendered empty.
// Usage: node scripts/content-audit.mjs [baseUrl]   → prints a report, writes .audit.json
import { writeFileSync } from "node:fs";
import { chromium } from "playwright-core";

const base = process.argv[2] || "http://localhost:3000";
const xml = await (await fetch(`${base}/sitemap.xml`)).text();
const fromSitemap = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
const urls = [...new Set(["/", ...fromSitemap, "/collections", "/cart", "/search?q=dress", "/track-order", "/contact", "/wishlist", "/account/login"])];

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36 TrumeeAudit",
});
const results = [];

for (const path of urls) {
  const page = await ctx.newPage();
  const failed = [];
  const errors = [];
  page.on("response", (r) => {
    if (r.status() >= 400 && !r.url().includes("/api/collect")) failed.push(`${r.status()} ${r.url().replace(base, "")}`);
  });
  page.on("requestfailed", (r) => {
    const f = r.failure()?.errorText ?? "";
    if (!/ERR_ABORTED/.test(f)) failed.push(`FAILED ${r.url().replace(base, "")} (${f})`);
  });
  page.on("pageerror", (e) => errors.push(e.message.split("\n")[0]));
  page.on("console", (m) => {
    if (m.type() === "error" && !/hydrat|caret-color/i.test(m.text())) errors.push(m.text().split("\n")[0].slice(0, 200));
  });

  let status = 0;
  try {
    const res = await page.goto(base + path, { waitUntil: "networkidle", timeout: 60000 });
    status = res?.status() ?? 0;
    const H = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < H; y += 700) {
      await page.evaluate((y) => window.scrollTo(0, y), y);
      await page.waitForTimeout(120);
    }
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(800);
  } catch (e) {
    errors.push("navigation: " + e.message.split("\n")[0]);
  }

  const dom = await page
    .evaluate(() => {
      const broken = [...document.images]
        .filter((i) => i.complete && i.naturalWidth === 0 && i.currentSrc)
        .map((i) => i.currentSrc.replace(location.origin, ""));
      const badVideos = [...document.querySelectorAll("video")]
        .filter((v) => v.error || v.networkState === 3)
        .map((v) => (v.currentSrc || v.getAttribute("src") || "").replace(location.origin, ""));
      const text = document.body.innerText;
      const empties = ["Nothing matches", "Loading…", "Loading...", "No products", "Something went wrong", "This page wandered off", "Application error"].filter((t) => text.includes(t));
      const productLinks = new Set([...document.querySelectorAll('a[href^="/products/"]')].map((a) => a.getAttribute("href"))).size;
      const h1 = document.querySelector("h1")?.textContent?.trim() ?? "";
      return { broken: [...new Set(broken)], badVideos: [...new Set(badVideos)], empties, productLinks, h1, words: text.split(/\s+/).length };
    })
    .catch(() => ({ broken: [], badVideos: [], empties: [], productLinks: 0, h1: "", words: 0 }));

  const issues = [];
  if (status >= 400 || status === 0) issues.push(`HTTP ${status}`);
  if (failed.length) issues.push(...[...new Set(failed)].slice(0, 8).map((f) => "request " + f));
  if (dom.broken.length) issues.push(...dom.broken.slice(0, 8).map((b) => "broken image " + b));
  if (dom.badVideos.length) issues.push(...dom.badVideos.map((v) => "broken video " + v));
  if (errors.length) issues.push(...[...new Set(errors)].slice(0, 5).map((e) => "JS " + e));
  if (dom.empties.length) issues.push("shows: " + dom.empties.join(", "));
  if (path.startsWith("/collections/") && dom.productLinks === 0) issues.push("collection shows no products");
  if (!dom.h1) issues.push("no H1");

  results.push({ path, status, productLinks: dom.productLinks, words: dom.words, issues });
  console.log(`${issues.length ? "✗" : "✓"} ${path}  [${status}, ${dom.productLinks} products, ${dom.words} words]${issues.length ? "\n   " + issues.join("\n   ") : ""}`);
  await page.close();
}

await browser.close();
writeFileSync(".audit.json", JSON.stringify(results, null, 1));
const bad = results.filter((r) => r.issues.length);
console.log(`\n${results.length} pages audited, ${bad.length} with issues`);
