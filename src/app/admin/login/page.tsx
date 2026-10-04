import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { getStaff } from "@/lib/auth";

export const metadata = { title: "Sign in" };

export default async function AdminLogin({ searchParams }: PageProps<"/admin/login">) {
  if (await getStaff()) redirect("/admin");
  const next = (await searchParams).next;
  return (
    <main className="min-h-dvh grid place-items-center p-4">
      <div className="w-full max-w-sm rounded-2xl bg-admin-card border border-admin-line p-8 shadow-sm">
        <p className="font-display text-3xl tracking-[0.3em] text-center">TRUMEE</p>
        <p className="text-center text-sm text-admin-muted mt-2">Store admin</p>
        <LoginForm next={typeof next === "string" ? next : ""} />
      </div>
    </main>
  );
}
