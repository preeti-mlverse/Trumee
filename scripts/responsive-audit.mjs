// Responsive audit: loads key pages at common device widths and reports horizontal
// overflow, elements escaping the viewport, and small tap targets on touch widths.
// Usage: node scripts/responsive-audit.mjs [baseUrl]   (SHOTS_DIR=... to save screenshots)
import { chromium } from "playwright-core";

const base = process.argv[2] || "http://localhost:3000";
const shots = process.env.SHOTS_DIR;
const WIDTHS = [320, 375, 414, 768, 1024, 1280, 1920];
const PAGES = [
  "/",
  "/collections/dresses",
  "/collections/escape-edit",
  "/products/floral-spaghetti-strap-fit-and-flare-dress",
  "/cart",
  "/checkout",
  "/contact",
  "/track-order",
  "/account/login",
  "/wishlist",
  "/blogs/news",
  "/blogs/news/what-to-wear-in-goa-vacation-outfits-for-women",
  "/pages/faqs",
  "/pages/sizing-chart",
  "/search?q=dress",
];

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36 TrumeeAudit";
let problems = 0;

for (const w of WIDTHS) {
  const touch = w < 1024;
  const ctx = await browser.newContext({ viewport: { width: w, height: touch ? 800 : 900 }, isMobile: w < 768, hasTouch: touch, userAgent: ua });
  // Put something in the bag so /cart and /checkout render their full layouts
  const warm = await ctx.newPage();
  await warm.goto(`${base}/products/floral-crochet-lace-up-boho-top`, { waitUntil: "networkidle" });
  await warm.getByRole("button", { name: "M", exact: true }).click().catch(() => {});
  await warm.getByRole("button", { name: "Add to bag" }).click().catch(() => {});
  await warm.waitForTimeout(800);
  await warm.close();

  for (const path of PAGES) {
    const page = await ctx.newPage();
    await page.goto(base + path, { waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(400);
    const r = await page.evaluate((touch) => {
      const vw = document.documentElement.clientWidth;
      const out = [];
      const pageOverflow = document.documentElement.scrollWidth - vw;
      // Elements whose box escapes the viewport, ignoring intentional horizontal scrollers & off-canvas UI
      const inScroller = (el) => {
        for (let p = el.parentElement; p; p = p.parentElement) {
          const s = getComputedStyle(p);
          if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) return true;
        }
        return false;
      };
      for (const el of document.querySelectorAll("body *")) {
        const s = getComputedStyle(el);
        if (s.display === "none" || s.visibility === "hidden" || s.position === "fixed") continue;
        const b = el.getBoundingClientRect();
        if (!b.width || !b.height) continue;
        if ((b.right > vw + 1 || b.left < -1) && !inScroller(el)) {
          out.push(`overflow: <${el.tagName.toLowerCase()} class="${String(el.className).slice(0, 70)}"> right=${Math.round(b.right)} vw=${vw}`);
          if (out.length > 5) break;
        }
      }
      const small = [];
      if (touch) {
        for (const el of document.querySelectorAll("a, button, input, select, textarea, summary, [role=button]")) {
          const b = el.getBoundingClientRect();
          const s = getComputedStyle(el);
          if (!b.width || s.visibility === "hidden" || s.display === "none") continue;
          // Inline text links inside paragraphs are exempt (WCAG 2.5.8 inline exception)
          if (el.tagName === "A" && el.closest("p, li, td") && s.display === "inline") continue;
          // Checkboxes/radios inside a <label>: the whole label is the tap target
          if (el.tagName === "INPUT" && /checkbox|radio/.test(el.type) && el.closest("label")) continue;
          if (b.width < 24 || b.height < 24) small.push(`${el.tagName.toLowerCase()} "${(el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30)}" ${Math.round(b.width)}x${Math.round(b.height)}`);
        }
      }
      return { pageOverflow, out, small: [...new Set(small)].slice(0, 6) };
    }, touch);
    const issues = [];
    if (r.pageOverflow > 1) issues.push(`page scrolls sideways by ${r.pageOverflow}px`);
    issues.push(...r.out, ...r.small.map((s) => "small tap target: " + s));
    if (issues.length) {
      problems += issues.length;
      console.log(`✗ ${w}px ${path}\n   ${issues.join("\n   ")}`);
    }
    if (shots && (w === 375 || w === 768) && ["/", "/collections/dresses", "/products/floral-spaghetti-strap-fit-and-flare-dress", "/checkout"].includes(path)) {
      await page.screenshot({ path: `${shots}/r-${w}-${path.replace(/[^a-z0-9]+/gi, "_") || "home"}.png`, fullPage: true });
    }
    await page.close();
  }
  await ctx.close();
  console.log(`— ${w}px done`);
}
await browser.close();
console.log(problems ? `\n${problems} issue(s) found` : "\nNo responsive issues found");
process.exit(problems ? 1 : 0);
