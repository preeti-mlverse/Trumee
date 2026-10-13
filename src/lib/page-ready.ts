"use client";

import { useEffect, useState } from "react";

/**
 * Resolves once the page has finished loading and the browser is idle, so decorative media
 * (videos, later hero slides) never competes with the first paint on slow phones.
 */
let ready: Promise<void> | null = null;

export function whenPageReady(): Promise<void> {
  if (ready) return ready;
  ready = new Promise<void>((resolve) => {
    const idle = () => ("requestIdleCallback" in window ? window.requestIdleCallback(() => resolve(), { timeout: 2500 }) : setTimeout(resolve, 1200));
    if (document.readyState === "complete") idle();
    else window.addEventListener("load", idle, { once: true });
  });
  return ready;
}

export function usePageReady() {
  const [isReady, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    whenPageReady().then(() => live && setReady(true));
    return () => {
      live = false;
    };
  }, []);
  return isReady;
}

/** True when the shopper asked to save data or is on a 2G-class connection: show posters, not video. */
export function prefersLiteMedia() {
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return !!c && (c.saveData === true || /(^|-)2g$/.test(c.effectiveType ?? ""));
}
