// Full purchase E2E: several products (one with qty 2) → bag → checkout, once paying online and
// once by COD. Checks every amount the shopper sees against the saved order, the GST invoice
// (customer + admin), and that analytics events were recorded for the session.
// Usage: node scripts/e2e-full.mjs [baseUrl]   (needs ADMIN_EMAIL / ADMIN_PASSWORD in .env for the admin check)
import "dotenv/config";
import postgres from "postgres";
import { chromium } from "playwright-core";

const base = process.argv[2] || "http://localhost:3000";
const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe" });
let failed = 0;
const check = (name, ok, got) => {
  console.log(`${ok ? "✓" : "✗"} ${name}${got !== undefined ? ` — ${got}` : ""}`);
  if (!ok) failed++;
};
const money = (s) => Math.round(Number(String(s).replace(/[^\d.]/g, "")) * 100); // → paise
const PRODUCTS = [
  ["floral-crochet-lace-up-boho-top", "M", 2],
  ["paisley-print-cotton-moss-boho-dress", "M", 1],
  ["checkered-yoke-denim-shirt-with-roll-up-sleeves", "M", 1],
];

async function run(method) {
  console.log(`\n── ${method === "cod" ? "Cash on delivery" : "Pay online"} ──`);
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 }, userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let expected = 0;

  for (const [handle, size, qty] of PRODUCTS) {
    await page.goto(`${base}/products/${handle}`, { waitUntil: "networkidle", timeout: 180000 });
    const price = money(await page.locator("#buy-box span.text-2xl").first().textContent());
    const sizeBtn = page.getByRole("button", { name: size, exact: true });
    if (await sizeBtn.isEnabled().catch(() => false)) await sizeBtn.click();
    else await page.locator("#buy-box button:not([disabled])").filter({ hasText: /^(XS|S|M|L|XL|2XL)$/ }).first().click();
    for (let i = 1; i < qty; i++) await page.getByRole("button", { name: "Increase quantity" }).click();
    await page.getByRole("button", { name: "Add to bag" }).click();
    await page.getByRole("dialog", { name: "Shopping bag" }).waitFor();
    await page.keyboard.press("Escape");
    expected += price * qty;
  }

  await page.goto(`${base}/cart`, { waitUntil: "networkidle" });
  const cartText = await page.locator("main").innerText();
  const cartSubtotal = money(cartText.match(/Subtotal\s*₹([\d,.]+)/)?.[1]);
  check("bag subtotal = sum of items × qty", cartSubtotal === expected, `₹${cartSubtotal / 100} vs ₹${expected / 100}`);
  check("bag shipping Free", /Shipping\s*Free/i.test(cartText));

  await page.goto(`${base}/checkout`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', "e2e-test@example.com");
  await page.fill('input[name="phone"]', "9876543210");
  await page.fill('input[name="name"]', "Test Shopper");
  await page.fill('input[name="line1"]', "12 Test Lane, Sector 109");
  await page.fill('input[name="pincode"]', method === "cod" ? "560001" : "122017"); // Bengaluru (IGST) / Gurgaon (CGST+SGST)
  await page.getByText(/Arrives /).waitFor({ timeout: 60000 });

  const prepaid = Math.round(expected * 0.05);
  if (method === "cod") {
    await page.getByText(/Cash on delivery · \+₹100 COD fee/).click();
    const btn = money(await page.getByRole("button", { name: /Place order/ }).textContent());
    check("COD total = subtotal + ₹100", btn === expected + 10000, `₹${btn / 100}`);
    await page.getByRole("button", { name: /Place order/ }).click();
  } else {
    const btn = money(await page.getByRole("button", { name: /^Pay ₹/ }).textContent());
    check("online total = subtotal − 5%", Math.abs(btn - (expected - prepaid)) <= 1, `₹${btn / 100} (expected ₹${(expected - prepaid) / 100})`);
    await page.getByRole("button", { name: /^Pay ₹/ }).click();
    await page.getByRole("button", { name: /Complete test payment/ }).click({ timeout: 120000 });
  }
  await page.waitForURL("**/orders/**", { timeout: 120000 });
  const token = page.url().split("/orders/")[1].split("?")[0];

  const [o] = await sql`select * from orders where token = ${token}`;
  const items = await sql`select * from order_items where order_id = ${o.id}`;
  const lineSum = items.reduce((s, i) => s + i.price * i.quantity - i.discount, 0);
  check(`order #${o.number} saved with ${items.length} lines, ${items.reduce((s, i) => s + i.quantity, 0)} units`, items.length === 3 && items.reduce((s, i) => s + i.quantity, 0) === 4);
  check("order total = lines − discounts + COD fee + shipping", lineSum + o.cod_fee + o.shipping_total === o.total, `₹${o.total / 100}`);
  check("shipping charged = ₹0", o.shipping_total === 0);
  check(method === "cod" ? "COD fee ₹100 saved" : "prepaid discount saved", method === "cod" ? o.cod_fee === 10000 : o.prepaid_discount === prepaid, method === "cod" ? `₹${o.cod_fee / 100}` : `₹${o.prepaid_discount / 100}`);
  check("every line has an HSN code", items.every((i) => /^\d{4,8}$/.test(i.hsn ?? "")), items.map((i) => i.hsn).join(", "));

  const orderPage = await page.locator("main").innerText();
  check("order page shows invoice download", /Download invoice/i.test(orderPage));

  const inv = await ctx.newPage();
  await inv.goto(`${base}/invoice/${token}`, { waitUntil: "networkidle" });
  const t = await inv.locator("article").innerText();
  check("invoice: GSTIN + legal name", t.includes("06AAJCN9325R1ZN") && t.includes("Nirantaa Clothing Private Limited"));
  check("invoice: number + HSN column", /TRM\/\d{4}-\d{2}\/\d+/.test(t) && /HSN/.test(t));
  check(method === "cod" ? "invoice: IGST (Karnataka)" : "invoice: CGST + SGST (Haryana)", method === "cod" ? /IGST/.test(t) && !/CGST/.test(t) : /CGST/.test(t) && /SGST/.test(t));
  const invTotal = money(t.match(/Invoice total\s*₹([\d,.]+)/)?.[1]);
  check("invoice total = order total", invTotal === o.total, `₹${invTotal / 100}`);
  check("invoice: amount in words", /Rupees .* Only/.test(t));
  await inv.screenshot({ path: `${process.env.TEMP}/invoice-${method}.png`, fullPage: true });

  const events = await sql`select distinct name from analytics_events where session_id = (select session_id from orders where id = ${o.id})`;
  const names = events.map((e) => e.name);
  const want = ["page_view", "view_item", "add_to_cart", "view_cart", "begin_checkout", "add_shipping_info", "add_payment_info", "purchase"];
  check("tracking events recorded", want.every((w) => names.includes(w)), `missing: ${want.filter((w) => !names.includes(w)).join(", ") || "none"}`);
  check("no page errors", !errors.length, errors.slice(0, 2).join(" | "));
  await ctx.close();
  return o;
}

const a = await run("prepaid");
const b = await run("cod");

if (process.env.ADMIN_EMAIL) {
  console.log("\n── Admin ──");
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${base}/admin/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', process.env.ADMIN_EMAIL);
  await page.fill('input[name="password"]', process.env.ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(`${base}/admin`, { timeout: 120000 });
  for (const o of [a, b]) {
    await page.goto(`${base}/admin/orders/${o.id}`, { waitUntil: "networkidle" });
    check(`admin order #${o.number} has GST invoice button`, await page.getByRole("link", { name: "GST invoice" }).isVisible());
    await page.goto(`${base}/admin/invoice/${o.id}`, { waitUntil: "networkidle" });
    check(`admin invoice #${o.number} opens`, (await page.locator("article").innerText()).includes("Tax invoice".toUpperCase()) || /Tax invoice/i.test(await page.locator("article").innerText()));
  }
  await ctx.close();
}
console.log(`\nOrders: #${a.number} (online), #${b.number} (COD) — cancel them in Admin after a production run.`);
await browser.close();
await sql.end();
process.exitCode = failed ? 1 : 0;
