"use client";

import { useActionState } from "react";
import { adminLogin } from "@/app/actions/admin";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(adminLogin, {});
  return (
    <form action={action} className="mt-8 space-y-3">
      <input type="hidden" name="next" value={next} />
      <input name="email" type="email" autoComplete="username" required placeholder="Email" className="w-full rounded-lg border border-admin-line px-3.5 py-2.5 text-sm outline-none focus:border-admin-accent" />
      <input name="password" type="password" autoComplete="current-password" required placeholder="Password" className="w-full rounded-lg border border-admin-line px-3.5 py-2.5 text-sm outline-none focus:border-admin-accent" />
      {state.error && <p className="text-sm text-admin-red">{state.error}</p>}
      <button disabled={pending} className="w-full rounded-lg bg-admin-accent text-white py-2.5 text-sm font-medium disabled:opacity-60">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
