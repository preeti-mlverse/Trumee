// Renders public/favicon.svg's design into the raster icons Google Search, browsers and iOS use.
// Usage: node scripts/make-icons.mjs
import fs from "node:fs";
import sharp from "sharp";

const svg = (size) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64"><rect width="64" height="64" fill="#22101e"/><text x="32" y="47" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="42" fill="#e2a631">T</text></svg>`);
const png = (size) => sharp(svg(size)).png().toBuffer();

for (const [file, size] of [["icon-48.png", 48], ["icon-192.png", 192], ["icon-512.png", 512], ["apple-touch-icon.png", 180]]) fs.writeFileSync(`public/${file}`, await png(size));

// favicon.ico holding 16/32/48 px PNGs
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map(png));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((s, i) => {
  const e = 6 + 16 * i;
  header.writeUInt8(s, e);
  header.writeUInt8(s, e + 1);
  header.writeUInt16LE(1, e + 4);
  header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(images[i].length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += images[i].length;
});
fs.writeFileSync("public/favicon.ico", Buffer.concat([header, ...images]));
console.log("icons written");
