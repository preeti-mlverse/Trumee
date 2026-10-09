"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Muted, looping, inline video that only downloads/plays while on screen.
 * Falls back to the poster for reduced-motion users. `hoverOnly` plays on pointer hover.
 */
export function LoopVideo({
  src,
  poster,
  className,
  hoverOnly = false,
  playing,
  priority = false,
}: {
  src: string;
  poster?: string | null;
  className?: string;
  hoverOnly?: boolean;
  /** Controlled play state (e.g. parent hover). Overrides visibility-based autoplay. */
  playing?: boolean;
  priority?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "200px 0px", threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, [src]);

  const shouldPlay = !reduced && (playing ?? (!hoverOnly && visible));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (shouldPlay) {
      if (el.preload === "none") el.preload = "auto";
      el.play().catch(() => {});
    } else el.pause();
  }, [shouldPlay, src]);

  // Our own clips also ship as AV1 (~35% smaller, same look): browsers that decode it take that,
  // the rest (older Safari/iPhone) fall through to the H.264 MP4. A missing AV1 file also falls through.
  const av1 = src.startsWith("/videos/") && src.endsWith(".mp4") ? src.replace(/\.mp4$/, ".av1.mp4") : null;

  return (
    <video
      key={src}
      ref={ref}
      poster={poster ?? undefined}
      muted
      loop
      playsInline
      preload={priority ? "auto" : "none"}
      aria-hidden
      className={cn("object-cover", className)}
      onMouseEnter={hoverOnly && playing === undefined ? (e) => !reduced && e.currentTarget.play().catch(() => {}) : undefined}
      onMouseLeave={hoverOnly && playing === undefined ? (e) => e.currentTarget.pause() : undefined}
    >
      {av1 && <source src={av1} type='video/mp4; codecs="av01.0.08M.08"' />}
      <source src={src} type="video/mp4" />
    </video>
  );
}
