import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerNoteForm } from "@/components/admin/customer-note";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/auth";
import { formatDate, inr } from "@/lib/utils";

export const metadata = { title: "Customer" };
export const dynamic = "force-dynamic";

export default async function CustomerPage({ params }: PageProps<"/admin/customers/[id]">) {
  await requireStaff("customers");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const c = await db.query.customers.findFirst({ where: eq(schema.customers.id, id) });
  if (!c) notFound();
  const [orders, addresses] = await Promise.all([
    db.query.orders.findMany({ where: eq(schema.orders.customerId, id), orderBy: desc(schema.orders.createdAt) }),
    db.query.addresses.findMany({ where: eq(schema.addresses.customerId, id), orderBy: [desc(schema.addresses.isDefault)] }),
  ]);
  const live = orders.filter((o) => o.status !== "cancelled");
  const spent = live.filter((o) => ["paid", "partially_refunded"].includes(o.financialStatus)).reduce((s, o) => s + o.total - o.refundedTotal, 0);
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/customers" className="text-sm text-admin-muted hover:text-admin-text">← Customers</Link>
        <h1 className="text-2xl font-semibold">{name}</h1>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ["Amount spent", inr(spent)],
          ["Orders", String(live.length)],
          ["Average order", live.length ? inr(Math.round(spent / Math.max(1, live.length))) : "—"],
          ["Customer since", formatDate(c.createdAt)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl bg-admin-card border border-admin-line p-4">
            <p className="text-xs text-admin-muted">{k}</p>
            <p className="text-xl font-semibold mt-1">{v}</p>
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        <section className="rounded-2xl bg-admin-card border border-admin-line overflow-x-auto">
          <h2 className="font-semibold px-5 pt-4 pb-2">Orders</h2>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-admin-line">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="px-5 py-2.5"><Link href={`/admin/orders/${o.id}`} className="underline">#{o.number}</Link></td>
                  <td className="px-2 py-2.5 text-admin-muted">{formatDate(o.createdAt)}</td>
                  <td className="px-2 py-2.5">{o.status === "cancelled" ? "Cancelled" : o.paymentMethod === "cod" ? "COD" : o.financialStatus}</td>
                  <td className="px-2 py-2.5 text-admin-muted">{o.shippingMeta?.status ?? o.fulfillmentStatus}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{inr(o.total)}</td>
                </tr>
              ))}
              {!orders.length && (
                <tr>
                  <td className="px-5 py-6 text-admin-muted">No orders yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
        <aside className="space-y-6">
          <section className="rounded-2xl bg-admin-card border border-admin-line p-5 text-sm space-y-2">
            <h2 className="font-semibold">Contact</h2>
            <p><a href={`mailto:${c.email}`} className="underline break-all">{c.email}</a></p>
            {c.phone && (
              <p>
                <a href={`tel:${c.phone}`} className="underline">{c.phone}</a> · <a href={`https://wa.me/91${c.phone.replace(/\D/g, "").slice(-10)}`} target="_blank" rel="noopener" className="underline">WhatsApp</a>
              </p>
            )}
            <p className="text-admin-muted">{c.acceptsMarketing ? "Subscribed to email offers" : "Not subscribed to emails"}</p>
            {c.lastLoginAt && <p className="text-admin-muted">Last login {formatDate(c.lastLoginAt)}</p>}
          </section>
          <section className="rounded-2xl bg-admin-card border border-admin-line p-5 text-sm space-y-3">
            <h2 className="font-semibold">Saved addresses</h2>
            {addresses.map((a) => (
              <p key={a.id} className="text-admin-muted">
                {a.isDefault && <span className="block text-xs font-medium text-admin-text">Default</span>}
                {a.data.name} · {a.data.phone}
                <br />
                {a.data.line1}
                {a.data.line2 && `, ${a.data.line2}`}, {a.data.city}, {a.data.state} {a.data.pincode}
              </p>
            ))}
            {!addresses.length && <p className="text-admin-muted">None saved.</p>}
          </section>
          <section className="rounded-2xl bg-admin-card border border-admin-line p-5">
            <CustomerNoteForm customerId={c.id} note={c.note ?? ""} tags={c.tags.join(", ")} />
          </section>
        </aside>
      </div>
    </div>
  );
}
