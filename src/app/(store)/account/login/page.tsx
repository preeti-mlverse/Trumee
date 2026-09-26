import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm, RegisterForm } from "@/components/store/account-forms";
import { Container } from "@/components/store/ui";
import { getCustomer } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: true } };

export default async function LoginPage({ searchParams }: PageProps<"/account/login">) {
  const next = (await searchParams).next;
  const nextPath = typeof next === "string" ? next : undefined;
  if (await getCustomer()) redirect(nextPath ?? "/account");
  return (
    <Container className="pt-12 sm:pt-16">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-24 max-w-5xl">
        <section>
          <h1 className="font-display text-5xl">Sign in</h1>
          <p className="text-ink-soft mt-3 mb-8">Track orders, save addresses and check out faster.</p>
          <LoginForm next={nextPath} />
        </section>
        <section className="md:border-l md:border-line md:pl-12 lg:pl-24">
          <h2 className="font-display text-5xl">New here?</h2>
          <p className="text-ink-soft mt-3 mb-8">Create an account in seconds. Already ordered as a guest? Use the same email and we’ll link your orders.</p>
          <RegisterForm next={nextPath} />
        </section>
      </div>
    </Container>
  );
}
