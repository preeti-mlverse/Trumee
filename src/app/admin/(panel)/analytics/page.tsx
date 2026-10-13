import { and, desc, eq, gte, sql } from "drizzle-orm";
import Link from "next/link";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/auth";
import { inr } from "@/lib/utils";

export const metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

const { analyticsEvents: E, analyticsSessions: S, products: P } = schema;
const RANGES = { today: "Today", "7d": "Last 7 days", "30d": "Last 30 days" } as const;
type Range = keyof typeof RANGES;
const count = sql<number>`count(*)::int`;
const sessionsWith = sql<number>`count(distinct ${E.sessionId})::int`;
const when = (d: Date) => d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", second: "2-digit", timeZone: "Asia/Kolkata" });

const FUNNEL = [
  ["view_item", "Viewed a product"],
  ["add_to_cart", "Added to bag"],
  ["begin_checkout", "Started checkout"],
  ["add_shipping_info", "Entered address"],
  ["purchase", "Ordered"],
] as const;

/** First-party event tracking: what shoppers do on the site (every visitor, cookies or not). */
export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireStaff("analytics");
  const sp = await searchParams;
  const range = (String(sp.range ?? "7d") in RANGES ? String(sp.range ?? "7d") : "7d") as Range;
  const event = typeof sp.event === "string" ? sp.event : "";
  const start = new Date();
  if (range === "today") start.setTime(new Date(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) + "T00:00:00+05:30").getTime());
  else start.setDate(start.getDate() - (range === "7d" ? 7 : 30));

  const [[totals], byEvent, byChannel, topProducts, recent] = await Promise.all([
    db
      .select({ sessions: count, visitors: sql<number>`count(distinct ${S.visitorId})::int`, pageviews: sql<number>`coalesce(sum(${S.pageviews}),0)::int`, engaged: sql<number>`count(*) filter (where ${S.engaged})::int`, revenue: sql<number>`coalesce(sum(${S.revenue}),0)::int` })
      .from(S)
      .where(gte(S.startedAt, start)),
    db.select({ name: E.name, events: count, sessions: sessionsWith }).from(E).where(gte(E.ts, start)).groupBy(E.name).orderBy(desc(count)),
    db
      .select({ channel: S.channel, sessions: count, orders: sql<number>`count(*) filter (where ${S.converted})::int` })
      .from(S)
      .where(gte(S.startedAt, start))
      .groupBy(S.channel)
      .orderBy(desc(count)),
    db
      .select({
        id: E.productId,
        title: sql<string>`max(${P.title})`,
        views: sql<number>`count(*) filter (where ${E.name} = 'view_item')::int`,
        adds: sql<number>`count(*) filter (where ${E.name} = 'add_to_cart')::int`,
      })
      .from(E)
      .innerJoin(P, eq(P.id, E.productId))
      .where(and(gte(E.ts, start), sql`${E.name} in ('view_item','add_to_cart')`))
      .groupBy(E.productId)
      .orderBy(desc(sql`count(*) filter (where ${E.name} = 'view_item')`))
      .limit(15),
    db
      .select({ id: E.id, name: E.name, path: E.path, value: E.value, ts: E.ts, sessionId: E.sessionId, channel: S.channel, device: S.deviceType, city: S.city })
      .from(E)
      .leftJoin(S, eq(S.id, E.sessionId))
      .where(event ? eq(E.name, event) : undefined)
      .orderBy(desc(E.id))
      .limit(100),
  ]);

  const reached = new Map(byEvent.map((e) => [e.name, e.sessions]));
  const pct = (n: number, d: number) => (d ? `${((n / d) * 100).toFixed(1)}%` : "—");
  const card = "rounded-2xl bg-admin-card border border-admin-line";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="text-sm text-admin-muted mt-1">Every visit and action on the store, recorded on our own server — no cookies needed, so it counts everyone (GA4 / Meta only see shoppers who accept cookies).</p>
        </div>
        <div className="flex gap-2">
          {(Object.keys(RANGES) as Range[]).map((r) => (
            <Link key={r} href={`/admin/analytics?range=${r}`} className={`rounded-full px-3 py-1 text-sm ${r === range ? "bg-admin-accent text-white" : "bg-admin-card border border-admin-line hover:border-admin-accent"}`}>
              {RANGES[r]}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          ["Sessions", totals.sessions],
          ["Visitors", totals.visitors],
          ["Page views", totals.pageviews],
          ["Engaged sessions", `${totals.engaged} (${pct(totals.engaged, totals.sessions)})`],
          ["Revenue", inr(totals.revenue)],
        ].map(([k, v]) => (
          <div key={k} className={`${card} p-4`}>
            <p className="text-xs text-admin-muted">{k}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{v}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className={`${card} p-5`}>
          <h2 className="font-semibold">Shopping funnel</h2>
          <p className="text-xs text-admin-muted">Sessions that reached each step</p>
          <ul className="mt-4 space-y-3">
            {[["", "All sessions", totals.sessions] as const, ...FUNNEL.map(([k, l]) => [k, l, reached.get(k) ?? 0] as const)].map(([k, label, n]) => (
              <li key={label}>
                <div className="flex justify-between text-sm">
                  <span>{label}</span>
                  <span className="tabular-nums">
                    {n} <span className="text-admin-muted">· {pct(n, totals.sessions)}</span>
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-admin-bg overflow-hidden">
                  <div className="h-full bg-admin-accent" style={{ width: totals.sessions ? `${Math.max(1, (n / totals.sessions) * 100)}%` : 0 }} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className={`${card} p-5`}>
          <h2 className="font-semibold">Where visitors come from</h2>
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs text-admin-muted">
              <tr>
                <th className="py-1.5 font-normal">Channel</th>
                <th className="py-1.5 font-normal text-right">Sessions</th>
                <th className="py-1.5 font-normal text-right">Orders</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-line">
              {byChannel.map((c) => (
                <tr key={c.channel}>
                  <td className="py-2">{c.channel}</td>
                  <td className="py-2 text-right tabular-nums">{c.sessions}</td>
                  <td className="py-2 text-right tabular-nums">{c.orders}</td>
                </tr>
              ))}
              {!byChannel.length && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-admin-muted">No visits yet in this period.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className={`${card} p-5`}>
          <h2 className="font-semibold">Events</h2>
          <p className="text-xs text-admin-muted">Click one to see it in the live feed below</p>
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs text-admin-muted">
              <tr>
                <th className="py-1.5 font-normal">Event</th>
                <th className="py-1.5 font-normal text-right">Count</th>
                <th className="py-1.5 font-normal text-right">Sessions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-line">
              {byEvent.map((e) => (
                <tr key={e.name}>
                  <td className="py-2">
                    <Link href={`/admin/analytics?range=${range}&event=${e.name}#feed`} className="font-mono text-xs hover:underline">{e.name}</Link>
                  </td>
                  <td className="py-2 text-right tabular-nums">{e.events}</td>
                  <td className="py-2 text-right tabular-nums">{e.sessions}</td>
                </tr>
              ))}
              {!byEvent.length && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-admin-muted">No events yet in this period.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className={`${card} p-5`}>
          <h2 className="font-semibold">Most viewed products</h2>
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs text-admin-muted">
              <tr>
                <th className="py-1.5 font-normal">Product</th>
                <th className="py-1.5 font-normal text-right">Views</th>
                <th className="py-1.5 font-normal text-right">Added to bag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-line">
              {topProducts.map((p) => (
                <tr key={p.id}>
                  <td className="py-2 pr-2">
                    <Link href={`/admin/products/${p.id}`} className="hover:underline line-clamp-1">{p.title}</Link>
                  </td>
                  <td className="py-2 text-right tabular-nums">{p.views}</td>
                  <td className="py-2 text-right tabular-nums">{p.adds} <span className="text-admin-muted text-xs">{pct(p.adds, p.views)}</span></td>
                </tr>
              ))}
              {!topProducts.length && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-admin-muted">No product views yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>

      <section id="feed" className={`${card} overflow-x-auto`}>
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-5">
          <h2 className="font-semibold">Live feed {event && <span className="font-mono text-sm text-admin-muted">· {event}</span>}</h2>
          <div className="flex gap-3 text-sm">
            {event && <Link href={`/admin/analytics?range=${range}#feed`} className="underline">Show all events</Link>}
            <Link href={`/admin/analytics?range=${range}${event ? `&event=${event}` : ""}#feed`} className="underline">Refresh</Link>
          </div>
        </div>
        <table className="mt-3 w-full text-sm min-w-[720px]">
          <thead className="text-left text-xs text-admin-muted border-b border-admin-line">
            <tr>
              <th className="px-5 py-2 font-normal">Time (IST)</th>
              <th className="px-2 py-2 font-normal">Event</th>
              <th className="px-2 py-2 font-normal">Page</th>
              <th className="px-2 py-2 font-normal">Value</th>
              <th className="px-2 py-2 font-normal">Visitor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-admin-line">
            {recent.map((e) => (
              <tr key={e.id}>
                <td className="px-5 py-2 whitespace-nowrap text-admin-muted">{when(e.ts)}</td>
                <td className="px-2 py-2 font-mono text-xs">{e.name}</td>
                <td className="px-2 py-2 max-w-72 truncate">{e.path}</td>
                <td className="px-2 py-2 tabular-nums">{e.value ? inr(e.value) : ""}</td>
                <td className="px-2 py-2 text-admin-muted whitespace-nowrap">{[e.channel, e.device, e.city].filter(Boolean).join(" · ")} <span className="font-mono text-[10px]">{e.sessionId.slice(0, 6)}</span></td>
              </tr>
            ))}
            {!recent.length && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-admin-muted">No events recorded yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
