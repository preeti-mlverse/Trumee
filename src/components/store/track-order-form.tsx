"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { trackOrder } from "@/app/actions/checkout";

export function TrackOrderForm() {
  const [state, action, pending] = useActionState(trackOrder, null);
  const router = useRouter();
  useEffect(() => {
    if (state?.url) router.push(state.url);
  }, [state, router]);
  const input = "w-full border border-line bg-cream px-3.5 py-3 text-sm outline-none focus:border-ink";
  return (
    <form action={action} className="mt-8 space-y-3">
      <input name="order" inputMode="numeric" placeholder="Order number" required className={input} aria-label="Order number" />
      <input name="contact" placeholder="Email or mobile number" required className={input} aria-label="Email or mobile number" />
      {state?.error && <p className="text-sm text-sale">{state.error}</p>}
      <button disabled={pending} className="w-full bg-ink text-cream py-3.5 text-[11px] tracking-[0.22em] uppercase disabled:opacity-60">
        {pending ? "Looking up…" : "Track order"}
      </button>
    </form>
  );
}
