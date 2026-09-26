import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Image from "next/image";
import { db, schema } from "@/db";
import { JsonLd } from "@/components/store/json-ld";
import { ProductGrid } from "@/components/store/product-card";
import { Breadcrumbs, Container, SectionHeading } from "@/components/store/ui";
import { listProducts } from "@/lib/catalog";
import { redirectOrNotFound } from "@/lib/redirects";
import { articleLd, breadcrumbLd } from "@/lib/seo";
import { formatDate, truncate } from "@/lib/utils";

export const revalidate = 600;

const getPost = (handle: string) =>
  db.query.blogPosts.findFirst({ where: and(eq(schema.blogPosts.handle, handle), eq(schema.blogPosts.published, true)) });

export async function generateMetadata({ params }: PageProps<"/blogs/news/[handle]">): Promise<Metadata> {
  const p = await getPost((await params).handle);
  if (!p) return {};
  return {
    title: p.seoTitle || p.title,
    description: p.seoDescription || truncate(p.excerpt, 160),
    alternates: { canonical: `/blogs/news/${p.handle}` },
    openGraph: { type: "article", title: p.title, images: p.coverUrl ? [p.coverUrl] : undefined, publishedTime: p.publishedAt?.toISOString() },
  };
}

export default async function PostPage({ params }: PageProps<"/blogs/news/[handle]">) {
  const { handle } = await params;
  const post = await getPost(handle);
  if (!post) return redirectOrNotFound(`/blogs/news/${handle}`);
  // "Shop the story": products the article links to, else bestsellers
  const linked = [...post.bodyHtml.matchAll(/href="\/products\/([^"?#]+)"/g)].map((m) => m[1]);
  const { items: all } = await listProducts({ limit: 48 });
  const byLink = all.filter((p) => linked.includes(p.handle));
  const shop = (byLink.length >= 2 ? byLink : (await listProducts({ featured: true, limit: 4 })).items).slice(0, 4);
  return (
    <article>
      <JsonLd data={[articleLd(post), breadcrumbLd([{ name: "Journal", path: "/blogs/news" }, { name: post.title, path: `/blogs/news/${post.handle}` }])]} />
      <Container className="pt-10 max-w-3xl">
        <Breadcrumbs items={[{ label: "Journal", href: "/blogs/news" }, { label: post.title }]} />
        <p className="text-xs text-muted mt-8">{post.publishedAt && formatDate(post.publishedAt)} · {post.author}</p>
        <h1 className="font-display text-4xl sm:text-6xl leading-[1.05] mt-3">{post.title}</h1>
      </Container>
      {post.coverUrl && (
        <Container className="mt-10">
          <div className="relative aspect-[16/9] max-h-[640px] overflow-hidden bg-sand">
            <Image src={post.coverUrl} alt="" fill priority sizes="100vw" className="object-cover object-[50%_30%]" />
          </div>
        </Container>
      )}
      <Container className="max-w-3xl pt-12">
        <div className="prose-trumee text-[17px]" dangerouslySetInnerHTML={{ __html: post.bodyHtml }} />
      </Container>
      <Container className="pt-20">
        <SectionHeading eyebrow="Shop the story" title="Pieces from this guide" href="/collections/all" />
        <ProductGrid items={shop} list={`Journal – ${post.title}`} />
      </Container>
    </article>
  );
}
