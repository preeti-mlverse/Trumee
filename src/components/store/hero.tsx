"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { HomeSettings } from "@/lib/settings";
import { cn, inr } from "@/lib/utils";
import { LoopVideo } from "./loop-video";

export type HeroClip = { handle: string; title: string; price: number; video: string; poster: string | null };

const DURATION = 7000;

/** Split hero: plum-black type panel ⟷ two catwalk loops that change with each slide. */
export function Hero({ slides, clips }: { slides: HomeSettings["heroSlides"]; clips: HeroClip[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = slides.length;

  useEffect(() => {
    if (paused || n < 2) return;
    const t = setTimeout(() => setI((x) => (x + 1) % n), DURATION);
    return () => clearTimeout(t);
  }, [i, paused, n]);

  const pair = (k: number) => [clips[(k * 2) % clips.length], clips[(k * 2 + 1) % clips.length]].filter(Boolean);

  return (
    <section
      className="relative bg-ink text-cream lg:grid grid-cols-1 lg:grid-cols-12 lg:h-[calc(100svh-108px)] lg:min-h-[620px] lg:max-h-[920px] overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      <h1 className="sr-only">Trumee — boho dresses, crochet tops and western wear for women in India</h1>
      {/* Videos */}
      <div className="relative h-[78svh] min-h-[520px] lg:h-auto lg:min-h-0 lg:col-span-7 lg:order-2">
        {slides.map((_, k) => (
          <div
            key={k}
            className={cn("absolute inset-0 grid lg:grid-cols-2 gap-px bg-ink transition-opacity duration-1000", k === i ? "opacity-100" : "opacity-0 pointer-events-none")}
            aria-hidden={k !== i}
          >
            {pair(k).map((c, j) => (
              <Link key={c.handle} href={`/products/${c.handle}`} className={cn("group relative overflow-hidden", j === 1 && "hidden lg:block")} tabIndex={k === i ? 0 : -1}>
                <LoopVideo src={c.video} poster={c.poster} playing={k === i} priority={k === 0} className="absolute inset-0 size-full object-[50%_30%]" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent lg:from-ink/50" />
                <span className="hidden lg:flex absolute left-5 right-5 bottom-5 items-end justify-between gap-4 text-[12px]">
                  <span className="max-w-[80%] leading-snug">{c.title}</span>
                  <span className="shrink-0 flex items-center gap-1 text-marigold tabular-nums">
                    {inr(c.price)} <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </span>
                </span>
              </Link>
            ))}
          </div>
        ))}
      </div>

      {/* Type panel (overlays the video on mobile) */}
      <div className="absolute inset-x-0 bottom-0 lg:static lg:col-span-5 lg:order-1 flex flex-col justify-end lg:justify-between px-5 sm:px-10 lg:px-14 pb-10 pt-8 lg:py-14 pointer-events-none lg:pointer-events-auto">
        <p className="hidden lg:block text-[11px] tracking-[0.3em] uppercase text-marigold">New season, new wanderings</p>

        <div className="relative pointer-events-auto">
          {slides.map((s, k) => (
            <div key={k} className={cn("transition-all duration-700", k === i ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 absolute inset-x-0 bottom-0 pointer-events-none")} aria-hidden={k !== i}>
              <p className="text-[11px] tracking-[0.3em] uppercase text-marigold">{s.eyebrow}</p>
              <p role="heading" aria-level={2} className="mt-4 font-display text-[44px] sm:text-6xl xl:text-[84px] leading-[0.95] tracking-[-0.015em]">{s.title}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={s.href} tabIndex={k === i ? 0 : -1} className="bg-marigold text-ink px-7 py-3.5 text-[11px] font-semibold tracking-[0.22em] uppercase hover:bg-cream transition-colors">
                  {s.cta}
                </Link>
                <Link href="/collections/all?sort=newest" tabIndex={k === i ? 0 : -1} className="hidden sm:inline-block border border-cream/40 px-7 py-3.5 text-[11px] tracking-[0.22em] uppercase hover:bg-cream hover:text-ink transition-colors">
                  New in
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 lg:mt-0 flex items-center gap-5 pointer-events-auto">
          <div className="flex gap-2 flex-1 max-w-56">
            {slides.map((_, k) => (
              <button key={k} aria-label={`Show slide ${k + 1}`} onClick={() => setI(k)} className="relative flex-1 h-6 before:absolute before:inset-x-0 before:top-1/2 before:h-[2px] before:bg-cream/25 overflow-hidden">
                <span
                  key={k === i ? `run-${i}` : k}
                  className={cn("absolute left-0 top-1/2 h-[2px] -translate-y-1/2 bg-marigold", k === i ? "w-0 animate-grow" : k < i ? "w-full" : "w-0")}
                  style={{ animationPlayState: paused ? "paused" : "running" }}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
