import { desc, eq } from "drizzle-orm";
import { ArrowUpRight, Quote, RotateCcw, ShieldCheck, Truck, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { db, schema } from "@/db";
import { EditSpotlight } from "@/components/store/edit-spotlight";
import { Hero, type HeroClip, type HeroProduct } from "@/components/store/hero";
import { LoopVideo } from "@/components/store/loop-video";
import { blockPrint, Doodle } from "@/components/store/motifs";
import { ProductRail } from "@/components/store/product-rail";
import { CategoryTile, ImageWord, ReelRail } from "@/components/store/reels";
import { Reveal } from "@/components/store/reveal";
import { Container, DotLink, PillLink, SectionHeading } from "@/components/store/ui";
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

const CRAFT_WORDS = ["Crochet lace", "Schiffli embroidery", "Sanganeri prints", "Breathable cotton", "Designed in India", "Made for getaways", "Cash on delivery"];

const PROMISES = [
  [Truck, "Pan-India delivery", "Flat ₹29 shipping, 2–8 days"],
  [RotateCcw, "Easy returns", "7-day return window"],
  [Wallet, "Cash on delivery", "Pay when it arrives"],
  [ShieldCheck, "Secure checkout", "UPI, cards & netbanking"],
] as const;

/** Full-width rounded panel inset from the viewport edges. */
function Panel({ className, style, children }: { className?: string; style?: React.CSSProperties; children: React.ReactNode }) {
  return (
    <section className="mt-16 sm:mt-24 px-2 sm:px-4 lg:px-6">
      <div className={`relative mx-auto max-w-[1400px] rounded-panel ${className ?? ""}`} style={style}>
        {children}
      </div>
    </section>
  );
}

/** "Shop by mood": occasion and craft tags that already power the collection filters. */
const MOODS = [
  { key: "vacation", group: "occasion", title: "Getaway", sub: "Vacation-ready", tone: "sea" },
  { key: "casuals", group: "occasion", title: "Everyday", sub: "Easy casuals", tone: "sand" },
  { key: "office", group: "occasion", title: "Nine to five", sub: "Office-ready", tone: "shade" },
  { key: "crochet", group: "detail", title: "Crochet", sub: "Hand-finished lace", tone: "sun" },
  { key: "embroidery", group: "detail", title: "Embroidered", sub: "Thread-work florals", tone: "sea" },
  { key: "schiffli", group: "detail", title: "Schiffli", sub: "Scallops & eyelets", tone: "sand" },
] as const;

/** The four brand treatments (sea · sand · shade · sun) the mood cards rotate through. */
const TONES = {
  sea: { card: "bg-gradient-to-br from-sea-soft via-[#c3dbe9] to-[#9cc2d9] text-ink", sub: "text-sea-dark", print: "#1d6188" },
  sand: { card: "bg-gradient-to-br from-paper via-sand to-[#e5d4b6] text-ink", sub: "text-muted", print: "#161616" },
  shade: { card: "bg-gradient-to-br from-ink via-ink-soft to-ink text-cream", sub: "text-sun", print: "#f5e0a3" },
  sun: { card: "bg-gradient-to-br from-[#fbf0d2] via-sun-soft to-[#e9bf55] text-ink", sub: "text-ink/70", print: "#161616" },
} as const;

export default async function Home() {
  const [home, categories, edits, bestsellers, fresh, underPrice, withVideo, posts] = await Promise.all([
    getSettings("home"),
    listCollections("category"),
    listCollections("edit"),
    listProducts({ featured: true, limit: 10 }),
    listProducts({ sort: "newest", limit: 10 }),
    listProducts({ maxPrice: 99900, sort: "best-selling", limit: 10 }),
    listProducts({ withVideo: true, limit: 24, sort: "best-selling" }),
    db.select().from(schema.blogPosts).where(eq(schema.blogPosts.published, true)).orderBy(desc(schema.blogPosts.publishedAt)).limit(3),
  ]);

  const clips: HeroClip[] = withVideo.items.map((p) => ({ handle: p.handle, title: p.title, price: p.price, video: p.video!.url, poster: p.video!.poster }));
  // Hero glass card: lead with the most striking full-length looks
  const heroOrder = ["floral-spaghetti-strap-fit-and-flare-dress", "mustard-artistic-print-cord-set-with-crochet-lace-accents", "schiffli-embroidered-and-printed-rayon-tiered-midi-dress", "red-cotton-check-shirt-with-schiffli-embroidery-and-hood", "paisley-print-cotton-moss-boho-dress", "floral-crochet-lace-up-boho-top"];
  const heroClips = [...heroOrder.map((h) => clips.find((c) => c.handle === h)).filter(Boolean), ...clips.filter((c) => !heroOrder.includes(c.handle))] as HeroClip[];
  const spotlightEdits = home.featuredCollections
    .map((h) => edits.find((e) => e.handle === h))
    .filter((e): e is (typeof edits)[number] => !!e)
    .map((e) => ({ handle: e.handle, title: e.title, image: e.imageUrl, text: stripHtml(e.descriptionHtml) }));
  const escape = clips.find((c) => c.handle === "boho-handkerchief-hem-vacation-dress");
  const bento = ["dresses", "tops", "skirts", "co-ord-sets", "jumpsuit", "shirts"]
    .map((h) => categories.find((c) => c.handle === h))
    .filter((c): c is (typeof categories)[number] => !!c);
  // Shoppable strip under each banner slide: the pictured piece first, then the rest of its collection
  const shop: HeroProduct[][] = await Promise.all(
    home.heroSlides.map(async (s) => {
      const col = s.collection && categories.find((c) => c.handle === s.collection);
      if (!col) return [];
      const { items } = await listProducts({ collectionId: col.id, limit: 12 });
      const lead = (s.featured ?? []).map((h) => items.find((p) => p.handle === h)).filter((p) => !!p);
      return [...lead, ...items.filter((p) => !lead.includes(p))]
        .slice(0, 3)
        .map((p) => ({ handle: p.handle, title: p.title, price: p.price, compareAtPrice: p.compareAtPrice, image: p.images[0]?.url ?? null }));
    }),
  );
  // Each mood card gets a different product photo (bestsellers overlap across tags)
  const moodLists = await Promise.all(MOODS.map((m) => listProducts({ tagGroups: [[m.key]], limit: 8, sort: "best-selling" })));
  const used = new Set<number>();
  const moods = MOODS.map((m, i) => {
    const pick = moodLists[i].items.find((p) => !used.has(p.id) && p.images[0]) ?? moodLists[i].items[0];
    if (pick) used.add(pick.id);
    return { ...m, total: moodLists[i].total, image: pick?.images[0]?.url ?? null };
  });
  const tabs = [
    { label: "Bestsellers", items: bestsellers.items, href: "/collections/all?sort=best-selling" },
    { label: "New in", items: fresh.items, href: "/collections/all?sort=newest" },
    { label: "Under ₹999", items: underPrice.items, href: "/collections/all?max=999" },
  ].filter((t) => t.items.length);

  return (
    <>
      <Hero slides={home.heroSlides} clips={heroClips} shop={shop} />

      {/* Craft words — slim sun ribbon tucked under the hero, same width */}
      <div aria-hidden>
        <div className="bg-sun text-ink overflow-hidden py-2 sm:py-2.5">
          <div className="flex w-max animate-marquee-slow whitespace-nowrap font-display italic text-[17px] sm:text-[21px] leading-none">
            {[0, 1].map((k) => (
              <span key={k} className="flex">
                {CRAFT_WORDS.map((t) => (
                  <span key={t} className="px-4 sm:px-6 flex items-center gap-8 sm:gap-12">
                    {t} <span className="not-italic text-[0.5em] text-sea">✦</span>
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Categories — bento mosaic */}
      <Container className="relative pt-10 sm:pt-14">
        <Doodle kind="sprig" className="hidden md:block absolute right-[38%] top-6 size-24 text-sea/25" />
        <SectionHeading eyebrow="Discover" title="Shop by" accent="category" />
        <Reveal stagger className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 lg:auto-rows-[340px] xl:auto-rows-[380px]">
          {bento.map((c) => {
            const m = CATEGORY_MEDIA[c.handle];
            return (
              <CategoryTile
                key={c.id}
                href={`/collections/${c.handle}`}
                title={c.title}
                image={m?.image ?? c.imageUrl ?? ""}
                video={m?.video}
                poster={m?.image}
                className="aspect-[3/4] lg:aspect-auto"
              />
            );
          })}
          <ImageWord word="Boho" image="linear-gradient(120deg, #134560 0%, #2b7aa5 38%, #d9a21b 72%, #161616 100%)" href="/collections/free-spirited" className="col-span-2 py-10 lg:py-0 bg-paper/70" />
        </Reveal>
      </Container>

      {/* Shop by mood — gradient cards with a floating product cut-out */}
      <Container className="relative pt-16 sm:pt-24">
        <Doodle kind="bloom" className="hidden md:block absolute left-[46%] top-12 size-20 text-sun/40" />
        <SectionHeading eyebrow="Find your vibe" title="Shop by" accent="mood" />
        <Reveal stagger className="grid grid-cols-2 lg:grid-cols-6 gap-2.5 sm:gap-4">
          {moods.map((m) => (
            <Link
              key={m.key}
              href={`/collections/all?${m.group}=${m.key}`}
              className={`group relative h-72 sm:h-80 overflow-hidden rounded-card ${TONES[m.tone].card} p-4 sm:p-5 flex flex-col justify-between shadow-[0_18px_40px_-28px_rgba(22,22,22,0.6)] transition-transform duration-500 hover:-translate-y-1.5`}
            >
              <span aria-hidden className="absolute inset-0" style={blockPrint(TONES[m.tone].print, 0.08)} />
              <span className="relative z-10">
                <span className={`block text-[10px] tracking-[0.26em] uppercase ${TONES[m.tone].sub}`}>{m.sub}</span>
                <span className="block font-display italic text-[30px] sm:text-[34px] leading-none mt-1.5">{m.title}</span>
              </span>
              {m.image && (
                <span className="absolute right-0 bottom-0 left-6 sm:left-8 top-[30%] rounded-t-[999px] overflow-hidden transition-transform duration-700 origin-bottom group-hover:scale-[1.04] [mask-image:linear-gradient(to_bottom,transparent,#000_22%)]">
                  <Image src={m.image} alt="" fill sizes="(min-width:1024px) 14vw, 40vw" className="object-cover object-top" />
                </span>
              )}
              <span className={`relative z-10 inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[12px] shadow-sm ${m.tone === "shade" ? "bg-sun text-ink" : "bg-paper text-ink"}`}>
                {m.total} styles <ArrowUpRight className="size-3.5 transition-transform group-hover:rotate-45" />
              </span>
            </Link>
          ))}
        </Reveal>
      </Container>

      {/* Products — tabbed rail */}
      {tabs.length > 0 && (
        <Container className="pt-16 sm:pt-24">
          <SectionHeading eyebrow="Fresh picks" title="Just dropped," accent="made for repeat wear" />
          <ProductRail
            list="Home"
            lead={{ image: "/images/lifestyle/cafe-chair.webp", eyebrow: "Most loved", title: "The pieces everyone’s wearing", href: "/collections/all?sort=best-selling", cta: "Shop bestsellers" }}
            tabs={tabs}
          />
        </Container>
      )}

      {/* Reels — dark rounded panel */}
      {clips.length > 0 && (
        <Panel className="bg-ink text-cream pt-14 sm:pt-20 pb-14 sm:pb-20 px-4 sm:px-6 lg:px-10 overflow-hidden" style={blockPrint("#f5e0a3", 0.05)}>
          <SectionHeading dark eyebrow="Watch & shop" title="See it" accent="move" />
          <ReelRail clips={clips} />
        </Panel>
      )}

      {/* The Edits — moodboard index */}
      {spotlightEdits.length > 0 && (
        <Container className="pt-16 sm:pt-24">
          <SectionHeading eyebrow="Moodboards" title="The" accent="Edits" />
          <EditSpotlight edits={spotlightEdits} />
        </Container>
      )}

      {/* Editorial split */}
      <Panel className="relative overflow-hidden bg-ink text-cream grid lg:grid-cols-2 isolate">
        <div className="relative aspect-[4/5] lg:aspect-auto lg:min-h-[760px]">
          {escape ? (
            <LoopVideo src={escape.video} poster={escape.poster} className="absolute inset-0 size-full object-[50%_40%]" />
          ) : (
            <Image src="/images/lifestyle/lake-rust.webp" alt="" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
          )}
        </div>
        <div className="relative flex items-center px-6 sm:px-12 lg:px-16 py-16 lg:py-20 overflow-hidden isolate">
          <Image src="/images/lifestyle/lake-wide.webp" alt="" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover opacity-35 -z-10" />
          <div className="absolute inset-0 bg-gradient-to-br from-ink via-ink/85 to-ink/40 -z-10" />
          <div className="max-w-md">
            <p className="text-[11px] tracking-[0.3em] uppercase text-sun">Nomadic Escapes</p>
            <h2 className="font-display text-[52px] sm:text-[80px] leading-[0.9] mt-6">
              For your <em className="font-normal text-sun-soft">soul’s</em> expedition
            </h2>
            <p className="mt-7 text-cream/75 leading-relaxed text-[15px]">
              Adventure is more than travel — it’s a mindset. Pieces for spontaneous weekend getaways, barefoot evenings and stories that start with “why not?”
            </p>
            <div className="mt-10 grid grid-cols-2 gap-3 max-w-sm">
              <Image src="/images/lifestyle/lake-rust.webp" alt="" width={400} height={500} className="aspect-[4/5] object-cover rounded-2xl" />
              <Image src="/images/lifestyle/stone-wall.webp" alt="" width={400} height={500} className="aspect-[4/5] object-cover rounded-2xl mt-10" />
            </div>
            <PillLink href="/collections/escape-edit" tone="sun" className="mt-10">
              Escape in style
            </PillLink>
          </div>
        </div>
      </Panel>

      {/* Details */}
      <Container className="pt-16 sm:pt-24">
        <SectionHeading eyebrow="In the spotlight" title="Details that" accent="do the talking" />
        <Reveal stagger className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {home.spotlight.map((s) => (
            <Link key={s.title} href={s.href} className="group relative aspect-[4/5] overflow-hidden rounded-panel bg-sand isolate">
              <Image src={s.image} alt="" fill sizes="(min-width:768px) 33vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="glass absolute inset-x-3 bottom-3 rounded-3xl p-5 flex items-end justify-between gap-4">
                <div>
                  <h3 className="font-display text-[28px] leading-tight">{s.title}</h3>
                  <p className="text-sm text-ink-soft mt-0.5">{s.text}</p>
                </div>
                <span className="size-10 shrink-0 rounded-full bg-ink text-cream grid place-items-center transition-transform group-hover:rotate-45">
                  <ArrowUpRight className="size-4" />
                </span>
              </div>
            </Link>
          ))}
        </Reveal>
      </Container>

      {/* The Trumee promise — craft & quality */}
      <Panel className="bg-paper/75 py-16 sm:py-20 px-4 sm:px-6 lg:px-10" style={blockPrint("#1d6188", 0.07)}>
        <SectionHeading eyebrow="The Trumee promise" title="Crafted to be worn, loved," accent="and worn again" />
        <Reveal stagger className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {CRAFT_IMAGES.map((c) => (
            <figure key={c.title} className="group">
              <div className="relative aspect-[4/5] overflow-hidden rounded-card bg-sand">
                <Image src={c.src} alt={c.title} fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
              <h3 className="font-display text-[26px] sm:text-[28px] leading-tight mt-4">{c.title}</h3>
              <p className="text-sm text-ink-soft mt-1 leading-relaxed">{c.text}</p>
              <DotLink href={c.shop.href} className="mt-2">
                {c.shop.label}
              </DotLink>
            </figure>
          ))}
        </Reveal>
      </Panel>

      {/* Love notes — lace-edged sun panel with a slow ribbon of cards */}
      <Panel className="bg-sun text-ink pt-16 sm:pt-20 pb-14 sm:pb-16 overflow-hidden" style={blockPrint("#161616", 0.06)}>
        <p className="text-[11px] tracking-[0.3em] uppercase text-center">Love notes</p>
        <p className="font-display text-center text-[40px] sm:text-[60px] leading-[1] mt-3 px-4">
          Words from <em className="font-normal">our girls</em>
        </p>
        <div className="mt-12 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
          <div className="flex w-max gap-4 animate-ribbon hover:[animation-play-state:paused]">
            {[0, 1, 2].flatMap((k) =>
              home.testimonials.map((t) => (
                <figure key={`${k}-${t.name}`} aria-hidden={k > 0} className="w-[300px] sm:w-[380px] shrink-0 rounded-3xl bg-paper/70 p-7 sm:p-8 flex flex-col shadow-[0_16px_40px_-30px_rgba(22,22,22,0.6)]">
                  <Quote className="size-7 mb-4 fill-sea/15 text-sea/40" strokeWidth={1} aria-hidden />
                  <blockquote className="font-display text-[22px] sm:text-[24px] leading-snug flex-1">{t.text}</blockquote>
                  <figcaption className="mt-6 flex items-center gap-3 text-[12px] tracking-[0.2em] uppercase">
                    <span className="size-9 rounded-full bg-ink text-sun grid place-items-center font-display text-lg normal-case tracking-normal">{t.name[0]}</span>
                    {t.name}
                  </figcaption>
                </figure>
              )),
            )}
          </div>
        </div>
      </Panel>

      {/* Journal */}
      {posts.length > 0 && (
        <Container className="pt-16 sm:pt-24">
          <SectionHeading eyebrow="The Journal" title="Style" accent="notes" href="/blogs/news" linkLabel="Read the journal" />
          <Reveal stagger className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-5">
            {posts.map((p) => (
              <Link key={p.id} href={`/blogs/news/${p.handle}`} className="group">
                <div className="relative aspect-[4/3] overflow-hidden rounded-card bg-sand">
                  {p.coverUrl && <Image src={p.coverUrl} alt="" fill sizes="(min-width:768px) 33vw, 100vw" className="object-cover object-top transition-transform duration-700 group-hover:scale-105" />}
                  {p.publishedAt && <span className="glass absolute left-3 top-3 rounded-full px-3 py-1 text-[11px] tracking-[0.12em] uppercase">{formatDate(p.publishedAt)}</span>}
                </div>
                <h3 className="font-display text-[28px] leading-tight mt-5 group-hover:text-sea">{p.title}</h3>
                <p className="text-sm text-muted mt-2 line-clamp-2">{p.excerpt}</p>
              </Link>
            ))}
          </Reveal>
        </Container>
      )}

      {/* Promises */}
      <Container className="pt-16 sm:pt-20">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {PROMISES.map(([I, title, text]) => (
            <div key={title} className="rounded-3xl bg-paper/70 flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center p-5 sm:p-6">
              <span className="size-11 shrink-0 rounded-full bg-ink text-sun grid place-items-center">
                <I className="size-5" strokeWidth={1.4} />
              </span>
              <div>
                <p className="text-[15px] font-medium">{title}</p>
                <p className="text-[13px] text-muted mt-0.5">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </>
  );
}
