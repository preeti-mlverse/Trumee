import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { db, schema } from "@/db";
import { logout } from "@/app/actions/account";
import { ProfileForm } from "@/components/store/account-forms";
import { Container } from "@/components/store/ui";
import { requireCustomer } from "@/lib/auth";
import { formatDate, inr } from "@/lib/utils";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

const STATUS: Record<string, string> = { unfulfilled: "Being packed", partially_fulfilled: "Partly shipped", fulfilled: "Shipped", returned: "Returned" };

export default async function AccountPage({ searchParams }: PageProps<"/account">) {
  const c = await requireCustomer();
  const welcome = (await searchParams).welcome === "1";
  const orders = await db.query.orders.findMany({
    where: eq(schema.orders.customerId, c.id),
    orderBy: [desc(schema.orders.createdAt)],
    with: { items: { columns: { id: true, title: true, imageUrl: true } } },
    limit: 50,
  });

  return (
    <Container className="pt-12 sm:pt-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] tracking-[0.3em] uppercase text-sea">{welcome ? "Welcome to Trumee" : "My account"}</p>
          <h1 className="font-display text-5xl sm:text-6xl mt-2">Hello, {c.firstName || "there"}</h1>
        </div>
        <form action={logout}>
          <button className="text-xs underline underline-offset-4">Sign out</button>
        </form>
      </div>

      <div className="mt-12 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-12">
        <section>
          <h2 className="font-display text-3xl mb-5">Orders</h2>
          {orders.length ? (
            <ul className="divide-y divide-line border-y border-line">
              {orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/orders/${o.token}`} className="flex items-center gap-5 py-5 hover:bg-sand/50 -mx-3 px-3">
                    <div className="flex -space-x-4">
                      {o.items.slice(0, 3).map((i) => (
                        <div key={i.id} className="relative w-12 aspect-[2/3] bg-sand border-2 border-cream">
                          {i.imageUrl && <Image src={i.imageUrl} alt="" fill sizes="48px" className="object-cover" />}
                        </div>
                      ))}
                    </div>
                    <div className="flex-1 text-sm">
                      <p className="font-medium">#{o.number}</p>
                      <p className="text-muted text-xs mt-0.5">{formatDate(o.createdAt)} · {o.items.length} item{o.items.length > 1 ? "s" : ""}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="tabular-nums">{inr(o.total)}</p>
                      <p className="text-xs text-muted">{o.status === "cancelled" ? "Cancelled" : STATUS[o.fulfillmentStatus]}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">
              No orders yet. <Link href="/collections/all" className="underline">Find your first piece</Link>.
            </p>
          )}
        </section>
        <aside>
          <h2 className="font-display text-3xl mb-5">Your details</h2>
          <p className="text-sm text-muted mb-4">{c.email}</p>
          <ProfileForm c={c} />
          <div className="mt-10 text-sm space-y-2">
            <Link href="/wishlist" className="block underline">Wishlist</Link>
            <Link href="/pages/returns-policy" className="block underline">Returns & exchanges</Link>
            <Link href="/contact" className="block underline">Contact support</Link>
          </div>
        </aside>
      </div>
    </Container>
  );
}
