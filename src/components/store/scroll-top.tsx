"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const R = 21;
const C = 2 * Math.PI * R;

/** Round back-to-top button whose ring fills as you read down the page. */
export function ScrollTop() {
  const [p, setP] = useState(0);
  useEffect(() => {
    let frame = 0;
    const on = () =>
      (frame ||= requestAnimationFrame(() => {
        frame = 0;
        const max = document.documentElement.scrollHeight - innerHeight;
        setP(max > 0 ? Math.min(1, scrollY / max) : 0);
      }));
    on();
    addEventListener("scroll", on, { passive: true });
    return () => {
      removeEventListener("scroll", on);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <button
      aria-label="Back to top"
      onClick={() => scrollTo({ top: 0, behavior: "smooth" })}
      className={cn(
        "glass fixed right-3 sm:right-5 bottom-20 sm:bottom-6 z-30 size-12 rounded-full grid place-items-center shadow-lg shadow-ink/10 transition-all duration-300 hover:scale-105",
        p > 0.08 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none",
      )}
    >
      <svg viewBox="0 0 48 48" className="absolute inset-0 size-full -rotate-90" aria-hidden>
        <circle cx="24" cy="24" r={R} fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="2" />
        <circle cx="24" cy="24" r={R} fill="none" stroke="var(--color-sea)" strokeWidth="2" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - p)} />
      </svg>
      <ArrowUp className="size-4" strokeWidth={1.8} />
    </button>
  );
}
