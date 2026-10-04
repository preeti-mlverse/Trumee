import { and, gte, ne, sql } from "drizzle-orm";
import Link from "next/link";
import { db, schema } from "@/db";
import { getSettings } from "@/lib/settings";
import { shiprocketConfigured } from "@/lib/shiprocket";
import { inr } from "@/lib/utils";

export const metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const since = daysAgo(30);
  const [[stats], payments, sr] = await Promise.all([
    db
      .select({
        orders: sql<number>`count(*)::int`,
        revenue: sql<number>`coalesce(sum(${schema.orders.total}),0)::int`,
        prepaid: sql<number>`count(*) filter (where ${schema.orders.paymentMethod} = 'razorpay')::int`,
        prepaidSaved: sql<number>`coalesce(sum(${schema.orders.prepaidDiscount}),0)::int`,
        unshipped: sql<number>`count(*) filter (where ${schema.orders.fulfillmentStatus} = 'unfulfilled')::int`,
      })
      .from(schema.orders)
      .where(and(gte(schema.orders.createdAt, since), ne(schema.orders.status, "cancelled"))),
    getSettings("payments"),
    getSettings("shiprocket"),
  ]);

  const cards = [
    ["Orders (30 days)", String(stats.orders)],
    ["Revenue (30 days)", inr(stats.revenue)],
    ["Paid online", stats.orders ? `${Math.round((stats.prepaid / stats.orders) * 100)}%` : "—"],
    ["Prepaid discounts given", inr(stats.prepaidSaved)],
    ["Waiting to ship", String(stats.unshipped)],
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Overview</h1>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {cards.map(([k, v]) => (
          <div key={k} className="rounded-xl bg-admin-card border border-admin-line p-4">
            <p className="text-xs text-admin-muted">{k}</p>
            <p className="text-xl font-semibold mt-1 tabular-nums">{v}</p>
          </div>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <Status
          title="Prepaid discount"
          ok={payments.prepaidDiscountPercent > 0}
          okText={`${payments.prepaidDiscountPercent}% off online payments${payments.prepaidDiscountMax ? `, up to ${inr(payments.prepaidDiscountMax)}` : ""}`}
          offText="Off — shoppers see no online-payment incentive"
          href="/admin/settings#payments"
        />
        <Status
          title="Shiprocket"
          ok={shiprocketConfigured()}
          okText={`Connected · live delivery dates ${sr.liveEstimates ? "on" : "off"} · auto-send orders ${sr.autoCreateOrders ? "on" : "off"}`}
          offText="Not connected — add SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD (see docs/SHIPROCKET_SETUP.md)"
          href="/admin/settings#shiprocket"
        />
      </div>
    </div>
  );
}

function Status({ title, ok, okText, offText, href }: { title: string; ok: boolean; okText: string; offText: string; href: string }) {
  return (
    <Link href={href} className="rounded-xl bg-admin-card border border-admin-line p-4 flex items-start gap-3 hover:border-admin-accent">
      <span className={`mt-1.5 size-2.5 rounded-full shrink-0 ${ok ? "bg-admin-green" : "bg-admin-yellow"}`} />
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-sm text-admin-muted mt-0.5">{ok ? okText : offText}</span>
      </span>
    </Link>
  );
}

/** Start of the reporting window. */
function daysAgo(n: number) {
  return new Date(Date.now() - n * 86_400_000);
}
