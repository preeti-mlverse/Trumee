"use client";

import { useTransition } from "react";
import { setMessageStatus } from "@/app/actions/admin";

const NEXT = { new: "read", read: "replied", replied: "new" } as const;
const LABEL = { new: "Mark read", read: "Mark replied", replied: "Reopen" } as const;

export function MessageStatus({ id, status }: { id: number; status: keyof typeof NEXT }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => start(() => setMessageStatus(id, NEXT[status]))}
      className="rounded-md border border-admin-line bg-white px-2.5 py-1 text-xs font-medium hover:border-admin-accent disabled:opacity-50"
    >
      {pending ? "…" : LABEL[status]}
    </button>
  );
}
