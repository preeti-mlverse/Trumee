import { eq } from "drizzle-orm";
import type { MetadataRoute } from "next";
import { db, schema } from "@/db";
import { abs } from "@/lib/seo";

export const revalidate = 3600;

/** XML sitemap: products (with images & videos), collections, pages and journal posts. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, collections, pages, posts] = await Promise.all([
    db.query.products.findMany({
      where: eq(schema.products.status, "active"),
      columns: { handle: true, updatedAt: true, videoUrl: true },
      with: { images: { columns: { url: true }, limit: 6 } },
    }),
    db.select({ handle: schema.collections.handle, updatedAt: schema.collections.updatedAt }).from(schema.collections).where(eq(schema.collections.published, true)),
    db.select({ handle: schema.pages.handle, updatedAt: schema.pages.updatedAt }).from(schema.pages).where(eq(schema.pages.published, true)),
    db.select({ handle: schema.blogPosts.handle, updatedAt: schema.blogPosts.updatedAt, cover: schema.blogPosts.coverUrl }).from(schema.blogPosts).where(eq(schema.blogPosts.published, true)),
  ]);
  const now = new Date();
  return [
    { url: abs("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: abs("/collections/all"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: abs("/collections"), lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    ...collections.map((c) => ({ url: abs(`/collections/${c.handle}`), lastModified: c.updatedAt, changeFrequency: "weekly" as const, priority: 0.9 })),
    ...products.map((p) => ({
      url: abs(`/products/${p.handle}`),
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      images: p.images.map((i) => abs(i.url)),
      videos: p.videoUrl
        ? [{ title: p.handle.replace(/-/g, " "), thumbnail_loc: abs(p.images[0]?.url ?? ""), description: "Catwalk video", content_loc: abs(p.videoUrl) }]
        : undefined,
    })),
    { url: abs("/blogs/news"), lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    ...posts.map((p) => ({ url: abs(`/blogs/news/${p.handle}`), lastModified: p.updatedAt, changeFrequency: "monthly" as const, priority: 0.6, images: p.cover ? [abs(p.cover)] : undefined })),
    ...pages.map((p) => ({ url: abs(`/pages/${p.handle}`), lastModified: p.updatedAt, changeFrequency: "monthly" as const, priority: 0.4 })),
    { url: abs("/contact"), lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: abs("/track-order"), lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
