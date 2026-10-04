"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics/client";

/** Page views, engagement time and scroll depth → first-party collector (+ GA4/Meta when consented). */
export function Tracker() {
  const pathname = usePathname();
  const search = useSearchParams();
  const last = useRef<string | null>(null);

  useEffect(() => {
    const key = pathname + "?" + search.toString();
    // Let the page set document.title first. The guard is set inside the timer so a
    // cancelled run (React strict mode re-runs effects) doesn't swallow the page view.
    const t = setTimeout(() => {
      if (last.current === key) return;
      last.current = key;
      track("page_view");
    }, 50);
    let scrolled = false;
    const onScroll = () => {
      if (scrolled) return;
      const h = document.documentElement;
      if ((h.scrollTop + innerHeight) / h.scrollHeight >= 0.9) {
        scrolled = true;
        track("scroll", { percent_scrolled: 90 });
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener("scroll", onScroll);
    };
  }, [pathname, search]);

  useEffect(() => {
    const onHide = () => document.visibilityState === "hidden" && track("user_engagement");
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  return null;
}

const CONSENT_KEY = "tm_consent";

/** GA4 + Meta Pixel with Google Consent Mode v2 (denied until the shopper accepts). */
export function ThirdPartyTags({ ga4, pixel, clarity }: { ga4: string; pixel: string; clarity: string }) {
  const [consent, setConsent] = useState<"all" | "essential" | null>(null);
  const [asked, setAsked] = useState(true);

  useEffect(() => {
    try {
      const v = localStorage.getItem(CONSENT_KEY) as "all" | "essential" | null;
      setConsent(v);
      setAsked(!!v);
    } catch {
      setAsked(false);
    }
  }, []);

  const choose = (v: "all" | "essential") => {
    try {
      localStorage.setItem(CONSENT_KEY, v);
    } catch {}
    setConsent(v);
    setAsked(true);
    const granted = v === "all" ? "granted" : "denied";
    window.gtag?.("consent", "update", { ad_storage: granted, analytics_storage: granted, ad_user_data: granted, ad_personalization: granted });
    if (v === "all") window.fbq?.("consent", "grant");
  };

  const hasTags = !!(ga4 || pixel || clarity);

  return (
    <>
      {ga4 && (
        <>
          <Script id="ga4-consent" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('consent', 'default', { ad_storage: '${consent === "all" ? "granted" : "denied"}', analytics_storage: '${consent === "all" ? "granted" : "denied"}', ad_user_data: '${consent === "all" ? "granted" : "denied"}', ad_personalization: '${consent === "all" ? "granted" : "denied"}', wait_for_update: 500 });
            gtag('js', new Date());
            gtag('config', '${ga4}', { send_page_view: true });
          `}</Script>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga4}`} strategy="afterInteractive" />
        </>
      )}
      {pixel && consent === "all" && (
        <Script id="meta-pixel" strategy="afterInteractive">{`
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${pixel}'); fbq('track', 'PageView');
        `}</Script>
      )}
      {clarity && consent === "all" && (
        <Script id="ms-clarity" strategy="afterInteractive">{`
          (function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window, document, "clarity", "script", "${clarity}");
        `}</Script>
      )}
      {hasTags && !asked && (
        <div className="fixed bottom-3 inset-x-3 sm:left-auto sm:right-5 sm:bottom-5 sm:max-w-sm z-40 bg-[#fffdf8] rounded-3xl border border-line shadow-2xl shadow-ink/10 p-5 animate-fade-in">
          <p className="text-sm leading-relaxed">
            We use cookies to run the store and, with your OK, to measure ads and improve your experience.{" "}
            <Link href="/pages/privacy-policy" className="underline underline-offset-2">
              Privacy policy
            </Link>
          </p>
          <div className="mt-4 flex gap-2">
            <button onClick={() => choose("all")} className="flex-1 rounded-full bg-ink text-cream py-2.5 text-xs tracking-[0.14em] uppercase">
              Accept all
            </button>
            <button onClick={() => choose("essential")} className="flex-1 border border-ink py-2.5 text-xs tracking-[0.14em] uppercase">
              Essential only
            </button>
          </div>
        </div>
      )}
    </>
  );
}
