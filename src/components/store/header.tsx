"use client";

import { Heart, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { NavLink } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { useCart, useWishlist } from "./cart-context";
import { Wordmark } from "./ui";
import { SearchOverlay } from "./search-overlay";

export function Header({ nav, announcement }: { nav: NavLink[]; announcement: { enabled: boolean; text: string; href?: string } }) {
  const { cart, setOpen } = useCart();
  const { ids } = useWishlist();
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    setMenu(false);
    setSearch(false);
  }, [pathname]);

  return (
    <>
      {announcement.enabled && (
        <div className="bg-ink text-marigold-soft text-[9.5px] sm:text-[11px] tracking-[0.14em] sm:tracking-[0.24em] uppercase text-center py-2.5 px-3 whitespace-nowrap overflow-hidden text-ellipsis">
          {announcement.href ? <Link href={announcement.href} className="inline-block py-1.5 -my-1.5">{announcement.text}</Link> : announcement.text}
        </div>
      )}
      <header
        className={cn(
          "sticky top-0 z-40 bg-cream/95 backdrop-blur transition-shadow",
          scrolled ? "shadow-[0_1px_0_var(--color-line)]" : "",
        )}
      >
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 h-16 lg:h-[72px] grid grid-cols-[minmax(0,1fr)_auto_1fr] items-center">
          <div className="flex items-center gap-1">
            <button aria-label="Open menu" className="lg:hidden -ml-2 p-2" onClick={() => setMenu(true)}>
              <Menu className="size-5" strokeWidth={1.5} />
            </button>
            <nav className="hidden lg:flex items-center gap-7 text-[13px] tracking-[0.12em] uppercase">
              {nav.map((item) => (
                <div key={item.label} className="group relative">
                  <Link
                    href={item.href}
                    className={cn(
                      "relative py-6 inline-block hover:text-plum transition-colors",
                      isActive(item, pathname) && "text-plum after:absolute after:left-0 after:right-0 after:bottom-5 after:h-px after:bg-plum",
                    )}
                  >
                    {item.label}
                  </Link>
                  {item.children?.length ? (
                    <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 transition-opacity absolute -left-5 top-full">
                      <div className="bg-cream border border-line shadow-xl shadow-ink/10 min-w-60 py-3">
                        {item.children.map((c) => (
                          <Link key={c.href} href={c.href} className="block px-5 py-2 normal-case tracking-normal text-sm text-ink-soft hover:text-plum hover:bg-sand/60">
                            {c.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </nav>
          </div>

          <Link href="/" className="text-ink" aria-label="Trumee home">
            <Wordmark className="text-[22px] lg:text-[26px]" />
          </Link>

          <div className="flex items-center justify-end gap-0.5 sm:gap-1.5">
            <button aria-label="Search" className="p-2" onClick={() => setSearch(true)}>
              <Search className="size-5" strokeWidth={1.5} />
            </button>
            <Link aria-label="Account" href="/account" className="p-2 hidden sm:inline-flex">
              <User className="size-5" strokeWidth={1.5} />
            </Link>
            <Link aria-label="Wishlist" href="/wishlist" className="p-2 relative hidden sm:inline-flex">
              <Heart className="size-5" strokeWidth={1.5} />
              {ids.length > 0 && <Badge n={ids.length} />}
            </Link>
            <button aria-label="Open bag" className="p-2 -mr-2 relative" onClick={() => setOpen(true)}>
              <ShoppingBag className="size-5" strokeWidth={1.5} />
              {!!cart?.count && <Badge n={cart.count} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {menu && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40 animate-fade-in" onClick={() => setMenu(false)} />
          <div className="absolute inset-y-0 left-0 w-[86%] max-w-sm bg-cream flex flex-col animate-fade-in">
            <div className="flex items-center justify-between px-5 h-16 border-b border-line">
              <Wordmark className="text-xl" />
              <button aria-label="Close menu" onClick={() => setMenu(false)} className="p-2 -mr-2">
                <X className="size-5" strokeWidth={1.5} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-5 py-4">
              {nav.map((item) => (
                <div key={item.label} className="border-b border-line/70 py-3">
                  <Link href={item.href} className="block text-sm tracking-[0.14em] uppercase py-1">
                    {item.label}
                  </Link>
                  {item.children && (
                    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
                      {item.children.map((c) => (
                        <Link key={c.href} href={c.href} className="text-[15px] text-ink-soft py-0.5">
                          {c.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>
            <div className="border-t border-line px-5 py-4 grid grid-cols-2 gap-3 text-sm">
              <Link href="/account" className="flex items-center gap-2"><User className="size-4" strokeWidth={1.5} /> Account</Link>
              <Link href="/wishlist" className="flex items-center gap-2"><Heart className="size-4" strokeWidth={1.5} /> Wishlist</Link>
              <Link href="/track-order" className="col-span-2 text-muted">Track your order</Link>
            </div>
          </div>
        </div>
      )}

      {search && <SearchOverlay onClose={() => setSearch(false)} />}
    </>
  );
}

function Badge({ n }: { n: number }) {
  return (
    <span className="absolute top-0.5 right-0 min-w-[18px] h-[18px] rounded-full bg-marigold text-ink text-[10px] font-medium grid place-items-center px-1">
      {n > 99 ? "99+" : n}
    </span>
  );
}

/** Highlight exactly one top-level item: its own path, or one of its children's paths. */
function isActive(item: NavLink, pathname: string) {
  const path = (h: string) => h.split("?")[0];
  if (item.href.includes("?")) return false;
  if (item.children?.some((c) => path(c.href) === pathname)) return true;
  return path(item.href) === pathname || (path(item.href) !== "/" && item.href !== "/collections" && pathname.startsWith(path(item.href) + "/"));
}
