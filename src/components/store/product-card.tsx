"use client";

import { Heart, Play, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { track } from "@/lib/analytics/client";
import type { CardProduct } from "@/lib/catalog";
import { cn, discountPercent, inr } from "@/lib/utils";
import { useWishlist } from "./cart-context";
import { LoopVideo } from "./loop-video";

export function ProductCard({ p, list, index = 0, priority }: { p: CardProduct; list?: string; index?: number; priority?: boolean }) {
  const { ids, toggle } = useWishlist();
  const [hover, setHover] = useState(false);
  const saved = ids.includes(p.id);
  const off = discountPercent(p.price, p.compareAtPrice);
  const [a, b] = p.images;
  const sizes = "(min-width:1280px) 25vw, (min-width:768px) 33vw, 50vw";

  return (
    <div className="group relative" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <Link
        href={`/products/${p.handle}`}
        onClick={() =>
          track("select_item", {
            item_list_name: list,
            product_id: p.id,
            items: [{ item_id: p.id, item_name: p.title, price: p.price / 100, item_category: p.productType, index }],
          })
        }
        className="block"
      >
        <div className="relative aspect-[2/3] overflow-hidden rounded-card bg-sand isolate">
          {a && (
            <Image
              src={a.url}
              alt={a.alt || p.title}
              fill
              priority={priority}
              sizes={sizes}
              className={cn("object-cover transition duration-700", (b || p.video) && "group-hover:opacity-0")}
            />
          )}
          {p.video ? (
            <LoopVideo
              src={p.video.url}
              poster={p.video.poster}
              playing={hover}
              className="absolute inset-0 size-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
          ) : (
            b && (
              <Image
                src={b.url}
                alt=""
                fill
                sizes={sizes}
                className="object-cover opacity-0 scale-105 transition duration-700 group-hover:opacity-100 group-hover:scale-100"
              />
            )
          )}
          <div className="absolute left-2.5 top-2.5 sm:left-3 sm:top-3 flex flex-col items-start gap-1">
            {p.soldOut ? (
              <span className="rounded-full bg-paper text-ink text-[10px] sm:text-[11px] tracking-[0.1em] uppercase px-2.5 sm:px-3 py-1">Sold out</span>
            ) : off >= 5 ? (
              <span className="rounded-full bg-paper text-ink text-[10px] sm:text-[11px] font-medium tracking-[0.06em] px-2.5 sm:px-3 py-1 tabular-nums">{off}% off</span>
            ) : null}
          </div>
          {p.video && (
            <span className="glass-dark absolute left-2.5 bottom-2.5 sm:left-3 sm:bottom-3 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] tracking-[0.16em] uppercase text-cream group-hover:opacity-0 transition-opacity">
              <Play className="size-3 fill-current" /> Watch
            </span>
          )}
          {!p.soldOut && p.sizes.length > 0 && (
            <div className="glass hidden md:flex absolute inset-x-3 bottom-3 translate-y-[calc(100%+1rem)] group-hover:translate-y-0 transition-transform duration-300 rounded-full text-ink px-3 py-2 gap-3.5 justify-center text-[12px] tracking-wider">
              {p.sizes.map((s) => (
                <span key={s.value} className={cn(!s.available && "line-through opacity-40")}>
                  {s.value}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="pt-3.5 px-0.5">
          <h3 className="text-[13px] sm:text-[15px] leading-snug line-clamp-2 text-ink-soft group-hover:text-ink">{p.title}</h3>
          <div className="mt-1.5 flex items-baseline gap-2 text-[15px] tabular-nums">
            <span className={cn("font-medium", off > 0 && "text-sea")}>{inr(p.price)}</span>
            {off > 0 && <span className="text-xs text-muted line-through">{inr(p.compareAtPrice)}</span>}
          </div>
          {p.reviewCount > 0 && p.rating && (
            <div className="mt-1 flex items-center gap-1 text-xs text-muted">
              <Star className="size-3 fill-sun text-sun" /> {p.rating.toFixed(1)} ({p.reviewCount})
            </div>
          )}
        </div>
      </Link>
      <button
        aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
        onClick={() => toggle(p.id, p.title)}
        className="glass absolute right-2.5 top-2.5 sm:right-3 sm:top-3 size-9 grid place-items-center rounded-full transition-transform hover:scale-110"
      >
        <Heart className={cn("size-[17px]", saved ? "fill-sea text-sea" : "text-ink-soft")} strokeWidth={1.5} />
      </button>
    </div>
  );
}

export function ProductGrid({ items, list, className }: { items: CardProduct[]; list?: string; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-3 sm:gap-x-5 gap-y-10 sm:gap-y-14", className)}>
      {items.map((p, i) => (
        <ProductCard key={p.id} p={p} list={list} index={i} priority={i < 4} />
      ))}
    </div>
  );
}
