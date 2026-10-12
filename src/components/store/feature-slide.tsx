"use client";

import Image from "next/image";
import Link from "next/link";
import { cn, inr } from "@/lib/utils";
import { LoopVideo } from "./loop-video";

export type FeatureMedia = { image: string; video?: string; href: string; label: string; price: number };
export type FeatureBanner = {
  kind: "feature";
  tone: "sea" | "sun";
  eyebrow: string;
  title: string;
  accent: string;
  text: string;
  /** Giant outlined word drifting behind the stage */
  word: string;
  href: string;
  cta: string;
  alt: string;
  secondary?: { label: string; href: string };
  /** Exactly two pieces: the lead (tall) frame and the second (offset) frame */
  media: [FeatureMedia, FeatureMedia];
  /** Optional round close-up of a real detail (embroidery, lace…) */
  detail?: { image: string; label: string; href: string };
};

const TONES = {
  sea: {
    stage: "bg-[radial-gradient(120%_120%_at_78%_30%,#1d6188_0%,#134560_55%,#0e3347_100%)] text-cream",
    stroke: "[-webkit-text-stroke:1px_rgba(250,246,239,0.22)]",
    accent: "text-sun",
    muted: "text-cream/75",
    solid: "bg-cream text-ink hover:bg-white",
    outline: "border border-cream/70 text-cream hover:bg-cream hover:text-ink",
    chip: "bg-cream text-ink",
    badge: "text-cream",
  },
  sun: {
    stage: "bg-[radial-gradient(120%_120%_at_78%_30%,#ecbd4a_0%,#d9a21b_52%,#b9850f_100%)] text-ink",
    stroke: "[-webkit-text-stroke:1px_rgba(22,22,22,0.18)]",
    accent: "text-sea-dark",
    muted: "text-ink/75",
    solid: "bg-ink text-cream hover:bg-ink-soft",
    outline: "border border-ink/70 text-ink hover:bg-ink hover:text-cream",
    chip: "bg-paper text-ink",
    badge: "text-ink",
  },
} as const;

/**
 * Composed hero slide built from real product media (no artwork file). Everything is laid out in
 * container-query units (cqw) on the banner's own 1896:829 stage, so the composition scales exactly
 * like the artwork banners around it. Arrival choreography (when `active`): photos wipe open like a
 * curtain, headline lines rise, price tags and badge settle — then frames drift with the pointer via
 * the --mx/--my variables set by the slider. Exits reset only after the slide has left the screen.
 */
export function FeatureSlide({ b, active, priority }: { b: FeatureBanner; active: boolean; priority?: boolean }) {
  const t = TONES[b.tone];
  const [lead, second] = b.media;
  // Enter with easing; reset instantly but only once the slide has slid away (900 ms)
  const enter = (delay: number) => (active ? { transitionDelay: `${delay}ms` } : { transitionDelay: "900ms", transitionDuration: "0ms" });

  return (
    <div className={cn("@container absolute inset-0 overflow-hidden", t.stage)}>
      {/* Drifting outlined word */}
      <div aria-hidden className="absolute inset-x-0 bottom-[-3cqw] overflow-hidden pointer-events-none select-none">
        <div className={cn("flex w-max animate-marquee-slow whitespace-nowrap font-display font-medium uppercase leading-none text-transparent", t.stroke)} style={{ fontSize: "19cqw" }}>
          {[0, 1].map((k) => (
            <span key={k} className="pr-[4cqw]">
              {b.word} · {b.word} ·&nbsp;
            </span>
          ))}
        </div>
      </div>

      {/* Copy */}
      <div className="absolute left-[5cqw] top-1/2 -translate-y-1/2 w-[38cqw]">
        <p className={cn("hidden sm:block uppercase font-medium tracking-[0.32em] transition-all duration-700", t.muted, active ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2")} style={{ fontSize: "max(0.78cqw,10px)", ...enter(150) }}>
          {b.eyebrow}
        </p>
        <h2 className="font-display leading-[0.92] tracking-[-0.01em] mt-[1.2cqw]" style={{ fontSize: "max(5.6cqw,24px)" }}>
          {[b.title, b.accent].map((line, i) => (
            <span key={line} className="block overflow-hidden pb-[0.25em] -mb-[0.25em]">
              <span
                className={cn("block transition-transform duration-[900ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]", i === 1 && cn("italic font-normal", t.accent), active ? "translate-y-0" : "translate-y-[110%]")}
                style={enter(250 + i * 120)}
              >
                {line}
              </span>
            </span>
          ))}
        </h2>
        <p className={cn("hidden sm:block mt-[1.4cqw] max-w-[30cqw] leading-relaxed transition-all duration-700", t.muted, active ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3")} style={{ fontSize: "max(1.05cqw,13px)", ...enter(500) }}>
          {b.text}
        </p>
        <div className={cn("hidden sm:flex flex-wrap gap-3 mt-[2.2cqw] transition-all duration-700", active ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3")} style={enter(650)}>
          <Link href={b.href} tabIndex={active ? 0 : -1} className={cn("inline-flex items-center justify-center h-11 lg:h-[52px] w-[176px] lg:w-[216px] whitespace-nowrap text-[11px] lg:text-[13px] font-medium tracking-[0.16em] uppercase transition-colors", t.solid)}>
            {b.cta}
          </Link>
          {b.secondary && (
            <Link href={b.secondary.href} tabIndex={active ? 0 : -1} className={cn("inline-flex items-center justify-center h-11 lg:h-[52px] w-[176px] lg:w-[216px] whitespace-nowrap text-[11px] lg:text-[13px] font-medium tracking-[0.16em] uppercase transition-colors", t.outline)}>
              {b.secondary.label}
            </Link>
          )}
        </div>
      </div>

      {/* Stage: two framed pieces (lead + offset second), each with a hanging price tag */}
      {[
        { m: lead, box: { left: "45cqw", top: "3.6cqw", width: "20cqw", height: "36.4cqw" }, depth: 14, delay: 100 },
        { m: second, box: { left: "67.6cqw", top: "9.4cqw", width: "15.6cqw", height: "28.4cqw" }, depth: 26, delay: 280 },
      ].map(({ m, box, depth, delay }, i) => (
        <div
          key={m.href}
          className="absolute will-change-transform transition-transform duration-[600ms] ease-out"
          style={{ ...box, transform: `translate3d(calc(var(--mx,0) * ${depth}px), calc(var(--my,0) * ${depth * 0.6}px), 0)` }}
        >
          <Link
            href={m.href}
            tabIndex={-1}
            aria-label={`${m.label} — ${inr(m.price)}`}
            className={cn(
              "group relative block size-full overflow-hidden rounded-[1.1cqw] shadow-[0_2cqw_4cqw_-2cqw_rgba(0,0,0,0.55)] transition-[clip-path] duration-[1100ms] ease-[cubic-bezier(0.77,0,0.18,1)]",
              active ? "[clip-path:inset(0_0_0_0_round_1.1cqw)]" : "[clip-path:inset(100%_0_0_0_round_1.1cqw)]",
            )}
            style={enter(delay)}
          >
            {m.video ? (
              <LoopVideo src={m.video} poster={m.image} playing={active} className="absolute inset-0 size-full object-[50%_22%]" />
            ) : (
              <Image
                src={m.image}
                alt={m.label}
                fill
                priority={priority && i === 0}
                sizes="(min-width:1024px) 22vw, 40vw"
                className={cn("object-cover object-[50%_18%] transition-transform duration-[6000ms] ease-out group-hover:scale-[1.04]", active ? "scale-100" : "scale-[1.12]")}
              />
            )}
          </Link>
          <Link
            href={m.href}
            tabIndex={active ? 0 : -1}
            className={cn(
              "hidden sm:flex absolute -left-[1.4cqw] bottom-[2.2cqw] items-baseline gap-[0.8cqw] px-[1cqw] py-[0.6cqw] shadow-[0_0.8cqw_2cqw_-1cqw_rgba(0,0,0,0.45)] transition-all duration-700 hover:-translate-y-0.5",
              t.chip,
              active ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3",
            )}
            style={{ fontSize: "max(0.82cqw,11px)", ...enter(900 + i * 150) }}
          >
            <span className="whitespace-nowrap">{m.label}</span>
            <span className="font-semibold tabular-nums whitespace-nowrap">{inr(m.price)}</span>
          </Link>
        </div>
      ))}

      {/* Detail close-up */}
      {b.detail && (
        <Link
          href={b.detail.href}
          tabIndex={active ? 0 : -1}
          className={cn("hidden sm:block absolute group transition-all duration-[900ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]", active ? "opacity-100 scale-100" : "opacity-0 scale-75")}
          style={{ left: "85.2cqw", top: "24cqw", width: "10.4cqw", height: "10.4cqw", ...enter(1050) }}
        >
          <span className="relative block size-full rounded-full overflow-hidden ring-[0.35cqw] ring-paper shadow-[0_1.2cqw_2.4cqw_-1.2cqw_rgba(0,0,0,0.5)]">
            <Image src={b.detail.image} alt={b.detail.label} fill sizes="160px" className="object-cover transition-transform duration-700 group-hover:scale-110" />
          </span>
          <span className={cn("absolute left-1/2 -translate-x-1/2 top-full mt-[0.8cqw] whitespace-nowrap uppercase tracking-[0.2em]", t.muted)} style={{ fontSize: "max(0.7cqw,10px)" }}>
            {b.detail.label}
          </span>
        </Link>
      )}

      {/* Rotating badge */}
      <Link
        href={b.href}
        tabIndex={-1}
        aria-hidden
        className={cn("hidden sm:block absolute transition-all duration-700", t.badge, active ? "opacity-100" : "opacity-0")}
        style={{ left: "86cqw", top: "5cqw", width: "8.4cqw", height: "8.4cqw", ...enter(1200) }}
      >
        <svg viewBox="0 0 100 100" className="size-full animate-[spin_22s_linear_infinite] motion-reduce:animate-none">
          <defs>
            <path id={`ring-${b.tone}`} d="M50 50 m-38 0 a38 38 0 1 1 76 0 a38 38 0 1 1 -76 0" />
          </defs>
          {/* textLength = ring circumference, so any label wraps the circle exactly once */}
          <text fill="currentColor" style={{ fontSize: 9.5, textTransform: "uppercase" }}>
            <textPath href={`#ring-${b.tone}`} textLength="236" lengthAdjust="spacing">
              {b.cta} · New season ·
            </textPath>
          </text>
        </svg>
        <span className="absolute inset-0 grid place-items-center">
          <svg viewBox="0 0 24 24" className="w-[28%] h-[28%]" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M7 17 17 7M9 7h8v8" />
          </svg>
        </span>
      </Link>
    </div>
  );
}
