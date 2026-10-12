"use client";

import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import type { CardProduct } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { ProductCard } from "./product-card";
import { useAutoAdvance } from "./use-auto-advance";

/** One shelf: its products plus the colour "feature tile" that opens the rail. */
export type RailTab = {
  label: string;
  items: CardProduct[];
  href: string;
  /** Total pieces in this list */
  count?: number;
  tone: "sun" | "ink" | "sea";
  feature: { kicker: string; big: string; line: string };
};

const TONE = {
  sun: { tile: "bg-sun text-ink", kicker: "text-ink/70", btn: "bg-ink text-cream", dot: "bg-sun" },
  ink: { tile: "bg-ink text-cream", kicker: "text-sun-soft", btn: "bg-sun text-ink", dot: "bg-ink" },
  sea: { tile: "bg-sea-bright text-cream", kicker: "text-sea-soft", btn: "bg-cream text-ink", dot: "bg-sea-bright" },
} as const;

/**
 * Shelf of products behind a sliding segmented switch. Each list opens with a bold colour tile
 * (big price / promise), then the cards; the rail steps along on its own.
 */
export function ProductRail({ tabs, list }: { tabs: RailTab[]; list: string }) {
  const [t, setT] = useState(0);
  const rail = useRef<HTMLDivElement>(null);
  useAutoAdvance(rail, 2600, t);
  const scroll = (dir: 1 | -1) => rail.current?.scrollBy({ left: dir * rail.current.clientWidth * 0.75, behavior: "smooth" });
  const tab = tabs[t];
  const tone = TONE[tab.tone];
  const item = "shrink-0 snap-start w-[64vw] sm:w-[40vw] md:w-[30vw] lg:w-[calc((100%-3*20px)/4)] xl:w-[calc((100%-4*20px)/5)]";

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 sm:mb-8">
        {/* Segmented switch with a sliding indicator */}
        <div
          role="tablist"
          className="relative grid w-full lg:w-auto rounded-full bg-paper border border-ink/10 p-1.5 shadow-[0_10px_30px_-22px_rgba(22,22,22,0.6)]"
          style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
        >
          <span
            aria-hidden
            className="absolute top-1.5 bottom-1.5 left-1.5 rounded-full bg-ink transition-transform duration-500 ease-[cubic-bezier(0.65,0,0.35,1)]"
            style={{ width: `calc((100% - 12px) / ${tabs.length})`, transform: `translateX(${t * 100}%)` }}
          />
          {tabs.map((x, k) => (
            <button
              key={x.label}
              role="tab"
              aria-selected={k === t}
              onClick={() => {
                setT(k);
                rail.current?.scrollTo({ left: 0, behavior: "smooth" });
              }}
              className={cn("relative z-10 flex items-center justify-center gap-2 rounded-full px-3 sm:px-7 py-3 sm:py-3.5 transition-colors duration-500", k === t ? "text-cream" : "text-ink/70 hover:text-ink")}
            >
              <span className={cn("size-2 rounded-full shrink-0", TONE[x.tone].dot, k === t && "ring-2 ring-cream/60")} />
              <span className="font-display text-[19px] sm:text-[24px] leading-none whitespace-nowrap">{x.label}</span>
              {x.count != null && <span className={cn("hidden sm:inline text-[12px] tabular-nums", k === t ? "text-cream/60" : "text-muted")}>{x.count}</span>}
            </button>
          ))}
        </div>
        <div className="hidden lg:flex items-center gap-2">
          <RoundArrow onClick={() => scroll(-1)} label="Previous products">
            <ArrowLeft className="size-4" />
          </RoundArrow>
          <RoundArrow onClick={() => scroll(1)} label="More products">
            <ArrowRight className="size-4" />
          </RoundArrow>
        </div>
      </div>

      <div
        ref={rail}
        key={t}
        className="flex gap-3 sm:gap-5 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10 scroll-px-4 sm:scroll-px-6 lg:scroll-px-10 animate-fade-in"
      >
        {/* Feature tile */}
        <Link href={tab.href} className={cn(item, "group relative aspect-[2/3] rounded-card overflow-hidden p-6 sm:p-7 flex flex-col justify-between isolate", tone.tile)}>
          <span aria-hidden className="absolute -right-16 -top-16 size-56 rounded-full bg-white/10 transition-transform duration-700 group-hover:scale-125" />
          <span aria-hidden className="absolute -left-10 bottom-24 size-32 rounded-full bg-white/[0.07]" />
          <span className={cn("relative text-[11px] tracking-[0.28em] uppercase", tone.kicker)}>{tab.feature.kicker}</span>
          <span className="relative">
            <span className="block font-display leading-[0.85] text-[64px] sm:text-[84px] tracking-[-0.02em]">{tab.feature.big}</span>
            <span className="block mt-4 text-[15px] leading-snug opacity-85 max-w-[16rem]">{tab.feature.line}</span>
          </span>
          <span className={cn("relative inline-flex w-fit items-center gap-3 rounded-full pl-5 pr-1.5 py-1.5 text-sm font-medium", tone.btn)}>
            Shop all{tab.count != null ? ` ${tab.count}` : ""}
            <span className="size-8 rounded-full bg-white/20 grid place-items-center transition-transform duration-300 group-hover:rotate-45">
              <ArrowUpRight className="size-4" />
            </span>
          </span>
        </Link>
        {tab.items.map((p, i) => (
          <div key={p.id} className={item}>
            <ProductCard p={p} list={`${list} – ${tab.label}`} index={i} priority={i < 3} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function RoundArrow({ onClick, label, children, dark }: { onClick: () => void; label: string; children: React.ReactNode; dark?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        "size-11 grid place-items-center rounded-full border transition-colors",
        dark ? "border-cream/30 hover:bg-cream hover:text-ink" : "border-ink/20 bg-paper/60 hover:bg-ink hover:text-cream",
      )}
    >
      {children}
    </button>
  );
}
