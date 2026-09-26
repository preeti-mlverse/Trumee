"use client";

import { createContext, useCallback, useContext, useEffect, useState, useTransition, type ReactNode } from "react";
import { addToCart, applyDiscountCode, fetchCart, removeDiscountCode, updateCartLine } from "@/app/actions/cart";
import { track } from "@/lib/analytics/client";
import type { CartLine, CartState } from "@/lib/cart";

type Ctx = {
  cart: CartState | null;
  open: boolean;
  setOpen: (v: boolean) => void;
  pending: boolean;
  add: (variantId: number, qty: number, meta: { title: string; variant: string; price: number; productId: number }) => Promise<string | undefined>;
  update: (line: CartLine, qty: number) => void;
  applyCode: (code: string) => Promise<CartState>;
  removeCode: () => void;
  refresh: () => void;
};

const CartCtx = createContext<Ctx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartState | null>(null);
  const [open, setOpenState] = useState(false);
  const [pending, start] = useTransition();

  const refresh = useCallback(() => {
    fetchCart().then(setCart).catch(() => {});
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const setOpen = (v: boolean) => {
    setOpenState(v);
    if (v && cart?.lines.length) {
      track("view_cart", {
        value: cart.totals.total / 100,
        items: cart.lines.map((l) => ({ item_id: l.productId, item_name: l.title, item_variant: l.variantTitle, price: l.unitPrice / 100, quantity: l.quantity })),
      });
    }
  };

  const add: Ctx["add"] = async (variantId, qty, meta) => {
    const res = await addToCart(variantId, qty);
    setCart(res.cart);
    if (!res.error) {
      setOpenState(true);
      track("add_to_cart", {
        value: (meta.price * qty) / 100,
        product_id: meta.productId,
        items: [{ item_id: meta.productId, item_name: meta.title, item_variant: meta.variant, price: meta.price / 100, quantity: qty }],
      });
    }
    return res.error;
  };

  const update = (line: CartLine, qty: number) => {
    start(async () => {
      const next = await updateCartLine(line.variantId, qty);
      setCart(next);
      if (qty < line.quantity) {
        track("remove_from_cart", {
          value: (line.unitPrice * (line.quantity - qty)) / 100,
          product_id: line.productId,
          items: [{ item_id: line.productId, item_name: line.title, item_variant: line.variantTitle, price: line.unitPrice / 100, quantity: line.quantity - qty }],
        });
      }
    });
  };

  const applyCode = async (code: string) => {
    const next = await applyDiscountCode(code);
    setCart(next);
    return next;
  };
  const removeCode = () => start(async () => setCart(await removeDiscountCode()));

  return (
    <CartCtx.Provider value={{ cart, open, setOpen, pending, add, update, applyCode, removeCode, refresh }}>
      {children}
    </CartCtx.Provider>
  );
}

export function useCart() {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useCart must be used inside CartProvider");
  return c;
}

// ─────────────────────────────── wishlist (device-local; synced to account when signed in)

const WL_KEY = "tm_wishlist";
const WishCtx = createContext<{ ids: number[]; toggle: (id: number, title?: string) => void } | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<number[]>([]);
  useEffect(() => {
    try {
      setIds(JSON.parse(localStorage.getItem(WL_KEY) || "[]"));
    } catch {}
  }, []);
  const toggle = (id: number, title?: string) => {
    setIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem(WL_KEY, JSON.stringify(next));
      } catch {}
      if (!prev.includes(id)) track("add_to_wishlist", { product_id: id, items: [{ item_id: id, item_name: title ?? "" }] });
      return next;
    });
  };
  return <WishCtx.Provider value={{ ids, toggle }}>{children}</WishCtx.Provider>;
}

export function useWishlist() {
  const c = useContext(WishCtx);
  if (!c) throw new Error("useWishlist must be used inside WishlistProvider");
  return c;
}
