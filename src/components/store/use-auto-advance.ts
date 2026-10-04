"use client";

import { type RefObject, useEffect } from "react";

/**
 * Steps a horizontal scroll rail one card at a time on a steady beat, looping back to the start.
 * Runs only while the rail is on screen; a touch/drag by the shopper pauses it briefly so it never
 * fights their finger. Skipped for reduced-motion users.
 */
export function useAutoAdvance(ref: RefObject<HTMLElement | null>, everyMs = 3000, resetKey?: unknown) {
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let visible = false;
    let holdUntil = 0;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0.4 });
    io.observe(el);
    const hold = () => (holdUntil = Date.now() + 5000);
    el.addEventListener("pointerdown", hold);
    el.addEventListener("touchstart", hold, { passive: true });
    el.addEventListener("wheel", hold, { passive: true });

    const tick = setInterval(() => {
      if (!visible || Date.now() < holdUntil || document.hidden) return;
      const first = el.firstElementChild as HTMLElement | null;
      const gap = parseFloat(getComputedStyle(el).columnGap || "0") || 0;
      const step = (first?.offsetWidth ?? el.clientWidth * 0.8) + gap;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
      el.scrollTo({ left: atEnd ? 0 : el.scrollLeft + step, behavior: "smooth" });
    }, everyMs);

    return () => {
      clearInterval(tick);
      io.disconnect();
      el.removeEventListener("pointerdown", hold);
      el.removeEventListener("touchstart", hold);
      el.removeEventListener("wheel", hold);
    };
  }, [ref, everyMs, resetKey]);
}
