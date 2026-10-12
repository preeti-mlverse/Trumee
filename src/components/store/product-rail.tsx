"use client";

import { ArrowLeft, ArrowRight, Flame, Sparkles, Tag } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import type { CardProduct } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { ProductCard } from "./product-card";
import { useAutoAdvance } from "./use-auto-advance";
import { DotLink, PillLink } from "./ui";

export type RailTab = {
  label: string;
  items: CardProduct[];
  href: string;
  /** One-line promise shown on the tab card */
  sub?: string;
  /** Total pieces in this list (shown as "24 styles") */
  count?: number;
  icon?: "flame" | "sparkles" | "tag";
};

const ICONS = { flame: Flame, sparkles: Sparkles, tag: Tag };
export type RailLead = { image: string; eyebrow: string; title: string; href: string; cta: string };

/**
 * Horizontal product rail with pill tabs. An optional lifestyle "lead" tile opens the rail,
 * so each list starts with a mood before the product grid.
 */
export function ProductRail({ tabs, lead, list }: { tabs: RailTab[]; lead?: RailLead; list: string }) {
  const [t, setT] = useState(0);
  const rail = useRef<HTMLDivElement>(null);
  useAutoAdvance(rail, 2600, t);
  const scroll = (dir: 1 | -1) => rail.current?.scrollBy({ left: dir * rail.current.clientWidth * 0.75, behavior: "smooth" });
  const tab = tabs[t];
  const item = "shrink-0 snap-start w-[64vw] sm:w-[40vw] md:w-[30vw] lg:w-[calc((100%-3*20px)/4)] xl:w-[calc((100%-4*20px)/5)]";

  return (
    <div>
      {/* Shelf tabs: three big, clear choices — the active one is solid ink */}
      <div role="tablist" className="grid grid-flow-col auto-cols-[78%] sm:auto-cols-auto sm:grid-flow-row sm:grid-cols-3 gap-3 sm:gap-4 overflow-x-auto scrollbar-none snap-x -mx-4 px-4 sm:mx-0 sm:px-0">
        {tabs.map((x, k) => {
          const I = ICONS[x.icon ?? "sparkles"];
          const on = k === t;
          return (
            <button
              key={x.label}
              role="tab"
              aria-selected={on}
              onClick={() => {
                setT(k);
                rail.current?.scrollTo({ left: 0, behavior: "smooth" });
              }}
              className={cn(
                "group snap-start text-left rounded-card border px-5 py-4 sm:px-6 sm:py-5 flex items-center gap-4 transition-all duration-300",
                on ? "bg-ink text-cream border-ink shadow-[0_18px_40px_-24px_rgba(22,22,22,0.7)]" : "bg-paper/80 border-ink/10 hover:border-ink/40 hover:-translate-y-0.5",
              )}
            >
              <span className={cn("size-11 sm:size-12 shrink-0 rounded-full grid place-items-center transition-colors", on ? "bg-sun text-ink" : "bg-sand text-sea")}>
                <I className="size-5" strokeWidth={1.6} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-[26px] sm:text-[30px] leading-none">{x.label}</span>
                {x.sub && <span className={cn("block mt-1.5 text-[13px] truncate", on ? "text-cream/70" : "text-muted")}>{x.sub}</span>}
              </span>
              {x.count != null && (
                <span className={cn("hidden md:inline-flex shrink-0 rounded-full px-3 py-1 text-[12px] tabular-nums", on ? "bg-cream/15 text-cream" : "bg-sand text-ink-soft")}>{x.count} styles</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-4 mt-6 mb-4 sm:mt-8 sm:mb-5">
        <DotLink href={tab.href}>Shop all {tab.label.toLowerCase()}</DotLink>
        <div className="hidden lg:flex gap-2">
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
        {lead && (
          <div className={cn(item, "relative aspect-[2/3] rounded-card overflow-hidden bg-ink text-cream")}>
            <Image src={lead.image} alt="" fill sizes="(min-width:1024px) 22vw, 60vw" className="object-cover animate-kenburns" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
              <p className="text-[10px] tracking-[0.26em] uppercase text-sun-soft">{lead.eyebrow}</p>
              <p className="font-display text-[30px] sm:text-[40px] leading-[0.95] mt-2">{lead.title}</p>
              <PillLink href={lead.href} className="mt-5 text-[12px] sm:text-[13px] pl-4 sm:pl-5">
                {lead.cta}
              </PillLink>
            </div>
          </div>
        )}
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
