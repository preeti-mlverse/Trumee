import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db, schema } from "@/db";
import { markOrderPaid } from "@/lib/orders";
import { verifyWebhookSignature } from "@/lib/razorpay";

/**
 * Razorpay webhook (Dashboard → Webhooks → https://<domain>/api/razorpay/webhook).
 * Events: payment.captured / order.paid (backup confirmation if the shopper closes the tab),
 * payment.failed (noted on the order), refund.processed / refund.failed (refund outcome).
 * Payments that aren't ours (e.g. the Shopify store on the same account) are ignored.
 */
type Entity = { id: string; order_id?: string; payment_id?: string; amount?: number; error_description?: string; speed_processed?: string };
type Evt = { event: string; payload: { payment?: { entity: Entity }; refund?: { entity: Entity } } };

const rupees = (p?: number) => `₹${((p ?? 0) / 100).toLocaleString("en-IN")}`;

async function orderByGatewayOrder(gatewayOrderId?: string) {
  return gatewayOrderId ? db.query.orders.findFirst({ where: eq(schema.orders.paymentGatewayOrderId, gatewayOrderId), columns: { id: true } }) : undefined;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  if (!verifyWebhookSignature(body, req.headers.get("x-razorpay-signature") ?? "")) return new NextResponse("bad signature", { status: 401 });
  const evt = JSON.parse(body) as Evt;
  const p = evt.payload.payment?.entity;

  if ((evt.event === "payment.captured" || evt.event === "order.paid") && p?.order_id) {
    const order = await orderByGatewayOrder(p.order_id);
    if (order) await markOrderPaid(order.id, p.id, p.order_id);
  } else if (evt.event === "payment.failed" && p?.order_id) {
    const order = await orderByGatewayOrder(p.order_id);
    if (order)
      await db.insert(schema.orderEvents).values({ orderId: order.id, kind: "payment", message: `Payment attempt failed: ${p.error_description || "declined"} (${p.id})` });
  } else if (evt.event === "refund.processed" || evt.event === "refund.failed") {
    const r = evt.payload.refund?.entity;
    const refund = r ? await db.query.refunds.findFirst({ where: eq(schema.refunds.gatewayRefundId, r.id), columns: { orderId: true } }) : undefined;
    if (r && refund)
      await db.insert(schema.orderEvents).values({
        orderId: refund.orderId,
        kind: "refund",
        message:
          evt.event === "refund.processed"
            ? `Refund ${r.id} of ${rupees(r.amount)} reached the customer${r.speed_processed === "instant" ? " instantly" : ""}`
            : `Refund ${r.id} of ${rupees(r.amount)} FAILED at Razorpay — refund the customer another way`,
      });
  }
  return NextResponse.json({ ok: true });
}
