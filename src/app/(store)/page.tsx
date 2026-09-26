import { desc, eq } from "drizzle-orm";
import { ArrowUpRight, Quote, RotateCcw, ShieldCheck, Truck, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { db, schema } from "@/db";
import { Hero, type HeroClip } from "@/components/store/hero";
import { LoopVideo } from "@/components/store/loop-video";
import { ProductGrid } from "@/components/store/product-card";
import { CategoryTile, ReelRail } from "@/components/store/reels";
import { Container, SectionHeading } from "@/components/store/ui";
import { listCollections, listProducts } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { CRAFT_IMAGES } from "@/lib/trust";
import { formatDate, stripHtml } from "@/lib/utils";

export const revalidate = 300;
export const metadata: Metadata = {
  title: { absolute: "Trumee | Boho Dresses, Crochet Tops & Western Wear for Women in India" },
  description:
    "Shop Trumee’s boho dresses, crochet & embroidered tops, schiffli jumpsuits, skirts and co-ord sets in breathable fabrics. Designed in Gurgaon · COD · 7-day returns.",
  alternates: { canonical: "/" },
};

const CATEGORY_MEDIA: Record<string, { image: string; video?: string }> = {
  dresses: { image: "/videos/trmd13.webp", video: "/videos/trmd13.mp4" },
  tops: { image: "/videos/trmt08.webp", video: "/videos/trmt08.mp4" },
  skirts: { image: "/videos/trmsk03.webp", video: "/videos/trmsk03.mp4" },
  jumpsuit: { image: "/images/products/ombre-cotton-schiffli-dungaree-style-jumpsuit/1.webp" },
  shirts: { image: "/videos/trmsh01.webp", video: "/videos/trmsh01.mp4" },
  "co-ord-sets": { image: "/videos/trmcs01.webp", video: "/videos/trmcs01.mp4" },
};

export default async function Home() {
  const [home, categories, edits, bestsellers, fresh, withVideo, posts] = await Promise.all([
    getSettings("home"),
    listCollections("category"),
    listCollections("edit"),
    listProducts({ featured: true, limit: 8 }),
    listProducts({ sort: "newest", limit: 4 }),
    listProducts({ withVideo: true, limit: 24, sort: "best-selling" }),
    db.select().from(schema.blogPosts).where(eq(schema.blogPosts.published, true)).orderBy(desc(schema.blogPosts.publishedAt)).limit(3),
  ]);

  const clips: HeroClip[] = withVideo.items.map((p) => ({ handle: p.handle, title: p.title, price: p.price, video: p.video!.url, poster: p.video!.poster }));
  // Hero pairs: lead with the most striking full-length looks
  const heroOrder = ["floral-spaghetti-strap-fit-and-flare-dress", "mustard-artistic-print-cord-set-with-crochet-lace-accents", "schiffli-embroidered-and-printed-rayon-tiered-midi-dress", "red-cotton-check-shirt-with-schiffli-embroidery-and-hood", "paisley-print-cotton-moss-boho-dress", "floral-crochet-lace-up-boho-top"];
  const heroClips = [...heroOrder.map((h) => clips.find((c) => c.handle === h)).filter(Boolean), ...clips.filter((c) => !heroOrder.includes(c.handle))] as HeroClip[];
  // 1 hero tile (2×2) + 4 tiles fills the 4×2 grid exactly
  const featuredEdits = (home.featuredCollections.map((h) => edits.find((e) => e.handle === h)).filter(Boolean) as typeof edits).slice(0, 5);
  const escape = clips.find((c) => c.handle === "boho-handkerchief-hem-vacation-dress");

  return (
    <>
      <Hero slides={home.heroSlides} clips={heroClips} />

      <div className="bg-marigold text-ink overflow-hidden py-3">
        <div className="flex w-max animate-marquee whitespace-nowrap text-[11px] font-medium tracking-[0.3em] uppercase">
          {[0, 1].map((k) => (
            <span key={k} className="flex" aria-hidden={k === 1}>
              {["Crochet lace", "Schiffli embroidery", "Sanganeri prints", "Breathable cotton", "Designed in India", "Made for getaways", "Cash on delivery"].map((t) => (
                <span key={t} className="px-7 flex items-center gap-7">
                  {t} <span className="size-1.5 rotate-45 bg-ink inline-block" />
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* Categories */}
      <Container className="pt-24 sm:pt-28">
        <SectionHeading eyebrow="Discover" title="Shop by category" href="/collections/all" linkLabel="Shop all" />
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-5">
          {categories.map((c, i) => {
            const m = CATEGORY_MEDIA[c.handle];
            return (
              <CategoryTile
                key={c.id}
                href={`/collections/${c.handle}`}
                title={c.title}
                image={m?.image ?? c.imageUrl ?? ""}
                video={m?.video}
                poster={m?.image}
              />
            );
          })}
        </div>
      </Container>

      {/* Bestsellers */}
      <Container className="pt-28">
        <SectionHeading eyebrow="Top of the game" title="Bestsellers" href="/collections/all?sort=best-selling" />
        <ProductGrid items={bestsellers.items} list="Home – Bestsellers" />
      </Container>

      {/* Reels — inverted */}
      {clips.length > 0 && (
        <section className="mt-28 bg-ink text-cream py-20 sm:py-24">
          <Container>
            <SectionHeading dark eyebrow="Watch & shop" title="See it move" />
            <ReelRail clips={clips} />
          </Container>
        </section>
      )}

      {/* Edits */}
      <Container className="pt-28">
        <SectionHeading eyebrow="Moodboards" title="The Edits" href="/collections" linkLabel="All edits" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {featuredEdits.map((c, i) => (
            <Link
              key={c.id}
              href={`/collections/${c.handle}`}
              className={`group relative overflow-hidden bg-ink ${i === 0 ? "col-span-2 row-span-2 aspect-square lg:aspect-auto" : "aspect-[3/4]"}`}
            >
              {c.imageUrl && (
                <Image src={c.imageUrl} alt="" fill sizes={i === 0 ? "(min-width:1024px) 50vw, 100vw" : "(min-width:1024px) 25vw, 50vw"} className="object-cover object-[50%_30%] transition duration-700 group-hover:scale-105" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/5 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 text-cream">
                <h3 className={`font-display leading-[1] ${i === 0 ? "text-4xl sm:text-5xl" : "text-2xl sm:text-3xl"}`}>{c.title}</h3>
                {i === 0 && c.descriptionHtml && <p className="hidden sm:block text-sm text-cream/80 mt-3 max-w-md">{stripHtml(c.descriptionHtml)}</p>}
                <span className="mt-4 inline-flex items-center gap-1.5 text-[10px] tracking-[0.24em] uppercase border-b border-marigold pb-1">
                  Explore <ArrowUpRight className="size-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </Container>

      {/* Editorial split — inverted */}
      <section className="mt-28 grid grid-cols-1 lg:grid-cols-2 bg-ink text-cream">
        <div className="relative aspect-[4/5] lg:aspect-auto lg:min-h-[720px] overflow-hidden">
          {escape ? (
            <LoopVideo src={escape.video} poster={escape.poster} className="absolute inset-0 size-full object-[50%_40%]" />
          ) : (
            <Image src="/images/lifestyle/lake-rust.webp" alt="" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
          )}
        </div>
        <div className="flex items-center px-6 sm:px-12 lg:px-20 py-20">
          <div className="max-w-md">
            <p className="text-[11px] tracking-[0.3em] uppercase text-marigold">Nomadic Escapes</p>
            <h2 className="font-display text-5xl sm:text-7xl leading-[0.95] mt-6">For your soul’s expedition</h2>
            <p className="mt-7 text-cream/70 leading-relaxed">
              Adventure is more than travel — it’s a mindset. Pieces for spontaneous weekend getaways, barefoot evenings and stories that start with “why not?”
            </p>
            <div className="mt-10 grid grid-cols-2 gap-3 max-w-sm">
              <Image src="/images/lifestyle/lake-rust.webp" alt="" width={400} height={500} className="aspect-[4/5] object-cover" />
              <Image src="/images/lifestyle/stone-wall.webp" alt="" width={400} height={500} className="aspect-[4/5] object-cover mt-10" />
            </div>
            <Link href="/collections/escape-edit" className="mt-10 inline-block bg-marigold text-ink px-7 py-3.5 text-[11px] font-semibold tracking-[0.22em] uppercase hover:bg-cream transition-colors">
              Escape in style
            </Link>
          </div>
        </div>
      </section>

      {/* Details */}
      <Container className="pt-28">
        <SectionHeading eyebrow="In the spotlight" title="Details that do the talking" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {home.spotlight.map((s) => (
            <Link key={s.title} href={s.href} className="group">
              <div className="relative aspect-[4/5] overflow-hidden bg-sand">
                <Image src={s.image} alt="" fill sizes="(min-width:768px) 33vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
              <h3 className="font-display text-[28px] leading-tight mt-5">{s.title}</h3>
              <p className="text-sm text-muted mt-1">{s.text}</p>
            </Link>
          ))}
        </div>
      </Container>

      {/* The Trumee promise — craft & quality, with CC0 museum imagery (credited) */}
      <section className="mt-28 bg-sand py-20 sm:py-24">
        <Container>
          <SectionHeading eyebrow="The Trumee promise" title="Crafted to be worn, loved, and worn again" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {CRAFT_IMAGES.map((c) => (
              <figure key={c.title}>
                <div className="relative aspect-[4/5] overflow-hidden bg-cream">
                  <Image src={c.src} alt={c.title + " — " + c.credit.split(" — ")[0]} fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover transition-transform duration-700 hover:scale-105" />
                </div>
                <h3 className="font-display text-2xl mt-4">{c.title}</h3>
                <p className="text-sm text-ink-soft mt-1">{c.text}</p>
                <Link href={c.shop.href} className="inline-block mt-3 py-1.5 text-[11px] tracking-[0.2em] uppercase border-b border-ink hover:text-plum hover:border-plum">
                  {c.shop.label}
                </Link>
                <figcaption className="text-[10px] text-muted mt-2">
                  <a href={c.href} target="_blank" rel="noopener" className="inline-block py-1.5 hover:underline">{c.credit}</a>
                </figcaption>
              </figure>
            ))}
          </div>
          <dl className="mt-14 grid grid-cols-2 lg:grid-cols-4 gap-6 border-t border-ink/15 pt-10">
            {[
              ["Designed in", "Gurgaon, India"],
              ["Dispatched in", "1–2 business days"],
              ["Returns", "7 days, no fuss"],
              ["Pay your way", "UPI · Cards · COD"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-[11px] tracking-[0.24em] uppercase text-muted">{k}</dt>
                <dd className="font-display text-2xl sm:text-3xl mt-1">{v}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      {/* New in */}
      <Container className="pt-28">
        <SectionHeading eyebrow="Just landed" title="New in" href="/collections/all?sort=newest" />
        <ProductGrid items={fresh.items} list="Home – New in" />
      </Container>

      {/* Love notes — marigold band */}
      <section className="mt-28 bg-marigold text-ink py-20 sm:py-24">
        <Container>
          <p className="text-[11px] tracking-[0.3em] uppercase text-center">Love notes</p>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-10">
            {home.testimonials.map((t) => (
              <figure key={t.name} className="text-center md:text-left">
                <Quote className="size-7 mx-auto md:mx-0 mb-4 fill-ink/15 text-ink/30" strokeWidth={1} aria-hidden />
                <blockquote className="font-display text-2xl leading-snug">{t.text}</blockquote>
                <figcaption className="mt-5 text-[11px] tracking-[0.26em] uppercase">— {t.name}</figcaption>
              </figure>
            ))}
          </div>
        </Container>
      </section>

      {/* Journal */}
      {posts.length > 0 && (
        <Container className="pt-28">
          <SectionHeading eyebrow="The Journal" title="Style notes" href="/blogs/news" linkLabel="Read the journal" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {posts.map((p) => (
              <Link key={p.id} href={`/blogs/news/${p.handle}`} className="group">
                <div className="relative aspect-[4/3] overflow-hidden bg-sand">
                  {p.coverUrl && <Image src={p.coverUrl} alt="" fill sizes="(min-width:768px) 33vw, 100vw" className="object-cover object-top transition-transform duration-700 group-hover:scale-105" />}
                </div>
                <p className="text-[11px] tracking-[0.2em] uppercase text-muted mt-5">{p.publishedAt && formatDate(p.publishedAt)}</p>
                <h3 className="font-display text-[26px] leading-tight mt-2 group-hover:text-plum">{p.title}</h3>
                <p className="text-sm text-muted mt-2 line-clamp-2">{p.excerpt}</p>
              </Link>
            ))}
          </div>
        </Container>
      )}

      {/* Promises */}
      <Container className="pt-28">
        <div className="grid grid-cols-2 lg:grid-cols-4 border-y border-line divide-x divide-line">
          {[
            [Truck, "Pan-India delivery", "Flat ₹29 shipping, 2–8 days"],
            [RotateCcw, "Easy returns", "7-day return window"],
            [Wallet, "Cash on delivery", "Pay when it arrives"],
            [ShieldCheck, "Secure checkout", "UPI, cards & netbanking"],
          ].map(([Icon, title, text]) => {
            const I = Icon as typeof Truck;
            return (
              <div key={title as string} className="flex gap-3 items-start p-6 [&:nth-child(3)]:border-l-0 lg:[&:nth-child(3)]:border-l">
                <I className="size-6 text-plum shrink-0" strokeWidth={1.3} />
                <div>
                  <p className="text-sm font-medium">{title as string}</p>
                  <p className="text-xs text-muted mt-0.5">{text as string}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </>
  );
}
