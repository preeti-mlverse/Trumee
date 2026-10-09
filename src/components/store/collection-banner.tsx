import Image from "next/image";
import Link from "next/link";
import { listProducts } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { LoopVideo } from "./loop-video";
import { blockPrint, Umbrella } from "./motifs";
import { Breadcrumbs } from "./ui";

/**
 * Split banner: type panel ⟷ up to three catwalk loops from the collection.
 * Categories sit on bone, edits on sea-black, so neighbouring pages invert.
 */
export async function CollectionBanner({
  collectionId,
  title,
  imageUrl,
  group,
}: {
  collectionId?: number;
  title: string;
  imageUrl: string | null;
  group: "category" | "edit" | "all";
}) {
  const [withVideo, all] = await Promise.all([
    listProducts({ collectionId, withVideo: true, limit: 3, sort: "best-selling" }),
    listProducts({ collectionId, limit: 3 }),
  ]);
  const dark = group === "edit";

  // Title: last word set in italic accent; size steps down for long words/titles so nothing spills
  const words = title.replace(/\s+-\s+/g, " ").trim().split(/\s+/);
  const last = words.pop()!;
  const lead = words.join(" ");
  const longest = Math.max(...title.split(/\s+/).map((w) => w.length));
  const titleSize =
    longest >= 9 || title.length > 22
      ? "text-[44px] sm:text-[60px] xl:text-[76px]"
      : longest >= 7 || title.length > 14
        ? "text-[52px] sm:text-[72px] xl:text-[92px]"
        : "text-[58px] sm:text-[84px] xl:text-[104px]";

  // Media: videos first, then product stills, then the collection image
  const media: { key: string; href?: string; video?: { url: string; poster: string | null }; image?: string; label?: string }[] = withVideo.items.map((p) => ({
    key: "v" + p.id,
    href: `/products/${p.handle}`,
    video: p.video!,
    label: p.title,
  }));
  if (media.length < 3 && imageUrl && group === "edit") media.unshift({ key: "cover", image: imageUrl });
  for (const p of all.items) if (media.length < 3 && !media.some((m) => m.key === "v" + p.id) && p.images[0]) media.push({ key: "i" + p.id, href: `/products/${p.handle}`, image: p.images[0].url, label: p.title });

  return (
    <section className="px-2 sm:px-4 lg:px-6 pt-2 sm:pt-3">
    <div className={cn("mx-auto max-w-[1400px] rounded-panel overflow-hidden lg:grid lg:grid-cols-12 lg:min-h-[560px] lg:h-[66svh] lg:max-h-[740px]", dark ? "bg-ink text-cream" : "bg-paper/75 text-ink")}>
      <div className="relative lg:col-span-5 flex flex-col justify-between px-4 sm:px-6 lg:px-12 pt-8 pb-10 lg:py-12 overflow-hidden">
        <span aria-hidden className="absolute inset-0" style={blockPrint(dark ? "#f5e0a3" : "#1d6188", dark ? 0.05 : 0.06)} />
        <span aria-hidden className={cn("absolute -left-24 -bottom-24 size-72 rounded-full blur-3xl", dark ? "bg-sea-bright/30" : "bg-sun-soft/70")} />
        <div className={cn("relative", dark && "[&_a]:text-cream/60 [&_a:hover]:text-cream [&_span]:text-cream/80")}>
          <Breadcrumbs items={[{ label: "Collections", href: "/collections" }, { label: title }]} />
        </div>
        <div className="relative mt-10 lg:mt-0 lg:mb-6">
          <p className={cn("flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase", dark ? "text-sun" : "text-sea")}>
            <Umbrella dark={dark} className="size-4 -mt-0.5" />
            {group === "edit" ? "The Edit" : group === "all" ? "Everything" : "Category"}
          </p>
          <h1 className={cn("font-display mt-5 text-balance break-words", titleSize, "leading-[0.95]")}>
            {lead && <span className="block">{lead}</span>}
            <em className={cn("block italic", dark ? "text-sun" : "text-sea")}>{last}</em>
          </h1>
          <span aria-hidden className={cn("mt-8 block h-[3px] w-16 rounded-full", dark ? "bg-sun" : "bg-sea-bright")} />
        </div>
      </div>

      <div className="lg:col-span-7 grid grid-cols-3 gap-1.5 p-1.5 lg:pl-0 h-[62vw] sm:h-[48vw] lg:h-auto [&>*]:rounded-card">
        {media.slice(0, 3).map((m, i) => {
          const inner = (
            <>
              {m.video ? (
                <LoopVideo src={m.video.url} poster={m.video.poster} priority={i === 0} className="absolute inset-0 size-full object-[50%_30%]" />
              ) : (
                <Image src={m.image!} alt="" fill priority={i === 0} sizes="(min-width:1024px) 20vw, 33vw" className="object-cover object-[50%_30%]" />
              )}
              {m.label && (
                <span className="hidden lg:block absolute inset-x-0 bottom-0 p-4 pt-16 text-[12px] leading-snug text-cream bg-gradient-to-t from-ink/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  {m.label}
                </span>
              )}
            </>
          );
          return m.href ? (
            <Link key={m.key} href={m.href} className="group relative overflow-hidden">
              {inner}
            </Link>
          ) : (
            <div key={m.key} className="relative overflow-hidden">
              {inner}
            </div>
          );
        })}
      </div>
    </div>
    </section>
  );
}
