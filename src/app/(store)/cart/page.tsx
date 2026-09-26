import type { Metadata } from "next";
import { CartPageView } from "@/components/store/cart-page";
import { ProductGrid } from "@/components/store/product-card";
import { Container, SectionHeading } from "@/components/store/ui";
import { listProducts } from "@/lib/catalog";

export const metadata: Metadata = { title: "Your bag", robots: { index: false, follow: true } };

export default async function CartPage() {
  const { items } = await listProducts({ featured: true, limit: 4 });
  return (
    <>
      <Container className="pt-12 sm:pt-16">
        <h1 className="font-display text-5xl sm:text-6xl">Your bag</h1>
        <CartPageView />
      </Container>
      <Container className="pt-24">
        <SectionHeading eyebrow="Complete the look" title="You might also love" href="/collections/all?sort=best-selling" />
        <ProductGrid items={items} list="Cart – Recommendations" />
      </Container>
    </>
  );
}
