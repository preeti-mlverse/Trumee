import type { Metadata } from "next";
import { ForgotForm } from "@/components/store/account-forms";
import { Container } from "@/components/store/ui";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

export default function ForgotPage() {
  return (
    <Container className="pt-12 sm:pt-16 max-w-md">
      <h1 className="font-display text-5xl">Forgot password</h1>
      <p className="text-ink-soft mt-3 mb-8">Enter your email and we’ll send you a link to set a new one.</p>
      <ForgotForm />
    </Container>
  );
}
