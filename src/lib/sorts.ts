export type SortKey = "featured" | "best-selling" | "price-asc" | "price-desc" | "newest" | "title";

export const SORTS: { value: SortKey; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "best-selling", label: "Best selling" },
  { value: "newest", label: "New arrivals" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "title", label: "Alphabetical" },
];

export const isSortKey = (v: unknown): v is SortKey => SORTS.some((s) => s.value === v);
