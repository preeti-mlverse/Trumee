"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { forgotPassword, login, register, resetPassword, updateProfile, wishlistProducts } from "@/app/actions/account";
import type { CardProduct } from "@/lib/catalog";
import { useWishlist } from "./cart-context";
import { ProductGrid } from "./product-card";

const input = "w-full rounded-xl border border-line bg-[#fffdf8] px-4 py-3 text-sm outline-none focus:border-ink";
const btn = "w-full rounded-full bg-ink text-cream py-3.5 text-[11px] tracking-[0.22em] uppercase disabled:opacity-60";

function Msg({ s }: { s: { error?: string; ok?: string } | null }) {
  if (!s) return null;
  return <p className={s.error ? "text-sm text-sale" : "text-sm text-sage"}>{s.error ?? s.ok}</p>;
}

export function LoginForm({ next }: { next?: string }) {
  const [s, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="next" value={next ?? "/account"} />
      <input name="email" type="email" autoComplete="email" required placeholder="Email" aria-label="Email" className={input} />
      <input name="password" type="password" autoComplete="current-password" required placeholder="Password" aria-label="Password" className={input} />
      <Msg s={s} />
      <button disabled={pending} className={btn}>{pending ? "Signing in…" : "Sign in"}</button>
      <Link href="/account/forgot" className="inline-block py-2 text-xs underline underline-offset-4 text-muted">Forgot your password?</Link>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [s, action, pending] = useActionState(register, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="next" value={next ?? "/account"} />
      <div className="grid grid-cols-2 gap-3">
        <input name="firstName" autoComplete="given-name" required placeholder="First name" aria-label="First name" className={input} />
        <input name="lastName" autoComplete="family-name" placeholder="Last name" aria-label="Last name" className={input} />
      </div>
      <input name="email" type="email" autoComplete="email" required placeholder="Email" aria-label="Email" className={input} />
      <input name="password" type="password" autoComplete="new-password" minLength={8} required placeholder="Password (8+ characters)" aria-label="Password" className={input} />
      <label className="flex items-center gap-2.5 text-sm text-ink-soft">
        <input type="checkbox" name="acceptsMarketing" defaultChecked className="accent-[var(--color-ink)] size-4" /> Send me new drops and members-only offers
      </label>
      <Msg s={s} />
      <button disabled={pending} className={btn}>{pending ? "Creating…" : "Create account"}</button>
    </form>
  );
}

export function ForgotForm() {
  const [s, action, pending] = useActionState(forgotPassword, null);
  return (
    <form action={action} className="space-y-3">
      <input name="email" type="email" required placeholder="Email" aria-label="Email" className={input} />
      <Msg s={s} />
      <button disabled={pending} className={btn}>{pending ? "Sending…" : "Send reset link"}</button>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [s, action, pending] = useActionState(resetPassword, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      <input name="password" type="password" autoComplete="new-password" minLength={8} required placeholder="New password" aria-label="New password" className={input} />
      <Msg s={s} />
      <button disabled={pending} className={btn}>{pending ? "Saving…" : "Set new password"}</button>
    </form>
  );
}

export function ProfileForm({ c }: { c: { firstName: string | null; lastName: string | null; phone: string | null; acceptsMarketing: boolean } }) {
  const [s, action, pending] = useActionState(updateProfile, null);
  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <input name="firstName" defaultValue={c.firstName ?? ""} placeholder="First name" aria-label="First name" className={input} />
        <input name="lastName" defaultValue={c.lastName ?? ""} placeholder="Last name" aria-label="Last name" className={input} />
      </div>
      <input name="phone" defaultValue={c.phone ?? ""} placeholder="Mobile number" aria-label="Mobile number" className={input} />
      <label className="flex items-center gap-2.5 text-sm text-ink-soft">
        <input type="checkbox" name="acceptsMarketing" defaultChecked={c.acceptsMarketing} className="accent-[var(--color-ink)] size-4" /> Email me new drops and offers
      </label>
      <Msg s={s} />
      <button disabled={pending} className="rounded-full border border-ink px-6 py-3 text-[11px] tracking-[0.2em] uppercase hover:bg-ink hover:text-cream">
        {pending ? "Saving…" : "Save details"}
      </button>
    </form>
  );
}

export function WishlistView() {
  const { ids } = useWishlist();
  const [items, setItems] = useState<CardProduct[] | null>(null);
  const key = ids.join(",");
  useEffect(() => {
    wishlistProducts(ids).then(setItems);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  if (items === null) return <p className="text-muted mt-10">Loading…</p>;
  if (!items.length)
    return (
      <div className="mt-10 py-16 text-center border border-line">
        <p className="font-display text-3xl">Nothing saved yet</p>
        <p className="text-sm text-muted mt-2">Tap the heart on any piece to keep it here.</p>
        <Link href="/collections/all" className="inline-block mt-6 rounded-full bg-ink text-cream px-7 py-3.5 text-[11px] tracking-[0.22em] uppercase">Browse the collection</Link>
      </div>
    );
  return <ProductGrid items={items} list="Wishlist" className="mt-10" />;
}
