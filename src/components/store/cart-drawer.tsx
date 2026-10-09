"use client";

import { Minus, Plus, RotateCcw, ShieldCheck, ShoppingBag, Truck, Wallet, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { cn, inr } from "@/lib/utils";
import { useCart } from "./cart-context";

export function CartDrawer() {
  const { cart, open, setOpen, update, pending } = useCart();

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [open, setOpen]);

  if (!open) return null;
  const t = cart?.totals;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-label="Shopping bag">
      <div className="absolute inset-0 bg-ink/40 animate-fade-in" onClick={() => setOpen(false)} />
      <aside className="absolute inset-y-2 right-2 w-[calc(100%-1rem)] max-w-[440px] bg-paper rounded-3xl overflow-hidden flex flex-col animate-slide-in">
        <div className="flex items-center justify-between px-5 sm:px-6 h-16 border-b border-line">
          <h2 className="font-display text-2xl">Your bag {cart?.count ? <span className="text-muted text-lg">({cart.count})</span> : null}</h2>
          <button onClick={() => setOpen(false)} aria-label="Close bag" className="p-2 -mr-2">
            <X className="size-5" strokeWidth={1.5} />
          </button>
        </div>

        {!cart?.lines.length ? (
          <div className="flex-1 grid place-items-center text-center px-8">
            <div>
              <ShoppingBag className="size-10 mx-auto text-muted" strokeWidth={1} />
              <p className="font-display text-2xl mt-4">Your bag is empty</p>
              <p className="text-sm text-muted mt-2">Let’s find you something you’ll love wearing.</p>
              <Link href="/collections/all" onClick={() => setOpen(false)} className="inline-block mt-6 rounded-full bg-ink text-cream px-7 py-3 text-xs tracking-[0.18em] uppercase">
                Start shopping
              </Link>
            </div>
          </div>
        ) : (
          <>
            {t?.freeShippingRemaining != null && t.freeShippingRemaining > 0 && (
              <div className="px-6 py-3 bg-sand text-xs flex items-center gap-2">
                <Truck className="size-4" strokeWidth={1.5} /> Add {inr(t.freeShippingRemaining)} more for free shipping
              </div>
            )}
            <ul className={cn("flex-1 overflow-y-auto px-5 sm:px-6 divide-y divide-line", pending && "opacity-60")}>
              {cart.lines.map((l) => (
                <li key={l.variantId} className="py-5 flex gap-4">
                  <Link href={`/products/${l.handle}`} onClick={() => setOpen(false)} className="relative w-20 aspect-[3/4] bg-sand shrink-0 overflow-hidden">
                    {l.image && <Image src={l.image} alt={l.title} fill sizes="80px" className="object-cover" />}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/products/${l.handle}`} onClick={() => setOpen(false)} className="text-sm leading-snug line-clamp-2">
                      {l.title}
                    </Link>
                    <p className="text-xs text-muted mt-1">{l.variantTitle}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center border border-line">
                        <button aria-label="Decrease quantity" className="p-2" onClick={() => update(l, l.quantity - 1)}>
                          <Minus className="size-3" />
                        </button>
                        <span className="w-7 text-center text-sm tabular-nums">{l.quantity}</span>
                        <button aria-label="Increase quantity" className="p-2 disabled:opacity-30" disabled={l.quantity >= l.maxQty} onClick={() => update(l, l.quantity + 1)}>
                          <Plus className="size-3" />
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">{inr(l.unitPrice * l.quantity)}</p>
                        {l.compareAtPrice && l.compareAtPrice > l.unitPrice && (
                          <p className="text-xs text-muted line-through">{inr(l.compareAtPrice * l.quantity)}</p>
                        )}
                      </div>
                    </div>
                    <button onClick={() => update(l, 0)} className="text-xs text-muted underline underline-offset-2 mt-1 py-1.5">
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-line px-5 sm:px-6 py-5 space-y-2 bg-paper">
              <Row label="Subtotal" value={inr(t!.subtotal)} />
              {t!.discountTotal > 0 && <Row label={`Discount (${t!.discountApplied})`} value={"−" + inr(t!.discountTotal)} className="text-sage" />}
              <Row label="Shipping" value={t!.shipping ? inr(t!.shipping) : "Free"} />
              <Row label="Total" value={inr(t!.total)} className="text-base font-medium pt-2 border-t border-line" />
              <p className="text-[11px] text-muted">Inclusive of all taxes. Discount codes can be applied at checkout.</p>
              {t!.prepaidAvailable > 0 && (
                <p className="rounded-full bg-sage/10 text-sage text-[13px] text-center px-3 py-1.5">
                  Pay online & save {inr(t!.prepaidAvailable)} more at checkout
                </p>
              )}
              <Link
                href="/checkout"
                onClick={() => setOpen(false)}
                className="mt-3 block text-center rounded-full bg-ink text-cream py-4 text-xs tracking-[0.2em] uppercase hover:bg-ink-soft"
              >
                Checkout · {inr(t!.total)}
              </Link>
              <Link href="/cart" onClick={() => setOpen(false)} className="block text-center text-xs underline underline-offset-4 pt-1">
                View bag
              </Link>
              <ul className="pt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-[11px] text-ink-soft">
                <li className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-sage" strokeWidth={1.5} /> Secure checkout</li>
                {cart?.perks.codEnabled && <li className="flex items-center gap-1.5"><Wallet className="size-3.5 text-sage" strokeWidth={1.5} /> Cash on delivery</li>}
                <li className="flex items-center gap-1.5"><RotateCcw className="size-3.5 text-sage" strokeWidth={1.5} /> 7-day returns & exchanges</li>
              </ul>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("flex justify-between text-sm", className)}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
