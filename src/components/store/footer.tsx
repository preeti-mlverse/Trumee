import { Mail, MessageCircle, Phone } from "lucide-react";
import Link from "next/link";
import type { StoreSettings } from "@/lib/settings";
import { NewsletterForm } from "./newsletter-form";
import { Wordmark } from "./ui";

const COLS = [
  {
    title: "Shop",
    links: [
      ["All clothing", "/collections/all"],
      ["Dresses", "/collections/dresses"],
      ["Tops", "/collections/tops"],
      ["Skirts", "/collections/skirts"],
      ["Jumpsuits", "/collections/jumpsuit"],
      ["Co-ord sets", "/collections/co-ord-sets"],
    ],
  },
  {
    title: "Help",
    links: [
      ["Track your order", "/track-order"],
      ["Shipping policy", "/pages/shipping-policy"],
      ["Returns & exchanges", "/pages/returns-policy"],
      ["Size guide", "/pages/sizing-chart"],
      ["FAQs", "/pages/faqs"],
      ["Contact us", "/contact"],
    ],
  },
  {
    title: "Trumee",
    links: [
      ["About us", "/pages/about-us"],
      ["Journal", "/blogs/news"],
      ["Terms & conditions", "/pages/terms-and-conditions"],
      ["Privacy policy", "/pages/privacy-policy"],
    ],
  },
];

export function Footer({ store }: { store: StoreSettings }) {
  return (
    <footer className="mt-28 bg-ink text-cream">
      <div className="mx-auto max-w-[1400px] overflow-hidden px-5 sm:px-10 lg:px-14 pt-16 pb-8">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.3fr)_2fr]">
          <div>
            <p className="font-display text-4xl sm:text-5xl leading-[1]">
              Dressed for days that <em className="font-normal text-sun-soft">don’t follow a plan.</em>
            </p>
            <p className="mt-4 text-sm text-cream/60 max-w-sm">{store.tagline}. Designed in Gurgaon for spontaneous getaways and barefoot evenings.</p>
            <div className="mt-8">
              <p className="text-[11px] tracking-[0.26em] uppercase mb-3 text-sun">Join the list</p>
              <p className="text-sm text-cream/60 mb-4">New drops, styling notes and members-only offers. No spam, ever.</p>
              <NewsletterForm />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
            {COLS.map((c) => (
              <div key={c.title}>
                <p className="text-[11px] tracking-[0.26em] uppercase mb-5 text-sun">{c.title}</p>
                <ul className="space-y-1">
                  {c.links.map(([label, href]) => (
                    <li key={href}>
                      <Link href={href} className="inline-block py-1 text-sm text-cream/75 hover:text-sun">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="col-span-2 sm:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-cream/15 text-sm">
              <a href={`tel:${store.phone.replace(/\s/g, "")}`} className="flex items-center gap-2 py-2 text-cream/75">
                <Phone className="size-4" strokeWidth={1.5} /> {store.phone}
              </a>
              <a href={`mailto:${store.email}`} className="flex items-center gap-2 py-2 text-cream/75">
                <Mail className="size-4" strokeWidth={1.5} /> {store.email}
              </a>
              <a href={`https://wa.me/${store.whatsapp}`} target="_blank" rel="noopener" className="flex items-center gap-2 py-2 text-cream/75">
                <MessageCircle className="size-4" strokeWidth={1.5} /> WhatsApp us
              </a>
            </div>
          </div>
        </div>
        <Link href="/" aria-label="Trumee home" className="block mt-16 -mb-[0.08em] text-center select-none">
          <Wordmark className="block text-[17vw] lg:text-[208px] tracking-[0.12em] [padding-left:0.12em] text-cream/95 hover:text-sun transition-colors duration-500" />
        </Link>
        <div className="mt-8 pt-6 border-t border-cream/15 flex flex-col sm:flex-row gap-4 items-center justify-between text-xs text-cream/50">
          <p>
            © {new Date().getFullYear()} {store.legalName}. All rights reserved. ·{" "}
            <Link href="/credits" className="inline-block py-1.5 hover:text-cream">
              Image credits
            </Link>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-5">
            {store.social.instagram && (
              <a href={store.social.instagram} target="_blank" rel="noopener" aria-label="Instagram" className="p-2 -m-2 inline-flex">
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" /></svg>
              </a>
            )}
            {store.social.youtube && (
              <a href={store.social.youtube} target="_blank" rel="noopener" aria-label="YouTube" className="p-2 -m-2 inline-flex">
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2.5" y="5.5" width="19" height="13" rx="4" /><path d="M10 9.5v5l4.5-2.5z" fill="currentColor" /></svg>
              </a>
            )}
            {store.social.facebook && (
              <a href={store.social.facebook} target="_blank" rel="noopener" aria-label="Facebook" className="p-2 -m-2 inline-flex">
                <svg viewBox="0 0 24 24" className="size-4" fill="currentColor"><path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.5V4.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.4H8v3h2.6V21z" /></svg>
              </a>
            )}
            <span>Secure payments by Razorpay · UPI · Cards · Netbanking · COD</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
