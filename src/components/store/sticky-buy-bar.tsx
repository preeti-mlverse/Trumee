"use client";

import { useEffect, useState } from "react";
import { cn, inr } from "@/lib/utils";

/** Mobile-only bar that appears once the main buy box scrolls away; tapping it returns there. */
export function StickyBuyBar({ title, price, soldOut }: { title: string; price: number; soldOut: boolean }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = document.getElementById("buy-box");
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      className={cn(
        "glass lg:hidden fixed inset-x-2 bottom-2 z-30 rounded-3xl border border-white/60 shadow-xl shadow-ink/15 px-3 py-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center gap-3 transition-transform duration-300",
        show ? "translate-y-0" : "translate-y-full",
      )}
      aria-hidden={!show}
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted truncate">{title}</p>
        <p className="text-sm font-medium tabular-nums">{inr(price)}</p>
      </div>
      <button
        tabIndex={show ? 0 : -1}
        disabled={soldOut}
        onClick={() => document.getElementById("buy-box")?.scrollIntoView({ behavior: "smooth", block: "center" })}
        className="rounded-full bg-ink text-cream px-6 py-3 text-[11px] tracking-[0.2em] uppercase disabled:opacity-50"
      >
        {soldOut ? "Sold out" : "Choose size"}
      </button>
    </div>
  );
}
