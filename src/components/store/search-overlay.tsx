"use client";

import { Search, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { quickSearch } from "@/app/actions/search";
import { inr } from "@/lib/utils";

const POPULAR = ["Dresses", "Crochet", "Co-ord set", "Jumpsuit", "Schiffli", "Floral"];

export function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Awaited<ReturnType<typeof quickSearch>>>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      setResults(await quickSearch(q));
      setLoading(false);
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  const go = (term: string) => {
    if (!term.trim()) return;
    router.push(`/search?q=${encodeURIComponent(term.trim())}`);
  };

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-label="Search">
      <div className="absolute inset-0 bg-ink/40 animate-fade-in" onClick={onClose} />
      <div className="relative bg-cream border-b border-line animate-fade-in">
        <form
          className="mx-auto max-w-3xl px-4 sm:px-6 h-20 flex items-center gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            go(q);
          }}
        >
          <Search className="size-5 text-muted shrink-0" strokeWidth={1.5} />
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search dresses, tops, crochet…"
            className="flex-1 bg-transparent text-lg sm:text-xl outline-none placeholder:text-muted/70 font-display"
            aria-label="Search products"
          />
          <button type="button" onClick={onClose} aria-label="Close search" className="p-2 -mr-2">
            <X className="size-5" strokeWidth={1.5} />
          </button>
        </form>
        <div className="mx-auto max-w-3xl px-4 sm:px-6 pb-6">
          {q.trim().length < 2 ? (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs uppercase tracking-[0.16em] text-muted w-full mb-1">Popular</span>
              {POPULAR.map((p) => (
                <button key={p} onClick={() => go(p)} className="px-3.5 py-1.5 rounded-full border border-line text-sm hover:border-ink">
                  {p}
                </button>
              ))}
            </div>
          ) : loading && !results.length ? (
            <p className="text-sm text-muted">Searching…</p>
          ) : results.length ? (
            <>
              <ul className="divide-y divide-line">
                {results.map((r) => (
                  <li key={r.id}>
                    <Link href={`/products/${r.handle}`} className="flex items-center gap-4 py-3 hover:bg-sand/50 -mx-2 px-2">
                      <div className="relative size-14 bg-sand shrink-0 overflow-hidden">
                        {r.image && <Image src={r.image} alt="" fill sizes="56px" className="object-cover" />}
                      </div>
                      <span className="flex-1 text-sm">{r.title}</span>
                      <span className="text-sm">{inr(r.price)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <button onClick={() => go(q)} className="mt-4 text-sm underline underline-offset-4">
                See all results for “{q}”
              </button>
            </>
          ) : (
            <p className="text-sm text-muted">No pieces match “{q}”. Try “dress” or “crochet”.</p>
          )}
        </div>
      </div>
    </div>
  );
}
