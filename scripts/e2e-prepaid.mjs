// E2E: admin sets a 5% prepaid discount → shopper sees it → pays online (test mode) → order carries it → reset to 0%.
// Usage: node scripts/e2e-prepaid.mjs <screenshotDir>   (needs ADMIN_EMAIL / ADMIN_PASSWORD in .env and the dev server on :3000)
import "dotenv/config";
import { chromium } from "playwright-core";

const base = "http://localhost:3000";
const out = process.argv[2];
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 }, userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36" });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const step = async (name, fn) => {
  process.stdout.write(`• ${name} … `);
  const r = await fn();
  console.log(r ?? "ok");
};

await step("admin sign-in", async () => {
  await page.goto(`${base}/admin/login`, { waitUntil: "networkidle", timeout: 180000 });
  await page.fill('input[name="email"]', process.env.ADMIN_EMAIL);
  await page.fill('input[name="password"]', process.env.ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(`${base}/admin`, { timeout: 120000 });
});
await step("set 5% prepaid discount", async () => {
  await page.goto(`${base}/admin/settings`, { waitUntil: "networkidle", timeout: 180000 });
  const form = page.locator("#payments form");
  await form.locator('input[name="prepaidDiscountPercent"]').fill("5");
  await form.locator('input[name="prepaidDiscountMax"]').fill("");
  await form.locator('input[name="prepaidDiscountMinOrder"]').fill("0");
  await form.getByRole("button", { name: "Save" }).click();
  await form.getByText("Saved — live on the store now.").waitFor({ timeout: 60000 });
  await page.screenshot({ path: `${out}/admin-settings.png`, fullPage: true });
});
await step("Shiprocket test without credentials", async () => {
  const f = page.locator("#shiprocket form").first();
  await f.locator('input[name="pincode"]').fill("560001");
  await f.getByRole("button", { name: "Test connection" }).click();
  const msg = await f.locator("p").last().textContent({ timeout: 60000 });
  return msg?.slice(0, 90);
});

const shop = await ctx.newPage();
shop.on("pageerror", (e) => errors.push(e.message));
await step("product page shows prepaid offer", async () => {
  await shop.goto(`${base}/products/floral-crochet-lace-up-boho-top`, { waitUntil: "networkidle", timeout: 180000 });
  await shop.getByText("Extra 5% off when you pay online at checkout").waitFor({ timeout: 60000 });
  await shop.fill('input[aria-label="Pincode"]', "560001");
  await shop.getByRole("button", { name: "Check" }).click();
  await shop.getByText(/Delivery by|Get it by/).waitFor({ timeout: 60000 });
  await shop.locator("#buy-box").scrollIntoViewIfNeeded();
  await shop.screenshot({ path: `${out}/pdp-prepaid.png` });
});
await step("add to bag → drawer advertises saving", async () => {
  await shop.getByRole("button", { name: "M", exact: true }).click();
  await shop.getByRole("button", { name: "Add to bag" }).click();
  await shop.getByRole("dialog", { name: "Shopping bag" }).waitFor();
  const t = await shop.getByText(/Pay online & save/).textContent({ timeout: 60000 });
  await shop.screenshot({ path: `${out}/drawer-prepaid.png` });
  return t;
});
let shown;
await step("checkout: pincode date + prepaid row", async () => {
  await shop.getByRole("link", { name: /Checkout ·/ }).click();
  await shop.waitForURL("**/checkout", { timeout: 120000 });
  await shop.fill('input[name="email"]', "e2e-test@example.com");
  await shop.fill('input[name="phone"]', "9876543210");
  await shop.fill('input[name="name"]', "Test Shopper");
  await shop.fill('input[name="line1"]', "12 Test Lane, Sector 109");
  await shop.fill('input[name="pincode"]', "122017");
  const hint = await shop.getByText(/Arrives /).textContent({ timeout: 60000 });
  await shop.getByText(/Prepaid discount \(5%\)/).waitFor();
  shown = await shop.getByRole("button", { name: /^Pay ₹/ }).textContent();
  await shop.screenshot({ path: `${out}/checkout-prepaid.png`, fullPage: true });
  return `${hint} | button: ${shown}`;
});
await step("COD option hides the saving", async () => {
  await shop.getByText("Cash on delivery", { exact: false }).first().click();
  const btn = await shop.getByRole("button", { name: /Place order/ }).textContent();
  await shop.getByText("UPI, cards, netbanking & wallets").click();
  return btn;
});
let orderUrl;
await step("pay online (test mode) → order page", async () => {
  await shop.getByRole("button", { name: /^Pay ₹/ }).click();
  await shop.getByRole("button", { name: /Complete test payment/ }).click({ timeout: 120000 });
  await shop.waitForURL("**/orders/**", { timeout: 120000 });
  orderUrl = shop.url();
  await shop.getByText("Prepaid discount").waitFor({ timeout: 60000 });
  await shop.screenshot({ path: `${out}/order-prepaid.png`, fullPage: true });
  return orderUrl.replace(base, "");
});
await step("admin orders list", async () => {
  await page.goto(`${base}/admin/orders`, { waitUntil: "networkidle", timeout: 180000 });
  await page.screenshot({ path: `${out}/admin-orders.png` });
});
await step("reset prepaid discount to 0%", async () => {
  await page.goto(`${base}/admin/settings`, { waitUntil: "networkidle", timeout: 180000 });
  const form = page.locator("#payments form");
  await form.locator('input[name="prepaidDiscountPercent"]').fill("0");
  await form.getByRole("button", { name: "Save" }).click();
  await form.getByText("Saved — live on the store now.").waitFor({ timeout: 60000 });
});
console.log("button showed:", shown, "| errors:", errors.slice(0, 5));
console.log("ORDER_TOKEN=" + orderUrl?.split("/orders/")[1]?.split("?")[0]);
await browser.close();
