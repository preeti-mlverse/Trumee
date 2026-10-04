"use client";

import { BadgeCheck, Lock, MessageCircle, RotateCcw, ShieldCheck, Truck, Wallet } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { checkoutPincode, checkoutStarted, placeOrder, simulatePayment, verifyPayment, type PlaceOrderResult } from "@/app/actions/checkout";
import { track } from "@/lib/analytics/client";
import type { CartState } from "@/lib/cart";
import { INDIAN_STATES } from "@/lib/india";
import { cn, inr } from "@/lib/utils";
import { useCart } from "./cart-context";

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (r: unknown) => void) => void };
  }
}

type Prefill = { email?: string; phone?: string; name?: string; line1?: string; line2?: string; city?: string; state?: string; pincode?: string };

export function CheckoutForm({
  initial,
  prefill,
  codEnabled,
  codMax,
  codFee,
  processingDays,
  whatsapp,
}: {
  initial: CartState;
  prefill: Prefill;
  codEnabled: boolean;
  codMax: number | null;
  codFee: number;
  processingDays: string;
  whatsapp: string;
}) {
  const router = useRouter();
  const { cart: live, applyCode, removeCode } = useCart();
  const cart = live ?? initial;
  const t = cart.totals;
  const [method, setMethod] = useState<"razorpay" | "cod">("razorpay");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ msg: string; field?: string } | null>(null);
  const [sim, setSim] = useState<{ token: string; amount: number } | null>(null);
  const [code, setCode] = useState("");
  const [codeMsg, setCodeMsg] = useState<string | null>(null);
  const [city, setCity] = useState(prefill.city ?? "");
  const [state, setState] = useState(prefill.state ?? "");
  const [pinHint, setPinHint] = useState<{ text: string; tone: "ok" | "warn" } | null>(null);
  const [pinCod, setPinCod] = useState(true);
  const tracked = useRef(false);

  const codAllowed = codEnabled && pinCod && (codMax == null || t.total + codFee <= codMax);
  // Server is authoritative; these mirror its maths (onlineTotal includes the prepaid saving).
  const payable = method === "cod" ? t.total + codFee : t.onlineTotal;
  const prepaidPct = cart.perks.prepaidPercent;
  const items = cart.lines.map((l) => ({ item_id: l.productId, item_name: l.title, item_variant: l.variantTitle, price: l.unitPrice / 100, quantity: l.quantity }));

  useEffect(() => {
    if (tracked.current || !cart.lines.length) return;
    tracked.current = true;
    track("begin_checkout", { value: t.total / 100, items, coupon: t.discountApplied ?? undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPin = async (pin: string) => {
    if (pin.length !== 6) {
      setPinHint(null);
      setPinCod(true);
      return;
    }
    const { place, quote } = await checkoutPincode(pin);
    if (place) {
      setCity((c) => c || place.city);
      if (INDIAN_STATES.includes(place.state)) setState(place.state);
    }
    if (quote && !quote.serviceable) {
      setPinCod(false);
      setPinHint({ text: "Our couriers don’t deliver to this pincode yet — please use another address or WhatsApp us.", tone: "warn" });
    } else if (quote) {
      setPinCod(quote.codAvailable);
      if (!quote.codAvailable && method === "cod") setMethod("razorpay");
      setPinHint({
        text: `Arrives ${quote.from} – ${quote.to}${quote.place ? ` · ${quote.place}` : ""}${quote.codAvailable ? "" : " · Cash on delivery isn’t available here"}`,
        tone: "ok",
      });
      track("add_shipping_info", { value: t.total / 100, items });
    } else setPinHint({ text: "We couldn’t verify this pincode — please double-check it.", tone: "warn" });
  };

  const finish = (url: string) => {
    router.push(url);
    router.refresh();
  };

  const submit = async (form: FormData) => {
    setBusy(true);
    setError(null);
    form.set("paymentMethod", method);
    track("add_payment_info", { value: payable / 100, payment_type: method, items });
    const res: PlaceOrderResult = await placeOrder(form);
    if (!res.ok) {
      setBusy(false);
      setError({ msg: res.error, field: res.field });
      document.querySelector(`[name="${res.field}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (res.kind === "done") return finish(res.url);
    if (res.kind === "simulate") {
      setBusy(false);
      setSim({ token: res.token, amount: res.amount });
      return;
    }
    if (!window.Razorpay) {
      setBusy(false);
      setError({ msg: "Payment window couldn’t load. Check your connection and try again." });
      return;
    }
    const rzp = new window.Razorpay({
      key: res.key,
      order_id: res.gatewayOrderId,
      amount: res.amount,
      currency: "INR",
      name: "Trumee",
      description: "Order payment",
      prefill: res.prefill,
      theme: { color: "#22101e" },
      handler: async (r: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
        const v = await verifyPayment(res.token, r);
        if (v.ok) finish(v.url);
        else setError({ msg: v.error });
      },
      modal: { ondismiss: () => setBusy(false) },
    });
    rzp.on("payment.failed", () => {
      setBusy(false);
      setError({ msg: "Payment didn’t go through. You can try again or choose Cash on Delivery." });
    });
    rzp.open();
  };

  const input = (name: string) =>
    cn("w-full rounded-xl border bg-[#fffdf8] px-4 py-3 text-sm outline-none focus:border-ink transition-colors", error?.field === name ? "border-sale" : "border-line");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_440px] gap-10 lg:gap-16 items-start">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <form action={submit} className="space-y-10" noValidate>
        <fieldset className="space-y-3">
          <legend className="font-display text-2xl mb-4">Contact</legend>
          <input name="email" type="email" autoComplete="email" required defaultValue={prefill.email} placeholder="Email" className={input("email")} onBlur={(e) => checkoutStarted(e.target.value)} />
          <input name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" required defaultValue={prefill.phone} placeholder="Mobile number (for delivery updates)" className={input("phone")} />
          <label className="flex items-center gap-2.5 text-sm text-ink-soft">
            <input type="checkbox" name="acceptsMarketing" defaultChecked className="accent-[var(--color-ink)] size-4" /> Email me new drops and offers
          </label>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="font-display text-2xl mb-4">Delivery address</legend>
          <input name="name" autoComplete="name" required defaultValue={prefill.name} placeholder="Full name" className={input("name")} />
          <input name="line1" autoComplete="address-line1" required defaultValue={prefill.line1} placeholder="House / flat no., building, street" className={input("line1")} />
          <input name="line2" autoComplete="address-line2" defaultValue={prefill.line2} placeholder="Area, landmark (optional)" className={input("line2")} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <input name="pincode" inputMode="numeric" maxLength={6} autoComplete="postal-code" required defaultValue={prefill.pincode} placeholder="Pincode" className={input("pincode")} onChange={(e) => onPin(e.target.value.replace(/\D/g, ""))} />
            </div>
            <input name="city" autoComplete="address-level2" required value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className={input("city")} />
          </div>
          {pinHint && (
            <p className={cn("flex items-start gap-2 text-xs -mt-1", pinHint.tone === "ok" ? "text-sage" : "text-sale")}>
              <Truck className="size-3.5 mt-px shrink-0" strokeWidth={1.6} /> {pinHint.text}
            </p>
          )}
          <select name="state" required value={state} onChange={(e) => setState(e.target.value)} autoComplete="address-level1" className={input("state")}>
            <option value="">State</option>
            {INDIAN_STATES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <textarea name="note" rows={2} placeholder="Delivery instructions (optional)" className={input("note")} />
        </fieldset>

        <fieldset>
          <legend className="font-display text-2xl mb-4">Payment</legend>
          <div className="rounded-3xl border border-line overflow-hidden divide-y divide-line bg-[#fffdf8]/60">
            <PayOption
              checked={method === "razorpay"}
              onChange={() => setMethod("razorpay")}
              title="UPI, cards, netbanking & wallets"
              sub="Secured by Razorpay · PCI-DSS compliant"
              badge={t.prepaidAvailable > 0 ? `Save ${inr(t.prepaidAvailable)} · ${prepaidPct}% off` : undefined}
              icon={<Lock className="size-4" />}
            />
            <PayOption
              checked={method === "cod"}
              disabled={!codAllowed}
              onChange={() => setMethod("cod")}
              title={`Cash on delivery${codFee ? ` (+${inr(codFee)})` : ""}`}
              sub={
                !codEnabled
                  ? "Not available right now"
                  : !pinCod
                    ? "Not available for this pincode"
                    : codAllowed
                      ? t.prepaidAvailable > 0
                        ? `Pay when it arrives · pay online instead to save ${inr(t.prepaidAvailable)}`
                        : "Pay in cash or UPI when your order arrives"
                      : `Available on orders up to ${inr(codMax)}`
              }
              icon={<Wallet className="size-4" />}
            />
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="rounded-2xl text-sm text-sale bg-sale/5 border border-sale/30 px-4 py-3">
            {error.msg}
          </p>
        )}
        <button disabled={busy || !cart.lines.length} className="rounded-full w-full bg-ink text-cream py-4 text-[11px] font-semibold tracking-[0.24em] uppercase hover:bg-ink-soft disabled:opacity-60 flex items-center justify-center gap-2">
          <Lock className="size-3.5" /> {busy ? "Placing your order…" : method === "cod" ? `Place order · ${inr(payable)}` : `Pay ${inr(payable)}`}
        </button>
        <p className="text-xs text-muted text-center -mt-6">
          By placing your order you agree to our <Link href="/pages/terms-and-conditions" className="underline">terms</Link>,{" "}
          <Link href="/pages/shipping-policy" className="underline">shipping</Link> and{" "}
          <Link href="/pages/returns-policy" className="underline">returns & exchange policy</Link>.
        </p>
      </form>

      {/* Summary */}
      <aside className="rounded-panel bg-[#fffdf8]/80 p-6 sm:p-8 lg:sticky lg:top-24">
        <h2 className="font-display text-2xl">Order summary</h2>
        <ul className="mt-6 space-y-4">
          {cart.lines.map((l) => (
            <li key={l.variantId} className="flex gap-4">
              <div className="relative w-16 aspect-[2/3] bg-sand shrink-0 rounded-xl">
                {l.image && <Image src={l.image} alt="" fill sizes="64px" className="object-cover rounded-xl" />}
                <span className="absolute -top-2 -right-2 size-5 rounded-full bg-ink text-cream text-[10px] grid place-items-center">{l.quantity}</span>
              </div>
              <div className="flex-1 text-sm">
                <p className="leading-snug line-clamp-2">{l.title}</p>
                <p className="text-xs text-muted mt-0.5">{l.variantTitle}</p>
              </div>
              <p className="text-sm tabular-nums">{inr(l.unitPrice * l.quantity)}</p>
            </li>
          ))}
        </ul>

        <form
          className="mt-6 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!code.trim()) return;
            const next = await applyCode(code);
            setCodeMsg(next.totals.discountError ?? (next.totals.discountApplied ? `${next.totals.discountApplied} applied` : null));
            if (next.totals.discountApplied) setCode("");
          }}
        >
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Discount code" className="flex-1 rounded-full border border-line bg-[#fffdf8] px-4 py-2.5 text-sm outline-none focus:border-ink uppercase" />
          <button className="rounded-full border border-ink px-4 text-[11px] tracking-[0.18em] uppercase hover:bg-ink hover:text-cream">Apply</button>
        </form>
        {codeMsg && <p className={cn("text-xs mt-2", t.discountApplied ? "text-sage" : "text-sale")}>{codeMsg}</p>}

        <dl className="mt-6 space-y-2 text-sm border-t border-line pt-5">
          <Row k="Subtotal" v={inr(t.subtotal)} />
          {t.discountTotal > 0 && (
            <div className="flex justify-between text-sage">
              <dt>
                Discount · {t.discountApplied}{" "}
                <button type="button" onClick={removeCode} className="text-xs underline text-muted ml-1">
                  remove
                </button>
              </dt>
              <dd className="tabular-nums">−{inr(t.discountTotal)}</dd>
            </div>
          )}
          {method === "razorpay" && t.prepaidAvailable > 0 && (
            <div className="flex justify-between text-sage">
              <dt>Prepaid discount ({prepaidPct}%)</dt>
              <dd className="tabular-nums">−{inr(t.prepaidAvailable)}</dd>
            </div>
          )}
          <Row k="Shipping" v={t.shipping ? inr(t.shipping) : "Free"} />
          {method === "cod" && codFee > 0 && <Row k="COD fee" v={inr(codFee)} />}
          <div className="flex justify-between text-base font-medium border-t border-line pt-3 mt-3">
            <dt>Total</dt>
            <dd className="tabular-nums">{inr(payable)}</dd>
          </div>
          <p className="text-[11px] text-muted">Includes {inr(t.tax)} GST</p>
        </dl>

        <ul className="mt-6 grid grid-cols-2 gap-3 text-[11px] text-ink-soft">
          <li className="flex items-center gap-2"><ShieldCheck className="size-4 text-sage" strokeWidth={1.5} /> 100% secure payment</li>
          <li className="flex items-center gap-2"><RotateCcw className="size-4 text-sage" strokeWidth={1.5} /> 7-day returns & exchanges</li>
          <li className="flex items-center gap-2"><Truck className="size-4 text-sage" strokeWidth={1.5} /> Ships in {processingDays}</li>
          <li className="flex items-center gap-2"><BadgeCheck className="size-4 text-sage" strokeWidth={1.5} /> GST invoice included</li>
        </ul>
        <a
          href={`https://wa.me/${whatsapp}?text=${encodeURIComponent("Hi Trumee! I need help with my order at checkout.")}`}
          target="_blank"
          rel="noopener"
          className="mt-5 flex items-center justify-center gap-2 rounded-full border border-line py-2.5 text-xs text-ink-soft hover:border-ink transition-colors"
        >
          <MessageCircle className="size-3.5" strokeWidth={1.6} /> Questions? Chat with us on WhatsApp
        </a>
      </aside>

      {sim && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4" role="dialog" aria-label="Test payment">
          <div className="bg-[#fffdf8] rounded-3xl max-w-sm w-full p-7">
            <p className="text-[11px] tracking-[0.24em] uppercase text-plum">Test mode</p>
            <h3 className="font-display text-2xl mt-2">Simulated payment</h3>
            <p className="text-sm text-muted mt-3">
              Razorpay keys aren’t configured yet, so no real payment is taken. Add <code>RAZORPAY_KEY_ID</code> and <code>RAZORPAY_KEY_SECRET</code> to go live.
            </p>
            <button
              onClick={async () => {
                const r = await simulatePayment(sim.token);
                if (r.ok) finish(r.url);
              }}
              className="mt-6 w-full rounded-full bg-ink text-cream py-3.5 text-[11px] tracking-[0.22em] uppercase"
            >
              Complete test payment · {inr(sim.amount)}
            </button>
            <button onClick={() => setSim(null)} className="mt-2 w-full py-2 text-xs underline">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <dt>{k}</dt>
      <dd className="tabular-nums">{v}</dd>
    </div>
  );
}

function PayOption({ checked, disabled, onChange, title, sub, icon, badge }: { checked: boolean; disabled?: boolean; onChange: () => void; title: string; sub: string; icon: React.ReactNode; badge?: string }) {
  return (
    <label className={cn("flex items-start gap-3 p-4 cursor-pointer", checked && "bg-sand/60", disabled && "opacity-50 cursor-not-allowed")}>
      <input type="radio" name="pm" checked={checked} disabled={disabled} onChange={onChange} className="mt-1 accent-[var(--color-ink)] size-4" />
      <span className="flex-1">
        <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
          {icon} {title}
          {badge && <span className="rounded-full bg-sage text-cream text-[11px] font-medium px-2.5 py-0.5">{badge}</span>}
        </span>
        <span className="block text-xs text-muted mt-0.5">{sub}</span>
      </span>
    </label>
  );
}
