"use client";

import Image from "next/image";
import { useActionState, useState, useTransition } from "react";
import { deleteImage, deleteProduct, moveImage, saveProduct, setImageAlt, uploadImages, type CatalogResult } from "@/app/actions/catalog";

const input = "w-full rounded-lg border border-admin-line bg-white px-3 py-2 text-sm outline-none focus:border-admin-accent";
const card = "rounded-2xl bg-admin-card border border-admin-line p-5 space-y-4";
const btn = "rounded-lg border border-admin-line bg-white px-3 py-1.5 text-sm font-medium hover:border-admin-accent disabled:opacity-50";

export type EditorVariant = {
  id: number | null;
  option1: string;
  sku: string;
  price: string;
  compare: string;
  cost: string;
  qty: number;
  track: boolean;
  backorder: boolean;
};
export type EditorProduct = {
  id: number | null;
  title: string;
  handle: string;
  status: "active" | "draft" | "archived";
  productType: string;
  tags: string;
  descriptionHtml: string;
  fabric: string;
  care: string;
  seoTitle: string;
  seoDescription: string;
  videoUrl: string;
  videoPoster: string;
  collectionIds: number[];
  variants: EditorVariant[];
};

const SIZE_PRESETS = ["XS", "S", "M", "L", "XL", "XXL"];

/** New size row, copying prices from the first row so they needn't be retyped. */
function blankVariant(option1: string, base?: EditorVariant): EditorVariant {
  return { id: null, option1, sku: "", price: base?.price ?? "", compare: base?.compare ?? "", cost: base?.cost ?? "", qty: 0, track: true, backorder: false };
}

function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <span className="block text-sm font-medium mb-1">
      {children}
      {hint && <span className="font-normal text-admin-muted"> — {hint}</span>}
    </span>
  );
}

export function ProductEditor({ p, collections, types }: { p: EditorProduct; collections: { id: number; title: string; group: string }[]; types: string[] }) {
  const [state, action, pending] = useActionState<CatalogResult, FormData>(saveProduct.bind(null, p.id), {});
  const [variants, setVariants] = useState<EditorVariant[]>(p.variants.length ? p.variants : [blankVariant("Free size")]);
  const [title, setTitle] = useState(p.title);
  const [deleting, startDelete] = useTransition();

  const blank = (option1: string) => blankVariant(option1, variants[0]);
  const update = (i: number, patch: Partial<EditorVariant>) => setVariants((vs) => vs.map((v, k) => (k === i ? { ...v, ...patch } : v)));
  const missing = SIZE_PRESETS.filter((s) => !variants.some((v) => v.option1.toUpperCase() === s));

  return (
    <form action={action} className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start">
      <div className="space-y-6">
        <section className={card}>
          <label className="block">
            <Label>Title</Label>
            <input name="title" value={title} onChange={(e) => setTitle(e.target.value)} required className={input} />
          </label>
          <label className="block">
            <Label hint="HTML allowed: <p>, <ul><li>, <strong>">Description</Label>
            <textarea name="descriptionHtml" rows={8} defaultValue={p.descriptionHtml} className={`${input} font-mono text-xs`} />
          </label>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <Label>Fabric</Label>
              <input name="fabric" defaultValue={p.fabric} placeholder="e.g. 100% cotton slub" className={input} />
            </label>
            <label className="block">
              <Label>Care</Label>
              <input name="care" defaultValue={p.care} placeholder="e.g. Gentle hand wash, dry in shade" className={input} />
            </label>
          </div>
        </section>

        {/* Variants */}
        <section className={card}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Sizes, prices & stock</h2>
            <div className="flex flex-wrap gap-1.5">
              {missing.map((s) => (
                <button key={s} type="button" onClick={() => setVariants((vs) => [...vs.filter((v) => v.option1 !== "Free size" || v.id), blank(s)])} className="rounded-full border border-admin-line px-2.5 py-0.5 text-xs hover:border-admin-accent">
                  + {s}
                </button>
              ))}
              <button type="button" onClick={() => setVariants((vs) => [...vs, blank("")])} className="rounded-full border border-admin-line px-2.5 py-0.5 text-xs hover:border-admin-accent">
                + Custom
              </button>
            </div>
          </div>
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm min-w-[760px]">
              <thead className="text-left text-xs text-admin-muted">
                <tr>
                  {["Size", "SKU", "Price ₹", "MRP ₹", "Cost ₹", "Stock", "Track", "Sell when out", ""].map((h) => (
                    <th key={h} className="pb-2 pr-2 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {variants.map((v, i) => (
                  <tr key={i} className="align-top">
                    <td className="pr-2 pb-2">
                      <input type="hidden" name="v_id" value={v.id ?? ""} />
                      <input name="v_option1" value={v.option1} onChange={(e) => update(i, { option1: e.target.value })} required className={`${input} w-24`} />
                    </td>
                    <td className="pr-2 pb-2"><input name="v_sku" value={v.sku} onChange={(e) => update(i, { sku: e.target.value })} className={`${input} w-28`} /></td>
                    <td className="pr-2 pb-2"><input name="v_price" type="number" step="0.01" min="1" value={v.price} onChange={(e) => update(i, { price: e.target.value })} required className={`${input} w-24`} /></td>
                    <td className="pr-2 pb-2"><input name="v_compare" type="number" step="0.01" value={v.compare} onChange={(e) => update(i, { compare: e.target.value })} placeholder="—" className={`${input} w-24`} /></td>
                    <td className="pr-2 pb-2"><input name="v_cost" type="number" step="0.01" value={v.cost} onChange={(e) => update(i, { cost: e.target.value })} placeholder="—" className={`${input} w-20`} /></td>
                    <td className="pr-2 pb-2"><input name="v_qty" type="number" step="1" value={v.qty} onChange={(e) => update(i, { qty: Number(e.target.value) })} className={`${input} w-20`} /></td>
                    <td className="pr-2 pb-2 pt-2.5 text-center">
                      <input type="hidden" name="v_track" value={v.track ? "1" : "0"} />
                      <input type="checkbox" checked={v.track} onChange={(e) => update(i, { track: e.target.checked })} className="size-4" aria-label="Track stock" />
                    </td>
                    <td className="pr-2 pb-2 pt-2.5 text-center">
                      <input type="hidden" name="v_backorder" value={v.backorder ? "1" : "0"} />
                      <input type="checkbox" checked={v.backorder} onChange={(e) => update(i, { backorder: e.target.checked })} className="size-4" aria-label="Allow orders when out of stock" />
                    </td>
                    <td className="pb-2 pt-1.5">
                      {variants.length > 1 && (
                        <button type="button" onClick={() => setVariants((vs) => vs.filter((_, k) => k !== i))} className="text-xs text-admin-red px-1" aria-label={`Remove ${v.option1}`}>
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-admin-muted">MRP is the crossed-out price (leave blank for none). Cost is private — used for margin reports. Stock changes are logged in Inventory history.</p>
        </section>

        <section className={card}>
          <h2 className="font-semibold">Search engine listing</h2>
          <label className="block">
            <Label hint="blank = product title">SEO title</Label>
            <input name="seoTitle" defaultValue={p.seoTitle} maxLength={80} className={input} />
          </label>
          <label className="block">
            <Label hint="~150 characters">SEO description</Label>
            <textarea name="seoDescription" rows={2} defaultValue={p.seoDescription} maxLength={200} className={input} />
          </label>
          <label className="block">
            <Label hint="blank = made from the title">URL handle</Label>
            <span className="flex items-center gap-1 text-sm text-admin-muted">
              /products/
              <input name="handle" defaultValue={p.handle} placeholder={title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")} className={input} />
            </span>
            {p.id && <span className="block text-xs text-admin-muted mt-1">Changing the handle of a live product breaks old links — add a redirect if it’s already been shared.</span>}
          </label>
        </section>

        <section className={card}>
          <h2 className="font-semibold">Catwalk video</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <Label hint="9:16 MP4 in /videos">Video path</Label>
              <input name="videoUrl" defaultValue={p.videoUrl} placeholder="/videos/trmd03.mp4" className={input} />
            </label>
            <label className="block">
              <Label>Poster image</Label>
              <input name="videoPoster" defaultValue={p.videoPoster} placeholder="/videos/trmd03.webp" className={input} />
            </label>
          </div>
        </section>
      </div>

      {/* Sidebar */}
      <aside className="space-y-6 lg:sticky lg:top-20">
        <section className={card}>
          <label className="block">
            <Label>Status</Label>
            <select name="status" defaultValue={p.status} className={input}>
              <option value="active">Active — visible on the store</option>
              <option value="draft">Draft — hidden</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <button disabled={pending} className="w-full rounded-lg bg-admin-accent text-white px-4 py-2.5 text-sm font-medium disabled:opacity-60">
            {pending ? "Saving…" : p.id ? "Save product" : "Create product"}
          </button>
          {state.error && <p className="text-sm text-admin-red">{state.error}</p>}
          {state.ok && !pending && <p className="text-sm text-admin-green">{state.ok}</p>}
        </section>

        <section className={card}>
          <label className="block">
            <Label>Category</Label>
            <input name="productType" list="product-types" defaultValue={p.productType} placeholder="e.g. Dresses" className={input} />
            <datalist id="product-types">
              {types.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </label>
          <label className="block">
            <Label hint="comma separated">Tags</Label>
            <input name="tags" defaultValue={p.tags} placeholder="cotton, vacation, floral" className={input} />
            <span className="block text-xs text-admin-muted mt-1">Tags power the filters and the “Shop by mood” tiles.</span>
          </label>
        </section>

        <section className={card}>
          <h2 className="font-semibold">Collections</h2>
          {(["category", "edit"] as const).map((g) => (
            <div key={g}>
              <p className="text-xs uppercase tracking-wide text-admin-muted mb-1.5">{g === "category" ? "Categories" : "Edits"}</p>
              <div className="space-y-1">
                {collections
                  .filter((c) => (g === "category" ? c.group === "category" : c.group !== "category" && c.group !== "all"))
                  .map((c) => (
                    <label key={c.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="collections" value={c.id} defaultChecked={p.collectionIds.includes(c.id)} className="size-4" />
                      {c.title}
                    </label>
                  ))}
              </div>
            </div>
          ))}
        </section>

        {p.id && (
          <button
            type="button"
            disabled={deleting}
            onClick={() => confirm("Delete this product permanently? Past orders keep their details. Consider Archived instead.") && startDelete(() => deleteProduct(p.id!))}
            className="text-sm text-admin-red underline"
          >
            {deleting ? "Deleting…" : "Delete product"}
          </button>
        )}
      </aside>
    </form>
  );
}

/** Photo manager for a saved product: upload (auto-converted to WebP), reorder, alt text, delete. */
export function ProductImages({ productId, images }: { productId: number; images: { id: number; url: string; alt: string }[] }) {
  const [state, action, pending] = useActionState<CatalogResult, FormData>(uploadImages.bind(null, productId), {});
  const [busy, start] = useTransition();
  return (
    <section className={card}>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Photos</h2>
        <span className="text-xs text-admin-muted">First photo = main image · portrait 3:4 or 2:3 works best</span>
      </div>
      {images.length > 0 && (
        <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {images.map((img, i) => (
            <li key={img.id} className="space-y-1.5">
              <div className={`relative aspect-[3/4] overflow-hidden rounded-xl bg-admin-bg ${i === 0 ? "ring-2 ring-admin-accent" : ""}`}>
                <Image src={img.url} alt={img.alt} fill sizes="160px" className="object-cover" />
                {i === 0 && <span className="absolute left-1.5 top-1.5 rounded-full bg-admin-accent text-white px-2 py-0.5 text-[10px]">Main</span>}
              </div>
              <input defaultValue={img.alt} onBlur={(e) => e.target.value !== img.alt && setImageAlt(img.id, e.target.value)} placeholder="Alt text" aria-label="Alt text" className={`${input} text-xs py-1`} />
              <div className="flex gap-1 text-xs">
                <button type="button" disabled={busy || i === 0} onClick={() => start(() => moveImage(img.id, -1))} className={btn} aria-label="Move earlier">←</button>
                <button type="button" disabled={busy || i === images.length - 1} onClick={() => start(() => moveImage(img.id, 1))} className={btn} aria-label="Move later">→</button>
                {i > 0 && <button type="button" disabled={busy} onClick={() => start(() => moveImage(img.id, 0))} className={btn}>Main</button>}
                <button type="button" disabled={busy} onClick={() => confirm("Delete this photo?") && start(() => deleteImage(img.id))} className={`${btn} text-admin-red ml-auto`} aria-label="Delete photo">✕</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <form action={action} key={state.at} className="flex flex-wrap items-center gap-3">
        <input type="file" name="files" accept="image/*" multiple className="text-sm" />
        <button disabled={pending} className={btn}>{pending ? "Uploading…" : "Upload photos"}</button>
        {state.error && <p className="w-full text-sm text-admin-red">{state.error}</p>}
        {state.ok && <p className="w-full text-sm text-admin-green">{state.ok}</p>}
      </form>
      <p className="text-xs text-admin-muted">Any size or format — photos are resized to 2000px and converted to WebP automatically.</p>
    </section>
  );
}
