import { Suspense } from "react";
import { Tracker, ThirdPartyTags } from "@/components/store/analytics";
import { CartDrawer } from "@/components/store/cart-drawer";
import { CartProvider, WishlistProvider } from "@/components/store/cart-context";
import { Footer } from "@/components/store/footer";
import { Header } from "@/components/store/header";
import { JsonLd } from "@/components/store/json-ld";
import { organizationLd, websiteLd } from "@/lib/seo";
import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const i = await getSettings("integrations");
  const google = process.env.GOOGLE_SITE_VERIFICATION || i.googleSiteVerification;
  const bing = process.env.BING_SITE_VERIFICATION;
  return { verification: { google: google || undefined, other: bing ? { "msvalidate.01": bing } : undefined } };
}

export default async function StoreLayout({ children }: LayoutProps<"/">) {
  const [store, nav, integrations] = await Promise.all([getSettings("store"), getSettings("navigation"), getSettings("integrations")]);
  return (
    <div className="font-sans flex flex-col min-h-dvh">
      <JsonLd data={[organizationLd(store), websiteLd()]} />
      <CartProvider>
        <WishlistProvider>
          <Header nav={nav} announcement={store.announcement} />
          <main className="flex-1">{children}</main>
          <Footer store={store} />
          <CartDrawer />
          <Suspense>
            <Tracker />
          </Suspense>
          <ThirdPartyTags ga4={integrations.ga4MeasurementId} pixel={integrations.metaPixelId} clarity={integrations.clarityId} />
        </WishlistProvider>
      </CartProvider>
    </div>
  );
}
