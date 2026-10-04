"use client";

import { useActionState, useEffect } from "react";
import { sendContact } from "@/app/actions/marketing";
import { track } from "@/lib/analytics/client";

export function ContactForm() {
  const [state, action, pending] = useActionState(sendContact, null);
  useEffect(() => {
    if (state?.ok) track("generate_lead", { method: "contact_form" });
  }, [state]);
  if (state?.ok) return <p className="mt-6 text-sage">{state.message}</p>;
  const input = "w-full rounded-xl border border-line bg-[#fffdf8] px-4 py-3 text-sm outline-none focus:border-ink";
  return (
    <form action={action} className="mt-6 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input name="name" required placeholder="Name" aria-label="Name" className={input} />
        <input name="phone" type="tel" placeholder="Phone (optional)" aria-label="Phone" className={input} />
      </div>
      <input name="email" type="email" required placeholder="Email" aria-label="Email" className={input} />
      <textarea name="message" rows={5} required placeholder="How can we help?" aria-label="Message" className={input} />
      {state && !state.ok && <p className="text-sm text-sale">{state.message}</p>}
      <button disabled={pending} className="rounded-full bg-ink text-cream px-8 py-3.5 text-[11px] tracking-[0.22em] uppercase disabled:opacity-60">
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
