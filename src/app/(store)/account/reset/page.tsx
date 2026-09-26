import type { Metadata } from "next";
import Link from "next/link";
import { ResetForm } from "@/components/store/account-forms";
import { Container } from "@/components/store/ui";

export const metadata: Metadata = { title: "Set a new password", robots: { index: false } };

export default async function ResetPage({ searchParams }: PageProps<"/account/reset">) {
  const token = (await searchParams).token;
  return (
    <Container className="pt-12 sm:pt-16 max-w-md">
      <h1 className="font-display text-5xl">New password</h1>
      {typeof token === "string" ? (
        <div className="mt-8">
          <ResetForm token={token} />
        </div>
      ) : (
        <p className="mt-6">This link is incomplete. <Link href="/account/forgot" className="underline">Request a new one</Link>.</p>
      )}
    </Container>
  );
}
