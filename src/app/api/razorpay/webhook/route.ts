import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db, schema } from "@/db";
import { markOrderPaid } from "@/lib/orders";
import { verifyWebhookSignature } from "@/lib/razorpay";

/** Backup path for payment confirmation if the shopper closes the tab before our handler runs. */
export async function POST(req: NextRequest) {
  const body = await req.text();
  if (!verifyWebhookSignature(body, req.headers.get("x-razorpay-signature") ?? "")) return new NextResponse("bad signature", { status: 401 });
  const evt = JSON.parse(body) as { event: string; payload: { payment?: { entity: { id: string; order_id: string } } } };
  if (evt.event === "payment.captured" || evt.event === "order.paid") {
    const p = evt.payload.payment?.entity;
    if (p) {
      const order = await db.query.orders.findFirst({ where: eq(schema.orders.paymentGatewayOrderId, p.order_id) });
      if (order) await markOrderPaid(order.id, p.id, p.order_id);
    }
  }
  return NextResponse.json({ ok: true });
}
