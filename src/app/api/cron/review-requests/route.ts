import { and, eq, isNotNull, lt, notExists, sql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db, schema } from "@/db";
import { sendEmail, templates } from "@/lib/email";
import { abs } from "@/lib/seo";

/**
 * Daily: email a review request 4 days after delivery (once per order).
 * Protected by CRON_SECRET — Vercel Cron sends it as a Bearer token.
 */
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new NextResponse("unauthorized", { status: 401 });
  const cutoff = new Date(Date.now() - 4 * 86400_000);
  const due = await db
    .selectDistinct({ id: schema.orders.id })
    .from(schema.orders)
    .innerJoin(schema.fulfillments, eq(schema.fulfillments.orderId, schema.orders.id))
    .where(
      and(
        isNotNull(schema.fulfillments.deliveredAt),
        lt(schema.fulfillments.deliveredAt, cutoff),
        sql`${schema.orders.status} <> 'cancelled'`,
        notExists(
          db.select({ x: sql`1` }).from(schema.orderEvents).where(and(eq(schema.orderEvents.orderId, schema.orders.id), eq(schema.orderEvents.kind, "review_request"))),
        ),
      ),
    )
    .limit(100);

  let sent = 0;
  for (const { id } of due) {
    const o = await db.query.orders.findFirst({ where: eq(schema.orders.id, id), with: { items: { with: { product: { columns: { handle: true } } } } } });
    if (!o) continue;
    const items = o.items.filter((i) => i.product).map((i) => ({ title: i.title, url: abs(`/products/${i.product!.handle}`) }));
    if (!items.length) continue;
    await sendEmail({ to: o.email, ...templates.reviewRequest({ name: o.shippingAddress.name, number: o.number, items }) });
    await db.insert(schema.orderEvents).values({ orderId: o.id, kind: "review_request", message: "Review request emailed" });
    sent++;
  }
  return NextResponse.json({ sent });
}
