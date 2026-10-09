"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { deleteAddress, saveAddress, setDefaultAddress } from "@/app/actions/account";
import type { Address } from "@/db/schema";
import { INDIAN_STATES } from "@/lib/india";

const input = "w-full rounded-xl border border-line bg-paper px-4 py-3 text-sm outline-none focus:border-ink";

export type SavedAddress = { id: number; data: Address; isDefault: boolean };

function AddressForm({ a, onDone }: { a?: SavedAddress; onDone: () => void }) {
  const [s, action, pending] = useActionState(saveAddress.bind(null, a?.id ?? null), null);
  useEffect(() => {
    if (s?.ok) onDone();
  }, [s, onDone]);
  const d = a?.data;
  return (
    <form action={action} className="space-y-3 rounded-2xl border border-line p-4 bg-paper/60">
      <div className="grid grid-cols-2 gap-3">
        <input name="name" defaultValue={d?.name} placeholder="Full name" aria-label="Full name" autoComplete="name" className={input} />
        <input name="phone" defaultValue={d?.phone} placeholder="Mobile number" aria-label="Mobile number" inputMode="numeric" autoComplete="tel" className={input} />
      </div>
      <input name="line1" defaultValue={d?.line1} placeholder="House / flat, street" aria-label="Address line 1" autoComplete="address-line1" className={input} />
      <input name="line2" defaultValue={d?.line2} placeholder="Area, landmark (optional)" aria-label="Address line 2" autoComplete="address-line2" className={input} />
      <div className="grid grid-cols-3 gap-3">
        <input name="pincode" defaultValue={d?.pincode} placeholder="Pincode" aria-label="Pincode" inputMode="numeric" maxLength={6} autoComplete="postal-code" className={input} />
        <input name="city" defaultValue={d?.city} placeholder="City" aria-label="City" autoComplete="address-level2" className={input} />
        <select name="state" defaultValue={d?.state ?? ""} aria-label="State" className={input}>
          <option value="">State</option>
          {INDIAN_STATES.map((st) => (
            <option key={st}>{st}</option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2.5 text-sm text-ink-soft">
        <input type="checkbox" name="isDefault" defaultChecked={a?.isDefault} className="accent-[var(--color-ink)] size-4" /> Use as my default address
      </label>
      {s?.error && <p className="text-sm text-sale">{s.error}</p>}
      <div className="flex items-center gap-4">
        <button disabled={pending} className="rounded-full bg-ink text-cream px-6 py-3 text-[11px] tracking-[0.2em] uppercase disabled:opacity-60">
          {pending ? "Saving…" : "Save address"}
        </button>
        <button type="button" onClick={onDone} className="text-xs underline underline-offset-4">
          Cancel
        </button>
      </div>
    </form>
  );
}

/** Saved delivery addresses on My account: add, edit, delete, choose the default used at checkout. */
export function AddressBook({ addresses }: { addresses: SavedAddress[] }) {
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [pending, start] = useTransition();
  const done = () => setEditing(null);

  return (
    <div className="space-y-3">
      {addresses.map((a) =>
        editing === a.id ? (
          <AddressForm key={a.id} a={a} onDone={done} />
        ) : (
          <div key={a.id} className="rounded-2xl border border-line p-4 text-sm">
            <p className="font-medium flex items-center gap-2">
              {a.data.name}
              {a.isDefault && <span className="rounded-full bg-sea-soft text-sea-dark px-2 py-0.5 text-[10px] tracking-[0.15em] uppercase">Default</span>}
            </p>
            <p className="text-muted mt-1 leading-relaxed">
              {a.data.line1}
              {a.data.line2 && `, ${a.data.line2}`}
              <br />
              {a.data.city}, {a.data.state} {a.data.pincode}
              <br />
              {a.data.phone}
            </p>
            <div className="mt-3 flex gap-4 text-xs">
              <button onClick={() => setEditing(a.id)} className="underline underline-offset-4">Edit</button>
              {!a.isDefault && (
                <button disabled={pending} onClick={() => start(() => setDefaultAddress(a.id))} className="underline underline-offset-4">
                  Make default
                </button>
              )}
              <button disabled={pending} onClick={() => confirm("Delete this address?") && start(() => deleteAddress(a.id))} className="underline underline-offset-4 text-sale">
                Delete
              </button>
            </div>
          </div>
        ),
      )}
      {editing === "new" ? (
        <AddressForm onDone={done} />
      ) : (
        <button onClick={() => setEditing("new")} className="rounded-full border border-ink px-6 py-3 text-[11px] tracking-[0.2em] uppercase hover:bg-ink hover:text-cream">
          + Add address
        </button>
      )}
      {!addresses.length && editing !== "new" && <p className="text-xs text-muted">Addresses you use at checkout are saved here automatically.</p>}
    </div>
  );
}
