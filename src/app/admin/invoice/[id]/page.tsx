import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { InvoiceDocument } from "@/components/invoice-document";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/auth";
import { buildInvoice } from "@/lib/invoice";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Tax invoice" };
export const dynamic = "force-dynamic";

/** Admin copy of the GST invoice (available for any order, including unpaid ones, for checking). */
export default async function AdminInvoice({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("orders");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const o = await db.query.orders.findFirst({ where: eq(schema.orders.id, id), with: { items: true } });
  if (!o) notFound();
  const inv = buildInvoice(o, await getSettings("store"));
  return <InvoiceDocument inv={inv} backHref={`/admin/orders/${id}`} />;
}
