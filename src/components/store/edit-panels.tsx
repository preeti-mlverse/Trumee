"use client";

import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useAutoAdvance } from "./use-auto-advance";

export type EditPiece = { handle: string; title: string; price: number; image: string };
export type EditPanel = {
  handle: string;
  title: string;
  image: string;
  text: string;
  count: number;
  vibe: string;
  /** CSS object-position */
  focus?: string;
  /** A piece from this edit that no other panel shows */
  piece?: EditPiece | null;
};

const TICK = 4500;

/**
 * The Edits as expanding photo panels: one edit open wide with its story, the rest as slim
 * strips with vertical titles. Cycles on its own; hovering a strip opens it.
 * Phones get a swipeable row of full cards instead.
 */
export function EditPanels({ edits }: { edits: EditPanel[] }) {
  const [i, setI] = useState(0);
  const [hold, setHold] = useState(false);
  const rail = useRef<HTMLDivElement>(null);
  useAutoAdvance(rail, 3200);

  useEffect(() => {
    if (hold || edits.length < 2) return;
    const t = setTimeout(() => setI((x) => (x + 1) % edits.length), TICK);
    return () => clearTimeout(t);
  }, [i, hold, edits.length]);

  return (
    <>
      {/* Desktop / tablet */}
      <div className="hidden md:flex gap-3 h-[540px] lg:h-[600px]" onMouseLeave={() => setHold(false)}>
        {edits.map((e, k) => {
          const on = k === i;
          return (
            <Link
              key={e.handle}
              href={`/collections/${e.handle}`}
              onMouseEnter={() => (setI(k), setHold(true))}
              onFocus={() => setI(k)}
              className={cn(
                "group relative overflow-hidden rounded-card bg-ink text-cream isolate transition-[flex-grow] duration-700 ease-[cubic-bezier(0.65,0,0.35,1)]",
                on ? "grow-[5]" : "grow",
              )}
              style={{ flexBasis: 0 }}
            >
              <Image src={e.piece?.image ?? e.image} alt={e.piece?.title ?? ""} fill sizes="(min-width:1024px) 60vw, 70vw" style={{ objectPosition: e.piece ? "50% 20%" : e.focus }} className={cn("object-cover transition-transform duration-[1200ms]", on ? "scale-100" : "scale-110")} />
              <div className={cn("absolute inset-0 transition-colors duration-700", on ? "bg-gradient-to-t from-ink/85 via-ink/20 to-transparent" : "bg-ink/45")} />

              {/* Closed: vertical title */}
              <span
                className={cn(
                  "absolute left-1/2 bottom-6 -translate-x-1/2 font-display italic text-[24px] lg:text-[28px] whitespace-nowrap [writing-mode:vertical-rl] rotate-180 transition-opacity duration-500",
                  on ? "opacity-0" : "opacity-100",
                )}
              >
                {e.title}
              </span>

              {/* Open: the story */}
              <div className={cn("absolute inset-x-0 bottom-0 p-7 lg:p-9 transition-all duration-700", on ? "opacity-100 translate-y-0 delay-300" : "opacity-0 translate-y-6 pointer-events-none")}>
                <span className="inline-flex items-center gap-2 rounded-full bg-cream/15 backdrop-blur px-3 py-1 text-[11px] tracking-[0.2em] uppercase">
                  <span className="size-1.5 rounded-full bg-sun" /> {e.vibe}
                </span>
                <p className="font-display text-[44px] lg:text-[56px] leading-[0.95] mt-4 max-w-xl">{e.title}</p>
                {e.text && <p className="mt-3 text-[15px] text-cream/80 leading-relaxed max-w-md line-clamp-2">{e.text}</p>}
                <span className="mt-6 inline-flex items-center gap-4 rounded-full bg-cream text-ink pl-6 pr-1.5 py-1.5 text-sm font-medium">
                  Explore the edit
                  <span className="size-9 rounded-full bg-ink text-cream grid place-items-center transition-transform duration-300 group-hover:rotate-45">
                    <ArrowUpRight className="size-4" />
                  </span>
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Phones */}
      <div ref={rail} className="md:hidden flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-none -mx-4 px-4 scroll-px-4">
        {edits.map((e) => (
          <Link key={e.handle} href={`/collections/${e.handle}`} className="relative shrink-0 snap-start w-[78vw] aspect-[3/4] overflow-hidden rounded-card bg-ink text-cream isolate">
            <Image src={e.piece?.image ?? e.image} alt={e.piece?.title ?? ""} fill sizes="80vw" style={{ objectPosition: e.piece ? "50% 20%" : e.focus }} className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/15 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5">
              <span className="text-[10px] tracking-[0.24em] uppercase text-sun-soft">{e.vibe}</span>
              <p className="font-display text-[34px] leading-none mt-2">{e.title}</p>
              <p className="mt-2 text-[13px] text-cream/80 line-clamp-2">{e.text}</p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm">
                Explore the edit <ArrowUpRight className="size-4" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
