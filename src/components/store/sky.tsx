"use client";

import { useEffect } from "react";

/**
 * Sunlit backdrop: the page is one vacation day. Scrolling moves the sky from
 * dawn through noon and golden hour to dusk, with a soft sun arcing across.
 * Colours are written to CSS variables on <html>; the defaults in globals.css are dawn.
 */
type RGB = [number, number, number];
const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;

//            at    sky top              sky bottom           sun
const DAY: [number, RGB, RGB, RGB][] = [
  [0.0, hex("#efdfc4"), hex("#f5ecdd"), hex("#f3c98c")], // dawn — warm sand
  [0.25, hex("#fbe6c4"), hex("#f6efe3"), hex("#ffd98a")], // morning — pale gold
  [0.5, hex("#f5f1e6"), hex("#e3edef"), hex("#fff3c4")], // noon — bone & washed sky
  [0.75, hex("#f9d9a0"), hex("#f4c29c"), hex("#ffb347")], // golden hour — marigold
  [1.0, hex("#e8b2ae"), hex("#b7a2c6"), hex("#ff7a5c")], // dusk — rose into lavender
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
