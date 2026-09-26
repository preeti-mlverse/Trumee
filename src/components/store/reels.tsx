"use client";

import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { cn, inr } from "@/lib/utils";
import type { HeroClip } from "./hero";
import { LoopVideo } from "./loop-video";

/** Horizontal shoppable reel rail — every clip loops while in view and links to its product. */
export function ReelRail({ clips }: { clips: HeroClip[] }) {
  const rail = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => rail.current?.scrollBy({ left: dir * rail.current.clientWidth * 0.8, behavior: "smooth" });
  return (
    <div className="relative">
      <div className="hidden lg:flex absolute -top-[88px] right-0 gap-2">
        <button onClick={() => scroll(-1)} aria-label="Previous reels" className="size-11 grid place-items-center border border-cream/30 hover:bg-cream hover:text-ink transition-colors">
          <ArrowLeft className="size-4" />
        </button>
        <button onClick={() => scroll(1)} aria-label="More reels" className="size-11 grid place-items-center border border-cream/30 hover:bg-cream hover:text-ink transition-colors">
          <ArrowRight className="size-4" />
        </button>
      </div>
      <div ref={rail} className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-none -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10 scroll-px-4 sm:scroll-px-6 lg:scroll-px-10">
        {clips.map((c) => (
          <Link key={c.handle} href={`/products/${c.handle}`} className="group relative shrink-0 snap-start w-[58vw] sm:w-[34vw] lg:w-[calc((100%-4*16px)/5)] aspect-[9/16] overflow-hidden bg-ink-soft">
            <LoopVideo src={c.video} poster={c.poster} className="absolute inset-0 size-full transition-transform duration-700 group-hover:scale-[1.03]" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/0 to-ink/0" />
            <div className="absolute inset-x-0 bottom-0 p-4">
              <p className="text-[13px] leading-snug line-clamp-2">{c.title}</p>
              <div className="mt-2 flex items-center justify-between text-[12px]">
                <span className="text-marigold tabular-nums">{inr(c.price)}</span>
                <span className="flex items-center gap-1 tracking-[0.18em] uppercase text-[10px] opacity-80 group-hover:opacity-100">
                  Shop <ArrowUpRight className="size-3" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/** Arched category tile that swaps its still for a catwalk loop on hover. */
export function CategoryTile({ href, title, image, video, poster }: { href: string; title: string; image: string; video?: string; poster?: string }) {
  const [hover, setHover] = useState(false);
  return (
    <Link href={href} className="group text-center" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div className="relative aspect-[3/4.4] overflow-hidden bg-sand rounded-t-full">
        <Image src={image} alt={title} fill sizes="(min-width:1024px) 16vw, 33vw" className={cn("object-cover transition duration-700", video ? "group-hover:opacity-0" : "group-hover:scale-105")} />
        {video && <LoopVideo src={video} poster={poster} playing={hover} className="absolute inset-0 size-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />}
      </div>
      <p className="mt-4 text-[11px] sm:text-[13px] tracking-[0.16em] sm:tracking-[0.2em] uppercase group-hover:text-plum">{title}</p>
    </Link>
  );
}
