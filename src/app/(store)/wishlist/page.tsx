import type { Metadata } from "next";
import { WishlistView } from "@/components/store/account-forms";
import { Breadcrumbs, Container } from "@/components/store/ui";

export const metadata: Metadata = { title: "Wishlist", robots: { index: false, follow: true } };

export default function WishlistPage() {
  return (
    <Container className="pt-12 sm:pt-16">
      <Breadcrumbs items={[{ label: "Wishlist" }]} />
      <h1 className="font-display text-5xl sm:text-6xl mt-4">Your wishlist</h1>
      <p className="text-ink-soft mt-3">Saved on this device. Sign in to keep it across devices.</p>
      <WishlistView />
    </Container>
  );
}
