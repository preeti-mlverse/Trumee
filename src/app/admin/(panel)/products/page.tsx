import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import Image from "next/image";
import Link from "next/link";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/auth";
import { inr } from "@/lib/utils";

export const metadata = { title: "Products" };
export const dynamic = "force-dynamic";

const { products: P, variants: V, productImages: I } = schema;
const STATUS = ["all", "active", "draft", "archived"] as const;

export default async function ProductsPage({ searchParams }: PageProps<"/admin/products">) {
  await requireStaff("products");
  const sp = await searchParams;
  const q = String(sp.q ?? "").trim();
  const status = (STATUS as readonly string[]).includes(String(sp.status)) ? String(sp.status) : "all";

  const rows = await db
    .select({
      id: P.id,
      title: P.title,
      handle: P.handle,
      status: P.status,
      type: P.productType,
      updatedAt: P.updatedAt,
      stock: sql<number>`coalesce((select sum(${V.inventoryQty}) from ${V} where ${V.productId} = ${P.id} and ${V.trackInventory}), 0)::int`,
      sizes: sql<number>`(select count(*) from ${V} where ${V.productId} = ${P.id})::int`,
      soldOut: sql<number>`(select count(*) from ${V} where ${V.productId} = ${P.id} and ${V.trackInventory} and not ${V.allowBackorder} and ${V.inventoryQty} <= 0)::int`,
      minPrice: sql<number>`(select min(${V.price}) from ${V} where ${V.productId} = ${P.id})::int`,
      image: sql<string | null>`(select ${I.url} from ${I} where ${I.productId} = ${P.id} order by ${I.position} limit 1)`,
    })
    .from(P)
    .where(
      and(
        status === "all" ? undefined : eq(P.status, status as "active" | "draft" | "archived"),
        q ? or(ilike(P.title, `%${q}%`), ilike(P.handle, `%${q}%`), sql`exists (select 1 from ${V} where ${V.productId} = ${P.id} and ${V.sku} ilike ${`%${q}%`})`) : undefined,
      ),
    )
    .orderBy(asc(sql`case ${P.status} when 'active' then 0 when 'draft' then 1 else 2 end`), desc(P.updatedAt));

  const pill = (s: string) =>
    ({ active: "bg-admin-green-bg text-admin-green", draft: "bg-admin-yellow-bg text-admin-yellow", archived: "bg-admin-bg text-admin-muted" })[s] ?? "";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold">Products <span className="text-admin-muted text-base font-normal">({rows.length})</span></h1>
        <div className="flex gap-2">
          <Link href="/admin/inventory" className="rounded-lg border border-admin-line bg-white px-4 py-2 text-sm font-medium">Inventory</Link>
          <Link href="/admin/products/new" className="rounded-lg bg-admin-accent text-white px-4 py-2 text-sm font-medium">Add product</Link>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {STATUS.map((s) => (
          <Link
            key={s}
            href={`/admin/products?status=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`rounded-full px-3 py-1 text-sm capitalize ${s === status ? "bg-admin-accent text-white" : "bg-admin-card border border-admin-line hover:border-admin-accent"}`}
          >
            {s}
          </Link>
        ))}
        <form className="ml-auto flex gap-2">
          <input type="hidden" name="status" value={status} />
          <input name="q" defaultValue={q} placeholder="Title, handle or SKU" className="w-56 rounded-lg border border-admin-line bg-white px-3 py-1.5 text-sm outline-none focus:border-admin-accent" />
          <button className="rounded-lg bg-admin-accent text-white px-3 py-1.5 text-sm">Search</button>
        </form>
      </div>
      <div className="rounded-2xl bg-admin-card border border-admin-line overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-admin-muted border-b border-admin-line">
            <tr>
              {["", "Product", "Status", "Stock", "Category", "Price"].map((h) => (
                <th key={h} className="px-4 py-3 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-admin-line">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-admin-bg/50">
                <td className="pl-4 py-2 w-14">
                  <span className="relative block size-11 overflow-hidden rounded-lg bg-admin-bg">{r.image && <Image src={r.image} alt="" fill sizes="44px" className="object-cover" />}</span>
                </td>
                <td className="px-4 py-2">
                  <Link href={`/admin/products/${r.id}`} className="font-medium hover:underline">{r.title}</Link>
                  <span className="block text-xs text-admin-muted">{r.sizes} size{r.sizes === 1 ? "" : "s"}</span>
                </td>
                <td className="px-4 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${pill(r.status)}`}>{r.status}</span></td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <span className={r.stock <= 0 ? "text-admin-red" : r.stock < 5 ? "text-admin-yellow" : ""}>{r.stock} in stock</span>
                  {r.soldOut > 0 && <span className="block text-xs text-admin-red">{r.soldOut} size{r.soldOut > 1 ? "s" : ""} sold out</span>}
                </td>
                <td className="px-4 py-2 text-admin-muted">{r.type || "—"}</td>
                <td className="px-4 py-2 tabular-nums">{r.minPrice ? inr(r.minPrice) : "—"}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-admin-muted">No products match.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
