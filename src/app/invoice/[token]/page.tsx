import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InvoiceDocument } from "@/components/invoice-document";
import { buildInvoice, invoiceAvailable } from "@/lib/invoice";
import { getOrderByToken } from "@/lib/orders";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Tax invoice", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** Customer copy of the GST invoice — reached from the order page / confirmation email (unguessable token). */
export default async function CustomerInvoice({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const o = await getOrderByToken(token);
  if (!o || !invoiceAvailable(o)) notFound();
  const inv = buildInvoice(o, await getSettings("store"));
  return <InvoiceDocument inv={inv} backHref={`/orders/${token}`} />;
}
