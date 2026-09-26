import type { Metadata } from "next";
import { db, schema } from "@/db";
import { EventOnMount } from "@/components/store/list-tracker";
import { Listing } from "@/components/store/listing";
import { Container } from "@/components/store/ui";
import { listProducts } from "@/lib/catalog";

export const metadata: Metadata = { title: "Search", robots: { index: false } };

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim().slice(0, 80) ?? "";
  if (q && !sp.page) {
    const { total } = await listProducts({ q, limit: 1 });
    await db.insert(schema.searchQueries).values({ query: q.toLowerCase(), results: total }).catch(() => {});
  }
  return (
    <Container className="pt-12">
      <form action="/search" className="max-w-2xl mb-10">
        <p className="text-[11px] tracking-[0.26em] uppercase text-plum mb-3">Search</p>
        <input
          name="q"
          defaultValue={q}
          placeholder="What are you looking for?"
          className="w-full bg-transparent border-b border-ink py-3 font-display text-4xl outline-none placeholder:text-muted/50"
        />
      </form>
      {q ? (
        <>
          <EventOnMount name="search" params={{ search_term: q }} />
          <Listing sp={sp} q={q} listName="Search results" basePath={`/search`} />
        </>
      ) : (
        <p className="text-muted">Type a word like “dress”, “crochet” or “mustard”.</p>
      )}
    </Container>
  );
}
