"use client";

import { useActionState, useEffect, useState } from "react";
import { orderAction, type OrderOp, type OrderOpResult } from "@/app/actions/admin";

const input = "w-full rounded-lg border border-admin-line bg-white px-3 py-2 text-sm outline-none focus:border-admin-accent";
const btn = "rounded-lg border border-admin-line bg-white px-3 py-1.5 text-sm font-medium hover:border-admin-accent disabled:opacity-50";
const primary = "rounded-lg bg-admin-accent text-white px-4 py-2 text-sm font-medium disabled:opacity-60";
const danger = "rounded-lg bg-admin-red text-white px-4 py-2 text-sm font-medium disabled:opacity-60";

function useOp(orderId: number, op: OrderOp) {
  const [state, action, pending] = useActionState<OrderOpResult, FormData>(orderAction.bind(null, orderId, op), {});
  // Documents open in a new tab once Shiprocket returns the link
  useEffect(() => {
    if (state.url) window.open(state.url, "_blank", "noopener");
  }, [state.url, state.at]);
  return { state, action, pending };
}

function Result({ state }: { state: OrderOpResult }) {
  if (state.error) return <p className="text-sm text-admin-red">{state.error}</p>;
  if (state.ok) return <p className="text-sm text-admin-green">{state.ok}</p>;
  return null;
}

/** One-click action (no inputs): mark paid, label, invoice, cancel shipment, pickup. */
export function OrderButton({ orderId, op, label, confirm }: { orderId: number; op: OrderOp; label: string; confirm?: string }) {
  const { state, action, pending } = useOp(orderId, op);
  return (
    <form action={action} onSubmit={(e) => confirm && !window.confirm(confirm) && e.preventDefault()} className="inline-flex flex-col gap-1">
      <button disabled={pending} className={btn}>
        {pending ? "Working…" : label}
      </button>
      <Result state={state} />
    </form>
  );
}

export function RefundForm({ orderId, max, online, defaultSpeed }: { orderId: number; max: number; online: boolean; defaultSpeed: "normal" | "optimum" }) {
  const [open, setOpen] = useState(false);
  const { state, action, pending } = useOp(orderId, "refund");
  if (!open) return <button onClick={() => setOpen(true)} className={btn}>Refund</button>;
  return (
    <form
      action={action}
      onSubmit={(e) => !window.confirm(online ? "Send this refund to the customer through Razorpay? This can’t be undone." : "Record this refund?") && e.preventDefault()}
      className="w-full space-y-3 rounded-xl border border-admin-line p-4"
    >
      <p className="text-sm font-medium">Refund</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block text-sm">
          Amount (₹)
          <input name="amount" type="number" step="0.01" min="1" max={max / 100} defaultValue={max / 100} className={input} />
          <span className="text-xs text-admin-muted">Up to ₹{(max / 100).toLocaleString("en-IN")}</span>
        </label>
        {online ? (
          <label className="block text-sm">
            Speed
            <select name="speed" defaultValue={defaultSpeed} className={input}>
              <option value="normal">Normal · 5–7 working days</option>
              <option value="optimum">Instant where possible (fee)</option>
            </select>
          </label>
        ) : (
          <p className="text-xs text-admin-muted self-end">COD order: this records the refund — pay the customer back by UPI or bank transfer yourself.</p>
        )}
      </div>
      <label className="block text-sm">
        Reason
        <input name="reason" required placeholder="e.g. Size exchange not available" className={input} />
      </label>
      <div className="flex items-center gap-3">
        <button disabled={pending} className={primary}>{pending ? "Refunding…" : online ? "Refund via Razorpay" : "Record refund"}</button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-admin-muted">Close</button>
      </div>
      <Result state={state} />
    </form>
  );
}

export function CancelForm({ orderId, canRefund, paidOnline }: { orderId: number; canRefund: boolean; paidOnline: boolean }) {
  const [open, setOpen] = useState(false);
  const { state, action, pending } = useOp(orderId, "cancel");
  if (!open) return <button onClick={() => setOpen(true)} className={`${btn} text-admin-red`}>Cancel order</button>;
  return (
    <form action={action} onSubmit={(e) => !window.confirm("Cancel this order?") && e.preventDefault()} className="w-full space-y-3 rounded-xl border border-admin-red/30 p-4">
      <p className="text-sm font-medium">Cancel order</p>
      <label className="block text-sm">
        Reason
        <select name="reason" className={input} defaultValue="Customer changed their mind">
          <option>Customer changed their mind</option>
          <option>Out of stock</option>
          <option>Couldn’t reach the customer</option>
          <option>Suspected fraud / fake order</option>
          <option>Pincode not serviceable</option>
          <option>Other</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="restock" defaultChecked className="size-4" /> Put the items back into stock
      </label>
      {canRefund && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="refund" defaultChecked className="size-4" /> Refund the payment {paidOnline ? "through Razorpay" : "(record only)"}
        </label>
      )}
      <p className="text-xs text-admin-muted">Also cancels the order in Shiprocket if it was sent there.</p>
      <div className="flex items-center gap-3">
        <button disabled={pending} className={danger}>{pending ? "Cancelling…" : "Cancel order"}</button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-admin-muted">Keep order</button>
      </div>
      <Result state={state} />
    </form>
  );
}

export function NoteForm({ orderId }: { orderId: number }) {
  const { state, action, pending } = useOp(orderId, "note");
  return (
    <form action={action} key={state.at} className="space-y-2">
      <textarea name="note" rows={2} placeholder="Add an internal note (only staff see this)" className={input} />
      <div className="flex items-center gap-3">
        <button disabled={pending} className={btn}>{pending ? "Saving…" : "Add note"}</button>
        <Result state={state} />
      </div>
    </form>
  );
}
