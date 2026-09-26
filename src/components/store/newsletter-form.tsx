"use client";

import { useActionState, useEffect } from "react";
import { subscribe } from "@/app/actions/marketing";
import { track } from "@/lib/analytics/client";

export function NewsletterForm({ source = "footer" }: { source?: string }) {
  const [state, action, pending] = useActionState(subscribe, null);
  useEffect(() => {
    if (state?.ok) track("generate_lead", { method: "newsletter", source });
  }, [state, source]);
  if (state?.ok) return <p className="text-sm">✓ {state.message}</p>;
  return (
    <form action={action} className="flex max-w-md border-b border-current">
      <input type="hidden" name="source" value={source} />
      <input
        type="email"
        name="email"
        required
        placeholder="Your email address"
        aria-label="Email address"
        className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-current/50"
      />
      <button disabled={pending} className="text-xs tracking-[0.18em] uppercase px-2 disabled:opacity-50">
        {pending ? "…" : "Subscribe"}
      </button>
      {state && !state.ok && <p className="text-xs text-sale mt-2">{state.message}</p>}
    </form>
  );
}
