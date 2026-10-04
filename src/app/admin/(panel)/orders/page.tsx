import { desc } from "drizzle-orm";
import Link from "next/link";
import { ShipActions } from "@/components/admin/ship-actions";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/auth";
import { shiprocketConfigured, trackingUrl } from "@/lib/shiprocket";
import { formatDate, inr } from "@/lib/utils";

export const metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  await requireStaff("orders");
  const orders = await db.query.orders.findMany({ orderBy: desc(schema.orders.createdAt), limit: 100 });
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
                    <Link href={`/orders/${o.token}`} target="_blank" className="hover:underline">#{o.number}</Link>
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
                <td colSpan={7} className="px-4 py-10 text-center text-admin-muted">No orders yet.</td>
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
