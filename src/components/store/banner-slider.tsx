"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { FeatureSlide, type FeatureBanner } from "./feature-slide";

/** Two equal rectangular buttons: solid (main) and outlined (secondary). */
const BTN = "inline-flex items-center justify-center w-[196px] lg:w-[236px] h-11 lg:h-[52px] px-4 whitespace-nowrap text-[11px] lg:text-[13px] font-medium tracking-[0.16em] uppercase transition-colors";
const SOLID = "bg-ink text-cream hover:bg-ink-soft";
const OUTLINE = "border border-cream text-cream bg-ink/15 backdrop-blur-[2px] hover:bg-cream hover:text-ink";

/**
 * `cta` sits just under the title painted into the artwork: `at` is its top-left position as a % of
 * the banner (desktop/tablet); on phones the button moves to a strip under the image.
 */
export type ArtBanner = { kind?: "art"; image: string; alt: string; href: string; cta: string; at: { left: number; top: number }; secondary?: { label: string; href: string } };
export type Banner = ArtBanner | FeatureBanner;
export type { FeatureBanner };
const keyOf = (b: Banner) => (b.kind === "feature" ? b.href + b.title : b.image);

/**
 * Hero auto-slider for finished campaign artwork. Banners slide in one after another from the right
 * every 5 s on a steady beat (no hover pause), looping seamlessly via a copy of the first banner at the
 * end. Arrows, dots and swipe move it by hand; it rests only while the browser tab is hidden.
 */
export function BannerSlider({ banners, interval = 6000 }: { banners: Banner[]; interval?: number }) {
  const stage = useRef<HTMLDivElement>(null);
  const n = banners.length;
  const slides = n > 1 ? [...banners, banners[0]] : banners;
  const [pos, setPos] = useState(0); // 0..n (n = the copy of the first banner)
  const [animate, setAnimate] = useState(true);
  const touch = useRef<number | null>(null);
  const active = pos % n;

  const next = useCallback(() => {
    setAnimate(true);
    setPos((p) => (p >= n ? 1 : p + 1));
  }, [n]);
  const prev = useCallback(() => {
    if (pos === 0) {
      // Jump (unseen) to the copy at the end, then slide back to the last banner
      setAnimate(false);
      setPos(n);
      requestAnimationFrame(() => requestAnimationFrame(() => (setAnimate(true), setPos(n - 1))));
    } else {
      setAnimate(true);
      setPos((p) => p - 1);
    }
  }, [pos, n]);

  // Steady beat; restarts after any manual move
  useEffect(() => {
    if (n < 2) return;
    const t = setInterval(() => !document.hidden && next(), interval);
    return () => clearInterval(t);
  }, [n, next, interval, pos]);

  // After sliding onto the copy of the first banner, snap back to the real one without animation
  const onEnd = () => {
    if (pos === n) {
      setAnimate(false);
      setPos(0);
    }
  };
  useEffect(() => {
    if (!animate) {
      const r = requestAnimationFrame(() => requestAnimationFrame(() => setAnimate(true)));
      return () => cancelAnimationFrame(r);
    }
  }, [animate]);

  const b = banners[active];
  return (
    <section aria-roledescription="carousel" aria-label="Campaigns">
      <div
        ref={stage}
        className="relative w-full aspect-[1896/829] overflow-hidden bg-sand"
        // Pointer position (-1..1) for the gentle depth drift on composed slides
        onPointerMove={(e) => {
          if (e.pointerType !== "mouse" || !stage.current) return;
          const r = stage.current.getBoundingClientRect();
          stage.current.style.setProperty("--mx", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
          stage.current.style.setProperty("--my", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
        }}
        onPointerLeave={() => {
          stage.current?.style.setProperty("--mx", "0");
          stage.current?.style.setProperty("--my", "0");
        }}
        onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touch.current == null) return;
          const dx = e.changedTouches[0].clientX - touch.current;
          if (Math.abs(dx) > 40) (dx < 0 ? next : prev)();
          touch.current = null;
        }}
      >
        <div
          className={cn("flex h-full", animate && "transition-transform duration-[900ms] ease-[cubic-bezier(0.65,0,0.35,1)]")}
          style={{ transform: `translateX(-${pos * 100}%)` }}
          onTransitionEnd={onEnd}
        >
          {slides.map((x, k) => {
            const isActive = k % n === active && (k === pos);
            if (x.kind === "feature")
              return (
                <div key={`${keyOf(x)}-${k}`} aria-hidden={!isActive} aria-label={x.alt} className="relative shrink-0 w-full h-full">
                  <FeatureSlide b={x} active={isActive} priority={k === 0} />
                </div>
              );
            return (
              <div key={`${keyOf(x)}-${k}`} aria-hidden={!isActive} className="relative shrink-0 w-full h-full">
                <Link href={x.href} tabIndex={-1} aria-label={x.alt} className="absolute inset-0">
                  <Image src={x.image} alt={x.alt} fill priority={k === 0} sizes="100vw" className="object-cover" />
                </Link>
                <div
                  className={cn("hidden sm:flex absolute items-center gap-3 transition-all duration-700 delay-500", isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3")}
                  style={{ left: `${x.at.left}%`, top: `${x.at.top}%` }}
                >
                  <Link href={x.href} tabIndex={isActive ? 0 : -1} className={cn(BTN, SOLID)}>
                    {x.cta}
                  </Link>
                  {x.secondary && (
                    <Link href={x.secondary.href} tabIndex={isActive ? 0 : -1} className={cn(BTN, OUTLINE)}>
                      {x.secondary.label}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {n > 1 && (
          <>
            <div className="absolute z-20 bottom-3 sm:bottom-6 inset-x-0 flex justify-center gap-2">
              {banners.map((x, k) => (
                <button
                  key={keyOf(x)}
                  aria-label={`Show banner ${k + 1}`}
                  aria-current={k === active}
                  onClick={() => (setAnimate(true), setPos(k))}
                  className="h-6 px-1 grid place-items-center"
                >
                  <span className={cn("block h-[3px] rounded-full transition-all duration-500", k === active ? "w-10 bg-paper" : "w-4 bg-paper/50")} />
                </button>
              ))}
            </div>
            <div className="hidden sm:flex absolute z-20 bottom-5 right-6 gap-2">
              <button aria-label="Previous banner" onClick={prev} className="size-10 rounded-full grid place-items-center bg-paper/80 text-ink hover:bg-paper transition-colors">
                <ArrowLeft className="size-4" />
              </button>
              <button aria-label="Next banner" onClick={next} className="size-10 rounded-full grid place-items-center bg-paper/80 text-ink hover:bg-paper transition-colors">
                <ArrowRight className="size-4" />
              </button>
            </div>
          </>
        )}
      </div>
      {/* Phones: the painted title is small, so the button sits under the image */}
      <div className="sm:hidden grid grid-cols-2 gap-2 px-4 py-3 bg-paper/70">
        <Link href={b.href} className="flex items-center justify-center h-11 px-3 bg-ink text-cream text-[11px] font-medium tracking-[0.12em] uppercase text-center">
          {b.cta}
        </Link>
        {b.secondary && (
          <Link href={b.secondary.href} className="flex items-center justify-center h-11 px-3 border border-ink text-ink text-[11px] font-medium tracking-[0.12em] uppercase text-center">
            {b.secondary.label}
          </Link>
        )}
      </div>
    </section>
  );
}
