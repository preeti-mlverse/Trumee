"use client";

import { Heart, Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn, discountPercent, inr } from "@/lib/utils";
import { useCart, useWishlist } from "./cart-context";
import { SizeGuideButton } from "./trust";

type V = { id: number; title: string; option1: string | null; option2: string | null; price: number; compareAtPrice: number | null; available: boolean; lowStock: boolean };

export function ProductForm({ productId, title, options, variants, prepaidPercent = 0 }: { productId: number; title: string; options: { name: string; values: string[] }[]; variants: V[]; prepaidPercent?: number }) {
  const { add } = useCart();
  const { ids, toggle } = useWishlist();
  const router = useRouter();
  const sizeOpt = options.find((o) => o.name.toLowerCase() === "size");
  const colorOpt = options.find((o) => o.name.toLowerCase() === "color" || o.name.toLowerCase() === "colour");
  const [size, setSize] = useState<string | null>(variants.length === 1 ? variants[0].option1 : null);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"add" | "buy" | null>(null);

  const variant = variants.length === 1 ? variants[0] : variants.find((v) => v.option1 === size) ?? null;
  const display = variant ?? variants.reduce((a, b) => (b.price < a.price ? b : a), variants[0]);
  const off = discountPercent(display.price, display.compareAtPrice);
  const allSoldOut = !variants.some((v) => v.available);

  const submit = async (mode: "add" | "buy") => {
    if (!variant) {
      setError(`Please choose a ${sizeOpt?.name.toLowerCase() ?? "option"}`);
      return;
    }
    setBusy(mode);
    setError(null);
    const err = await add(variant.id, qty, { title, variant: variant.title, price: variant.price, productId });
    setBusy(null);
    if (err) setError(err);
    else if (mode === "buy") router.push("/checkout");
  };

  return (
    <div>
      <div className="flex items-baseline gap-3">
        <span className={cn("text-2xl", off > 0 && "text-sale")}>{inr(display.price)}</span>
        {off > 0 && (
          <>
            <span className="text-muted line-through">{inr(display.compareAtPrice)}</span>
            <span className="rounded-full text-[12px] font-medium bg-sun text-ink px-3 py-1 tracking-wide">{off}% off</span>
          </>
        )}
      </div>
      <p className="text-xs text-muted mt-1">Inclusive of all taxes</p>
      {prepaidPercent > 0 && (
        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-sage/10 text-sage px-3.5 py-1.5 text-[13px]">
          <span className="size-1.5 rounded-full bg-sage" /> Extra {prepaidPercent}% off when you pay online at checkout
        </p>
      )}

      {colorOpt && colorOpt.values.length > 0 && (
        <p className="mt-6 text-sm">
          <span className="text-muted">Colour:</span> {colorOpt.values.join(", ")}
        </p>
      )}

      {sizeOpt && variants.length > 1 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm">
              <span className="text-muted">Size:</span> {size ?? "Select"}
            </p>
            <SizeGuideButton />
          </div>
          <div className="flex flex-wrap gap-2">
            {sizeOpt.values.map((s) => {
              const v = variants.find((x) => x.option1 === s);
              const ok = !!v?.available;
              return (
                <button
                  key={s}
                  disabled={!ok}
                  onClick={() => {
                    setSize(s);
                    setError(null);
                  }}
                  className={cn(
                    "min-w-14 h-12 px-4 rounded-full border text-sm transition-colors relative",
                    size === s ? "bg-ink text-cream border-ink" : "border-line hover:border-ink",
                    !ok && "text-muted/60 line-through cursor-not-allowed hover:border-line",
                  )}
                >
                  {s}
                </button>
              );
            })}
          </div>
          {variant?.lowStock && variant.available && <p className="text-xs text-sea mt-3">Hurry — only a few left in {variant.option1}</p>}
        </div>
      )}

      <div className="mt-8 flex gap-3">
        <div className="flex items-center rounded-full border border-line bg-paper/60">
          <button aria-label="Decrease quantity" className="p-3.5" onClick={() => setQty((q) => Math.max(1, q - 1))}>
            <Minus className="size-3.5" />
          </button>
          <span className="w-6 text-center tabular-nums">{qty}</span>
          <button aria-label="Increase quantity" className="p-3.5" onClick={() => setQty((q) => Math.min(10, q + 1))}>
            <Plus className="size-3.5" />
          </button>
        </div>
        <button
          disabled={allSoldOut || !!busy}
          onClick={() => submit("add")}
          className="flex-1 rounded-full bg-ink text-cream text-[13px] font-medium tracking-[0.12em] uppercase hover:bg-sea transition-colors disabled:opacity-50"
        >
          {allSoldOut ? "Sold out" : busy === "add" ? "Adding…" : "Add to bag"}
        </button>
        <button
          aria-label={ids.includes(productId) ? "Remove from wishlist" : "Save to wishlist"}
          onClick={() => toggle(productId, title)}
          className="size-[52px] shrink-0 grid place-items-center rounded-full border border-line hover:border-ink"
        >
          <Heart className={cn("size-5", ids.includes(productId) ? "fill-sea text-sea" : "")} strokeWidth={1.5} />
        </button>
      </div>
      {!allSoldOut && (
        <button disabled={!!busy} onClick={() => submit("buy")} className="mt-3 w-full rounded-full border border-ink py-4 text-[13px] font-medium tracking-[0.12em] uppercase hover:bg-ink hover:text-cream transition-colors disabled:opacity-50">
          {busy === "buy" ? "One moment…" : "Buy it now"}
        </button>
      )}
      {error && <p className="text-sm text-sale mt-3" role="alert">{error}</p>}
    </div>
  );
}
