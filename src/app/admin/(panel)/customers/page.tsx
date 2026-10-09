import { desc, ilike, or, sql } from "drizzle-orm";
import Link from "next/link";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/auth";
import { formatDate, inr } from "@/lib/utils";

export const metadata = { title: "Customers" };
export const dynamic = "force-dynamic";

const { customers: C, orders: O, subscribers: S } = schema;

export default async function CustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  await requireStaff("customers");
  const q = String((await searchParams).q ?? "").trim();
  const [rows, [subs]] = await Promise.all([
    db
      .select({
        id: C.id,
        email: C.email,
        phone: C.phone,
        name: sql<string>`trim(coalesce(${C.firstName}, '') || ' ' || coalesce(${C.lastName}, ''))`,
        marketing: C.acceptsMarketing,
        createdAt: C.createdAt,
        orders: sql<number>`(select count(*) from ${O} where ${O.customerId} = ${C.id} and ${O.status} <> 'cancelled')::int`,
        spent: sql<number>`(select coalesce(sum(${O.total} - ${O.refundedTotal}), 0) from ${O} where ${O.customerId} = ${C.id} and ${O.status} <> 'cancelled' and ${O.financialStatus} in ('paid','partially_refunded'))::int`,
        lastOrder: sql<Date | null>`(select max(${O.createdAt}) from ${O} where ${O.customerId} = ${C.id})`,
      })
      .from(C)
      .where(q ? or(ilike(C.email, `%${q}%`), ilike(C.phone, `%${q}%`), ilike(C.firstName, `%${q}%`), ilike(C.lastName, `%${q}%`)) : undefined)
      .orderBy(desc(C.createdAt))
      .limit(300),
    db.select({ n: sql<number>`count(*)::int` }).from(S),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Customers <span className="text-admin-muted text-base font-normal">({rows.length})</span></h1>
          <p className="text-sm text-admin-muted mt-1">Shoppers with an account. Guest orders appear under Orders. {subs.n} newsletter subscriber{subs.n === 1 ? "" : "s"}.</p>
        </div>
        <form className="flex gap-2">
          <input name="q" defaultValue={q} placeholder="Name, email or phone" className="w-56 rounded-lg border border-admin-line bg-white px-3 py-1.5 text-sm outline-none focus:border-admin-accent" />
          <button className="rounded-lg bg-admin-accent text-white px-3 py-1.5 text-sm">Search</button>
        </form>
      </div>
      <div className="rounded-2xl bg-admin-card border border-admin-line overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-admin-muted border-b border-admin-line">
            <tr>
              {["Customer", "Orders", "Spent", "Last order", "Joined", "Email offers"].map((h) => (
                <th key={h} className="px-4 py-3 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-admin-line">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-admin-bg/50">
                <td className="px-4 py-2.5">
                  <Link href={`/admin/customers/${r.id}`} className="font-medium hover:underline">{r.name || r.email}</Link>
                  <span className="block text-xs text-admin-muted">{r.email}{r.phone && ` · ${r.phone}`}</span>
                </td>
                <td className="px-4 py-2.5 tabular-nums">{r.orders}</td>
                <td className="px-4 py-2.5 tabular-nums">{inr(r.spent)}</td>
                <td className="px-4 py-2.5 text-admin-muted">{r.lastOrder ? formatDate(r.lastOrder) : "—"}</td>
                <td className="px-4 py-2.5 text-admin-muted">{formatDate(r.createdAt)}</td>
                <td className="px-4 py-2.5">{r.marketing ? "Subscribed" : "—"}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-admin-muted">No customers {q ? "match" : "yet"}.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
