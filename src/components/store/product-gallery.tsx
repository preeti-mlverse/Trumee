"use client";

import { Play } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { LoopVideo } from "./loop-video";

type Slide = { kind: "image"; url: string; alt: string } | { kind: "video"; url: string; poster: string | null };

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
  // The catwalk clip sits second: first impression is the still, the next swipe shows it moving.
  if (video) slides.splice(Math.min(1, slides.length), 0, { kind: "video", ...video });

  const [active, setActive] = useState(0);
  const strip = useRef<HTMLDivElement>(null);

  const onScroll = () => {
    const el = strip.current;
    if (el) setActive(Math.round(el.scrollLeft / el.clientWidth));
  };
  const go = (i: number) => {
    setActive(i);
    strip.current?.scrollTo({ left: i * strip.current.clientWidth, behavior: "smooth" });
  };

  if (!slides.length) return <div className="aspect-[2/3] bg-sand" />;

  return (
    <div className="lg:grid grid-cols-1 lg:grid-cols-[76px_minmax(0,1fr)] lg:gap-4">
      <div className="hidden lg:flex flex-col gap-3 max-h-[82vh] overflow-y-auto scrollbar-none">
        {slides.map((s, i) => (
          <button
            key={s.url}
            onClick={() => go(i)}
            aria-label={s.kind === "video" ? "Play catwalk video" : `Show image ${i + 1}`}
            className={cn("relative aspect-[2/3] bg-sand shrink-0 border transition", i === active ? "border-ink" : "border-transparent opacity-60 hover:opacity-100")}
          >
            <Image src={s.kind === "video" ? s.poster ?? images[0]?.url : s.url} alt="" fill sizes="76px" className="object-cover" />
            {s.kind === "video" && (
              <span className="absolute inset-0 grid place-items-center bg-ink/30">
                <Play className="size-5 text-cream fill-cream" />
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="relative self-start">
        <div ref={strip} onScroll={onScroll} className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none">
          {slides.map((s, i) => (
            <div key={s.url} className="relative aspect-[2/3] lg:aspect-[4/5] w-full shrink-0 snap-center bg-sand overflow-hidden">
              {s.kind === "video" ? (
                <LoopVideo src={s.url} poster={s.poster} playing={active === i} className="absolute inset-0 size-full object-[50%_25%]" />
              ) : (
                <Image src={s.url} alt={s.alt || `${title} – image ${i + 1}`} fill priority={i === 0} sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
              )}
            </div>
          ))}
        </div>
        {video && active !== slides.findIndex((s) => s.kind === "video") && (
          <button
            onClick={() => go(slides.findIndex((s) => s.kind === "video"))}
            className="absolute left-3 bottom-3 flex items-center gap-2 bg-ink/80 text-cream text-[10px] tracking-[0.2em] uppercase px-3 py-2 backdrop-blur-sm"
          >
            <Play className="size-3 fill-current" /> Watch it move
          </button>
        )}
        <div className="lg:hidden absolute bottom-4 right-3 flex gap-1.5">
          {slides.map((_, i) => (
            <span key={i} className={cn("h-1.5 rounded-full transition-all", i === active ? "w-5 bg-ink" : "w-1.5 bg-ink/30")} />
          ))}
        </div>
      </div>
    </div>
  );
}
