import { desc, eq } from "drizzle-orm";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CancelForm, NoteForm, OrderButton, RefundForm } from "@/components/admin/order-actions";
import { ShipActions } from "@/components/admin/ship-actions";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { shiprocketConfigured, trackingUrl } from "@/lib/shiprocket";
import { formatDate, inr } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/admin/orders/[id]">) {
  const { id } = await params;
  return { title: `Order ${id}` };
}

const time = (d: Date) => d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

export default async function OrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  await requireStaff("orders");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const o = await db.query.orders.findFirst({
    where: eq(schema.orders.id, id),
    with: { items: true, refunds: true, events: { orderBy: desc(schema.orderEvents.createdAt) }, customer: true },
  });
  if (!o) notFound();
  const payments = await getSettings("payments");
  const staff = await db.select({ id: schema.staff.id, name: schema.staff.name }).from(schema.staff);
  const who = (sid: number | null) => (sid ? staff.find((s) => s.id === sid)?.name : null);

  const m = o.shippingMeta;
  const cancelled = o.status === "cancelled";
  const paid = ["paid", "partially_refunded"].includes(o.financialStatus);
  const refundable = o.total - o.refundedTotal;
  const connected = shiprocketConfigured();
  const stage = m?.awb ? "shipped" : m?.shipmentId ? "sent" : "new";
  const onWay = /transit|out for delivery|delivered|rto/i.test(m?.status ?? "");
  const rzpDash = "https://dashboard.razorpay.com/app/payments/";
  const a = o.shippingAddress;

  const pill = (t: string, tone: "green" | "yellow" | "red" | "blue" | "grey") => {
    const c = { green: "bg-admin-green-bg text-admin-green", yellow: "bg-admin-yellow-bg text-admin-yellow", red: "bg-admin-red-bg text-admin-red", blue: "bg-admin-blue-bg text-admin-blue", grey: "bg-admin-bg text-admin-muted" }[tone];
    return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${c}`}>{t}</span>;
  };
  const payPill =
    o.financialStatus === "paid"
      ? pill(o.paymentMethod === "cod" ? "COD collected" : "Paid", "green")
      : o.financialStatus === "refunded"
        ? pill("Refunded", "grey")
        : o.financialStatus === "partially_refunded"
          ? pill("Partially refunded", "yellow")
          : o.financialStatus === "voided"
            ? pill("Voided", "grey")
            : pill(o.paymentMethod === "cod" ? "COD — to collect" : "Payment pending", o.paymentMethod === "cod" ? "yellow" : "red");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/orders" className="text-sm text-admin-muted hover:text-admin-text">← Orders</Link>
        <h1 className="text-2xl font-semibold">#{o.number}</h1>
        {payPill}
        {cancelled ? pill("Cancelled", "red") : o.fulfillmentStatus === "fulfilled" ? pill(m?.status ?? "Shipped", "blue") : pill("Unfulfilled", "yellow")}
        <span className="text-sm text-admin-muted">{time(o.createdAt)} · {o.source}</span>
        <Link href={`/orders/${o.token}`} target="_blank" className="ml-auto text-sm underline">Customer view ↗</Link>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        <div className="space-y-6">
          {/* Items & totals */}
          <section className="rounded-2xl bg-admin-card border border-admin-line">
            <ul className="divide-y divide-admin-line">
              {o.items.map((i) => (
                <li key={i.id} className="flex items-center gap-4 px-5 py-3">
                  <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-admin-bg">
                    {i.imageUrl && <Image src={i.imageUrl} alt="" fill sizes="56px" className="object-cover" />}
                  </span>
                  <span className="flex-1 min-w-0 text-sm">
                    <span className="block font-medium truncate">{i.title}</span>
                    <span className="block text-admin-muted">{[i.variantTitle, i.sku].filter(Boolean).join(" · ")}</span>
                  </span>
                  <span className="text-sm tabular-nums text-admin-muted">{inr(i.price)} × {i.quantity}</span>
                  <span className="w-24 text-right text-sm tabular-nums">{inr(i.price * i.quantity)}</span>
                </li>
              ))}
            </ul>
            <dl className="border-t border-admin-line px-5 py-4 text-sm space-y-1.5">
              {[
                ["Subtotal", o.subtotal],
                o.discountTotal ? [`Discount${o.discountCode ? ` (${o.discountCode})` : ""}`, -o.discountTotal] : null,
                o.prepaidDiscount ? ["Prepaid discount", -o.prepaidDiscount] : null,
                ["Shipping", o.shippingTotal],
                o.codFee ? ["COD fee", o.codFee] : null,
              ]
                .filter((r): r is [string, number] => !!r)
                .map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <dt className="text-admin-muted">{k}</dt>
                    <dd className="tabular-nums">{v < 0 ? `−${inr(-v)}` : inr(v)}</dd>
                  </div>
                ))}
              <div className="flex justify-between font-semibold pt-1.5 border-t border-admin-line">
                <dt>Total</dt>
                <dd className="tabular-nums">{inr(o.total)}</dd>
              </div>
              {o.taxTotal > 0 && <p className="text-xs text-admin-muted text-right">Includes GST {inr(o.taxTotal)}</p>}
              {o.refundedTotal > 0 && (
                <div className="flex justify-between text-admin-red">
                  <dt>Refunded</dt>
                  <dd className="tabular-nums">−{inr(o.refundedTotal)}</dd>
                </div>
              )}
            </dl>
          </section>

          {/* Payment */}
          <section className="rounded-2xl bg-admin-card border border-admin-line p-5 space-y-3">
            <h2 className="font-semibold">Payment</h2>
            <p className="text-sm text-admin-muted">
              {o.paymentMethod === "cod" ? "Cash on delivery" : "Online via Razorpay"}
              {o.paymentId && (
                <>
                  {" · "}
                  <a href={`${rzpDash}${o.paymentId}`} target="_blank" rel="noopener" className="underline">{o.paymentId}</a>
                </>
              )}
              {o.paidAt && ` · paid ${time(o.paidAt)}`}
            </p>
            {o.refunds.length > 0 && (
              <ul className="text-sm space-y-1">
                {o.refunds.map((r) => (
                  <li key={r.id} className="text-admin-muted">
                    Refund {inr(r.amount)} · {time(r.createdAt)} {r.gatewayRefundId && `· ${r.gatewayRefundId}`} {r.reason && `— ${r.reason}`}
                  </li>
                ))}
              </ul>
            )}
            {!cancelled && (
              <div className="flex flex-wrap gap-2">
                {o.paymentMethod === "cod" && o.financialStatus === "pending" && <OrderButton orderId={o.id} op="markPaid" label="Mark COD as collected" confirm="Mark this COD order as paid?" />}
                {paid && refundable > 0 && <RefundForm orderId={o.id} max={refundable} online={o.paymentMethod === "razorpay"} defaultSpeed={payments.refundSpeed} />}
              </div>
            )}
            {cancelled && paid && refundable > 0 && <RefundForm orderId={o.id} max={refundable} online={o.paymentMethod === "razorpay"} defaultSpeed={payments.refundSpeed} />}
          </section>

          {/* Shipping */}
          <section className="rounded-2xl bg-admin-card border border-admin-line p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Shipping · Shiprocket</h2>
              {!connected && <Link href="/admin/settings#shiprocket" className="text-sm text-admin-yellow underline">Not connected</Link>}
            </div>
            <div className="text-sm">
              {m?.awb ? (
                <p>
                  {m.courier ?? "Courier"} · AWB{" "}
                  <a href={trackingUrl(m.awb)} target="_blank" rel="noopener" className="underline">{m.awb}</a>
                  {m.etd && <span className="text-admin-muted"> · ETA {m.etd}</span>}
                </p>
              ) : m?.shipmentId ? (
                <p>In Shiprocket · order {m.srOrderId} · shipment {m.shipmentId} — courier not booked yet</p>
              ) : (
                <p className="text-admin-muted">Not sent to Shiprocket yet</p>
              )}
              {m?.status && <p className="text-admin-muted mt-0.5">Status: {m.status}</p>}
              {m?.error && <p className="text-admin-red mt-0.5">{m.error}</p>}
            </div>
            {!cancelled && connected && (
              <div className="flex flex-wrap items-start gap-2">
                <ShipActions
                  orderId={o.id}
                  stage={stage}
                  disabled={o.paymentMethod !== "cod" && !paid ? "Waiting for payment" : undefined}
                />
                {m?.awb && !m.pickupScheduled && <OrderButton orderId={o.id} op="pickup" label="Request pickup" />}
                {m?.awb && <OrderButton orderId={o.id} op="label" label="Shipping label (PDF)" />}
                {m?.srOrderId && <OrderButton orderId={o.id} op="invoice" label="Invoice (PDF)" />}
                {m?.awb && !onWay && <OrderButton orderId={o.id} op="cancelShipment" label="Cancel shipment" confirm="Cancel the courier booking? The order stays and can be shipped again." />}
              </div>
            )}
          </section>

          {/* Timeline */}
          <section className="rounded-2xl bg-admin-card border border-admin-line p-5 space-y-4">
            <h2 className="font-semibold">Timeline</h2>
            <NoteForm orderId={o.id} />
            <ol className="space-y-3 border-l border-admin-line pl-4">
              {o.events.map((e) => (
                <li key={e.id} className="text-sm">
                  <span className={e.kind === "comment" ? "font-medium" : ""}>{e.message}</span>
                  <span className="block text-xs text-admin-muted">
                    {time(e.createdAt)}
                    {who(e.staffId) && ` · ${who(e.staffId)}`}
                  </span>
                </li>
              ))}
              {!o.events.some((e) => e.kind === "placed") && (
                <li className="text-sm">
                  Order placed
                  <span className="block text-xs text-admin-muted">{time(o.createdAt)}</span>
                </li>
              )}
            </ol>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <section className="rounded-2xl bg-admin-card border border-admin-line p-5 text-sm space-y-3">
            <h2 className="font-semibold">Customer</h2>
            <p>
              {a.name}
              {o.customer && <span className="block text-admin-muted">Account since {formatDate(o.customer.createdAt)}</span>}
            </p>
            <p>
              <a href={`mailto:${o.email}`} className="underline break-all">{o.email}</a>
              <br />
              <a href={`tel:${a.phone || o.phone}`} className="underline">{a.phone || o.phone}</a>
              {" · "}
              <a href={`https://wa.me/91${(a.phone || o.phone || "").replace(/\D/g, "").slice(-10)}`} target="_blank" rel="noopener" className="underline">WhatsApp</a>
            </p>
            <div>
              <p className="font-medium">Delivery address</p>
              <p className="text-admin-muted">
                {a.line1}
                {a.line2 && <>, {a.line2}</>}
                <br />
                {a.city}, {a.state} {a.pincode}
              </p>
            </div>
            {o.note && (
              <div>
                <p className="font-medium">Customer note</p>
                <p className="text-admin-muted">{o.note}</p>
              </div>
            )}
            {o.attribution && (
              <div>
                <p className="font-medium">Came from</p>
                <p className="text-admin-muted">{[o.attribution.source, o.attribution.medium, o.attribution.campaign].filter(Boolean).join(" / ") || "Direct"}</p>
              </div>
            )}
          </section>
          {!cancelled && (
            <section className="rounded-2xl bg-admin-card border border-admin-line p-5">
              <CancelForm orderId={o.id} canRefund={paid && refundable > 0} paidOnline={o.paymentMethod === "razorpay"} />
            </section>
          )}
          {cancelled && (
            <section className="rounded-2xl bg-admin-red-bg/40 border border-admin-line p-5 text-sm">
              Cancelled {o.cancelledAt && time(o.cancelledAt)}
              {o.cancelReason && <span className="block text-admin-muted">{o.cancelReason}</span>}
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
