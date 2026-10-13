"use client";

import { useEffect, useRef, useState } from "react";
import { preload } from "react-dom";
import { prefersLiteMedia, usePageReady } from "@/lib/page-ready";
import { cn } from "@/lib/utils";

/**
 * Muted, looping, inline video that only downloads/plays while on screen, and never before the
 * page has loaded — the poster is what paints first. Falls back to the poster for reduced-motion
 * and save-data users. `hoverOnly` plays on pointer hover. `priority` preloads the poster only.
 */
export function LoopVideo({
  src,
  poster,
  className,
  hoverOnly = false,
  playing,
  priority = false,
  small = false,
}: {
  src: string;
  poster?: string | null;
  className?: string;
  hoverOnly?: boolean;
  /** Controlled play state (e.g. parent hover). Overrides visibility-based autoplay. */
  playing?: boolean;
  priority?: boolean;
  /** Card-sized slot: use the 480px `.sm` encodes (about a third of the bytes). */
  small?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);
  const pageReady = usePageReady();
  if (priority && poster) preload(poster, { as: "image", fetchPriority: "high" }); // only when no <Image> already paints the poster

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches || prefersLiteMedia());
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, [src]);

  // Even a controlled (`playing`) video waits for the page to load and pauses when scrolled away.
  const shouldPlay = pageReady && !reduced && visible && (playing ?? !hoverOnly);

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
  // Card slots take the 480px `.sm` encodes first; a missing file falls through to the full-size ones.
  const own = src.startsWith("/videos/") && src.endsWith(".mp4");
  const av1 = own ? src.replace(/\.mp4$/, ".av1.mp4") : null;
  const sm = own && small ? { av1: src.replace(/\.mp4$/, ".sm.av1.mp4"), mp4: src.replace(/\.mp4$/, ".sm.mp4") } : null;

  return (
    <video
      key={src}
      ref={ref}
      poster={poster ?? undefined}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden
      className={cn("object-cover", className)}
      onMouseEnter={hoverOnly && playing === undefined ? (e) => !reduced && pageReady && e.currentTarget.play().catch(() => {}) : undefined}
      onMouseLeave={hoverOnly && playing === undefined ? (e) => e.currentTarget.pause() : undefined}
    >
      {sm && <source src={sm.av1} type='video/mp4; codecs="av01.0.08M.08"' />}
      {sm && <source src={sm.mp4} type="video/mp4" />}
      {av1 && <source src={av1} type='video/mp4; codecs="av01.0.08M.08"' />}
      <source src={src} type="video/mp4" />
    </video>
  );
}
