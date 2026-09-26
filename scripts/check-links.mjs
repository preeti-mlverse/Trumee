// Crawls the running site and reports every internal link that doesn't return 2xx/3xx.
// Usage: node scripts/check-links.mjs [baseUrl]
const base = process.argv[2] || "http://localhost:3000";
const seen = new Map(); // path -> status
const referrers = new Map(); // path -> Set(from)
// Also seed links that only exist in client-rendered UI (bag drawer, account menu)
const queue = ["/", "/cart", "/checkout", "/wishlist", "/account", "/account/login", "/account/forgot", "/track-order", "/search?q=dress"];

const norm = (href, from) => {
  try {
    const u = new URL(href, base + from);
    if (u.origin !== new URL(base).origin) return null;
    if (/\.(webp|jpg|png|svg|mp4|ico|css|js|txt|xml)$/.test(u.pathname) || u.pathname.startsWith("/_next")) return null;
    return u.pathname + u.search;
  } catch {
    return null;
  }
};

while (queue.length) {
  const path = queue.shift();
  if (seen.has(path)) continue;
  let status = 0;
  let html = "";
  try {
    const res = await fetch(base + path, { redirect: "manual" });
    status = res.status;
    if (status >= 300 && status < 400) {
      const loc = norm(res.headers.get("location"), path);
      if (loc && !seen.has(loc)) queue.push(loc);
    } else if (res.headers.get("content-type")?.includes("text/html")) html = await res.text();
  } catch (e) {
    status = -1;
  }
  seen.set(path, status);
  // Only crawl deeper from pages without query strings (filters create endless variants)
  if (!html || path.includes("?")) continue;
  for (const m of html.matchAll(/href="([^"#]+)"/g)) {
    const p = norm(m[1].replace(/&amp;/g, "&"), path);
    if (!p) continue;
    if (!referrers.has(p)) referrers.set(p, new Set());
    referrers.get(p).add(path);
    if (!seen.has(p) && !queue.includes(p)) queue.push(p);
  }
}

const broken = [...seen].filter(([, s]) => s < 200 || s >= 400);
console.log(`Crawled ${seen.size} URLs, ${broken.length} broken`);
for (const [p, s] of broken) console.log(`${s}  ${p}   ← linked from: ${[...(referrers.get(p) ?? [])].slice(0, 3).join(", ")}`);
process.exit(broken.length ? 1 : 0);
