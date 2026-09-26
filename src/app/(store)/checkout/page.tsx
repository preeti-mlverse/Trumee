import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { db, schema } from "@/db";
import { CheckoutForm } from "@/components/store/checkout-form";
import { Container } from "@/components/store/ui";
import { getCustomer } from "@/lib/auth";
import { getCartState } from "@/lib/cart";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Checkout", robots: { index: false, follow: false } };

export default async function CheckoutPage() {
  const [cart, shipping, customer] = await Promise.all([getCartState(), getSettings("shipping"), getCustomer()]);

  if (!cart.lines.length)
    return (
      <Container className="py-32 text-center">
        <h1 className="font-display text-5xl">Your bag is empty</h1>
        <p className="text-muted mt-3">Add a piece or two and come back to check out.</p>
        <Link href="/collections/all" className="inline-block mt-8 bg-ink text-cream px-7 py-3.5 text-[11px] tracking-[0.22em] uppercase">
          Shop all clothing
        </Link>
      </Container>
    );

  const address = customer
    ? (await db.query.addresses.findFirst({ where: eq(schema.addresses.customerId, customer.id), orderBy: [desc(schema.addresses.isDefault), desc(schema.addresses.createdAt)] }))?.data
    : undefined;

  return (
    <Container className="pt-10 sm:pt-14">
      <nav aria-label="Checkout steps" className="flex items-center gap-3 text-[11px] tracking-[0.2em] uppercase text-muted mb-10">
        <Link href="/cart" className="py-2 hover:text-ink">Bag</Link>
        <span className="h-px w-8 bg-line" />
        <span className="text-ink">Details & payment</span>
        <span className="h-px w-8 bg-line" />
        <span>Confirmation</span>
      </nav>
      <CheckoutForm
        initial={cart}
        codEnabled={shipping.codEnabled}
        codMax={shipping.codMaxOrder}
        codFee={shipping.codFee}
        prefill={{
          email: customer?.email ?? cart.email ?? undefined,
          phone: customer?.phone ?? address?.phone,
          name: address?.name ?? ([customer?.firstName, customer?.lastName].filter(Boolean).join(" ") || undefined),
          line1: address?.line1,
          line2: address?.line2,
          city: address?.city,
          state: address?.state,
          pincode: address?.pincode,
        }}
      />
    </Container>
  );
}
