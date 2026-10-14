"use client";

import { ChevronLeft, ChevronRight, Maximize2, Play, X, ZoomIn } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { LoopVideo } from "./loop-video";

type Slide = { kind: "image"; url: string; alt: string } | { kind: "video"; url: string; poster: string | null };

/**
 * Product media. Desktop: an editorial two-column grid of every photo (the try-on clip plays in
 * place) beside the pinned buy box. Mobile: a swipe gallery with a counter, a video chip and a
 * thumbnail strip. Any photo opens a full-screen viewer with tap/click-to-zoom.
 */
export function ProductGallery({
  images,
  title,
  video,
}: {
  images: { url: string; alt: string }[];
  title: string;
  video?: { url: string; poster: string | null } | null;
}) {
  const slides: Slide[] = images.map((i) => ({ kind: "image" as const, ...i }));
  // The try-on clip sits second: first impression is the still, the next tile shows it moving.
  if (video) slides.splice(Math.min(1, slides.length), 0, { kind: "video", ...video });
  const videoIndex = slides.findIndex((s) => s.kind === "video");

  const [active, setActive] = useState(0);
  const [viewer, setViewer] = useState<number | null>(null);
  const strip = useRef<HTMLDivElement>(null);
  const thumbs = useRef<HTMLDivElement>(null);

  const onScroll = () => {
    const el = strip.current;
    if (el) setActive(Math.round(el.scrollLeft / el.clientWidth));
  };
  const go = (i: number) => {
    setActive(i);
    strip.current?.scrollTo({ left: i * strip.current.clientWidth, behavior: "smooth" });
  };
  useEffect(() => {
    const t = thumbs.current?.children[active] as HTMLElement | undefined;
    t?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [active]);

  if (!slides.length) return <div className="aspect-[3/4] bg-sand" />;
  const alt = (s: Slide, i: number) => (s.kind === "image" && s.alt) || `${title} – image ${i + 1}`;

  return (
    <>
      {/* Desktop: editorial grid */}
      <div className="hidden lg:grid grid-cols-2 gap-2.5">
        {slides.map((s, i) => (
          <div key={s.url} className={cn("group relative aspect-[3/4] overflow-hidden bg-sand", i === 0 && "rounded-tl-panel", i === 1 && "rounded-tr-panel")}>
            {s.kind === "video" ? (
              <>
                <LoopVideo src={s.url} poster={s.poster} className="absolute inset-0 size-full object-[50%_25%]" />
                <span className="glass-dark pointer-events-none absolute left-4 top-4 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] tracking-[0.18em] uppercase text-cream">
                  <Play className="size-3 fill-current" /> Try-on
                </span>
              </>
            ) : (
              <button type="button" onClick={() => setViewer(i)} className="absolute inset-0 cursor-zoom-in" aria-label={`Enlarge image ${i + 1}`}>
                <Image src={s.url} alt={alt(s, i)} fill preload={i === 0} sizes="(min-width:1440px) 400px, 28vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                <span className="glass absolute right-3 bottom-3 grid size-9 place-items-center rounded-full text-ink opacity-0 transition-opacity group-hover:opacity-100">
                  <Maximize2 className="size-4" />
                </span>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Mobile and tablet: swipe gallery + thumbnails */}
      <div className="lg:hidden">
        <div className="relative overflow-hidden isolate">
          <div ref={strip} onScroll={onScroll} className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none">
            {slides.map((s, i) => (
              <div key={s.url} className="relative aspect-[3/4] w-full shrink-0 snap-center bg-sand overflow-hidden">
                {s.kind === "video" ? (
                  <LoopVideo src={s.url} poster={s.poster} playing={active === i} className="absolute inset-0 size-full object-[50%_25%]" />
                ) : (
                  <button type="button" onClick={() => setViewer(i)} className="absolute inset-0" aria-label={`Enlarge image ${i + 1}`}>
                    <Image src={s.url} alt={alt(s, i)} fill preload={i === 0} sizes="100vw" className="object-cover" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <span className="glass pointer-events-none absolute right-3 bottom-3 rounded-full px-2.5 py-1 text-[11px] tabular-nums text-ink">
            {active + 1} / {slides.length}
          </span>
          {videoIndex >= 0 && active !== videoIndex && (
            <button type="button" onClick={() => go(videoIndex)} className="glass-dark absolute left-3 bottom-3 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] tracking-[0.18em] uppercase text-cream">
              <Play className="size-3 fill-current" /> Try-on video
            </button>
          )}
          {active !== videoIndex && (
            <span className="glass pointer-events-none absolute right-3 top-3 grid size-8 place-items-center rounded-full text-ink">
              <ZoomIn className="size-4" />
            </span>
          )}
        </div>
        <div ref={thumbs} className="mt-2 flex gap-2 overflow-x-auto scrollbar-none px-4 sm:px-0">
          {slides.map((s, i) => (
            <button
              key={s.url}
              type="button"
              onClick={() => go(i)}
              aria-label={s.kind === "video" ? "Show try-on video" : `Show image ${i + 1}`}
              aria-current={i === active}
              className={cn("relative aspect-[3/4] w-14 shrink-0 overflow-hidden rounded-lg bg-sand ring-1 ring-offset-1 ring-offset-cream transition", i === active ? "ring-ink" : "ring-transparent opacity-60")}
            >
              <Image src={s.kind === "video" ? s.poster ?? images[0]?.url : s.url} alt="" fill sizes="56px" className="object-cover" />
              {s.kind === "video" && (
                <span className="absolute inset-0 grid place-items-center bg-ink/30">
                  <Play className="size-4 text-cream fill-cream" />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {viewer !== null && <Viewer slides={slides.filter((s) => s.kind === "image")} start={slides.slice(0, viewer).filter((s) => s.kind === "image").length} title={title} onClose={() => setViewer(null)} />}
    </>
  );
}

/** Full-screen photo viewer: swipe or arrow through, tap/click to zoom 2.5× and drag to look around. */
function Viewer({ slides, start, title, onClose }: { slides: Slide[]; start: number; title: string; onClose: () => void }) {
  const [i, setI] = useState(start);
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const n = slides.length;
  const close = useRef<HTMLButtonElement>(null);
  const touchX = useRef<number | null>(null);

  const step = useCallback((d: number) => {
    setZoom(false);
    setI((x) => (x + d + n) % n);
  }, [n]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, step]);

  const aim = (x: number, y: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    setOrigin(`${((x - r.left) / r.width) * 100}% ${((y - r.top) / r.height) * 100}%`);
  };
  const s = slides[i];
  if (!s) return null;

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`${title} photos`} className="fixed inset-0 z-[100] bg-ink/95 text-cream animate-fade-in flex flex-col">
      <div className="flex items-center justify-between px-4 sm:px-6 pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-3">
        <span className="text-sm tabular-nums text-cream/80">
          {i + 1} / {n}
        </span>
        <span className="hidden sm:block text-xs tracking-[0.18em] uppercase text-cream/60">{zoom ? "Move to look around · click to zoom out" : "Click to zoom"}</span>
        <button ref={close} type="button" onClick={onClose} className="grid size-11 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Close">
          <X className="size-5" />
        </button>
      </div>

      <div
        className={cn("relative flex-1 overflow-hidden touch-pan-y", zoom ? "cursor-zoom-out" : "cursor-zoom-in")}
        onClick={(e) => {
          aim(e.clientX, e.clientY, e.currentTarget);
          setZoom((z) => !z);
        }}
        onMouseMove={(e) => zoom && aim(e.clientX, e.clientY, e.currentTarget)}
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchMove={(e) => zoom && aim(e.touches[0].clientX, e.touches[0].clientY, e.currentTarget)}
        onTouchEnd={(e) => {
          if (zoom || touchX.current == null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 50) {
            e.preventDefault();
            step(dx < 0 ? 1 : -1);
          }
          touchX.current = null;
        }}
      >
        {/* Every photo is mounted (and downloading) as soon as the viewer opens; next/previous only swaps which one shows */}
        {slides.map((t, k) => (
          <Image
            key={t.url}
            src={t.url}
            alt={k === i ? (t.kind === "image" && t.alt) || `${title} – image ${k + 1}` : ""}
            aria-hidden={k !== i}
            fill
            loading="eager"
            fetchPriority={k === i ? "high" : "low"}
            // Photos are portrait and fit the viewer's height, so ~80vh of width is plenty (enough for the 2.5× zoom too)
            sizes="(orientation: landscape) 80vh, 100vw"
            className={cn("object-contain select-none", k === i ? "opacity-100 transition-transform duration-300 ease-out" : "opacity-0 pointer-events-none")}
            style={k === i ? { transform: zoom ? "scale(2.5)" : "none", transformOrigin: origin } : undefined}
            draggable={false}
          />
        ))}
      </div>

      {n > 1 && (
        <>
          <button type="button" onClick={() => step(-1)} className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 grid size-11 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Previous photo">
            <ChevronLeft className="size-5" />
          </button>
          <button type="button" onClick={() => step(1)} className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 grid size-11 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Next photo">
            <ChevronRight className="size-5" />
          </button>
          <div className="flex justify-center gap-2 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+14px)] overflow-x-auto scrollbar-none">
            {slides.map((t, k) => (
              <button
                key={t.url}
                type="button"
                onClick={() => {
                  setZoom(false);
                  setI(k);
                }}
                aria-label={`Show photo ${k + 1}`}
                aria-current={k === i}
                className={cn("relative aspect-[3/4] w-11 shrink-0 overflow-hidden rounded-md transition", k === i ? "ring-2 ring-cream" : "opacity-50 hover:opacity-90")}
              >
                <Image src={t.url} alt="" fill sizes="44px" className="object-cover" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>,
    document.body,
  );
}
