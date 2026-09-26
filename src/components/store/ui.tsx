import Link from "next/link";
import { cn } from "@/lib/utils";

export function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10", className)}>{children}</div>;
}

/** Upright, spaced wordmark. */
export function Wordmark({ className }: { className?: string }) {
  return <span className={cn("font-display font-medium uppercase tracking-[0.3em] leading-none not-italic [padding-left:0.3em]", className)}>Trumee</span>;
}

/** Editorial heading: short eyebrow over a Didone title. `dark` for inverted sections. */
export function SectionHeading({
  eyebrow,
  title,
  href,
  linkLabel = "View all",
  dark = false,
  className,
}: {
  eyebrow?: string;
  title: string;
  href?: string;
  linkLabel?: string;
  dark?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-6 mb-8 sm:mb-12", className)}>
      <div>
        {eyebrow && <p className={cn("text-[11px] tracking-[0.26em] uppercase mb-3", dark ? "text-marigold" : "text-plum")}>{eyebrow}</p>}
        <h2 className="font-display text-[36px] sm:text-[56px] leading-[1] tracking-[-0.01em]">{title}</h2>
      </div>
      {href && (
        <Link
          href={href}
          className={cn(
            "shrink-0 text-[11px] tracking-[0.2em] uppercase border px-4 py-2.5 transition-colors",
            dark ? "border-cream/40 hover:bg-cream hover:text-ink" : "border-ink hover:bg-ink hover:text-cream",
          )}
        >
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-xs text-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <Link href="/" className="inline-block py-1 hover:text-ink">
            Home
          </Link>
        </li>
        {items.map((it) => (
          <li key={it.label} className="flex items-center gap-1.5">
            <span aria-hidden>/</span>
            {it.href ? (
              <Link href={it.href} className="inline-block py-1 hover:text-ink">
                {it.label}
              </Link>
            ) : (
              <span className="text-ink-soft">{it.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Button({ className, variant = "dark", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "dark" | "outline" | "plum" }) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 px-7 py-3.5 text-xs tracking-[0.2em] uppercase transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        variant === "dark" && "bg-ink text-cream hover:bg-ink-soft",
        variant === "plum" && "bg-plum text-cream hover:bg-plum-dark",
        variant === "outline" && "border border-ink hover:bg-ink hover:text-cream",
        className,
      )}
    />
  );
}

export function Field({ label, error, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="block text-xs text-muted mb-1.5">{label}</span>
      <input
        {...props}
        className="w-full border border-line bg-cream px-3.5 py-3 text-sm outline-none focus:border-ink transition-colors aria-[invalid=true]:border-sale"
        aria-invalid={!!error}
      />
      {error && <span className="block text-xs text-sale mt-1">{error}</span>}
    </label>
  );
}
