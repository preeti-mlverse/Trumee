// E2E for the pricing policy: free shipping, 5% off prepaid, +₹100 on COD, COD returns note.
// Places one COD order (e2e-test@example.com) and checks the order page.
// Usage: node scripts/e2e-cod-prepaid.mjs [baseUrl] [screenshotDir]
import { chromium } from "playwright-core";

const base = process.argv[2] || "http://localhost:3000";
const shots = process.argv[3];
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const page = await browser.newPage({ viewport: { width: 1360, height: 900 }, userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36" });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
let failed = 0;
const rupees = (s) => Number(String(s).replace(/[^\d.]/g, ""));
const check = (name, ok, got) => {
  console.log(`${ok ? "✓" : "✗"} ${name}${got !== undefined ? ` — ${got}` : ""}`);
  if (!ok) failed++;
};

await page.goto(`${base}/products/floral-crochet-lace-up-boho-top`, { waitUntil: "networkidle", timeout: 180000 });
const price = rupees(await page.locator("#buy-box span.text-2xl").first().textContent());
check("product page shows 5% prepaid offer", await page.getByText(/Extra 5% off when you pay online/).isVisible());
check("product glance says free shipping", await page.getByText("Free across India").isVisible());

await page.getByRole("button", { name: "M", exact: true }).click();
await page.getByRole("button", { name: "Add to bag" }).click();
await page.getByRole("dialog", { name: "Shopping bag" }).waitFor();
const drawer = await page.getByRole("dialog", { name: "Shopping bag" }).innerText();
check("bag: shipping Free", /Shipping\s*Free/i.test(drawer));
check("bag: pay-online saving shown", /Pay online & save/i.test(drawer));

await page.getByRole("link", { name: /Checkout ·/ }).click();
await page.waitForURL("**/checkout");
await page.fill('input[name="email"]', "e2e-test@example.com");
await page.fill('input[name="phone"]', "9876543210");
await page.fill('input[name="name"]', "Test Shopper");
await page.fill('input[name="line1"]', "12 Test Lane, Sector 109");
await page.fill('input[name="pincode"]', "122017");
await page.getByText(/Arrives /).waitFor({ timeout: 60000 });

const summary = page.locator("aside").last();
check("checkout: shipping Free", /Shipping\s*Free/i.test(await summary.innerText()));
const expectOnline = Math.round(price * 0.95 * 100) / 100;
const payBtn = await page.getByRole("button", { name: /^Pay ₹/ }).textContent();
check("prepaid: 5% off applied", Math.abs(rupees(payBtn) - expectOnline) < 0.02, `${payBtn?.trim()} (expected ₹${expectOnline})`);
check("prepaid: discount row shown", await page.getByText(/Prepaid discount \(5%\)/).isVisible());
if (shots) await page.screenshot({ path: `${shots}/e2e-prepaid.png`, fullPage: true });

await page.getByText(/Cash on delivery · \+₹100 COD fee/).click();
const codBtn = await page.getByRole("button", { name: /Place order/ }).textContent();
check("COD: +₹100 added, no prepaid discount", rupees(codBtn) === price + 100, `${codBtn?.trim()} (expected ₹${price + 100})`);
check("COD: fee row shown", /COD fee\s*₹100/.test(await summary.innerText()));
check("COD: easy-returns note shown", await page.getByText(/Easy 7-day returns & size exchanges on COD orders/).isVisible());
if (shots) await page.screenshot({ path: `${shots}/e2e-cod.png`, fullPage: true });

await page.getByRole("button", { name: /Place order/ }).click();
await page.waitForURL("**/orders/**", { timeout: 120000 });
const order = await page.locator("main").innerText();
check("order page: COD fee ₹100", /COD fee\s*₹100/.test(order));
check("order page: shipping Free", /Shipping\s*Free/i.test(order));
check("no page errors", !errors.length, errors.slice(0, 2).join(" | "));
console.log(`ORDER_URL=${page.url()}`);
await browser.close();
process.exitCode = failed ? 1 : 0;
