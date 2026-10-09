"use client";

import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { cn, inr } from "@/lib/utils";
import type { HeroClip } from "./hero";
import { RoundArrow } from "./product-rail";
import { useAutoAdvance } from "./use-auto-advance";
import { LoopVideo } from "./loop-video";

/** Horizontal shoppable reel rail — every clip loops while in view and links to its product. */
export function ReelRail({ clips }: { clips: HeroClip[] }) {
  const rail = useRef<HTMLDivElement>(null);
  useAutoAdvance(rail, 3000);
  const scroll = (dir: 1 | -1) => rail.current?.scrollBy({ left: dir * rail.current.clientWidth * 0.8, behavior: "smooth" });
  return (
    <div className="relative">
      <div className="hidden lg:flex absolute -top-[76px] right-0 gap-2">
        <RoundArrow dark onClick={() => scroll(-1)} label="Previous reels">
          <ArrowLeft className="size-4" />
        </RoundArrow>
        <RoundArrow dark onClick={() => scroll(1)} label="More reels">
          <ArrowRight className="size-4" />
        </RoundArrow>
      </div>
      <div ref={rail} className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-none -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10 scroll-px-4 sm:scroll-px-6 lg:scroll-px-10">
        {clips.map((c) => (
          <Link key={c.handle} href={`/products/${c.handle}`} className="group relative shrink-0 snap-start w-[58vw] sm:w-[34vw] lg:w-[calc((100%-4*16px)/5)] aspect-[9/16] overflow-hidden rounded-card bg-ink-soft isolate">
            <LoopVideo src={c.video} poster={c.poster} className="absolute inset-0 size-full transition-transform duration-700 group-hover:scale-[1.03]" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/0 to-ink/0" />
            <div className="glass-dark absolute inset-x-2 bottom-2 rounded-2xl p-3 border border-cream/10">
              <p className="text-[13px] leading-snug line-clamp-2">{c.title}</p>
              <div className="mt-2 flex items-center justify-between text-[13px]">
                <span className="text-sun-soft tabular-nums">{inr(c.price)}</span>
                <span className="size-7 rounded-full bg-cream text-ink grid place-items-center transition-transform group-hover:rotate-45">
                  <ArrowUpRight className="size-3.5" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/** Rounded bento tile for a category — still image, catwalk loop on hover, glass label. */
export function CategoryTile({ href, title, image, video, poster, className, sizes = "(min-width:1024px) 25vw, 50vw" }: { href: string; title: string; image: string; video?: string; poster?: string; className?: string; sizes?: string }) {
  const [hover, setHover] = useState(false);
  return (
    <Link href={href} className={cn("group relative block overflow-hidden rounded-card bg-sand isolate", className)} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <Image src={image} alt={title} fill sizes={sizes} className={cn("object-cover object-[50%_25%] transition duration-700", video ? "group-hover:opacity-0" : "group-hover:scale-105")} />
      {video && <LoopVideo src={video} poster={poster} playing={hover} className="absolute inset-0 size-full object-[50%_25%] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />}
      <span className="glass absolute left-3 bottom-3 inline-flex items-center gap-2 rounded-full pl-4 pr-1.5 py-1.5 text-[13px] sm:text-sm tracking-[0.02em]">
        {title}
        <span className="size-7 rounded-full bg-ink text-cream grid place-items-center transition-transform group-hover:rotate-45">
          <ArrowUpRight className="size-3.5" />
        </span>
      </span>
    </Link>
  );
}

/** A single word with a photograph showing through the letters. */
export function ImageWord({ word, image, href, className }: { word: string; image: string; href: string; className?: string }) {
  return (
    <Link href={href} className={cn("group relative flex flex-col items-center justify-center rounded-card overflow-hidden", className)} aria-label={`Shop ${word.toLowerCase()} styles`}>
      <span
        className="text-image font-sans font-extrabold uppercase tracking-[-0.04em] text-[27vw] sm:text-[18vw] lg:text-[12vw] xl:text-[190px] leading-[0.85] transition-[background-position] duration-[2000ms] bg-[position:50%_30%] group-hover:bg-[position:50%_60%]"
        // `image` may be a photo path or a CSS gradient
        style={{ backgroundImage: image.includes("gradient(") ? image : `url(${image})`, backgroundSize: image.includes("gradient(") ? "200% 200%" : undefined }}
      >
        {word}
      </span>
      <span className="mt-2 text-[11px] tracking-[0.3em] uppercase text-sea">Shop the mood →</span>
    </Link>
  );
}
