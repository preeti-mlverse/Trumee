"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { PillLink } from "./ui";

export type SpotlightEdit = { handle: string; title: string; image: string | null; text: string };

const TICK = 4000;

/**
 * The Edits as a moodboard index: a cream card listing every edit (the active one lit),
 * beside a large photograph with a glass card that describes it.
 */
export function EditSpotlight({ edits }: { edits: SpotlightEdit[] }) {
  const [i, setI] = useState(0);
  const e = edits[i];

  useEffect(() => {
    if (edits.length < 2) return;
    const t = setTimeout(() => setI((x) => (x + 1) % edits.length), TICK);
    return () => clearTimeout(t);
  }, [i, edits.length]);

  if (!e) return null;
  return (
    <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-3 sm:gap-4">
      <div className="relative rounded-panel bg-paper overflow-hidden flex flex-col px-6 sm:px-10 pt-9 pb-6 min-h-[420px] lg:min-h-[620px]">
        <p className="text-[11px] tracking-[0.3em] uppercase text-sea text-center">Our moodboards</p>
        <ul className="flex-1 flex flex-col justify-center gap-1 sm:gap-2 py-8 text-center">
          {edits.map((x, k) => (
            <li key={x.handle}>
              <button
                onClick={() => setI(k)}
                onMouseEnter={() => setI(k)}
                className={cn(
                  "font-display text-[30px] sm:text-[44px] leading-[1.1] transition-all duration-500",
                  k === i ? "text-ink" : "text-ink/25 hover:text-ink/60",
                )}
              >
                {k === i ? <em className="font-medium">{x.title}</em> : x.title}
              </button>
            </li>
          ))}
        </ul>
        <div className="-mx-6 sm:-mx-10 overflow-hidden border-t border-line/70 pt-4" aria-hidden>
          <div className="flex w-max animate-marquee whitespace-nowrap text-[13px] tracking-[0.06em] text-ink-soft">
            {[0, 1].map((r) => (
              <span key={r} className="flex">
                {["Timeless fits, free spirit", "Designed to be noticed", "Made for getaways", "Crafted in India"].map((t) => (
                  <span key={t} className="px-5 flex items-center gap-5">
                    {t} <span className="size-1 rounded-full bg-sea" />
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="relative rounded-panel overflow-hidden bg-ink min-h-[600px] lg:min-h-[620px] isolate">
        {edits.map((x, k) =>
          x.image ? (
            <Image
              key={x.handle}
              src={x.image}
              alt=""
              fill
              sizes="(min-width:1024px) 58vw, 100vw"
              className={cn("object-cover object-[50%_30%] transition-opacity duration-1000", k === i ? "opacity-100" : "opacity-0")}
            />
          ) : null,
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/50 via-transparent to-transparent" />
        <div key={e.handle} className="glass-dark absolute inset-x-3 bottom-3 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[420px] rounded-3xl border border-cream/15 p-6 sm:p-7 text-cream animate-word">
          <p className="text-[10px] tracking-[0.28em] uppercase text-sun-soft">The edit</p>
          <p className="font-display text-[34px] sm:text-[40px] leading-[1] mt-2">{e.title}</p>
          {e.text && <p className="text-[15px] text-cream/80 mt-3 leading-relaxed line-clamp-3">{e.text}</p>}
          <PillLink href={`/collections/${e.handle}`} className="mt-6">
            Explore the edit
          </PillLink>
        </div>
      </div>
    </div>
  );
}
