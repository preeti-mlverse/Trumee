"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { SORTS } from "@/lib/sorts";
import { cn } from "@/lib/utils";

const PRICES = [
  { label: "Under ₹800", min: "", max: "800" },
  { label: "₹800 – ₹1,200", min: "800", max: "1200" },
  { label: "₹1,200 – ₹1,600", min: "1200", max: "1600" },
  { label: "Over ₹1,600", min: "1600", max: "" },
];

type Opt = { value: string; label: string };
export function Filters({ facets, total }: { facets: { sizes: string[]; types: string[]; fabrics: string[]; occasions: Opt[]; details: Opt[] }; total: number }) {
  const { sizes, types } = facets;
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const selectedSizes = sp.get("size")?.split(",").filter(Boolean) ?? [];
  const selectedTypes = sp.get("type")?.split(",").filter(Boolean) ?? [];
  const list = (k: string) => sp.get(k)?.split(",").filter(Boolean) ?? [];
  const price = `${sp.get("min") ?? ""}-${sp.get("max") ?? ""}`;
  const activeCount =
    selectedSizes.length + selectedTypes.length + list("fabric").length + list("occasion").length + list("detail").length + (price !== "-" ? 1 : 0) + (sp.get("instock") ? 1 : 0);

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) v ? next.set(k, v) : next.delete(k);
    next.delete("page");
    start(() => router.push(`${pathname}?${next.toString()}`, { scroll: false }));
  };
  const toggleList = (key: string, list: string[], v: string) =>
    set({ [key]: (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]).join(",") || null });

  const panel = (
    <div className="space-y-8">
      {sizes.length > 0 && (
        <Group title="Size">
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => (
              <button
                key={s}
                onClick={() => toggleList("size", selectedSizes, s)}
                className={cn("min-w-11 h-10 px-3 border text-sm", selectedSizes.includes(s) ? "bg-ink text-cream border-ink" : "border-line hover:border-ink")}
              >
                {s}
              </button>
            ))}
          </div>
        </Group>
      )}
      {types.length > 1 && (
        <Group title="Category">
          {types.map((t) => (
            <Check key={t} label={t} checked={selectedTypes.includes(t)} onChange={() => toggleList("type", selectedTypes, t)} />
          ))}
        </Group>
      )}
      {facets.fabrics.length > 1 && (
        <Group title="Fabric">
          {facets.fabrics.map((f) => (
            <Check key={f} label={f} checked={list("fabric").includes(f)} onChange={() => toggleList("fabric", list("fabric"), f)} />
          ))}
        </Group>
      )}
      {facets.occasions.length > 0 && (
        <Group title="Occasion">
          {facets.occasions.map((o) => (
            <Check key={o.value} label={o.label} checked={list("occasion").includes(o.value)} onChange={() => toggleList("occasion", list("occasion"), o.value)} />
          ))}
        </Group>
      )}
      {facets.details.length > 0 && (
        <Group title="Detail">
          {facets.details.map((o) => (
            <Check key={o.value} label={o.label} checked={list("detail").includes(o.value)} onChange={() => toggleList("detail", list("detail"), o.value)} />
          ))}
        </Group>
      )}
      <Group title="Price">
        {PRICES.map((p) => {
          const key = `${p.min}-${p.max}`;
          return <Check key={key} label={p.label} checked={price === key} onChange={() => set(price === key ? { min: null, max: null } : { min: p.min || null, max: p.max || null })} />;
        })}
      </Group>
      <Group title="Availability">
        <Check label="In stock only" checked={!!sp.get("instock")} onChange={() => set({ instock: sp.get("instock") ? null : "1" })} />
      </Group>
      {activeCount > 0 && (
        <button onClick={() => start(() => router.push(pathname + (sp.get("sort") ? `?sort=${sp.get("sort")}` : ""), { scroll: false }))} className="text-xs underline underline-offset-4">
          Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <>
      <div className="flex items-center justify-between gap-4 border-y border-line py-3 mb-8 sticky top-16 lg:top-[72px] z-20 bg-cream">
        <button onClick={() => setOpen(true)} className="flex items-center gap-2 py-2 text-xs tracking-[0.16em] uppercase">
          <SlidersHorizontal className="size-4" strokeWidth={1.5} /> Filter {activeCount > 0 && <span className="text-plum">({activeCount})</span>}
        </button>
        <p className={cn("text-xs text-muted hidden sm:block transition-opacity", pending && "opacity-40")}>{total} {total === 1 ? "piece" : "pieces"}</p>
        <label className="flex items-center gap-2 text-xs tracking-[0.16em] uppercase">
          <span className="hidden sm:inline">Sort</span>
          <select
            value={sp.get("sort") ?? "featured"}
            onChange={(e) => set({ sort: e.target.value === "featured" ? null : e.target.value })}
            className="bg-transparent normal-case tracking-normal text-sm outline-none cursor-pointer py-2 max-w-[9.5rem] sm:max-w-none"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-label="Filters">
          <div className="absolute inset-0 bg-ink/40 animate-fade-in" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-full max-w-sm bg-cream flex flex-col animate-fade-in">
            <div className="flex items-center justify-between px-6 h-16 border-b border-line">
              <h2 className="font-display text-2xl">Filter</h2>
              <button onClick={() => setOpen(false)} aria-label="Close filters" className="p-2 -mr-2">
                <X className="size-5" strokeWidth={1.5} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6">{panel}</div>
            <div className="border-t border-line p-4">
              <button onClick={() => setOpen(false)} className="w-full bg-ink text-cream py-3.5 text-xs tracking-[0.2em] uppercase">
                Show {total} {total === 1 ? "result" : "results"}
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs tracking-[0.18em] uppercase mb-3">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-3 text-sm cursor-pointer">
      <input type="checkbox" checked={checked} onChange={onChange} className="size-4 accent-[var(--color-ink)]" />
      {label}
    </label>
  );
}
