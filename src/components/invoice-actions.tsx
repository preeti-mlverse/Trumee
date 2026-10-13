"use client";

import Link from "next/link";

/** Toolbar above the invoice (hidden when printing). */
export function InvoiceActions({ backHref }: { backHref?: string }) {
  return (
    <div className="mx-auto max-w-[820px] mb-4 flex items-center justify-between print:hidden">
      {backHref ? (
        <Link href={backHref} className="text-sm underline">
          ← Back to order
        </Link>
      ) : (
        <span />
      )}
      <button onClick={() => window.print()} className="rounded-full bg-neutral-900 text-white px-5 py-2.5 text-sm font-medium">
        Download PDF / Print
      </button>
    </div>
  );
}
