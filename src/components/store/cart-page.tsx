"use client";

import { Lock, Minus, Plus, RotateCcw, Truck, Wallet } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cn, inr } from "@/lib/utils";
import { useCart } from "./cart-context";

export function CartPageView() {
  const { cart, update, pending } = useCart();
  if (!cart) return <p className="mt-10 text-muted">Loading your bag…</p>;
  if (!cart.lines.length)
    return (
      <div className="mt-10 py-16 text-center border border-line">
        <p className="font-display text-3xl">Your bag is empty</p>
        <p className="text-sm text-muted mt-2">Pieces you add will wait here for you.</p>
        <Link href="/collections/all" className="inline-block mt-6 rounded-full bg-ink text-cream px-7 py-3.5 text-[11px] tracking-[0.22em] uppercase">
          Start shopping
        </Link>
      </div>
    );
  const t = cart.totals;
  return (
    <div className="mt-10 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-10 lg:gap-14 items-start">
      <ul className={cn("divide-y divide-line border-y border-line", pending && "opacity-60")}>
        {cart.lines.map((l) => (
          <li key={l.variantId} className="py-6 flex gap-5">
            <Link href={`/products/${l.handle}`} className="relative w-24 sm:w-28 aspect-[2/3] bg-sand shrink-0 rounded-2xl overflow-hidden">
              {l.image && <Image src={l.image} alt={l.title} fill sizes="112px" className="object-cover" />}
            </Link>
            <div className="flex-1 flex flex-col">
              <div className="flex justify-between gap-4">
                <div>
                  <Link href={`/products/${l.handle}`} className="hover:text-plum">{l.title}</Link>
                  <p className="text-sm text-muted mt-1">Size: {l.variantTitle}</p>
                </div>
                <div className="text-right tabular-nums">
                  <p>{inr(l.unitPrice * l.quantity)}</p>
                  {l.compareAtPrice && l.compareAtPrice > l.unitPrice && <p className="text-xs text-muted line-through">{inr(l.compareAtPrice * l.quantity)}</p>}
                </div>
              </div>
              <div className="mt-auto pt-4 flex items-center gap-5">
                <div className="flex items-center rounded-full border border-line">
                  <button aria-label="Decrease quantity" className="p-2.5" onClick={() => update(l, l.quantity - 1)}><Minus className="size-3.5" /></button>
                  <span className="w-8 text-center text-sm tabular-nums">{l.quantity}</span>
                  <button aria-label="Increase quantity" className="p-2.5 disabled:opacity-30" disabled={l.quantity >= l.maxQty} onClick={() => update(l, l.quantity + 1)}><Plus className="size-3.5" /></button>
                </div>
                <button onClick={() => update(l, 0)} className="py-2 text-xs underline underline-offset-4 text-muted hover:text-ink">Remove</button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <aside className="rounded-panel bg-[#fffdf8]/80 p-6 sm:p-8 lg:sticky lg:top-24">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{inr(t.subtotal)}</dd></div>
          {t.discountTotal > 0 && <div className="flex justify-between text-sage"><dt>Discount ({t.discountApplied})</dt><dd>−{inr(t.discountTotal)}</dd></div>}
          <div className="flex justify-between"><dt>Shipping</dt><dd>{t.shipping ? inr(t.shipping) : "Free"}</dd></div>
          <div className="flex justify-between text-lg font-medium border-t border-line pt-3 mt-3"><dt>Total</dt><dd className="tabular-nums">{inr(t.total)}</dd></div>
          <p className="text-[11px] text-muted">Inclusive of {inr(t.tax)} GST · discount codes at checkout</p>
        </dl>
        {t.prepaidAvailable > 0 && (
          <p className="mt-4 rounded-2xl bg-sage/10 text-sage text-sm px-4 py-2.5">
            Pay online and save another <strong>{inr(t.prepaidAvailable)}</strong> ({cart.perks.prepaidPercent}% prepaid discount)
          </p>
        )}
        <Link href="/checkout" className="mt-6 flex items-center justify-center gap-2 rounded-full bg-ink text-cream py-4 text-[11px] font-semibold tracking-[0.24em] uppercase hover:bg-ink-soft">
          <Lock className="size-3.5" /> Secure checkout
        </Link>
        <ul className="mt-6 space-y-2.5 text-xs text-ink-soft">
          <li className="flex items-center gap-2"><Truck className="size-4" strokeWidth={1.5} /> Dispatched in {cart.perks.processingDays}</li>
          {cart.perks.codEnabled && <li className="flex items-center gap-2"><Wallet className="size-4" strokeWidth={1.5} /> Cash on delivery available</li>}
          <li className="flex items-center gap-2"><RotateCcw className="size-4" strokeWidth={1.5} /> Easy returns & size exchanges within 7 days</li>
        </ul>
      </aside>
    </div>
  );
}
