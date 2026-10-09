"use client";

import { useActionState } from "react";
import { saveCustomerNote, type CatalogResult } from "@/app/actions/catalog";

const input = "w-full rounded-lg border border-admin-line bg-white px-3 py-2 text-sm outline-none focus:border-admin-accent";

/** Private staff notes and tags on a customer (e.g. "VIP", "prefers WhatsApp"). */
export function CustomerNoteForm({ customerId, note, tags }: { customerId: number; note: string; tags: string }) {
  const [state, action, pending] = useActionState<CatalogResult, FormData>(saveCustomerNote.bind(null, customerId), {});
  return (
    <form action={action} className="space-y-3 text-sm">
      <h2 className="font-semibold">Notes</h2>
      <textarea name="note" rows={3} defaultValue={note} placeholder="Only staff see this" className={input} />
      <label className="block">
        Tags
        <input name="tags" defaultValue={tags} placeholder="VIP, wholesale" className={input} />
      </label>
      <div className="flex items-center gap-3">
        <button disabled={pending} className="rounded-lg bg-admin-accent text-white px-4 py-1.5 text-sm font-medium disabled:opacity-60">{pending ? "Saving…" : "Save"}</button>
        {state.ok && !pending && <span className="text-admin-green">{state.ok}</span>}
      </div>
    </form>
  );
}
