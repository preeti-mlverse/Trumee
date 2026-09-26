"use server";

import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { ensureCartId, getCartId, getCartState, setLineQty, variantStock, type CartState } from "@/lib/cart";

export async function fetchCart(): Promise<CartState> {
  return getCartState();
}

export async function addToCart(variantId: number, quantity = 1): Promise<{ cart: CartState; error?: string }> {
  const cartId = await ensureCartId();
  const [stock] = await variantStock([variantId]);
  if (!stock) return { cart: await getCartState(), error: "This item is no longer available" };
  const existing = await db.query.cartItems.findFirst({
    where: and(eq(schema.cartItems.cartId, cartId), eq(schema.cartItems.variantId, variantId)),
  });
  const want = (existing?.quantity ?? 0) + quantity;
  const limit = !stock.track || stock.backorder ? 20 : stock.qty;
  if (limit <= 0) return { cart: await getCartState(), error: "Sorry, this size just sold out" };
  await setLineQty(cartId, variantId, Math.min(want, limit));
  const cart = await getCartState();
  return want > limit ? { cart, error: `Only ${limit} left in this size` } : { cart };
}

export async function updateCartLine(variantId: number, quantity: number): Promise<CartState> {
  const cartId = await getCartId();
  if (cartId) await setLineQty(cartId, variantId, Math.max(0, Math.min(20, quantity)));
  return getCartState();
}

export async function applyDiscountCode(code: string): Promise<CartState> {
  const cartId = await ensureCartId();
  await db.update(schema.carts).set({ discountCode: code.trim().toUpperCase() || null }).where(eq(schema.carts.id, cartId));
  const state = await getCartState();
  // Don't keep an invalid code on the cart, but still return the error to show.
  if (state.totals.discountError && !state.totals.discountApplied) {
    await db.update(schema.carts).set({ discountCode: null }).where(eq(schema.carts.id, cartId));
  }
  return state;
}

export async function removeDiscountCode(): Promise<CartState> {
  const cartId = await getCartId();
  if (cartId) await db.update(schema.carts).set({ discountCode: null }).where(eq(schema.carts.id, cartId));
  return getCartState();
}
