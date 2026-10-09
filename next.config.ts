import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // WebP only: sources are already WebP, and AVIF encoding is ~2x slower and far more
    // memory-hungry — on a small server it delays first loads and can crash the process.
    formats: ["image/webp"],
    // Resized variants are kept for 30 days (default 4h) so the server re-encodes rarely.
    // Replacing a photo under the same file name can take up to that long to show — use a new name.
    minimumCacheTTL: 2592000,
  },
  // Permanent redirects for Shopify URL patterns so old links, bookmarks and
  // Google results keep their equity. Product-handle renames live in the DB (redirects table).
  async redirects() {
    return [
      { source: "/collections/:collection/products/:product", destination: "/products/:product", permanent: true },
      { source: "/collections/frontpage", destination: "/collections/all", permanent: true },
      { source: "/collections/home", destination: "/collections/all", permanent: true },
      { source: "/products", destination: "/collections/all", permanent: true },
      { source: "/pages/contact", destination: "/contact", permanent: true },
      { source: "/contact-us", destination: "/contact", permanent: true },
      { source: "/pages/faq", destination: "/pages/faqs", permanent: true },
      { source: "/policies/refund-policy", destination: "/pages/returns-policy", permanent: true },
      { source: "/policies/shipping-policy", destination: "/pages/shipping-policy", permanent: true },
      { source: "/policies/privacy-policy", destination: "/pages/privacy-policy", permanent: true },
      { source: "/policies/terms-of-service", destination: "/pages/terms-and-conditions", permanent: true },
      { source: "/blogs/news/tagged/:tag", destination: "/blogs/news", permanent: true },
      { source: "/blogs", destination: "/blogs/news", permanent: true },
      { source: "/account/orders/:id", destination: "/account", permanent: false },
      // Older WordPress/WooCommerce URLs that Google still has indexed
      { source: "/product-category/jumpsuits/:rest*", destination: "/collections/jumpsuit", permanent: true },
      { source: "/product-category/co-ords/:rest*", destination: "/collections/co-ord-sets", permanent: true },
      { source: "/product-category/:cat/:rest*", destination: "/collections/:cat", permanent: true },
      // (Next strips trailing slashes before these run, so no "/"-suffixed variants are needed)
      { source: "/product/:slug", destination: "/products/:slug", permanent: true },
      { source: "/trumee/:slug", destination: "/blogs/news/:slug", permanent: true },
      { source: "/shop", destination: "/collections/all", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/(images|videos)/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // Test copies (e.g. new.trumee.in) set NOINDEX=1 so Google never indexes them next to the live store
          ...(process.env.NOINDEX === "1" ? [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] : []),
        ],
      },
    ];
  },
};

export default nextConfig;
