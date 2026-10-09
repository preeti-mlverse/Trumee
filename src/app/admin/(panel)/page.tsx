import { and, desc, eq, gte, lt, lte, ne, sql } from "drizzle-orm";
import Link from "next/link";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { shiprocketConfigured } from "@/lib/shiprocket";
import { inr } from "@/lib/utils";

export const metadata = { title: "Home" };
export const dynamic = "force-dynamic";

const { orders: O, orderItems: OI, analyticsSessions: AS, variants: V, products: P } = schema;
const IST = 330 * 60_000;
const DAY = 86_400_000;

/** Midnight IST for a yyyy-mm-dd string, as a UTC Date. */
const istMidnight = (ymd: string) => new Date(Date.parse(`${ymd}T00:00:00Z`) - IST);
const ymdIST = (d: Date) => new Date(d.getTime() + IST).toISOString().slice(0, 10);

const PRESETS = [
  ["today", "Today"],
  ["yesterday", "Yesterday"],
  ["7d", "Last 7 days"],
  ["30d", "Last 30 days"],
  ["90d", "Last 90 days"],
  ["month", "This month"],
  ["lastmonth", "Last month"],
] as const;

/** Resolves ?range= / ?from=&to= into [start, end) in UTC plus a label. Dates are IST calendar days. */
function resolveRange(sp: Record<string, string | string[] | undefined>) {
  const today = ymdIST(new Date());
  const t0 = istMidnight(today);
  const from = String(sp.from ?? "");
  const to = String(sp.to ?? "");
  if (/^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to) && from <= to)
    return { key: "custom", start: istMidnight(from), end: new Date(istMidnight(to).getTime() + DAY), from, to };
  const key = String(sp.range ?? "30d");
  const ymd = (d: Date) => ymdIST(d);
  let start: Date, end: Date;
  switch (key) {
    case "today":
      [start, end] = [t0, new Date(t0.getTime() + DAY)];
      break;
    case "yesterday":
      [start, end] = [new Date(t0.getTime() - DAY), t0];
      break;
    case "7d":
    case "90d":
      [start, end] = [new Date(t0.getTime() - (key === "7d" ? 6 : 89) * DAY), new Date(t0.getTime() + DAY)];
      break;
    case "month":
      [start, end] = [istMidnight(today.slice(0, 8) + "01"), new Date(t0.getTime() + DAY)];
      break;
    case "lastmonth": {
      const firstThis = istMidnight(today.slice(0, 8) + "01");
      const prev = ymdIST(new Date(firstThis.getTime() - DAY));
      [start, end] = [istMidnight(prev.slice(0, 8) + "01"), firstThis];
      break;
    }
    default:
      [start, end] = [new Date(t0.getTime() - 29 * DAY), new Date(t0.getTime() + DAY)];
  }
  return { key: PRESETS.some(([k]) => k === key) ? key : "30d", start, end, from: ymd(start), to: ymd(new Date(end.getTime() - DAY)) };
}

async function metrics(start: Date, end: Date) {
  const live = and(gte(O.createdAt, start), lt(O.createdAt, end), ne(O.status, "cancelled"));
  const [[o], [s], [u]] = await Promise.all([
    db
      .select({
        orders: sql<number>`count(*)::int`,
        gross: sql<number>`coalesce(sum(${O.total}),0)::int`,
        refunds: sql<number>`coalesce(sum(${O.refundedTotal}),0)::int`,
        online: sql<number>`count(*) filter (where ${O.paymentMethod} = 'razorpay')::int`,
        prepaidSaved: sql<number>`coalesce(sum(${O.prepaidDiscount}),0)::int`,
      })
      .from(O)
      .where(and(live, sql`(${O.paymentMethod} = 'cod' or ${O.financialStatus} <> 'pending')`)),
    db.select({ sessions: sql<number>`count(*)::int` }).from(AS).where(and(gte(AS.startedAt, start), lt(AS.startedAt, end))),
    db
      .select({ units: sql<number>`coalesce(sum(${OI.quantity}),0)::int` })
      .from(OI)
      .innerJoin(O, eq(OI.orderId, O.id))
      .where(and(live, sql`(${O.paymentMethod} = 'cod' or ${O.financialStatus} <> 'pending')`)),
  ]);
  const net = o.gross - o.refunds;
  return { ...o, net, sessions: s.sessions, units: u.units, aov: o.orders ? Math.round(net / o.orders) : 0, conv: s.sessions ? (o.orders / s.sessions) * 100 : 0 };
}

export default async function AdminHome({ searchParams }: PageProps<"/admin">) {
  await requireStaff();
  const sp = await searchParams;
  const r = resolveRange(sp);
  const span = r.end.getTime() - r.start.getTime();
  const prevStart = new Date(r.start.getTime() - span);
  const days = Math.round(span / DAY);

  const [cur, prev, daily, top, todo, lowStock, payments, sr] = await Promise.all([
    metrics(r.start, r.end),
    metrics(prevStart, r.start),
    db
      .select({
        day: sql<string>`to_char(${O.createdAt} at time zone 'Asia/Kolkata', 'YYYY-MM-DD')`,
        revenue: sql<number>`coalesce(sum(${O.total} - ${O.refundedTotal}),0)::int`,
        orders: sql<number>`count(*)::int`,
      })
      .from(O)
      .where(and(gte(O.createdAt, r.start), lt(O.createdAt, r.end), ne(O.status, "cancelled"), sql`(${O.paymentMethod} = 'cod' or ${O.financialStatus} <> 'pending')`))
      .groupBy(sql`1`),
    db
      .select({ productId: OI.productId, title: OI.title, units: sql<number>`sum(${OI.quantity})::int`, revenue: sql<number>`sum(${OI.price} * ${OI.quantity})::int` })
      .from(OI)
      .innerJoin(O, eq(OI.orderId, O.id))
      .where(and(gte(O.createdAt, r.start), lt(O.createdAt, r.end), ne(O.status, "cancelled"), sql`(${O.paymentMethod} = 'cod' or ${O.financialStatus} <> 'pending')`))
      .groupBy(OI.productId, OI.title)
      .orderBy(desc(sql`sum(${OI.quantity})`))
      .limit(6),
    db
      .select({
        toShip: sql<number>`count(*) filter (where ${O.fulfillmentStatus} = 'unfulfilled' and (${O.paymentMethod} = 'cod' or ${O.financialStatus} = 'paid'))::int`,
        unpaid: sql<number>`count(*) filter (where ${O.paymentMethod} = 'razorpay' and ${O.financialStatus} = 'pending' and ${O.createdAt} > now() - interval '2 days')::int`,
        codToCollect: sql<number>`count(*) filter (where ${O.paymentMethod} = 'cod' and ${O.financialStatus} = 'pending' and ${O.fulfillmentStatus} = 'fulfilled')::int`,
      })
      .from(O)
      .where(ne(O.status, "cancelled")),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(V)
      .innerJoin(P, eq(V.productId, P.id))
      .where(and(eq(P.status, "active"), eq(V.trackInventory, true), lte(V.inventoryQty, 3))),
    getSettings("payments"),
    getSettings("shiprocket"),
  ]);

  // One bar per day in the window (zero-filled)
  const series = Array.from({ length: Math.min(days, 92) }, (_, i) => {
    const d = ymdIST(new Date(r.start.getTime() + i * DAY));
    const hit = daily.find((x) => x.day === d);
    return { d, revenue: hit?.revenue ?? 0, orders: hit?.orders ?? 0 };
  });
  const peak = Math.max(1, ...series.map((x) => x.revenue));

  // No comparison when the previous period had nothing (a "+100%" there would mean nothing)
  const delta = (a: number, b: number) => (b === 0 ? null : ((a - b) / b) * 100);
  const cards: [string, string, number | null][] = [
    ["Net sales", inr(cur.net), delta(cur.net, prev.net)],
    ["Orders", String(cur.orders), delta(cur.orders, prev.orders)],
    ["Average order", cur.orders ? inr(cur.aov) : "—", delta(cur.aov, prev.aov)],
    ["Sessions", String(cur.sessions), delta(cur.sessions, prev.sessions)],
    ["Conversion", cur.sessions ? `${cur.conv.toFixed(1)}%` : "—", delta(cur.conv, prev.conv)],
    ["Units sold", String(cur.units), delta(cur.units, prev.units)],
    ["Paid online", cur.orders ? `${Math.round((cur.online / cur.orders) * 100)}%` : "—", null],
    ["Refunded", inr(cur.refunds), null],
  ];
  const fmtDay = (ymd: string) => new Date(ymd + "T00:00:00Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
  const chip = (active: boolean) => `rounded-full px-3 py-1 text-sm ${active ? "bg-admin-accent text-white" : "bg-admin-card border border-admin-line hover:border-admin-accent"}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Home</h1>
          <p className="text-sm text-admin-muted mt-1">
            {fmtDay(r.from)}
            {r.from !== r.to && ` – ${fmtDay(r.to)}`} · compared with the {days === 1 ? "day" : `${days} days`} before
          </p>
        </div>
      </div>

      {/* Range picker */}
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map(([k, label]) => (
          <Link key={k} href={`/admin?range=${k}`} className={chip(r.key === k)}>
            {label}
          </Link>
        ))}
        <form className={`flex flex-wrap items-center gap-2 rounded-full pl-3 pr-1 py-1 ${r.key === "custom" ? "bg-admin-accent text-white" : "bg-admin-card border border-admin-line"}`}>
          <span className="text-sm">Custom</span>
          <input type="date" name="from" defaultValue={r.from} max={ymdIST(new Date())} required className="rounded-md border border-admin-line bg-white text-admin-text px-2 py-0.5 text-sm" aria-label="From date" />
          <span className="text-sm">to</span>
          <input type="date" name="to" defaultValue={r.to} max={ymdIST(new Date())} required className="rounded-md border border-admin-line bg-white text-admin-text px-2 py-0.5 text-sm" aria-label="To date" />
          <button className="rounded-full bg-white text-admin-text border border-admin-line px-3 py-0.5 text-sm">Apply</button>
        </form>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map(([k, v, d]) => (
          <div key={k} className="rounded-xl bg-admin-card border border-admin-line p-4">
            <p className="text-xs text-admin-muted">{k}</p>
            <p className="text-xl font-semibold mt-1 tabular-nums">{v}</p>
            {d != null && (
              <p className={`text-xs mt-1 tabular-nums ${d > 0 ? "text-admin-green" : d < 0 ? "text-admin-red" : "text-admin-muted"}`}>
                {d > 0 ? "▲" : d < 0 ? "▼" : "•"} {Math.abs(d).toFixed(0)}%
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
        <section className="rounded-2xl bg-admin-card border border-admin-line p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">Sales by day</h2>
            <span className="text-xs text-admin-muted">net of refunds</span>
          </div>
          {series.length > 1 ? (
            <div className="mt-4 flex items-end gap-[2px] h-44" role="img" aria-label="Daily net sales">
              {series.map((x) => (
                <div key={x.d} className="group relative flex-1 h-full flex items-end">
                  <div className="w-full rounded-t bg-admin-accent/80 group-hover:bg-admin-accent min-h-[2px]" style={{ height: `${(x.revenue / peak) * 100}%` }} />
                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block whitespace-nowrap rounded-md bg-admin-accent text-white px-2 py-1 text-xs z-10">
                    {fmtDay(x.d)} · {inr(x.revenue)} · {x.orders} order{x.orders === 1 ? "" : "s"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-3xl font-semibold tabular-nums">{inr(cur.net)}</p>
          )}
          {series.length > 1 && (
            <div className="mt-2 flex justify-between text-xs text-admin-muted">
              <span>{fmtDay(series[0].d)}</span>
              <span>{fmtDay(series[series.length - 1].d)}</span>
            </div>
          )}
        </section>

        <aside className="space-y-3">
          <section className="rounded-2xl bg-admin-card border border-admin-line p-5 space-y-2 text-sm">
            <h2 className="font-semibold mb-1">To do</h2>
            <TodoLink href="/admin/orders?f=unfulfilled" n={todo[0].toShip} label="orders to ship" />
            <TodoLink href="/admin/orders?f=unpaid" n={todo[0].unpaid} label="unpaid online orders (last 2 days)" />
            <TodoLink href="/admin/orders?f=cod" n={todo[0].codToCollect} label="shipped COD orders to mark collected" />
            <TodoLink href="/admin/inventory?view=low" n={lowStock[0].n} label="sizes with 3 or fewer left" />
          </section>
          <Status
            title="Prepaid discount"
            ok={payments.prepaidDiscountPercent > 0}
            okText={`${payments.prepaidDiscountPercent}% off online payments · ${inr(cur.prepaidSaved)} given in this period`}
            offText="Off — shoppers see no online-payment incentive"
            href="/admin/settings#payments"
          />
          <Status
            title="Shiprocket"
            ok={shiprocketConfigured()}
            okText={`Connected · live dates ${sr.liveEstimates ? "on" : "off"} · auto-send ${sr.autoCreateOrders ? "on" : "off"}`}
            offText="Not connected — add the API user to the server .env"
            href="/admin/settings#shiprocket"
          />
        </aside>
      </div>

      <section className="rounded-2xl bg-admin-card border border-admin-line">
        <h2 className="font-semibold px-5 pt-4 pb-2">Top products</h2>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-admin-line">
            {top.map((t) => (
              <tr key={`${t.productId}-${t.title}`}>
                <td className="px-5 py-2.5">{t.productId ? <Link href={`/admin/products/${t.productId}`} className="hover:underline">{t.title}</Link> : t.title}</td>
                <td className="px-2 py-2.5 text-admin-muted tabular-nums">{t.units} sold</td>
                <td className="px-5 py-2.5 text-right tabular-nums">{inr(t.revenue)}</td>
              </tr>
            ))}
            {!top.length && (
              <tr>
                <td className="px-5 py-6 text-admin-muted">No sales in this period.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function TodoLink({ href, n, label }: { href: string; n: number; label: string }) {
  return (
    <Link href={href} className={`flex items-center gap-3 rounded-lg px-2 py-1.5 -mx-2 hover:bg-admin-bg ${n ? "" : "text-admin-muted"}`}>
      <span className={`min-w-7 rounded-full px-2 py-0.5 text-center text-xs font-semibold tabular-nums ${n ? "bg-admin-yellow-bg text-admin-yellow" : "bg-admin-bg"}`}>{n}</span>
      {label}
    </Link>
  );
}

function Status({ title, ok, okText, offText, href }: { title: string; ok: boolean; okText: string; offText: string; href: string }) {
  return (
    <Link href={href} className="rounded-2xl bg-admin-card border border-admin-line p-4 flex items-start gap-3 hover:border-admin-accent">
      <span className={`mt-1.5 size-2.5 rounded-full shrink-0 ${ok ? "bg-admin-green" : "bg-admin-yellow"}`} />
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-sm text-admin-muted mt-0.5">{ok ? okText : offText}</span>
      </span>
    </Link>
  );
}
