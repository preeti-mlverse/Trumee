import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Umbrella } from "./motifs";

export function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10", className)}>{children}</div>;
}

/** Upright, spaced wordmark. */
export function Wordmark({ className }: { className?: string }) {
  return <span className={cn("font-display font-medium uppercase tracking-[0.3em] leading-none not-italic [padding-left:0.3em]", className)}>Trumee</span>;
}

/** "● View all" — small dotted text link used beside section titles. */
export function DotLink({ href, children, dark = false, className }: { href: string; children: React.ReactNode; dark?: boolean; className?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5 py-1.5 text-[13px] sm:text-sm tracking-[0.04em]", className)}>
      <span className={cn("size-1.5 rounded-full transition-transform group-hover:scale-150", dark ? "bg-sun" : "bg-sea")} />
      <span className={cn("border-b border-transparent transition-colors", dark ? "group-hover:border-cream/60" : "group-hover:border-ink/60")}>{children}</span>
    </Link>
  );
}

/** Pill call-to-action with a round arrow badge that turns on hover. */
export function PillLink({
  href,
  children,
  tone = "light",
  className,
  tabIndex,
}: {
  href: string;
  children: React.ReactNode;
  tone?: "light" | "dark" | "sun";
  className?: string;
  tabIndex?: number;
}) {
  return (
    <Link
      href={href}
      tabIndex={tabIndex}
      className={cn(
        "group inline-flex items-center gap-4 rounded-full pl-6 pr-1.5 py-1.5 text-[13px] sm:text-sm font-medium tracking-[0.04em] transition-colors",
        tone === "light" && "bg-paper text-ink hover:bg-white",
        tone === "dark" && "bg-ink text-cream hover:bg-ink-soft",
        tone === "sun" && "bg-sun text-ink hover:bg-sun-soft",
        className,
      )}
    >
      {children}
      <span className={cn("size-9 sm:size-10 rounded-full grid place-items-center transition-transform duration-300 group-hover:rotate-45", tone === "dark" ? "bg-sun text-ink" : "bg-ink text-cream")}>
        <ArrowUpRight className="size-4" strokeWidth={1.6} />
      </span>
    </Link>
  );
}

/** Section heading: large editorial title on the left; optional blurb + dotted link on the right. */
export function SectionHeading({
  eyebrow,
  title,
  accent,
  text,
  href,
  linkLabel = "View all",
  dark = false,
  as: Heading = "h2",
  className,
}: {
  eyebrow?: string;
  title: string;
  /** Use "h1" when this is the page's main heading */
  as?: "h1" | "h2";
  /** Optional italic word(s) appended to the title */
  accent?: string;
  text?: string;
  href?: string;
  linkLabel?: string;
  dark?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-end justify-between gap-5 sm:gap-10 mb-8 sm:mb-12", className)}>
      <div className="max-w-3xl">
        {eyebrow && (
          <p className={cn("flex items-center gap-2 text-[11px] tracking-[0.28em] uppercase mb-3", dark ? "text-sun" : "text-sea")}>
            <Umbrella dark={dark} className="size-4 -mt-0.5" />
            {eyebrow}
          </p>
        )}
        <Heading className="font-display text-[40px] sm:text-[64px] leading-[0.98]">
          {title}
          {accent && (
            <>
              {" "}
              <em className={cn("font-normal", dark ? "text-sun-soft" : "text-sea")}>{accent}</em>
            </>
          )}
        </Heading>
      </div>
      {(text || href) && (
        <div className="sm:max-w-sm sm:text-left shrink-0">
          {text && <p className={cn("text-[15px] leading-relaxed", dark ? "text-cream/70" : "text-ink-soft")}>{text}</p>}
          {href && (
            <DotLink href={href} dark={dark} className={text ? "mt-3" : ""}>
              {linkLabel}
            </DotLink>
          )}
        </div>
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

export function Button({ className, variant = "dark", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "dark" | "outline" | "sea" }) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-8 py-3.5 text-[13px] font-medium tracking-[0.08em] uppercase transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        variant === "dark" && "bg-ink text-cream hover:bg-ink-soft",
        variant === "sea" && "bg-sea text-cream hover:bg-sea-dark",
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
        className="w-full rounded-xl border border-line bg-paper px-4 py-3 text-sm outline-none focus:border-ink transition-colors aria-[invalid=true]:border-sale"
        aria-invalid={!!error}
      />
      {error && <span className="block text-xs text-sale mt-1">{error}</span>}
    </label>
  );
}
