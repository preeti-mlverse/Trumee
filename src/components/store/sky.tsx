"use client";

import { useEffect } from "react";

/**
 * Sunlit backdrop: the page is one vacation day. Scrolling moves the sky from
 * morning through a sea-breeze noon to golden hour, with a soft sun arcing across —
 * always within the brand palette (sand, sea, sun).
 * Colours are written to CSS variables on <html>; the defaults in globals.css are dawn.
 */
type RGB = [number, number, number];
const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;

//            at    sky top              sky bottom           sun
const DAY: [number, RGB, RGB, RGB][] = [
  [0.0, hex("#f6efe3"), hex("#faf6ef"), hex("#f5e0a3")], // morning — warm sand
  [0.3, hex("#f3f2ec"), hex("#f7f5ef"), hex("#f8e8b8")], // late morning — sand, a hint of shade
  [0.55, hex("#e9f1f4"), hex("#f7f4ec"), hex("#fbeec6")], // noon — sea breeze over sand
  [0.8, hex("#f5ead3"), hex("#f9f2e4"), hex("#f0cf75")], // golden hour — the mustard sun
  [1.0, hex("#e6eef1"), hex("#f4efe6"), hex("#e2bd5c")], // evening — cool sea, last of the sun
];

const mix = (a: RGB, b: RGB, t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * t)) as RGB;
const css = ([r, g, b]: RGB, a = 1) => `rgb(${r} ${g} ${b} / ${a})`;

function skyAt(p: number) {
  const i = Math.max(0, DAY.findIndex(([at]) => at >= p) - 1);
  const [a0, ...from] = DAY[i];
  const [a1, ...to] = DAY[Math.min(i + 1, DAY.length - 1)];
  const t = a1 === a0 ? 0 : (p - a0) / (a1 - a0);
  return from.map((c, k) => mix(c, to[k], t)) as [RGB, RGB, RGB];
}

export function SkyBackdrop() {
  useEffect(() => {
    const root = document.documentElement.style;
    let frame = 0;
    const paint = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
      const [top, bottom, sun] = skyAt(p);
      root.setProperty("--sky-top", css(top));
      root.setProperty("--sky-bottom", css(bottom));
      root.setProperty("--sky-head", css(top, 0.86));
      root.setProperty("--sun", css(sun, 0.55));
      // Sun rises bottom-left, peaks at noon, sets bottom-right
      root.setProperty("--sun-x", `${12 + p * 76}%`);
      root.setProperty("--sun-y", `${88 - Math.sin(p * Math.PI) * 74}%`);
    };
    const onScroll = () => (frame ||= requestAnimationFrame(paint));
    paint();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return <div aria-hidden className="sky-backdrop fixed inset-0 -z-10 pointer-events-none" />;
}
