import { and, asc, desc, eq, ilike, lte, ne, or, sql } from "drizzle-orm";
import Link from "next/link";
import { StockForm } from "@/components/admin/stock-form";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/auth";

export const metadata = { title: "Inventory" };
export const dynamic = "force-dynamic";

const { products: P, variants: V, inventoryAdjustments: A, staff: S } = schema;
const VIEWS = { all: "All", low: "Low (≤ 3)", out: "Sold out" } as const;

export default async function InventoryPage({ searchParams }: PageProps<"/admin/inventory">) {
  await requireStaff("products");
  const sp = await searchParams;
  const q = String(sp.q ?? "").trim();
  const view = (String(sp.view ?? "all") in VIEWS ? String(sp.view ?? "all") : "all") as keyof typeof VIEWS;

  const [rows, history] = await Promise.all([
    db
      .select({ id: V.id, size: V.option1, sku: V.sku, qty: V.inventoryQty, track: V.trackInventory, backorder: V.allowBackorder, productId: P.id, title: P.title, status: P.status })
      .from(V)
      .innerJoin(P, eq(V.productId, P.id))
      .where(
        and(
          ne(P.status, "archived"),
          view === "low" ? and(eq(V.trackInventory, true), lte(V.inventoryQty, 3)) : view === "out" ? and(eq(V.trackInventory, true), lte(V.inventoryQty, 0)) : undefined,
          q ? or(ilike(P.title, `%${q}%`), ilike(V.sku, `%${q}%`)) : undefined,
        ),
      )
      .orderBy(asc(P.title), asc(V.position)),
    db
      .select({ id: A.id, delta: A.delta, after: A.quantityAfter, reason: A.reason, orderId: A.orderId, at: A.createdAt, size: V.option1, title: P.title, by: S.name })
      .from(A)
      .innerJoin(V, eq(A.variantId, V.id))
      .innerJoin(P, eq(V.productId, P.id))
      .leftJoin(S, eq(A.staffId, S.id))
      .orderBy(desc(A.createdAt))
      .limit(40),
  ]);
  const totals = await db
    .select({ units: sql<number>`coalesce(sum(${V.inventoryQty}) filter (where ${V.trackInventory}), 0)::int`, value: sql<number>`coalesce(sum(${V.inventoryQty} * coalesce(${V.costPrice}, 0)) filter (where ${V.trackInventory} and ${V.inventoryQty} > 0), 0)::bigint` })
    .from(V)
    .innerJoin(P, eq(V.productId, P.id))
    .where(ne(P.status, "archived"));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Inventory</h1>
          <p className="text-sm text-admin-muted mt-1">
            {totals[0].units} pieces in stock{Number(totals[0].value) > 0 && ` · ₹${(Number(totals[0].value) / 100).toLocaleString("en-IN")} at cost`} · stock goes down automatically when an order is confirmed and back up when one is cancelled.
          </p>
        </div>
        <Link href="/admin/products/new" className="rounded-lg bg-admin-accent text-white px-4 py-2 text-sm font-medium">Add product</Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {Object.entries(VIEWS).map(([k, label]) => (
          <Link key={k} href={`/admin/inventory?view=${k}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className={`rounded-full px-3 py-1 text-sm ${k === view ? "bg-admin-accent text-white" : "bg-admin-card border border-admin-line hover:border-admin-accent"}`}>
            {label}
          </Link>
        ))}
        <form className="ml-auto flex gap-2">
          <input type="hidden" name="view" value={view} />
          <input name="q" defaultValue={q} placeholder="Product or SKU" className="w-56 rounded-lg border border-admin-line bg-white px-3 py-1.5 text-sm outline-none focus:border-admin-accent" />
          <button className="rounded-lg bg-admin-accent text-white px-3 py-1.5 text-sm">Search</button>
        </form>
      </div>

      <StockForm rows={rows} />

      <section className="rounded-2xl bg-admin-card border border-admin-line">
        <h2 className="font-semibold px-5 pt-4 pb-2">Recent stock changes</h2>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-admin-line">
            {history.map((h) => (
              <tr key={h.id}>
                <td className="px-5 py-2 text-admin-muted whitespace-nowrap">{h.at.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}</td>
                <td className="px-2 py-2">{h.title} · {h.size}</td>
                <td className={`px-2 py-2 tabular-nums ${h.delta < 0 ? "text-admin-red" : "text-admin-green"}`}>{h.delta > 0 ? `+${h.delta}` : h.delta}</td>
                <td className="px-2 py-2 tabular-nums text-admin-muted">→ {h.after}</td>
                <td className="px-5 py-2 text-admin-muted capitalize">
                  {h.reason}
                  {h.orderId && (
                    <>
                      {" · "}
                      <Link href={`/admin/orders/${h.orderId}`} className="underline">order</Link>
                    </>
                  )}
                  {h.by && ` · ${h.by}`}
                </td>
              </tr>
            ))}
            {!history.length && (
              <tr>
                <td className="px-5 py-6 text-admin-muted">No stock changes yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
