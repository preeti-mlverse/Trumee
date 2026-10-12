// SEO audit: fetches every sitemap URL and checks the essentials search engines and AI crawlers
// read — title, meta description, one H1, canonical, robots, Open Graph, image alt text and
// valid JSON-LD. Pages are fetched as Googlebot (Next streams metadata to browsers but sends it
// in <head> to crawlers). Usage: node scripts/seo-audit.mjs [baseUrl]
const base = process.argv[2] || "http://localhost:3000";
const xml = await (await fetch(`${base}/sitemap.xml`)).text();
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);

const decode = (s) => s.replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const attr = (tag, name) => tag.match(new RegExp(`${name}="([^"]*)"`))?.[1];
const titles = new Map();
const descs = new Map();
const issues = [];
const warn = (path, msg) => issues.push(`${path}  →  ${msg}`);

for (const path of urls) {
  const res = await fetch(base + path, { redirect: "manual", headers: { "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" } });
  if (res.status !== 200) {
    warn(path, `HTTP ${res.status} (listed in sitemap)`);
    continue;
  }
  const html = await res.text();
  const head = html;
  const title = decode(head.match(/<title>([^<]*)<\/title>/)?.[1] ?? "");
  const metas = [...head.matchAll(/<meta [^>]+>/g)].map((m) => m[0]);
  const meta = (k) => decode(attr(metas.find((m) => attr(m, "name") === k || attr(m, "property") === k) ?? "", "content") ?? "");
  const desc = meta("description");
  const canonical = attr([...head.matchAll(/<link [^>]+>/g)].map((m) => m[0]).find((l) => attr(l, "rel") === "canonical") ?? "", "href");
  const robots = meta("robots");
  const h1s = (html.match(/<h1[\s>]/g) ?? []).length;

  if (!title) warn(path, "missing <title>");
  else if (title.length > 65) warn(path, `title is ${title.length} chars (keep ≤ 65): "${title}"`);
  else if (title.length < 20) warn(path, `title is short (${title.length} chars): "${title}"`);
  if (!desc) warn(path, "missing meta description");
  else if (desc.length > 165) warn(path, `description is ${desc.length} chars (keep ≤ 160)`);
  else if (desc.length < 70) warn(path, `description is short (${desc.length} chars)`);
  if (h1s !== 1) warn(path, `${h1s} <h1> tags (should be exactly 1)`);
  if (!canonical) warn(path, "missing canonical");
  else if (new URL(canonical, base).pathname !== path.split("?")[0]) warn(path, `canonical points elsewhere: ${canonical}`);
  if (/noindex/.test(robots)) warn(path, `robots meta "${robots}" on a sitemap URL`);
  if (!meta("og:title") || !meta("og:image")) warn(path, `Open Graph ${!meta("og:title") ? "title" : "image"} missing`);

  const noAlt = [...html.matchAll(/<img [^>]*>/g)].map((m) => m[0]).filter((t) => !/\balt="/.test(t)).length;
  if (noAlt) warn(path, `${noAlt} <img> without alt attribute`);

  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      JSON.parse(m[1]);
    } catch {
      warn(path, "invalid JSON-LD block");
    }
  }
  if (title) titles.set(title, [...(titles.get(title) ?? []), path]);
  if (desc) descs.set(desc, [...(descs.get(desc) ?? []), path]);
}
for (const [t, ps] of titles) if (ps.length > 1) issues.push(`duplicate title "${t}" on: ${ps.join(", ")}`);
for (const [d, ps] of descs) if (ps.length > 1) issues.push(`duplicate description on: ${ps.join(", ")}`);

console.log(`Checked ${urls.length} sitemap URLs.\n`);
console.log(issues.length ? issues.join("\n") : "No SEO issues found.");
