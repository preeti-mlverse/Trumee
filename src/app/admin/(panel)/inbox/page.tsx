import { desc, inArray, ne, sql } from "drizzle-orm";
import Link from "next/link";
import { MessageStatus } from "@/components/admin/message-status";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/auth";

export const metadata = { title: "Inbox" };
export const dynamic = "force-dynamic";

const TABS = { messages: "Contact messages", returns: "Return & exchange requests", subscribers: "Newsletter sign-ups", searches: "What shoppers search" } as const;
type Tab = keyof typeof TABS;
const when = (d: Date) => d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
const count = sql<number>`count(*)::int`;

/** Everything shoppers send in: contact form, returns, newsletter and on-site searches. */
export default async function InboxPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireStaff("customers");
  const sp = await searchParams;
  const tab = (String(sp.tab ?? "messages") in TABS ? String(sp.tab ?? "messages") : "messages") as Tab;
  const { contactMessages: M, returnRequests: R, subscribers: S, searchQueries: Q } = schema;

  const [[newMsgs], [openReturns], [subs], messages, returns, subscribers, searches] = await Promise.all([
    db.select({ n: count }).from(M).where(sql`${M.status} = 'new'`),
    db.select({ n: count }).from(R).where(inArray(R.status, ["requested", "approved"])),
    db.select({ n: count }).from(S).where(ne(S.unsubscribed, true)),
    tab === "messages" ? db.select().from(M).orderBy(desc(M.createdAt)).limit(200) : Promise.resolve([]),
    tab === "returns" ? db.query.returnRequests.findMany({ orderBy: desc(R.createdAt), limit: 200, with: { order: { columns: { id: true, number: true, email: true } } } }) : Promise.resolve([]),
    tab === "subscribers" ? db.select().from(S).orderBy(desc(S.createdAt)).limit(500) : Promise.resolve([]),
    tab === "searches"
      ? db
          .select({ query: Q.query, times: count, results: sql<number>`min(${Q.results})::int`, last: sql<string>`max(${Q.ts})` })
          .from(Q)
          .groupBy(Q.query)
          .orderBy(desc(count))
          .limit(200)
      : Promise.resolve([]),
  ]);
  const badge: Partial<Record<Tab, number>> = { messages: newMsgs.n, returns: openReturns.n, subscribers: subs.n };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Inbox</h1>
        <p className="text-sm text-admin-muted mt-1">Everything shoppers send in from the website.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(TABS) as Tab[]).map((k) => (
          <Link key={k} href={`/admin/inbox?tab=${k}`} className={`rounded-full px-3 py-1 text-sm ${k === tab ? "bg-admin-accent text-white" : "bg-admin-card border border-admin-line hover:border-admin-accent"}`}>
            {TABS[k]}
            {badge[k] ? <span className="ml-1.5 tabular-nums opacity-70">{badge[k]}</span> : null}
          </Link>
        ))}
      </div>

      <div className="rounded-2xl bg-admin-card border border-admin-line overflow-x-auto">
        {tab === "messages" && (
          <ul className="divide-y divide-admin-line">
            {messages.map((m) => (
              <li key={m.id} className={`px-5 py-4 ${m.status === "new" ? "bg-admin-blue-bg/30" : ""}`}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="font-medium">{m.name}</span>
                  <a href={`mailto:${m.email}?subject=${encodeURIComponent("Re: your message to Trumee")}`} className="underline text-admin-muted">
                    {m.email}
                  </a>
                  {m.phone && (
                    <a href={`tel:${m.phone}`} className="text-admin-muted">
                      {m.phone}
                    </a>
                  )}
                  <span className="text-xs text-admin-muted">{when(m.createdAt)}</span>
                  <span className={`text-xs rounded-full px-2 py-0.5 ${m.status === "new" ? "bg-admin-blue-bg text-admin-blue" : m.status === "replied" ? "bg-admin-green-bg text-admin-green" : "bg-admin-bg text-admin-muted"}`}>{m.status}</span>
                  <span className="ml-auto">
                    <MessageStatus id={m.id} status={m.status as "new" | "read" | "replied"} />
                  </span>
                </div>
                <p className="mt-2 text-sm whitespace-pre-wrap">{m.message}</p>
              </li>
            ))}
            {!messages.length && <li className="px-5 py-10 text-center text-admin-muted">No contact messages yet. They arrive from the Contact us page.</li>}
          </ul>
        )}

        {tab === "returns" && (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-admin-muted border-b border-admin-line">
              <tr>
                {["Requested", "Order", "Type", "Reason", "Status"].map((h) => (
                  <th key={h} className="px-5 py-2.5 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-line">
              {returns.map((r) => (
                <tr key={r.id}>
                  <td className="px-5 py-2.5 text-admin-muted whitespace-nowrap">{when(r.createdAt)}</td>
                  <td className="px-5 py-2.5">
                    <Link href={`/admin/orders/${r.order.id}`} className="underline">#{r.order.number}</Link> <span className="text-admin-muted">{r.order.email}</span>
                  </td>
                  <td className="px-5 py-2.5 capitalize">{r.kind}</td>
                  <td className="px-5 py-2.5">{r.reason}</td>
                  <td className="px-5 py-2.5 capitalize">{r.status}</td>
                </tr>
              ))}
              {!returns.length && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-admin-muted">No return or exchange requests yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {tab === "subscribers" && (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-admin-muted border-b border-admin-line">
              <tr>
                {["Email", "Signed up", "From", "Status"].map((h) => (
                  <th key={h} className="px-5 py-2.5 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-line">
              {subscribers.map((s) => (
                <tr key={s.id}>
                  <td className="px-5 py-2.5">{s.email}</td>
                  <td className="px-5 py-2.5 text-admin-muted whitespace-nowrap">{when(s.createdAt)}</td>
                  <td className="px-5 py-2.5 capitalize">{s.source}</td>
                  <td className="px-5 py-2.5">{s.unsubscribed ? "Unsubscribed" : "Subscribed"}</td>
                </tr>
              ))}
              {!subscribers.length && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-admin-muted">No newsletter sign-ups yet (footer “Join the list”).</td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {tab === "searches" && (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-admin-muted border-b border-admin-line">
              <tr>
                {["Search", "Times", "Results", "Last searched"].map((h) => (
                  <th key={h} className="px-5 py-2.5 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-line">
              {searches.map((s) => (
                <tr key={s.query}>
                  <td className="px-5 py-2.5">
                    <Link href={`/search?q=${encodeURIComponent(s.query)}`} target="_blank" className="underline">{s.query}</Link>
                  </td>
                  <td className="px-5 py-2.5 tabular-nums">{s.times}</td>
                  <td className={`px-5 py-2.5 tabular-nums ${s.results === 0 ? "text-admin-red font-medium" : ""}`}>{s.results === 0 ? "0 — nothing found" : s.results}</td>
                  <td className="px-5 py-2.5 text-admin-muted whitespace-nowrap">{when(new Date(s.last))}</td>
                </tr>
              ))}
              {!searches.length && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-admin-muted">No searches yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
