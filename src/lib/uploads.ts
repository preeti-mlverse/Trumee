import "server-only";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import sharp from "sharp";

/**
 * Admin uploads (product photos). Files added after `next build` aren't served from /public, so
 * they live in UPLOAD_DIR (default ./uploads, outside git) and are served by app/uploads/[...path].
 * On a VPS keep this folder in backups — it isn't in the repository.
 */
export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(/* turbopackIgnore: true */ process.cwd(), "uploads");
const MAX_BYTES = 20 * 1024 * 1024;

/** Saves an uploaded photo as WebP (long side ≤ 2000px) and returns its public URL and size. */
export async function saveImage(file: File, folder: string) {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name} isn’t an image.`);
  if (file.size > MAX_BYTES) throw new Error(`${file.name} is over 20 MB.`);
  const safeFolder = folder.replace(/[^a-z0-9-]/gi, "").toLowerCase() || "misc";
  const dir = path.join(UPLOAD_DIR, "products", safeFolder);
  await mkdir(dir, { recursive: true });
  const name = `${nanoid(10)}.webp`;
  const out = await sharp(Buffer.from(await file.arrayBuffer()))
    .rotate()
    .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
  await writeFile(path.join(dir, name), out.data);
  return { url: `/uploads/products/${safeFolder}/${name}`, width: out.info.width, height: out.info.height };
}

/** Deletes an uploaded file (only ones under /uploads — repo images in /public are left alone). */
export async function removeUpload(url: string) {
  if (!url.startsWith("/uploads/")) return;
  const file = path.join(UPLOAD_DIR, url.slice("/uploads/".length));
  if (!file.startsWith(UPLOAD_DIR)) return;
  await unlink(file).catch(() => {});
}
