import Link from "next/link";
import { adminLogout } from "@/app/actions/admin";
import { requireStaff } from "@/lib/auth";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  const staff = await requireStaff();
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 bg-admin-accent text-white">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-6">
          <Link href="/admin" className="font-display tracking-[0.3em] text-lg">TRUMEE</Link>
          <nav className="flex gap-1 text-sm">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-md px-3 py-1.5 hover:bg-white/10">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-4 text-sm">
            <Link href="/" target="_blank" className="hidden sm:inline text-white/70 hover:text-white">View store ↗</Link>
            <span className="hidden sm:inline text-white/70">{staff.name}</span>
            <form action={adminLogout}>
              <button className="rounded-md px-3 py-1.5 bg-white/10 hover:bg-white/20">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
