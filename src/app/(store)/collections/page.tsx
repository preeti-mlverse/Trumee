import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Container, SectionHeading } from "@/components/store/ui";
import { listCollections } from "@/lib/catalog";
import { stripHtml } from "@/lib/utils";

export const revalidate = 300;
export const metadata: Metadata = { title: "Collections", description: "Explore Trumee’s edits and categories." };

export default async function CollectionsIndex() {
  const [edits, cats] = await Promise.all([listCollections("edit"), listCollections("category")]);
  return (
    <Container className="pt-14">
      <SectionHeading as="h1" eyebrow="Collections" title="The Edits" accent="& categories" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {edits.map((c) => (
          <Link key={c.id} href={`/collections/${c.handle}`} className="group relative aspect-[4/5] overflow-hidden bg-ink">
            {c.imageUrl && <Image src={c.imageUrl} alt="" fill sizes="(min-width:1024px) 33vw, 50vw" className="object-cover opacity-90 transition duration-700 group-hover:scale-105" />}
            <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
            <div className="absolute bottom-0 p-6 text-cream">
              <h2 className="font-display text-3xl">{c.title}</h2>
              <p className="text-sm opacity-85 mt-1 line-clamp-2">{stripHtml(c.descriptionHtml)}</p>
            </div>
          </Link>
        ))}
      </div>
      <SectionHeading title="Categories" className="mt-20" />
      <div className="flex flex-wrap gap-3">
        {cats.map((c) => (
          <Link key={c.id} href={`/collections/${c.handle}`} className="px-6 py-3 border border-line hover:border-ink text-sm tracking-[0.14em] uppercase">
            {c.title}
          </Link>
        ))}
      </div>
    </Container>
  );
}
