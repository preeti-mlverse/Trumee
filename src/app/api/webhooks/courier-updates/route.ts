import { timingSafeEqual } from "node:crypto";
import { eq, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { applyTrackingUpdate } from "@/lib/fulfilment";

/**
 * Shiprocket tracking webhook. Register in Shiprocket → Settings → API → Webhooks:
 *   URL:   https://<your-domain>/api/webhooks/courier-updates
 *          (Shiprocket rejects URLs containing words like "shiprocket", "kartrocket", "sr", "kr")
 *   Token: the value of SHIPROCKET_WEBHOOK_TOKEN — Shiprocket sends it as the `x-api-key` header.
 * Always answers 200 so Shiprocket doesn't disable the hook; bad tokens are ignored.
 */

type Payload = {
  awb?: string | number;
  courier_name?: string;
  current_status?: string;
  shipment_status?: string;
  order_id?: string;
  sr_order_id?: number;
  etd?: string;
};

function tokenOk(got: string | null) {
  const want = process.env.SHIPROCKET_WEBHOOK_TOKEN;
  if (!want || !got) return false;
  const a = Buffer.from(got);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  if (!tokenOk(req.headers.get("x-api-key"))) return Response.json({ ok: false }, { status: 200 });
  let p: Payload;
  try {
    p = (await req.json()) as Payload;
  } catch {
    return Response.json({ ok: false }, { status: 200 });
  }
  const awb = p.awb ? String(p.awb) : null;
  const number = Number(String(p.order_id ?? "").replace(/^TRM/i, "").replace(/\D/g, "")) || null;

  const order = await db.query.orders.findFirst({
    where: or(
      number ? eq(schema.orders.number, number) : undefined,
      p.sr_order_id ? sql`(${schema.orders.shippingMeta} ->> 'srOrderId')::bigint = ${p.sr_order_id}` : undefined,
      awb ? sql`${schema.orders.shippingMeta} ->> 'awb' = ${awb}` : undefined,
    ),
    columns: { id: true },
  });
  if (order && awb) {
    const status = p.current_status || p.shipment_status || null;
    await applyTrackingUpdate({
      orderId: order.id,
      awb,
      courier: p.courier_name ?? null,
      status,
      etd: p.etd ?? null,
      delivered: /^delivered$/i.test((status ?? "").trim()),
    });
  }
  return Response.json({ ok: true });
}
