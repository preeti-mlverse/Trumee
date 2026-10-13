/**
 * Shiprocket diagnosis (read-only — creates nothing): logs in with the server's credentials, lists the
 * pickup addresses Shiprocket knows, compares them with the store setting, and shows the last
 * Shiprocket error saved on recent orders.
 *
 *   npx tsx scripts/shiprocket-check.ts
 */
import "dotenv/config";
import postgres from "postgres";

const BASE = "https://apiv2.shiprocket.in/v1/external";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1, onnotice: () => {} });
  try {
    if (!process.env.SHIPROCKET_EMAIL || !process.env.SHIPROCKET_PASSWORD) return console.log("✗ SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD are not set in .env");

    const login = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: process.env.SHIPROCKET_EMAIL, password: process.env.SHIPROCKET_PASSWORD }),
    });
    const lj = (await login.json()) as { token?: string; message?: string };
    if (!lj.token) return console.log(`✗ Login failed: ${lj.message ?? login.status}`);
    console.log("✓ Logged in to Shiprocket");

    const pr = await fetch(`${BASE}/settings/company/pickup`, { headers: { Authorization: `Bearer ${lj.token}` } });
    const pj = (await pr.json()) as { data?: { shipping_address?: { pickup_location: string; pin_code: string; city: string; status?: number; phone_verified?: number }[] } };
    const pickups = pj.data?.shipping_address ?? [];
    console.log(`\nPickup addresses in Shiprocket (${pickups.length}):`);
    for (const p of pickups) console.log(`  • "${p.pickup_location}" — ${p.city} ${p.pin_code}${p.phone_verified === 1 ? "" : "  (phone NOT verified)"}`);

    const [row] = await sql`select value from settings where key = 'shiprocket'`;
    const name = (row?.value as { pickupLocation?: string } | undefined)?.pickupLocation ?? "Primary (default)";
    const ok = pickups.some((p) => p.pickup_location === name);
    console.log(`\nStore setting "Pickup location nickname": "${name}" ${ok ? "✓ matches" : "✗ does NOT match any pickup address above — fix it in Admin → Settings → Shiprocket"}`);

    const orders = await sql`select number, payment_method, financial_status, shipping_meta from orders order by id desc limit 10`;
    console.log("\nRecent orders:");
    for (const o of orders) {
      const m = (o.shipping_meta ?? {}) as { srOrderId?: number; shipmentId?: number; error?: string };
      console.log(`  #${o.number} ${o.payment_method}/${o.financial_status}: ${m.shipmentId ? `in Shiprocket (shipment ${m.shipmentId})` : m.error ? `ERROR — ${m.error}` : "not sent"}`);
    }
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
