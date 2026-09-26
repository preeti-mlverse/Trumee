import type { Metadata } from "next";
import { TrackOrderForm } from "@/components/store/track-order-form";
import { Breadcrumbs, Container } from "@/components/store/ui";

export const metadata: Metadata = {
  title: "Track your order",
  description: "Check the status of your Trumee order with your order number and email or phone number.",
  alternates: { canonical: "/track-order" },
};

export default function TrackOrderPage() {
  return (
    <Container className="pt-12 sm:pt-16 max-w-xl">
      <Breadcrumbs items={[{ label: "Track your order" }]} />
      <h1 className="font-display text-5xl sm:text-6xl mt-4">Track your order</h1>
      <p className="text-ink-soft mt-4">Enter the order number from your confirmation email (e.g. 1024) and the email or mobile number you ordered with.</p>
      <TrackOrderForm />
    </Container>
  );
}
