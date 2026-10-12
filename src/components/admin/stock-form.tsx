"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { updateStock, type CatalogResult } from "@/app/actions/catalog";

type Row = { id: number; size: string | null; sku: string | null; qty: number; track: boolean; backorder: boolean; productId: number; title: string; status: string; image: string | null };

const ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL", "FREE SIZE", "ONE SIZE"];
const rank = (s: string) => {
  const i = ORDER.indexOf(s.toUpperCase());
  return i === -1 ? 50 : i;
};

/**
 * Stock grid: one row per product, one column per size. Each cell is that size's SKU; type the new
 * count and save — every change is logged with a reason and shows on the store immediately.
 */
export function StockForm({ rows }: { rows: Row[] }) {
  const [state, action, pending] = useActionState<CatalogResult, FormData>(updateStock, {});
  const [edits, setEdits] = useState<Record<number, number>>({});
  const changed = Object.keys(edits).length;
  useEffect(() => {
    if (state.ok) setEdits({});
  }, [state.ok, state.at]);

  const { sizes, products } = useMemo(() => {
    const sizes = [...new Set(rows.map((r) => r.size ?? "—"))].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
    const map = new Map<number, { id: number; title: string; status: string; image: string | null; cells: Record<string, Row> }>();
    for (const r of rows) {
      const p = map.get(r.productId) ?? { id: r.productId, title: r.title, status: r.status, image: r.image, cells: {} };
      p.cells[r.size ?? "—"] = r;
      map.set(r.productId, p);
    }
    return { sizes, products: [...map.values()] };
  }, [rows]);

  const set = (r: Row, raw: string) =>
    setEdits((x) => {
      const n = { ...x };
      const v = Number(raw);
      if (raw === "" || !Number.isFinite(v) || v === r.qty) delete n[r.id];
      else n[r.id] = Math.trunc(v);
      return n;
    });

  return (
    <form action={action} className="rounded-2xl bg-admin-card border border-admin-line">
      <div className="sticky top-14 z-10 flex flex-wrap items-center gap-3 px-5 py-3 border-b border-admin-line bg-admin-card rounded-t-2xl">
        <span className="text-sm text-admin-muted">{changed ? `${changed} size${changed > 1 ? "s" : ""} changed` : "Type the new count in any size, then save"}</span>
        <select name="reason" defaultValue="restock" className="ml-auto rounded-lg border border-admin-line bg-white px-3 py-1.5 text-sm">
          <option value="restock">Reason: new stock arrived</option>
          <option value="correction">Reason: stock count correction</option>
          <option value="return">Reason: customer return</option>
          <option value="damage">Reason: damaged / lost</option>
        </select>
        <button disabled={pending || !changed} className="rounded-lg bg-admin-accent text-white px-4 py-1.5 text-sm font-medium disabled:opacity-50">
          {pending ? "Saving…" : "Save stock"}
        </button>
        {state.error && <span className="w-full text-sm text-admin-red">{state.error}</span>}
        {state.ok && !pending && <span className="w-full text-sm text-admin-green">{state.ok} The store shows the new stock now.</span>}
      </div>
      {Object.entries(edits).map(([id, q]) => (
        <input key={id} type="hidden" name={`q_${id}`} value={q} />
      ))}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-admin-muted border-b border-admin-line">
            <tr>
              <th className="px-5 py-2.5 font-medium">Product</th>
              {sizes.map((s) => (
                <th key={s} className="px-2 py-2.5 font-medium text-center whitespace-nowrap">{s}</th>
              ))}
              <th className="px-5 py-2.5 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-admin-line">
            {products.map((p) => {
              const cells = Object.values(p.cells);
              const total = cells.reduce((n, r) => n + (r.track ? (edits[r.id] ?? r.qty) : 0), 0);
              return (
                <tr key={p.id} className="align-top">
                  <td className="px-5 py-2.5 min-w-72">
                    <Link href={`/admin/products/${p.id}`} className="group flex items-center gap-3">
                      <span className="relative w-12 h-16 shrink-0 rounded-md overflow-hidden bg-admin-bg border border-admin-line">
                        {p.image ? <Image src={p.image} alt="" fill sizes="48px" className="object-cover object-top" /> : <span className="grid size-full place-items-center text-[10px] text-admin-muted">No photo</span>}
                      </span>
                      <span>
                        <span className="group-hover:underline">{p.title}</span>
                        {p.status === "draft" && <span className="ml-2 text-xs text-admin-yellow">draft</span>}
                      </span>
                    </Link>
                  </td>
                  {sizes.map((s) => {
                    const r = p.cells[s];
                    if (!r) return <td key={s} className="px-2 py-2.5 text-center text-admin-line">·</td>;
                    const val = edits[r.id] ?? r.qty;
                    const tone = !r.track ? "" : val <= 0 ? (r.backorder ? "border-admin-yellow" : "border-admin-red bg-admin-red-bg/40") : val <= 3 ? "border-admin-yellow bg-admin-yellow-bg/40" : "";
                    return (
                      <td key={s} className="px-1.5 py-1.5 text-center">
                        {r.track ? (
                          <input
                            type="number"
                            step="1"
                            defaultValue={r.qty}
                            onChange={(e) => set(r, e.target.value)}
                            className={`w-16 rounded-lg border border-admin-line bg-white px-2 py-1 text-center text-sm tabular-nums outline-none focus:border-admin-accent ${tone} ${edits[r.id] != null ? "ring-2 ring-admin-accent/30" : ""}`}
                            aria-label={`Stock for ${p.title}, size ${s}${r.sku ? `, SKU ${r.sku}` : ""}`}
                          />
                        ) : (
                          <span className="text-xs text-admin-muted">not tracked</span>
                        )}
                        <span className="block text-[10px] text-admin-muted mt-0.5 truncate max-w-20 mx-auto" title={r.sku ?? ""}>{r.sku || "no SKU"}</span>
                      </td>
                    );
                  })}
                  <td className="px-5 py-2.5 text-right tabular-nums font-medium">{total}</td>
                </tr>
              );
            })}
            {!products.length && (
              <tr>
                <td colSpan={sizes.length + 2} className="px-5 py-10 text-center text-admin-muted">Nothing here.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="px-5 py-3 text-xs text-admin-muted border-t border-admin-line">Red = sold out · yellow = 3 or fewer left (shoppers see “only a few left”) · SKUs are edited on the product page.</p>
    </form>
  );
}
