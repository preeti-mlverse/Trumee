import Link from "next/link";
import { Suspense } from "react";
import { DETAILS, getFacets, listProducts, OCCASIONS } from "@/lib/catalog";
import { isSortKey } from "@/lib/sorts";
import { Filters } from "./filters";
import { ProductGrid } from "./product-card";
import { ListTracker } from "./list-tracker";

const PER_PAGE = 24;
type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Filterable, sortable, paginated product grid used by collections and search. */
export async function Listing({ sp, collectionId, q, listName, basePath }: { sp: SP; collectionId?: number; q?: string; listName: string; basePath: string }) {
  const page = Math.max(1, Number(one(sp.page)) || 1);
  const sort = one(sp.sort);
  const min = one(sp.min);
  const max = one(sp.max);
  const [{ items, total }, facets] = await Promise.all([
    listProducts({
      collectionId,
      q,
      sort: isSortKey(sort) ? sort : "featured",
      sizes: one(sp.size)?.split(",").filter(Boolean),
      types: one(sp.type)?.split(",").filter(Boolean),
      fabrics: one(sp.fabric)?.split(",").filter(Boolean),
      // Whitelisted: only known occasion/detail tags ever reach the query
      tagGroups: [
        one(sp.occasion)?.split(",").filter((t) => t in OCCASIONS) ?? [],
        one(sp.detail)?.split(",").filter((t) => t in DETAILS) ?? [],
      ],
      minPrice: min ? Number(min) * 100 : undefined,
      maxPrice: max ? Number(max) * 100 : undefined,
      inStock: !!one(sp.instock),
      limit: PER_PAGE,
      offset: (page - 1) * PER_PAGE,
    }),
    getFacets(collectionId),
  ]);
  const pages = Math.ceil(total / PER_PAGE);
  const pageHref = (n: number) => {
    const next = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (v == null ? [] : [[k, String(one(v))]])));
    if (n > 1) next.set("page", String(n));
    else next.delete("page");
    return `${basePath}?${next.toString()}`;
  };

  return (
    <>
      <Suspense>
        <Filters facets={facets} total={total} />
      </Suspense>
      <ListTracker listName={listName} items={items.map((p, i) => ({ item_id: p.id, item_name: p.title, price: p.price / 100, index: i }))} />
      {items.length ? (
        <ProductGrid items={items} list={listName} />
      ) : (
        <div className="py-24 text-center">
          <p className="font-display text-3xl">Nothing matches just yet</p>
          <p className="text-sm text-muted mt-2">Try removing a filter or two.</p>
          <Link href={basePath} className="inline-block mt-6 text-xs tracking-[0.18em] uppercase underline underline-offset-4">
            Clear filters
          </Link>
        </div>
      )}
      {pages > 1 && (
        <nav className="mt-16 flex justify-center gap-2" aria-label="Pagination">
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={pageHref(n)}
              aria-current={n === page ? "page" : undefined}
              className={`size-10 grid place-items-center rounded-full text-sm border ${n === page ? "bg-ink text-cream border-ink" : "border-line hover:border-ink"}`}
            >
              {n}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
