import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { db, schema } from "@/db";
import { Container, SectionHeading } from "@/components/store/ui";
import { formatDate } from "@/lib/utils";

export const revalidate = 600;
export const metadata: Metadata = { title: "The Journal", description: "Style guides, lookbooks and vacation-dressing notes from Trumee." };

export default async function Journal() {
  const posts = await db.select().from(schema.blogPosts).where(eq(schema.blogPosts.published, true)).orderBy(desc(schema.blogPosts.publishedAt));
  return (
    <Container className="pt-14">
      <SectionHeading as="h1" eyebrow="The Journal" title="Style notes" accent="& lookbooks" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {posts.map((p) => (
          <Link key={p.id} href={`/blogs/news/${p.handle}`} className="group">
            <div className="relative aspect-[4/3] overflow-hidden bg-sand">
              {p.coverUrl && <Image src={p.coverUrl} alt="" fill sizes="(min-width:768px) 33vw, 100vw" className="object-cover object-top transition-transform duration-700 group-hover:scale-105" />}
            </div>
            <p className="text-xs text-muted mt-4">{p.publishedAt && formatDate(p.publishedAt)} · {p.author}</p>
            <h2 className="font-display text-2xl leading-snug mt-1 group-hover:text-sea">{p.title}</h2>
            <p className="text-sm text-muted mt-2 line-clamp-3">{p.excerpt}</p>
          </Link>
        ))}
      </div>
    </Container>
  );
}
