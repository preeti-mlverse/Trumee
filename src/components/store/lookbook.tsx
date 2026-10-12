"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn, inr } from "@/lib/utils";

export type LookProduct = { handle: string; title: string; price: number; compareAtPrice: number | null; image: string | null };
export type Look = { image: string; alt: string; products: LookProduct[] };

/**
 * Lookbook in the style of Shopify's Sky theme: the looks drift continuously from left to right.
 * Depth of field follows position — far left is faint and blurred, sharpening as a look travels
 * right, until it leaves the frame. The look in focus (right of centre) drives the "shop the look"
 * column, whose cards glide up in step. Runs on its own; no scrolling or clicking needed.
 */
export function Lookbook({ title, text, looks, speed = 16 }: { title: string; text: string; looks: Look[]; speed?: number }) {
  const stage = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLDivElement | null)[]>([]);
  const [focus, setFocus] = useState(0);
  const focusRef = useRef(0);
  const n = looks.length;

  useEffect(() => {
    const el = stage.current;
    if (!el || n < 2) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let offset = 0;
    let last = performance.now();
    let raf = 0;
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { rootMargin: "200px" });
    io.observe(el);

    const frame = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const W = el.clientWidth;
      const cardW = items.current[0]?.offsetWidth ?? W * 0.3;
      const gap = cardW + (W < 640 ? 16 : 28); // distance between looks: card width + gutter
      const span = gap * n;
      if (visible && !reduced && !document.hidden) offset = (offset + (speed * dt) / 1000) % span;
      let best = -1;
      let bestD = Infinity;
      items.current.forEach((node, k) => {
        if (!node) return;
        // x = left edge position; wraps so looks re-enter from the left
        const x = ((k * gap + offset) % span) - gap;
        const w = node.offsetWidth;
        const centre = x + w / 2;
        const p = Math.max(0, Math.min(1, centre / W)); // 0 = far left, 1 = far right
        const sharp = Math.min(1, p / 0.62); // reaches full focus at ~62% across
        node.style.transform = `translate3d(${x}px,0,0)`;
        node.style.opacity = String(0.18 + 0.82 * sharp);
        node.style.filter = sharp >= 0.995 ? "none" : `blur(${((1 - sharp) * 12).toFixed(1)}px)`;
        node.style.zIndex = String(Math.round(p * 10));
        // In focus = sharp, fully on screen, closest to 70% across
        const d = Math.abs(centre - W * 0.7);
        if (x > W * 0.35 && x + w < W + 1 && d < bestD) {
          bestD = d;
          best = k;
        }
      });
      if (best >= 0 && best !== focusRef.current) {
        focusRef.current = best;
        setFocus(best);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [n, speed]);

  return (
    <section className="bg-sand overflow-hidden">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex flex-col lg:h-[640px]">
          {/* Heading on its own row — the looks travel in the band below, never under the text */}
          <div className="px-4 sm:px-10 pt-8 sm:pt-12 pb-6 max-w-[40rem]">
            <h2 className="font-display text-[40px] sm:text-[60px] leading-[0.95]">{title}</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">{text}</p>
          </div>
          <div ref={stage} className="relative flex-1 min-h-[340px] sm:min-h-[420px] overflow-hidden">
          {looks.map((l, k) => (
            <div
              key={l.image}
              ref={(node) => {
                items.current[k] = node;
              }}
              className="absolute left-0 bottom-6 sm:bottom-8 top-2 aspect-[3/5] will-change-transform"
              style={{ transform: "translate3d(-200%,0,0)" }}
            >
              <span className="relative block size-full overflow-hidden rounded-[1.25rem]">
                <Image src={l.image} alt={l.alt} fill sizes="(min-width:1024px) 18vw, 45vw" className="object-cover object-top" />
              </span>
            </div>
          ))}
          </div>
        </div>

        {/* Shop the look: every look's cards in order; the column glides to the look in focus */}
        <div className="relative bg-sand lg:border-l lg:border-ink/5 h-[440px] sm:h-[520px] lg:h-[640px] overflow-hidden [--group-h:440px] sm:[--group-h:520px] lg:[--group-h:640px]">
          <div className="transition-transform duration-[2200ms] ease-[cubic-bezier(0.65,0,0.35,1)]" style={{ transform: `translateY(calc(-${focus} * var(--group-h)))` }}>
            {looks.map((l, k) => (
              <div key={l.image} className="h-[var(--group-h)] px-4 sm:px-6 pt-6 grid grid-cols-2 lg:grid-cols-1 gap-4 content-start">
                {l.products.map((p) => (
                  <Link
                    key={p.handle}
                    href={`/products/${p.handle}`}
                    tabIndex={k === focus ? 0 : -1}
                    className={cn("group block rounded-[1.25rem] bg-paper overflow-hidden transition-opacity duration-700", k === focus ? "opacity-100" : "opacity-40")}
                  >
                    <span className="relative block aspect-[4/5] lg:aspect-[4/3] bg-paper">
                      {p.image && <Image src={p.image} alt={p.title} fill sizes="(min-width:1024px) 360px, 45vw" className="object-cover object-top transition-transform duration-700 group-hover:scale-[1.03]" />}
                    </span>
                    <span className="block px-5 py-4">
                      <span className="block text-[14px] leading-snug line-clamp-1">{p.title}</span>
                      <span className="mt-1 flex items-baseline gap-2 tabular-nums">
                        <span className="font-semibold">{inr(p.price)}</span>
                        {p.compareAtPrice && p.compareAtPrice > p.price && <span className="text-xs text-muted line-through">{inr(p.compareAtPrice)}</span>}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
