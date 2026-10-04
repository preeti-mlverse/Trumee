"use client";

import { useState, useTransition } from "react";
import { shiprocketOrderAction } from "@/app/actions/admin";

/** Per-order Shiprocket buttons: send → ship now (AWB + pickup) → refresh tracking. */
export function ShipActions({ orderId, stage, disabled }: { orderId: number; stage: "new" | "sent" | "shipped"; disabled?: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const run = (op: "push" | "ship" | "track") => start(async () => setMsg(await shiprocketOrderAction(orderId, op)));
  const btn = "rounded-md border border-admin-line bg-white px-2.5 py-1 text-xs font-medium hover:border-admin-accent disabled:opacity-50";

  if (disabled) return <span className="text-xs text-admin-muted">{disabled}</span>;
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1.5">
        {stage === "new" && (
          <button className={btn} disabled={pending} onClick={() => run("push")}>
            Send to Shiprocket
          </button>
        )}
        {stage !== "shipped" && (
          <button className={btn} disabled={pending} onClick={() => run("ship")}>
            Ship now
          </button>
        )}
        {stage === "shipped" && (
          <button className={btn} disabled={pending} onClick={() => run("track")}>
            Refresh tracking
          </button>
        )}
      </div>
      {pending && <p className="text-xs text-admin-muted">Working…</p>}
      {msg?.ok && <p className="text-xs text-admin-green">{msg.ok}</p>}
      {msg?.error && <p className="text-xs text-admin-red max-w-64">{msg.error}</p>}
    </div>
  );
}
