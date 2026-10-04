"use client";

import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { HeroSlide } from "@/lib/settings";
import { cn, inr } from "@/lib/utils";
import { LoopVideo } from "./loop-video";
import { PillLink } from "./ui";

export type HeroClip = { handle: string; title: string; price: number; video: string; poster: string | null };
export type HeroProduct = { handle: string; title: string; price: number; compareAtPrice: number | null; image: string | null };

/** Every slide gets the same beat so the hero moves at a steady, unhurried pace. */
const DURATION = 6000;

/**
 * Auto-playing hero slider. Each slide has its own composition (scenic photo, catwalk
 * runway, split editorial), crossfades into the next, pauses on hover and swipes on touch.
 */
export function Hero({ slides, clips, shop = [] }: { slides: HeroSlide[]; clips: HeroClip[]; /** Products per slide (banner layout) */ shop?: HeroProduct[][] }) {
  const [i, setI] = useState(0);
  const n = slides.length;
  const touch = useRef<number | null>(null);

  const go = useCallback((d: number) => setI((x) => (x + d + n) % n), [n]);

  useEffect(() => {
    if (n < 2) return;
    const t = setTimeout(() => go(1), DURATION);
    return () => clearTimeout(t);
  }, [i, n, go]);

  return (
    <section
      className="px-2 sm:px-4 lg:px-6 pt-2 -mt-[68px] lg:-mt-[76px]"
      aria-roledescription="carousel"
      aria-label="Featured"
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current == null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        touch.current = null;
      }}
    >
      <h1 className="sr-only">Trumee — boho dresses, crochet tops and western wear for women in India</h1>
      <div className="relative mx-auto max-w-[1400px] h-[88svh] min-h-[620px] lg:h-[calc(100svh-48px)] lg:min-h-[700px] lg:max-h-[920px] rounded-panel overflow-hidden bg-ink">
        {slides.map((s, k) => (
          <div
            key={k}
            role="group"
            aria-roledescription="slide"
            aria-label={`${k + 1} of ${n}`}
            aria-hidden={k !== i}
            className={cn("absolute inset-0 transition-opacity duration-1000", k === i ? "opacity-100 z-10" : "opacity-0 pointer-events-none")}
          >
            {s.layout === "motion" ? (
              <Motion s={s} active={k === i} priority={k === 0} />
            ) : s.layout === "banner" ? (
              <Banner s={s} active={k === i} products={shop[k] ?? []} />
            ) : s.layout === "runway" ? (
              <Runway s={s} clips={clips} active={k === i} />
            ) : s.layout === "split" ? (
              <Split s={s} active={k === i} />
            ) : (
              <Scenic s={s} active={k === i} priority={k === 0} />
            )}
          </div>
        ))}

        {/* Controls: labelled progress tabs + round arrows */}
        <div className="absolute z-20 inset-x-0 bottom-0 px-5 sm:px-10 lg:px-12 pb-5 sm:pb-7 flex items-end justify-between gap-6 pointer-events-none">
          <div className="flex gap-2 sm:gap-5 pointer-events-auto" role="tablist">
            {slides.map((s, k) => (
              <button key={k} role="tab" aria-selected={k === i} aria-label={`Show ${s.tab ?? s.eyebrow}`} onClick={() => setI(k)} className="group text-left w-12 sm:w-36 text-cream">
                <span className="hidden sm:block text-[11px] tracking-[0.2em] uppercase mb-2 opacity-60 group-aria-selected:opacity-100 transition-opacity truncate">{s.tab ?? s.eyebrow}</span>
                <span className="relative block h-[3px] rounded-full bg-current/25 overflow-hidden">
                  <span
                    key={k === i ? `run-${i}` : k}
                    className={cn("absolute inset-y-0 left-0 rounded-full bg-marigold", k === i ? "w-0 animate-grow" : "w-0")}
                    style={{ animationDuration: `${DURATION}ms` }}
                  />
                </span>
              </button>
            ))}
          </div>
          <div className="hidden sm:flex gap-2 pointer-events-auto">
            <button onClick={() => go(-1)} aria-label="Previous slide" className="glass size-11 rounded-full grid place-items-center text-ink border border-ink/10 hover:bg-white transition-colors">
              <ArrowLeft className="size-4" />
            </button>
            <button onClick={() => go(1)} aria-label="Next slide" className="glass size-11 rounded-full grid place-items-center text-ink border border-ink/10 hover:bg-white transition-colors">
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Title({ s, className }: { s: HeroSlide; className?: string }) {
  return (
    <p role="heading" aria-level={2} className={cn("font-display animate-word [animation-delay:80ms]", className, "leading-[0.95]")}>
      {s.title}
      {s.accent && (
        <>
          {" "}
          <em className="font-normal">{s.accent}</em>
        </>
      )}
    </p>
  );
}

function Ctas({ s, active, dark }: { s: HeroSlide; active: boolean; dark?: boolean }) {
  const tab = active ? 0 : -1;
  return (
    <div className="mt-7 flex flex-wrap items-center gap-3 animate-word [animation-delay:200ms]">
      <PillLink href={s.href} tone={dark ? "dark" : "light"} tabIndex={tab}>
        {s.cta}
      </PillLink>
      {s.secondary && (
        <Link
          href={s.secondary.href}
          tabIndex={tab}
          className={cn(
            "rounded-full px-6 py-3.5 text-sm tracking-[0.04em] border transition-colors",
            dark ? "border-ink/25 hover:bg-ink hover:text-cream" : "glass-dark border-cream/25 text-cream hover:bg-cream hover:text-ink",
          )}
        >
          {s.secondary.label}
        </Link>
      )}
    </div>
  );
}

/**
 * Full-bleed campaign film. Phones get a portrait crop (smaller file, model stays centred).
 * The source is chosen after mount so only one file ever downloads; the poster shows until then.
 */
function Motion({ s, active, priority }: { s: HeroSlide; active: boolean; priority?: boolean }) {
  const [src, setSrc] = useState<{ video: string; poster: string } | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const pick = () =>
      setSrc(mq.matches || !s.mobileVideo ? { video: s.video!, poster: s.image } : { video: s.mobileVideo, poster: s.mobileImage ?? s.image });
    pick();
    mq.addEventListener("change", pick);
    return () => mq.removeEventListener("change", pick);
  }, [s.video, s.mobileVideo, s.image, s.mobileImage]);

  return (
    <div className="absolute inset-0 text-ink">
      <Image src={s.image} alt="" fill priority={priority} sizes="100vw" className={cn("object-cover", s.mobileImage && "hidden sm:block")} />
      {s.mobileImage && <Image src={s.mobileImage} alt="" fill priority={priority} sizes="100vw" className="object-cover sm:hidden" />}
      {src && <LoopVideo key={src.video} src={src.video} poster={src.poster} playing={active} priority={priority} className="absolute inset-0 size-full object-center" />}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink/45 to-transparent pointer-events-none" />
      {active && (
        <div className="absolute inset-x-3 bottom-14 sm:inset-x-auto sm:left-8 lg:left-10 sm:bottom-28 sm:w-[500px] glass rounded-[1.5rem] sm:rounded-[1.75rem] border border-white/70 p-5 sm:p-8 shadow-[0_20px_50px_-20px_rgba(34,16,30,0.45)]">
          <p className="text-[11px] tracking-[0.3em] uppercase text-plum animate-word">{s.eyebrow}</p>
          <Title s={s} className="mt-2 sm:mt-3 text-[34px] sm:text-[64px] xl:text-[72px] [&_em]:text-plum" />
          {s.text && <p className="hidden sm:block mt-4 text-[15px] text-ink-soft leading-relaxed animate-word [animation-delay:140ms]">{s.text}</p>}
          <div className="[&>div]:mt-4 sm:[&>div]:mt-6 max-sm:[&_a+a]:hidden">
            <Ctas s={s} active={active} dark />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * A finished wide banner (headline baked in) shown whole and sharp — never cropped — on an
 * ambient, blurred copy of itself, with the collection's pieces in a shoppable strip below.
 * Phones get the model-panel crop with the headline as live text.
 */
function Banner({ s, active, products }: { s: HeroSlide; active: boolean; products: HeroProduct[] }) {
  const tab = active ? 0 : -1;
  return (
    <div className="absolute inset-0 text-cream overflow-hidden">
      {/* Ambient glow */}
      <Image src={s.image} alt="" fill priority sizes="30vw" className="object-cover scale-125 blur-3xl saturate-150" />
      <div className="absolute inset-0 bg-ink/45" />

      {/* Desktop: the banner, whole */}
      <div className="hidden sm:flex absolute inset-0 flex-col px-6 lg:px-12 pt-24 lg:pt-28 pb-24 sm:pb-28">
        <Link href={s.href} tabIndex={tab} className="group relative block w-full aspect-[1920/500] rounded-3xl overflow-hidden shadow-[0_30px_60px_-25px_rgba(0,0,0,0.6)] ring-1 ring-white/15">
          <Image src={s.image} alt={`${s.title} ${s.accent ?? ""}`.trim()} fill priority sizes="(min-width:1400px) 1300px, 92vw" className={cn("object-cover transition-transform duration-[1500ms] group-hover:scale-[1.02]", active && "animate-kenburns")} />
        </Link>
        {active && (
          <div className="flex-1 flex items-center gap-8 xl:gap-12 pt-6 lg:pt-8 min-h-0">
            <div className="max-w-sm xl:max-w-md shrink-0">
              <p className="text-[11px] tracking-[0.3em] uppercase text-marigold-soft animate-word">{s.eyebrow}</p>
              <p className="sr-only" role="heading" aria-level={2}>
                {s.title} {s.accent}
              </p>
              {s.text && <p className="mt-3 text-[15px] lg:text-base text-cream/85 leading-relaxed animate-word [animation-delay:100ms]">{s.text}</p>}
              <div className="[&>div]:mt-5">
                <Ctas s={s} active={active} />
              </div>
            </div>
            {products.length > 0 && (
              <div className="hidden lg:grid flex-1 grid-cols-3 gap-3 min-w-0 animate-word [animation-delay:220ms]">
                {products.slice(0, 3).map((p) => (
                  <Link key={p.handle} href={`/products/${p.handle}`} tabIndex={tab} className="glass-dark group flex items-center gap-3 rounded-2xl p-2 pr-3 border border-cream/15 hover:border-cream/40 transition-colors min-w-0">
                    <span className="relative w-14 xl:w-16 aspect-[3/4] rounded-xl overflow-hidden bg-ink shrink-0">
                      {p.image && <Image src={p.image} alt="" fill sizes="64px" className="object-cover" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] leading-snug line-clamp-2">{p.title}</span>
                      <span className="mt-1 flex items-baseline gap-2 text-[13px] tabular-nums">
                        <span className="text-marigold-soft">{inr(p.price)}</span>
                        {p.compareAtPrice != null && p.compareAtPrice > p.price && <span className="text-cream/50 line-through text-[11px]">{inr(p.compareAtPrice)}</span>}
                      </span>
                    </span>
                    <span className="size-7 shrink-0 rounded-full bg-cream text-ink grid place-items-center transition-transform group-hover:rotate-45">
                      <ArrowUpRight className="size-3.5" />
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Phones: model panel + live headline */}
      <div className="sm:hidden absolute inset-0 flex flex-col px-3 pt-[84px] pb-16">
        <Link href={s.href} tabIndex={tab} className="relative flex-1 min-h-0 rounded-[1.5rem] overflow-hidden ring-1 ring-white/15">
          <Image src={s.mobileImage ?? s.image} alt="" fill priority sizes="100vw" style={{ objectPosition: s.mobileFocus ?? "50% 0%" }} className={cn("object-cover", active && "animate-kenburns")} />
        </Link>
        {active && (
          <div className="px-2 pt-5">
            <p className="text-[11px] tracking-[0.3em] uppercase text-marigold-soft animate-word">{s.eyebrow}</p>
            <Title s={s} className="mt-2 text-[40px] [&_em]:text-marigold-soft" />
            <div className="[&>div]:mt-4 [&_a+a]:hidden">
              <Ctas s={s} active={active} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Full-bleed landscape photo with copy bottom-left and a giant italic word drifting behind. */
function Scenic({ s, active, priority }: { s: HeroSlide; active: boolean; priority?: boolean }) {
  return (
    <div className="absolute inset-0 text-cream">
      <Image key={active ? "on" : "off"} src={s.image} alt="" fill priority={priority} sizes="100vw" className={cn("object-cover object-[50%_35%]", s.mobileImage && "hidden sm:block", active && "animate-kenburns")} />
      {s.mobileImage && <Image src={s.mobileImage} alt="" fill priority={priority} sizes="100vw" className={cn("object-cover object-[50%_25%] sm:hidden", active && "animate-kenburns")} />}
      <div className="absolute inset-0 bg-gradient-to-r from-ink/75 via-ink/25 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent" />
      <div className="absolute inset-x-0 top-[8%] overflow-hidden pointer-events-none select-none" aria-hidden>
        <div className="flex w-max animate-marquee-slow whitespace-nowrap font-display italic font-normal text-[24vw] sm:text-[13vw] leading-none text-cream/80 mix-blend-soft-light">
          {[0, 1].map((r) => (
            <span key={r} className="px-[0.2em]">
              Made for getaways <span className="not-italic text-[0.4em] align-middle">✦</span> Wander more <span className="not-italic text-[0.4em] align-middle">✦</span>
            </span>
          ))}
        </div>
      </div>
      {active && (
        <div className="absolute inset-x-0 bottom-0 px-5 sm:px-10 lg:px-12 pb-24 sm:pb-32 max-w-2xl">
          <p className="text-[11px] tracking-[0.3em] uppercase text-marigold-soft animate-word">{s.eyebrow}</p>
          <Title s={s} className="mt-3 text-[50px] sm:text-[76px] xl:text-[92px] [&_em]:text-marigold-soft" />
          {s.text && <p className="mt-5 max-w-md text-[15px] sm:text-base text-cream/85 leading-relaxed animate-word [animation-delay:140ms]">{s.text}</p>}
          <Ctas s={s} active={active} />
        </div>
      )}
    </div>
  );
}

/** Three catwalk loops across the frame, each tagged with its product; copy floats on a dark scrim. */
function Runway({ s, clips, active }: { s: HeroSlide; clips: HeroClip[]; active: boolean }) {
  const three = clips.slice(0, 3);
  return (
    <div className="absolute inset-0 text-cream">
      <div className="absolute inset-0 grid grid-cols-1 sm:grid-cols-3 gap-1.5 bg-ink">
        {three.map((c, j) => (
          <Link key={c.handle} href={`/products/${c.handle}`} tabIndex={active ? 0 : -1} className={cn("group relative overflow-hidden", j !== 1 && "hidden sm:block")}>
            <LoopVideo src={c.video} poster={c.poster} playing={active} className="absolute inset-0 size-full object-[50%_25%] transition-transform duration-700 group-hover:scale-[1.03]" />
            <span className="glass hidden lg:flex absolute right-3 top-3 items-center gap-2 rounded-full pl-3.5 pr-1.5 py-1.5 text-ink text-[12px] max-w-[85%] opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="truncate">{c.title}</span>
              <span className="shrink-0 tabular-nums font-medium">{inr(c.price)}</span>
              <span className="size-6 shrink-0 rounded-full bg-ink text-cream grid place-items-center">
                <ArrowUpRight className="size-3" />
              </span>
            </span>
          </Link>
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-transparent pointer-events-none" />
      {active && (
        <div className="absolute inset-x-0 bottom-0 px-5 sm:px-10 lg:px-12 pb-24 sm:pb-32 pointer-events-none">
          <div className="max-w-3xl pointer-events-auto">
            <p className="text-[11px] tracking-[0.3em] uppercase text-marigold-soft animate-word flex items-center gap-2">
              <span className="size-2 rounded-full bg-sale animate-pulse" /> {s.eyebrow}
            </p>
            <Title s={s} className="mt-3 text-[46px] sm:text-[72px] xl:text-[88px] [&_em]:text-marigold-soft" />
            {s.text && <p className="mt-5 max-w-md text-[15px] text-cream/85 leading-relaxed animate-word [animation-delay:140ms]">{s.text}</p>}
            <Ctas s={s} active={active} />
          </div>
        </div>
      )}
    </div>
  );
}

/** Portrait photo on one side, a cream editorial panel with craft detail tiles on the other. */
function Split({ s, active }: { s: HeroSlide; active: boolean }) {
  return (
    <div className="absolute inset-0 lg:grid lg:grid-cols-2">
      <div className="absolute inset-0 lg:relative overflow-hidden">
        <Image key={active ? "on" : "off"} src={s.image} alt="" fill sizes="(min-width:1024px) 50vw, 100vw" className={cn("object-cover object-[50%_20%]", active && "animate-kenburns")} />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent lg:hidden" />
      </div>
      <div className="absolute inset-x-0 bottom-0 lg:relative lg:inset-auto bg-transparent lg:bg-[#fffdf8] text-cream lg:text-ink flex flex-col justify-end lg:justify-center px-5 sm:px-10 lg:px-16 pb-24 sm:pb-32 lg:pb-16 lg:pt-16">
        {active && (
          <>
            <p className="text-[11px] tracking-[0.3em] uppercase text-marigold-soft lg:text-plum animate-word">{s.eyebrow}</p>
            <Title s={s} className="mt-3 text-[48px] sm:text-[72px] xl:text-[88px] [&_em]:text-marigold-soft lg:[&_em]:text-plum" />
            {s.text && <p className="mt-5 max-w-md text-[15px] text-cream/85 lg:text-ink-soft leading-relaxed animate-word [animation-delay:140ms]">{s.text}</p>}
            <div className="lg:hidden">
              <Ctas s={s} active={active} />
            </div>
            <div className="hidden lg:block">
              <Ctas s={s} active={active} dark />
            </div>
            {s.details && (
              <div className="hidden lg:grid grid-cols-2 gap-3 mt-10 max-w-md animate-word [animation-delay:260ms]">
                {s.details.map((d) => (
                  <Link key={d.href} href={d.href} tabIndex={active ? 0 : -1} className="group relative aspect-[5/4] rounded-2xl overflow-hidden bg-sand">
                    <Image src={d.image} alt="" fill sizes="220px" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                    <span className="glass absolute left-2 bottom-2 rounded-full px-3 py-1 text-[12px]">{d.label}</span>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
