"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { updateStock, type CatalogResult } from "@/app/actions/catalog";

type Row = { id: number; size: string | null; sku: string | null; qty: number; track: boolean; backorder: boolean; productId: number; title: string; status: string };

/** Editable stock table: only changed rows are submitted; each change is logged with a reason. */
export function StockForm({ rows }: { rows: Row[] }) {
  const [state, action, pending] = useActionState<CatalogResult, FormData>(updateStock, {});
  const [edits, setEdits] = useState<Record<number, number>>({});
  const changed = Object.keys(edits).length;
  // Saved numbers are now the real stock — clear the "changed" markers
  useEffect(() => {
    if (state.ok) setEdits({});
  }, [state.ok, state.at]);

  return (
    <form action={action} className="rounded-2xl bg-admin-card border border-admin-line">
      <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-admin-line">
        <span className="text-sm text-admin-muted">{changed ? `${changed} change${changed > 1 ? "s" : ""}` : "Type new stock numbers, then save"}</span>
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
        {state.ok && !pending && <span className="w-full text-sm text-admin-green">{state.ok}</span>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-admin-muted border-b border-admin-line">
            <tr>
              {["Product", "Size", "SKU", "Available", "Set to"].map((h) => (
                <th key={h} className="px-5 py-2.5 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-admin-line">
            {rows.map((r) => (
              <tr key={r.id} className={edits[r.id] != null ? "bg-admin-yellow-bg/30" : ""}>
                <td className="px-5 py-2">
                  <Link href={`/admin/products/${r.productId}`} className="hover:underline">{r.title}</Link>
                  {r.status === "draft" && <span className="ml-2 text-xs text-admin-yellow">draft</span>}
                </td>
                <td className="px-5 py-2">{r.size}</td>
                <td className="px-5 py-2 text-admin-muted">{r.sku || "—"}</td>
                <td className={`px-5 py-2 tabular-nums ${!r.track ? "text-admin-muted" : r.qty <= 0 ? "text-admin-red font-medium" : r.qty <= 3 ? "text-admin-yellow font-medium" : ""}`}>
                  {r.track ? r.qty : "Not tracked"}
                  {r.track && r.qty <= 0 && (r.backorder ? " · selling anyway" : " · sold out")}
                </td>
                <td className="px-5 py-1.5">
                  {r.track && (
                    <input
                      type="number"
                      step="1"
                      name={edits[r.id] != null ? `q_${r.id}` : undefined}
                      defaultValue={r.qty}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setEdits((x) => {
                          const n = { ...x };
                          if (e.target.value === "" || v === r.qty) delete n[r.id];
                          else n[r.id] = v;
                          return n;
                        });
                      }}
                      className="w-20 rounded-lg border border-admin-line bg-white px-2 py-1 text-sm outline-none focus:border-admin-accent"
                      aria-label={`New stock for ${r.title} ${r.size}`}
                    />
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-admin-muted">Nothing here.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </form>
  );
}
