import Image from "next/image";
import Link from "next/link";
import { listCollections, listProducts } from "@/lib/catalog";
import { cn, stripHtml } from "@/lib/utils";
import { LoopVideo } from "./loop-video";
import { Breadcrumbs } from "./ui";

/**
 * Split banner: type panel ⟷ up to three catwalk loops from the collection.
 * Categories sit on bone, edits on plum-black, so neighbouring pages invert.
 */
export async function CollectionBanner({
  collectionId,
  handle,
  title,
  descriptionHtml,
  imageUrl,
  group,
}: {
  collectionId?: number;
  handle: string;
  title: string;
  descriptionHtml: string;
  imageUrl: string | null;
  group: "category" | "edit" | "all";
}) {
  const [withVideo, all, siblings] = await Promise.all([
    listProducts({ collectionId, withVideo: true, limit: 3, sort: "best-selling" }),
    listProducts({ collectionId, limit: 3 }),
    listCollections(group === "edit" ? "edit" : "category"),
  ]);
  const dark = group === "edit";
  const description = stripHtml(descriptionHtml);

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
    <section className={cn("lg:grid lg:grid-cols-12 lg:min-h-[560px] lg:h-[68svh] lg:max-h-[760px]", dark ? "bg-ink text-cream" : "bg-sand text-ink")}>
      <div className="lg:col-span-5 flex flex-col justify-between px-4 sm:px-6 lg:px-12 pt-8 pb-10 lg:py-12">
        <div className={cn(dark && "[&_a]:text-cream/60 [&_a:hover]:text-cream [&_span]:text-cream/80")}>
          <Breadcrumbs items={[{ label: "Collections", href: "/collections" }, { label: title }]} />
        </div>
        <div className="mt-10 lg:mt-0">
          <p className={cn("text-[11px] tracking-[0.3em] uppercase", dark ? "text-marigold" : "text-plum")}>
            {group === "edit" ? "The Edit" : group === "all" ? "Everything" : "Category"}
          </p>
          <h1 className="font-display text-[52px] sm:text-7xl xl:text-[92px] leading-[0.92] tracking-[-0.015em] mt-5">{title}</h1>
          {description && <p className={cn("mt-5 max-w-md leading-relaxed", dark ? "text-cream/70" : "text-ink-soft")}>{description}</p>}
        </div>
        <nav aria-label="Related collections" className="mt-10 lg:mt-0 flex flex-wrap gap-2">
          {siblings
            .filter((s) => s.handle !== handle)
            .slice(0, 6)
            .map((s) => (
              <Link
                key={s.id}
                href={`/collections/${s.handle}`}
                className={cn(
                  "px-3.5 py-2 text-[11px] tracking-[0.16em] uppercase border transition-colors",
                  dark ? "border-cream/25 hover:bg-cream hover:text-ink" : "border-ink/25 hover:bg-ink hover:text-cream",
                )}
              >
                {s.title}
              </Link>
            ))}
        </nav>
      </div>

      <div className="lg:col-span-7 grid grid-cols-3 gap-px bg-ink h-[62vw] sm:h-[48vw] lg:h-auto">
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
    </section>
  );
}
