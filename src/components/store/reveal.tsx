"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Fades and lifts its children into view the first time they scroll on screen. With `stagger`,
 * direct children animate one after another. No-op for reduced-motion users (CSS handles it).
 */
export function Reveal({ children, className, stagger = false, as: Tag = "div" }: { children: React.ReactNode; className?: string; stagger?: boolean; as?: "div" | "section" | "ul" }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px 15% 0px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref as never} data-reveal={shown ? "in" : "out"} className={cn(stagger ? "reveal-stagger" : "reveal", className)}>
      {children}
    </Tag>
  );
}

/** Counts up from 0 to `to` once visible. */
export function CountUp({ to, prefix = "", suffix = "", ms = 1400 }: { to: number; prefix?: string; suffix?: string; ms?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [v, setV] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const step = (t: number) => {
        const p = Math.min(1, (t - start) / ms);
        setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, ms]);
  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {v.toLocaleString("en-IN")}
      {suffix}
    </span>
  );
}
