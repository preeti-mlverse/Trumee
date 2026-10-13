import { ArrowUpRight, Quote } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { EditPanels, type EditPanel } from "@/components/store/edit-panels";
import { Hero, type HeroClip, type HeroProduct } from "@/components/store/hero";
import { LoopVideo } from "@/components/store/loop-video";
import { blockPrint } from "@/components/store/motifs";
import { ProductRail, type RailTab } from "@/components/store/product-rail";
import { CategoryTile, ImageWord, ReelRail } from "@/components/store/reels";
import { Reveal } from "@/components/store/reveal";
import { Container, DotLink, PillLink, SectionHeading } from "@/components/store/ui";
import { listCollections, listProducts } from "@/lib/catalog";
import { getSettings, type HeroSlide } from "@/lib/settings";
import { CRAFT_IMAGES } from "@/lib/trust";
import { COLOUR_FAMILIES, colourTag } from "@/lib/product-facts";
import { stripHtml } from "@/lib/utils";

export const revalidate = 300;
export const metadata: Metadata = {
  title: { absolute: "Trumee | Boho Dresses, Crochet Tops & Western Wear Online" },
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

/** Campaign artwork (titles are painted into the image) shown as hero slides 4 and 5. */
const CAMPAIGN_SLIDES: HeroSlide[] = [
  {
    layout: "art",
    tab: "Summer Bloom",
    image: "/images/campaign/summer-bloom.webp",
    eyebrow: "New collection",
    title: "Summer Bloom",
    text: "Floral cami dresses for sunlit days",
    cta: "Shop Summer Bloom",
    href: "/search?q=floral",
    secondary: { label: "View collection", href: "/collections/main-character-energy" },
  },
  {
    layout: "art",
    tab: "New arrivals",
    image: "/images/campaign/new-arrivals.webp",
    eyebrow: "Trumee",
    title: "New Arrivals",
    text: "Sequin halter tops and floral wrap dresses",
    cta: "Shop New Arrivals",
    href: "/collections/all?sort=newest",
    secondary: { label: "Bestsellers", href: "/collections/all?sort=best-selling" },
  },
];

/** Second row of the collections grid: edits shown with location photography. */
const EDIT_TILES = [
  { handle: "wander-x-wear", image: "/images/lifestyle/forest-walk.webp" },
  { handle: "free-spirited", image: "/images/lifestyle/terrace-red.webp" },
  { handle: "in-her-element", image: "/images/lifestyle/stone-rust.webp" },
];

/** Edit panels: location photography and a two-word vibe for each moodboard. */
const EDIT_ART: Record<string, { image: string; vibe: string; focus?: string }> = {
  "main-character-energy": { image: "/images/lifestyle/hero-pink-wall.webp", vibe: "Bold & playful" },
  "in-her-element": { image: "/images/lifestyle/stone-wall.webp", vibe: "Desk to dinner" },
  "wander-x-wear": { image: "/images/campaign/summer-checks.webp", vibe: "Travel light", focus: "72% 40%" },
  "after-the-rain": { image: "/images/lifestyle/forest-walk.webp", vibe: "Monsoon mood" },
  "free-spirited": { image: "/images/campaign/summer-bloom.webp", vibe: "Boho & breezy", focus: "74% 35%" },
  "escape-edit": { image: "/images/campaign/new-arrivals.webp", vibe: "Getaway ready", focus: "62% 35%" },
};

const CRAFT_WORDS = ["Crochet lace", "Schiffli embroidery", "Sanganeri prints", "Breathable cotton", "Designed in India", "Made for getaways", "Cash on delivery"];



/** Edge-to-edge colour band; content keeps the page width unless `full`. */
function Panel({ bg, className, style, full, tight, flush, defer, children }: { bg: string; className?: string; style?: React.CSSProperties; full?: boolean; tight?: boolean; flush?: boolean; /** below the fold: skip rendering until near the viewport */ defer?: boolean; children: React.ReactNode }) {
  return (
    <section data-flush-end={flush || undefined} className={`relative ${flush ? "mt-0" : tight ? "mt-8 sm:mt-12" : "mt-16 sm:mt-24"} ${defer ? "cv-auto" : ""} ${bg}`} style={style}>
      <div className={`relative mx-auto ${full ? "" : "max-w-[1400px]"} ${className ?? ""}`}>{children}</div>
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

/** Slim brand-colour band on each mood card */
const MOOD_BAND = { sea: "bg-sea-bright", sand: "bg-sand", shade: "bg-ink", sun: "bg-sun" } as const;

/** The four brand treatments (sea · sand · shade · sun) the mood cards rotate through. */
const TONES = {
  sea: { card: "bg-gradient-to-br from-sea-soft via-[#c3dbe9] to-[#9cc2d9] text-ink", sub: "text-sea-dark", print: "#1d6188" },
  sand: { card: "bg-gradient-to-br from-paper via-sand to-[#e5d4b6] text-ink", sub: "text-muted", print: "#161616" },
  shade: { card: "bg-gradient-to-br from-ink via-ink-soft to-ink text-cream", sub: "text-sun", print: "#f5e0a3" },
  sun: { card: "bg-gradient-to-br from-[#fbf0d2] via-sun-soft to-[#e9bf55] text-ink", sub: "text-ink/85", print: "#161616" },
} as const;

export default async function Home() {
  const [home, categories, edits, bestsellers, fresh, underPrice, withVideo] = await Promise.all([
    getSettings("home"),
    listCollections("category"),
    listCollections("edit"),
    listProducts({ featured: true, limit: 10 }),
    listProducts({ sort: "newest", limit: 10 }),
    listProducts({ maxPrice: 99900, sort: "best-selling", limit: 10 }),
    listProducts({ withVideo: true, limit: 24, sort: "best-selling" }),
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
  // Hero: the production slides, then the Summer Bloom and New Arrivals campaign art as slides 4 and 5
  const heroSlides: HeroSlide[] = [...home.heroSlides.slice(0, 3), ...CAMPAIGN_SLIDES];
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
  const editTiles = EDIT_TILES.map((t) => ({ ...t, c: edits.find((e) => e.handle === t.handle) })).filter((t) => !!t.c);
  // Each mood card gets a different product photo (bestsellers overlap across tags)
  const moodLists = await Promise.all(MOODS.map((m) => listProducts({ tagGroups: [[m.key]], limit: 8, sort: "best-selling" })));
  const used = new Set<number>();
  const moods = MOODS.map((m, i) => {
    const pick = moodLists[i].items.find((p) => !used.has(p.id) && p.images[0]) ?? moodLists[i].items[0];
    if (pick) used.add(pick.id);
    return { ...m, total: moodLists[i].total, image: pick?.images[0]?.url ?? null };
  });
  // Edits: location photography + live style counts
  const editCounts = await Promise.all(spotlightEdits.map((e) => listProducts({ collectionId: edits.find((x) => x.handle === e.handle)?.id, limit: 1 })));
  const editLists = await Promise.all(spotlightEdits.map((e) => listProducts({ collectionId: edits.find((x) => x.handle === e.handle)?.id, limit: 24, sort: "best-selling" })));
  const pickedPieces = new Set<number>();
  const editPieces = editLists.map((l) => {
    const p = l.items.find((x) => !pickedPieces.has(x.id) && (x.video?.poster || x.images[0])) ?? null;
    if (p) pickedPieces.add(p.id);
    return p ? { handle: p.handle, title: p.title, price: p.price, image: p.video?.poster ?? p.images[0]!.url } : null;
  });
  const editPanels: EditPanel[] = spotlightEdits.map((e, k) => ({
    ...e,
    title: e.title.replace(/\s+-\s+.*$/, ""),
    image: EDIT_ART[e.handle]?.image ?? e.image ?? "/images/lifestyle/lake-wide.webp",
    vibe: EDIT_ART[e.handle]?.vibe ?? "The edit",
    focus: EDIT_ART[e.handle]?.focus,
    count: editCounts[k].total,
    piece: editPieces[k],
  }));
  const colourLists = await Promise.all(COLOUR_FAMILIES.map((f) => listProducts({ tagGroups: [[colourTag(f.key)]], limit: 12, sort: "best-selling" })));
  const usedForColour = new Set<number>();
  const colours = COLOUR_FAMILIES.map((f, i) => {
    const l = colourLists[i];
    const pick = l.items.find((p) => !usedForColour.has(p.id) && p.images[0]) ?? l.items[0];
    if (pick) usedForColour.add(pick.id);
    return { ...f, total: l.total, image: pick?.images[0]?.url ?? null };
  }).filter((c) => c.total > 0);
  const tabs: RailTab[] = [
    { label: "Under ₹999", tone: "sun" as const, count: underPrice.total, items: underPrice.items, href: "/collections/all?max=999", feature: { kicker: "Steal deals", big: "₹999", line: "& under — boho tops, skirts and dresses that cost less than dinner out." } },
    { label: "Bestsellers", tone: "ink" as const, count: bestsellers.total, items: bestsellers.items, href: "/collections/all?sort=best-selling", feature: { kicker: "Most loved", big: "Fan faves", line: "The pieces our girls keep coming back for — sold out once, restocked." } },
    { label: "New in", tone: "sea" as const, count: fresh.total, items: fresh.items, href: "/collections/all?sort=newest", feature: { kicker: "Just landed", big: "Fresh drop", line: "Crochet trims, schiffli and summer prints, straight off the studio rail." } },
  ].filter((t) => t.items.length);

  return (
    <>
      <Hero slides={heroSlides} clips={heroClips} shop={shop} />

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

      {/* Shop by Category — categories on top; edits and a photo-filled word below */}
      <Container className="pt-10 sm:pt-14">
        <div className="flex items-end justify-between gap-6 mb-6 sm:mb-8">
          <h2 className="font-display text-[34px] sm:text-[56px] leading-none">Shop by Category</h2>
          <DotLink href="/collections" className="shrink-0 hidden sm:inline-flex">
            Explore all collections
          </DotLink>
        </div>
        <Reveal stagger className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-12 gap-3 sm:gap-5 lg:auto-rows-[380px]">
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
                className="aspect-[3/4] lg:aspect-auto lg:col-span-2"
              />
            );
          })}
          {editTiles.slice(0, 2).map((t) => (
            <CategoryTile key={t.handle} href={`/collections/${t.handle}`} title={t.c!.title.replace(/\s+-\s+.*$/, "")} image={t.image} className="aspect-[3/4] lg:aspect-auto lg:col-span-3" />
          ))}
          <ImageWord word="Boho" image="/images/lifestyle/pink-stairs.webp" href="/collections/free-spirited" className="aspect-[3/4] sm:aspect-auto lg:col-span-3 py-6 lg:py-0 bg-paper border border-line" textClass="text-[12vw] sm:text-[11vw] lg:text-[6vw] xl:text-[92px]" />
          {editTiles.slice(2, 3).map((t) => (
            <CategoryTile key={t.handle} href={`/collections/${t.handle}`} title={t.c!.title.replace(/\s+-\s+.*$/, "")} image={t.image} className="aspect-[3/4] lg:aspect-auto lg:col-span-3" />
          ))}
        </Reveal>
      </Container>

      {/* Shop by mood — full-photo cards in a staggered (mirrored) rhythm; the brand tone is a slim band */}
      <Container className="pt-8 sm:pt-12">
        <SectionHeading eyebrow="Plans & details" title="Shop by" accent="occasion & craft" />
        <Reveal stagger className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 lg:pb-10">
          {moods.map((m, i) => (
            <Link
              key={m.key}
              href={`/collections/all?${m.group}=${m.key}`}
              className={`group relative block aspect-[3/4] lg:aspect-[3/4.6] overflow-hidden rounded-card bg-ink isolate ${i % 2 ? "lg:translate-y-10" : ""}`}
            >
              {m.image && <Image src={m.image} alt="" fill sizes="(min-width:1024px) 16vw, 48vw" className="object-cover object-top transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]" />}
              <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/15 to-transparent" />
              <span aria-hidden className={`absolute inset-x-0 top-0 h-1.5 ${MOOD_BAND[m.tone]}`} />
              <span className="absolute inset-x-0 bottom-0 p-4 sm:p-5 text-cream">
                <span className="block text-[10px] tracking-[0.26em] uppercase text-cream/70">{m.sub}</span>
                <span className="block font-display italic text-[28px] sm:text-[32px] leading-none mt-2">
                  {m.title}
                </span>
                <span className="mt-3 flex items-center justify-between text-[12px] tracking-[0.06em] text-cream/85">
                  Shop now
                  <span aria-hidden className="transition-transform duration-500 group-hover:translate-x-1">→</span>
                </span>
              </span>
            </Link>
          ))}
        </Reveal>
      </Container>

      {/* Products — tabbed rail */}
      {tabs.length > 0 && (
        <Container className="pt-16 sm:pt-24 cv-auto">
          <SectionHeading eyebrow="Under ₹999 · Bestsellers · New in" title="Shop the" accent="shelf" />
          <ProductRail list="Home" tabs={tabs} />
        </Container>
      )}

      {/* Try-on videos — dark rounded panel */}
      {clips.length > 0 && (
        <Panel defer bg="bg-ink text-cream overflow-hidden" className="pt-8 sm:pt-11 pb-8 sm:pb-11 px-4 sm:px-6 lg:px-10" style={blockPrint("#f5e0a3", 0.05)}>
          <SectionHeading dark eyebrow="Real fit · real fabric" title="Try-on videos," accent="see the fit" className="mb-6 sm:mb-8" />
          <ReelRail clips={clips} />
        </Panel>
      )}

      {/* The Edits — moodboard index */}
      {spotlightEdits.length > 0 && (
        <Container className="pt-8 sm:pt-12 cv-auto">
          <SectionHeading eyebrow="Moodboards" title="The" accent="Edits" href="/collections" linkLabel="Explore all edits" className="sm:flex-row sm:items-end" />
          <EditPanels edits={editPanels} />
        </Container>
      )}

      {/* Editorial split */}
      <Panel defer bg="bg-ink text-cream overflow-hidden isolate" full className="grid lg:grid-cols-2">
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

      {/* Shop by colour — one card per colour family, swatch + a piece in that colour */}
      {colours.length > 0 && (
        <Container className="pt-8 sm:pt-12 cv-auto">
          <SectionHeading eyebrow="Find your shade" title="Shop by" accent="colour" />
          <Reveal stagger className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {colours.map((c) => (
              <Link
                key={c.key}
                href={`/collections/all?colour=${c.key}`}
                className="group relative block aspect-[3/4] overflow-hidden rounded-card bg-sand isolate"
              >
                {c.image && <Image src={c.image} alt="" fill sizes="(min-width:1024px) 18vw, 45vw" className="object-cover object-top transition-transform duration-700 group-hover:scale-105" />}
                <span aria-hidden className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-ink/55 via-ink/15 to-transparent" />
                <span className="absolute inset-x-2.5 bottom-2.5 sm:inset-x-3 sm:bottom-3 flex items-center gap-2 rounded-full bg-paper/90 backdrop-blur-md pl-2 pr-3 py-1.5 sm:py-2 shadow-sm">
                  <span aria-hidden className="size-3.5 sm:size-4 shrink-0 rounded-full ring-1 ring-ink/15" style={{ background: c.swatch }} />
                  <span className="min-w-0 flex-1 truncate text-[11px] sm:text-xs tracking-[0.08em] uppercase">
                    <span className="sm:hidden">{c.label.split(" & ")[0]}</span>
                    <span className="hidden sm:inline">{c.label}</span>
                  </span>
                  <span aria-hidden className="text-xs transition-transform duration-300 group-hover:translate-x-0.5">→</span>
                </span>
              </Link>
            ))}
          </Reveal>
        </Container>
      )}

      {/* Details */}
      <Container className="pt-16 sm:pt-24 cv-auto">
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
      <Panel defer bg="bg-paper/75" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-10" style={blockPrint("#1d6188", 0.07)}>
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

      {/* Customer reviews — sun band with a slow ribbon of cards */}
      <Panel bg="bg-sun text-ink overflow-hidden" full flush className="pt-10 sm:pt-12 pb-10 sm:pb-12" style={blockPrint("#161616", 0.06)}>
        <p className="text-[11px] tracking-[0.3em] uppercase text-center">Customer reviews</p>
        <h2 className="font-display text-center text-[40px] sm:text-[60px] leading-[1] mt-3 px-4">
          Real reviews, <em className="font-normal">real love</em>
        </h2>
        <div className="mt-8 sm:mt-10 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
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


    </>
  );
}
