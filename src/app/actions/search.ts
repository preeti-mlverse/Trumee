"use server";

import { listProducts } from "@/lib/catalog";

export async function quickSearch(q: string) {
  const term = q.trim().slice(0, 80);
  if (term.length < 2) return [];
  const { items } = await listProducts({ q: term, limit: 6, sort: "best-selling" });
  return items.map((p) => ({ id: p.id, handle: p.handle, title: p.title, price: p.price, image: p.images[0]?.url ?? null }));
}
