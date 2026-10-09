"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { forgotPassword, login, register, requestOtp, resetPassword, updateProfile, verifyOtp, wishlistProducts } from "@/app/actions/account";
import type { CardProduct } from "@/lib/catalog";
import { useWishlist } from "./cart-context";
import { ProductGrid } from "./product-card";

const input = "w-full rounded-xl border border-line bg-paper px-4 py-3 text-sm outline-none focus:border-ink";
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

export function ProfileForm({ c, needsEmail = false }: { c: { firstName: string | null; lastName: string | null; phone: string | null; acceptsMarketing: boolean }; needsEmail?: boolean }) {
  const [s, action, pending] = useActionState(updateProfile, null);
  return (
    <form action={action} className="space-y-3">
      {needsEmail && <input name="email" type="email" autoComplete="email" placeholder="Add your email for order updates" aria-label="Email" className={input} />}
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

/** "Continue with Google" — a plain link into the OAuth flow. */
export function GoogleButton({ next }: { next?: string }) {
  return (
    <a
      href={`/api/auth/google?next=${encodeURIComponent(next ?? "/account")}`}
      className="flex w-full items-center justify-center gap-3 rounded-full border border-ink/20 bg-paper py-3.5 text-sm font-medium hover:border-ink transition-colors"
    >
      <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
        <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
      </svg>
      Continue with Google
    </a>
  );
}

/** Two steps on one form: mobile number → 6-digit code. New numbers get an account automatically. */
export function PhoneLogin({ next }: { next?: string }) {
  const [sendState, send, sending] = useActionState(requestOtp, null);
  const [verifyState, verify, verifying] = useActionState(verifyOtp, null);
  const [phone, setPhone] = useState("");
  const codeStep = !!sendState?.sent || verifyState?.sent === "";
  const err = codeStep ? verifyState?.error : sendState?.error;

  if (!codeStep)
    return (
      <form action={send} className="space-y-3">
        <div className="flex rounded-xl border border-line bg-paper focus-within:border-ink overflow-hidden">
          <span className="px-4 py-3 text-sm text-muted border-r border-line">+91</span>
          <input
            name="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/[^\d ]/g, "").slice(0, 11))}
            inputMode="numeric"
            autoComplete="tel-national"
            required
            placeholder="Mobile number"
            aria-label="Mobile number"
            className="flex-1 bg-transparent px-4 py-3 text-sm outline-none"
          />
        </div>
        {err && <p className="text-sm text-sale">{err}</p>}
        <button disabled={sending} className={btn}>{sending ? "Sending code…" : "Get a one-time code"}</button>
      </form>
    );

  return (
    <form action={verify} className="space-y-3">
      <input type="hidden" name="phone" value={sendState?.phone ?? phone} />
      <input type="hidden" name="next" value={next ?? "/account"} />
      <p className="text-sm text-ink-soft">{sendState?.sent || "Enter the code we sent you."}</p>
      <input
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        required
        autoFocus
        placeholder="6-digit code"
        aria-label="One-time code"
        className={`${input} tracking-[0.5em] text-center text-lg`}
      />
      {err && <p className="text-sm text-sale">{err}</p>}
      <button disabled={verifying} className={btn}>{verifying ? "Checking…" : "Verify & sign in"}</button>
      <button type="button" onClick={() => location.reload()} className="block py-1 text-xs underline underline-offset-4 text-muted">
        Use a different number
      </button>
    </form>
  );
}
