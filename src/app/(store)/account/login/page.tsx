import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GoogleButton, LoginForm, PhoneLogin, RegisterForm } from "@/components/store/account-forms";
import { Container } from "@/components/store/ui";
import { getCustomer } from "@/lib/auth";
import { googleConfigured, otpConfigured } from "@/lib/social-auth";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: true } };

export default async function LoginPage({ searchParams }: PageProps<"/account/login">) {
  const sp = await searchParams;
  const next = sp.next;
  const google = googleConfigured();
  const otp = otpConfigured();
  const nextPath = typeof next === "string" ? next : undefined;
  if (await getCustomer()) redirect(nextPath ?? "/account");
  return (
    <Container className="pt-12 sm:pt-16">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-24 max-w-5xl">
        <section>
          <h1 className="font-display text-5xl">Sign in</h1>
          <p className="text-ink-soft mt-3 mb-8">Track orders, save addresses and check out faster.</p>
          {sp.error === "google" && <p className="mb-6 text-sm text-sale">Google sign-in didn’t complete — please try again or use another way below.</p>}
          {(google || otp) && (
            <div className="space-y-4">
              {google && <GoogleButton next={nextPath} />}
              {otp && <PhoneLogin next={nextPath} />}
              <p className="flex items-center gap-4 py-2 text-[11px] tracking-[0.2em] uppercase text-muted before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">or with email</p>
            </div>
          )}
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
