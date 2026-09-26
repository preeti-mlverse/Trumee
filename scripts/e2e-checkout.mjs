// End-to-end: product → add to bag → checkout (COD) → order page. Uses the local Chrome install.
// Usage: node scripts/e2e-checkout.mjs [baseUrl]
import { chromium } from "playwright-core";

const base = process.argv[2] || "http://localhost:3000";
const shots = process.env.SHOTS_DIR;
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe" });
// Normal UA so the analytics bot filter doesn't drop the run (set E2E_BOT_UA=1 to test filtering)
const page = await browser.newPage({
  viewport: { width: 1360, height: 900 },
  userAgent: process.env.E2E_BOT_UA ? undefined : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36",
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

const step = async (name, fn) => {
  process.stdout.write(`• ${name} … `);
  await fn();
  console.log("ok");
};

await step("open product", async () => {
  await page.goto(`${base}/products/floral-crochet-lace-up-boho-top`, { waitUntil: "networkidle" });
});
await step("choose size M and add to bag", async () => {
  await page.getByRole("button", { name: "M", exact: true }).click();
  await page.getByRole("button", { name: "Add to bag" }).click();
  await page.getByRole("dialog", { name: "Shopping bag" }).waitFor();
});
await step("go to checkout", async () => {
  await page.getByRole("link", { name: /Checkout ·/ }).click();
  await page.waitForURL("**/checkout");
});
await step("fill details (pincode autofill)", async () => {
  await page.fill('input[name="email"]', "e2e-test@example.com");
  await page.fill('input[name="phone"]', "9876543210");
  await page.fill('input[name="name"]', "Test Shopper");
  await page.fill('input[name="line1"]', "12 Test Lane, Sector 109");
  await page.fill('input[name="pincode"]', "122017");
  await page.waitForFunction(() => document.querySelector('select[name="state"]')?.value, null, { timeout: 8000 }).catch(() => {});
  const state = await page.inputValue('select[name="state"]');
  if (!state) await page.selectOption('select[name="state"]', "Haryana");
  if (!(await page.inputValue('input[name="city"]'))) await page.fill('input[name="city"]', "Gurgaon");
  console.log(`(state=${await page.inputValue('select[name="state"]')}, city=${await page.inputValue('input[name="city"]')})`);
});
await step("choose COD and place order", async () => {
  await page.getByRole("radio").nth(1).check();
  if (shots) await page.screenshot({ path: `${shots}/checkout.png`, fullPage: true });
  await page.getByRole("button", { name: /Place order/ }).click();
  await page.waitForURL("**/orders/**", { timeout: 20000 });
});
await step("order confirmation shows", async () => {
  await page.getByText(/Thank you, Test/).waitFor();
  console.log(`(${page.url().replace(base, "")})`);
  if (shots) await page.screenshot({ path: `${shots}/order.png`, fullPage: true });
});

await browser.close();
if (errors.length) {
  console.log("\nBrowser errors:\n" + errors.join("\n"));
  process.exit(1);
}
console.log("\nE2E checkout passed");
