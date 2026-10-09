import { and, desc, eq, ilike, ne, or, sql, type SQL } from "drizzle-orm";
import Link from "next/link";
import { ShipActions } from "@/components/admin/ship-actions";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/auth";
import { shiprocketConfigured, trackingUrl } from "@/lib/shiprocket";
import { formatDate, inr } from "@/lib/utils";

export const metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

const FILTERS = {
  all: { label: "All", where: undefined },
  unfulfilled: { label: "To ship", where: and(eq(schema.orders.fulfillmentStatus, "unfulfilled"), ne(schema.orders.status, "cancelled")) },
  unpaid: { label: "Unpaid", where: and(eq(schema.orders.financialStatus, "pending"), ne(schema.orders.status, "cancelled")) },
  cod: { label: "COD", where: eq(schema.orders.paymentMethod, "cod") },
  shipped: { label: "Shipped", where: eq(schema.orders.fulfillmentStatus, "fulfilled") },
  refunded: { label: "Refunded", where: sql`${schema.orders.refundedTotal} > 0` },
  cancelled: { label: "Cancelled", where: eq(schema.orders.status, "cancelled") },
} satisfies Record<string, { label: string; where: SQL | undefined }>;

export default async function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireStaff("orders");
  const sp = await searchParams;
  const q = String(sp.q ?? "").trim();
  const f = (String(sp.f ?? "all") in FILTERS ? String(sp.f ?? "all") : "all") as keyof typeof FILTERS;
  const num = Number(q.replace(/^#|^TRM/i, ""));
  const search = q
    ? or(
        Number.isInteger(num) && num > 0 ? eq(schema.orders.number, num) : undefined,
        ilike(schema.orders.email, `%${q}%`),
        ilike(schema.orders.phone, `%${q.replace(/\D/g, "") || q}%`),
        sql`${schema.orders.shippingAddress} ->> 'name' ilike ${`%${q}%`}`,
        sql`${schema.orders.shippingMeta} ->> 'awb' = ${q}`,
      )
    : undefined;
  const orders = await db.query.orders.findMany({ where: and(FILTERS[f].where, search), orderBy: desc(schema.orders.createdAt), limit: 200 });
  const connected = shiprocketConfigured();

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-semibold">Orders</h1>
        {!connected && (
          <Link href="/admin/settings#shiprocket" className="text-sm text-admin-yellow underline">
            Shiprocket not connected
          </Link>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {Object.entries(FILTERS).map(([k, v]) => (
          <Link
            key={k}
            href={`/admin/orders?f=${k}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`rounded-full px-3 py-1 text-sm ${k === f ? "bg-admin-accent text-white" : "bg-admin-card border border-admin-line hover:border-admin-accent"}`}
          >
            {v.label}
          </Link>
        ))}
        <form className="ml-auto flex gap-2">
          <input type="hidden" name="f" value={f} />
          <input name="q" defaultValue={q} placeholder="Order #, name, email, phone or AWB" className="w-64 rounded-lg border border-admin-line bg-white px-3 py-1.5 text-sm outline-none focus:border-admin-accent" />
          <button className="rounded-lg bg-admin-accent text-white px-3 py-1.5 text-sm">Search</button>
        </form>
      </div>
      <div className="rounded-2xl bg-admin-card border border-admin-line overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-admin-muted border-b border-admin-line">
            <tr>
              {["Order", "Date", "Customer", "Total", "Payment", "Shipping", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-admin-line">
            {orders.map((o) => {
              const m = o.shippingMeta;
              const stage = m?.awb ? "shipped" : m?.shipmentId ? "sent" : "new";
              const blocked =
                o.status === "cancelled"
                  ? "Cancelled"
                  : o.paymentMethod !== "cod" && o.financialStatus !== "paid"
                    ? "Awaiting payment"
                    : !connected
                      ? "Connect Shiprocket"
                      : undefined;
              return (
                <tr key={o.id} className="align-top">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/admin/orders/${o.id}`} className="underline underline-offset-2">#{o.number}</Link>
                    {o.status === "cancelled" && <span className="block text-xs text-admin-red">Cancelled</span>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-admin-muted">{formatDate(o.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className="block">{o.shippingAddress.name}</span>
                    <span className="block text-xs text-admin-muted">{o.shippingAddress.city} · {o.shippingAddress.pincode}</span>
                  </td>
                  <td className="px-4 py-3 tabular-nums whitespace-nowrap">
                    {inr(o.total)}
                    {o.prepaidDiscount > 0 && <span className="block text-xs text-admin-green">−{inr(o.prepaidDiscount)} prepaid</span>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge tone={o.paymentMethod === "cod" ? "yellow" : o.financialStatus === "paid" ? "green" : "red"}>
                      {o.paymentMethod === "cod" ? "COD" : o.financialStatus === "paid" ? "Paid online" : "Unpaid"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {m?.awb ? (
                      <a href={trackingUrl(m.awb)} target="_blank" rel="noopener" className="underline">
                        {m.courier ?? "AWB"} {m.awb}
                      </a>
                    ) : m?.shipmentId ? (
                      <span>In Shiprocket · shipment {m.shipmentId}</span>
                    ) : (
                      <span className="text-admin-muted">Not sent</span>
                    )}
                    {m?.status && <span className="block text-admin-muted mt-0.5">{m.status}</span>}
                    {m?.error && <span className="block text-admin-red mt-0.5">{m.error}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <ShipActions orderId={o.id} stage={stage} disabled={blocked} />
                  </td>
                </tr>
              );
            })}
            {!orders.length && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-admin-muted">{q || f !== "all" ? "No orders match." : "No orders yet."}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Badge({ tone, children }: { tone: "green" | "yellow" | "red"; children: React.ReactNode }) {
  const c = { green: "bg-admin-green-bg text-admin-green", yellow: "bg-admin-yellow-bg text-admin-yellow", red: "bg-admin-red-bg text-admin-red" }[tone];
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${c}`}>{children}</span>;
}
