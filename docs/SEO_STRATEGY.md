# Trumee SEO strategy

_Prepared September 2026. Search volumes are directional — confirm exact numbers in Google Keyword Planner and Search Console once the new site is live (the tools behind these estimates don't expose India volumes publicly)._

## 1. Why trumee.in isn't ranking today

| Finding | Evidence | Fix (implemented) |
|---|---|---|
| Very few pages indexed | `site:trumee.in` returns ~4 URLs, including a dead WordPress URL (`/product-category/tops/`) | XML sitemap with every product/collection/post, 301s for old WordPress & Shopify URL patterns |
| Thin collection pages | Collection pages had 1 line of text; top competitors have 180–900 words (Libas, Old Marigold) | 250–400-word guide + FAQs on every collection |
| Generic titles | Titles were `Tops – trumee.in` | Keyword-led titles, e.g. *Crochet & Boho Tops for Women Online in India* |
| No structured data beyond basics | — | Organization, WebSite+Search, Product (variants, shipping, returns, reviews, video), Breadcrumb, CollectionPage, FAQPage, BlogPosting |
| Duplicate/"copy" product URLs | e.g. `/products/monochrome-floral-printed-wrap-dress-copy` holds the *Sunny Daisy* dress | Clean handles + 12 permanent redirects |
| Conflicting policy info in Google | Google shows "free shipping above ₹1999, ₹50–100 below"; site says ₹29 flat | **Owner action:** confirm the real policy; settings + `llms.txt` then publish one consistent answer |
| No informational content to rank for questions | 3 generic posts | 3 search-targeted guides (Goa outfits, schiffli, crochet styling) |

## 2. Keyword map (one primary target per page)

| Page | Primary keyword | Supporting / long-tail |
|---|---|---|
| `/` | boho western wear for women India | trumee, crochet tops and dresses online |
| `/collections/dresses` | boho dresses for women | summer dresses for women online India, cotton dresses for women, floral midi dress |
| `/collections/tops` | crochet tops for women | boho tops for women, peplum tops online, halter neck tops |
| `/collections/skirts` | embroidered skirts for women | mini skirts online India, ruffle skirt, flared cotton skirt |
| `/collections/jumpsuit` | cotton jumpsuits for women | schiffli jumpsuit, dungaree jumpsuit women |
| `/collections/shirts` | denim shirt for women | check shirt for women, embroidered shirt women |
| `/collections/co-ord-sets` | co-ord sets for women | printed co-ord set, shirt and shorts co-ord |
| `/collections/escape-edit` | vacation dresses for women | beach holiday outfits India, Goa outfits for women |
| `/collections/in-her-element` | office wear for women western | office casuals for women |
| `/collections/after-the-rain` | monsoon outfits for women | rainy season dresses |
| `/collections/free-spirited` | bohemian clothing for women | boho outfits India |
| `/collections/wander-x-wear` | travel outfits for women | comfortable travel dresses |
| `/blogs/news/what-to-wear-in-goa-…` | what to wear in Goa | Goa outfits for women, Goa packing list |
| `/blogs/news/what-is-schiffli-embroidery` | schiffli embroidery | schiffli vs chikankari, hakoba dress |
| `/blogs/news/how-to-style-a-crochet-top` | how to style a crochet top | what to wear under crochet top |

**Where to win first:** niche craft terms (*schiffli*, *crochet*, *embroidered*) and occasion terms (*vacation*, *Goa*, *monsoon*) — marketplaces (Myntra, Flipkart, Meesho) dominate broad terms like "dresses for women", but D2C labels (Libas, Old Marigold, Miss Mosa, LELA) rank on these narrower ones with helpful collection copy.

## 3. Competitor content gap (teardown)

**Old Marigold — `/collections/women-boho-dresses`** (~850–900 words non-product text): H2s on styling a boho dress, accessories, footwear, layering, scarves, plus a large "popular searches" internal-link block.
**Libas — `/collections/schiffli-dresses`** (~180 words): fabric-led intro ("perfect for summer"), rich filters (fabric, occasion, neck, sleeve), strong review counts on bestsellers.

What Trumee was missing → added:
- Definition paragraph for the head term (featured-snippet target) — **added to every collection guide**.
- Fabric-by-fabric and silhouette guidance — **dresses, tops, skirts guides**.
- Styling (shoes, accessories, layering) — **all guides**.
- FAQ blocks with FAQPage schema — **all main collections**.
- "Popular searches"-style internal links — **Explore block on every collection & product**.
- Reviews at scale — **review system live + automatic review-request email 4 days after delivery** (`/api/cron/review-requests`, daily via `vercel.json`).
- Occasion/fabric filters — **added**: Fabric (cotton family, rayon, georgette, denim), Occasion (vacation, casual, office) and Detail (crochet, embroidery, schiffli).

## 4. Internal linking — 3 opportunities for the priority page

**Target page:** `/collections/escape-edit` (vacation dresses — highest commercial intent + seasonal demand Oct–Feb).

| Link from | Context placement | Anchor text variations |
|---|---|---|
| `/collections/dresses` guide | Closing "matching look" paragraph (done); also worth adding in "How to style a boho dress" after the travel-day sentence | "vacation edit", "vacation dresses for women", "holiday dresses" |
| `/blogs/news/what-to-wear-in-goa-…` | Closing CTA after the packing list (done) and in the "Beach day" section | "Nomadic Escapes vacation edit", "beach holiday outfits", "Goa outfits" |
| `/collections/co-ord-sets` guide | After "Three ways to wear one co-ord" (done) | "travel-ready co-ords", "vacation edit", "outfits for your next getaway" |

All three are implemented. Vary anchors naturally — don't use the exact same phrase everywhere.

## 5. Featured-snippet outlines

Each published guide follows this pattern — reuse it for new posts:

1. **H1** with the question or "how to" phrasing.
2. **Snippet paragraph (40–55 words)** directly under the H1, starting with the bolded question and answering it plainly.
3. **H2s phrased as the next questions people ask** (from Google's "People also ask").
4. **A list or table** (packing list, comparison table) — Google lifts these into list/table snippets.
5. **FAQ section** with 2–3 short Q&As.
6. **Internal links** to 3–5 products and 1–2 collections; "Shop the story" grid underneath.
7. Target length: 700–1,200 words.

**Published from these outlines** (keep adding one every 2 weeks):
- ✅ *How to Style a Co-ord Set: 5 Outfits* → `/collections/co-ord-sets`
- ✅ *What to Wear in the Hills in Summer* → `/collections/wander-x-wear`
- ✅ *Monsoon Outfit Guide: Fabrics That Dry Fast* → `/collections/after-the-rain`
- ✅ *Office Outfits That Aren’t Boring: 10 Western Looks* → `/collections/in-her-element`
- ✅ *Boho Dresses for Every Body Type* → `/collections/dresses`
- Next ideas: *Crochet vs lace: what’s the difference*, *What to wear to a beach wedding*, *Gokarna packing list*, *Rayon vs cotton for summer*

## 6. 20 high-intent long-tail keywords

1. crochet top for women under 1000
2. boho dress for women online with COD
3. schiffli embroidered cotton dress
4. cotton jumpsuit for women with pockets *(verify product fit before targeting)*
5. vacation dress for Goa trip
6. beach outfits for women India online
7. printed co-ord set for women shirt and shorts
8. embroidered mini skirt for women
9. floral fit and flare dress under 1500
10. peplum top for women online India
11. halter neck boho top for women
12. denim check patchwork shirt for women
13. mustard dress for women embroidered
14. tiered midi dress rayon
15. office casual tops for women western
16. monsoon dresses for women online
17. crochet lace top for beach
18. boho clothing brand India
19. cotton summer dress with sleeves
20. co-ord set for travel women

Map each to the closest collection or product; add the phrase naturally to that page's intro or FAQ — never stuff.

## 7. Technical SEO checklist (status)

- [x] XML sitemap with product images & catwalk videos — `/sitemap.xml`
- [x] robots.txt blocking cart/checkout/account/search/filter URLs
- [x] Canonicals; filtered/sorted collection URLs `noindex,follow`
- [x] 301s: old Shopify handles, `/collections/*/products/*`, `/policies/*`, WordPress `/product-category/*`, `/product/*`, `/trumee/*`
- [x] Structured data (see §1)
- [x] One H1 per page; question-led H2s in guides
- [x] Image alt text, next-gen formats (AVIF/WebP), lazy video
- [x] `llms.txt` for AI assistants / answer engines
- [x] Mobile-first, no horizontal scroll 320–1920px
- [x] Search Console / Bing verification tags — set `GOOGLE_SITE_VERIFICATION` / `BING_SITE_VERIFICATION` in env
- [ ] **Owner:** verify domain in Google Search Console, submit `/sitemap.xml`, request indexing of top 20 URLs
- [x] Google Merchant Center feed — `/feeds/google-merchant.xml` (188 size-level items, unique IDs)
- [ ] **Owner:** create Merchant Center account, add the feed URL as a scheduled fetch, enable free listings
- [ ] **Owner:** fix duplicate legacy SKU codes (e.g. TRMD03/TRMD06 reused across 6–7 products)
- [ ] **Owner:** Google Business Profile for the Gurgaon studio
- [ ] **Owner:** collect reviews (aim for 5+ per bestseller) — they drive stars in results
- [ ] Monthly: check Search Console "Queries" and add FAQs for queries you rank 8–20 on

## 8. AI search (GEO) — being the answer in ChatGPT, Perplexity, Gemini & AI Overviews

Brand brief used for all copy: women 20–48 wanting trendy, comfortable, affordable everyday and vacation western wear; tone chic, confident, fashion-forward.

**Shipped in code**
- `robots.txt` names the AI crawlers explicitly (OAI-SearchBot, ChatGPT-User, GPTBot, PerplexityBot, Perplexity-User, ClaudeBot, Claude-SearchBot, Claude-User, Google-Extended, Applebot-Extended, Bingbot, CCBot) — allowed, with the same private-path blocks as everyone else.
- `/llms.txt` — quotable brand facts (audience, fabrics, sizes, prices, shipping, payments incl. prepaid offer, returns/exchanges, contact) + category/edit map + links to machine-readable files.
- `/llms-full.txt` — every live style with price, sale price, sizes (incl. sold out), fabric, colour, pattern and craft, grouped by category.
- Product pages carry an **"At a glance"** block (fabric, sizes, colour, details, care, dispatch, returns, payment) — short factual answers assistants quote.
- Category guides open with a 150–200-word intro + 3 "People Also Ask" FAQs answered in the first sentence (Tops, Dresses done; repeat for the rest).
- Colour is set for every product (variant option → `colour:` tag → name) so schema, feed and llms files agree.

**Owner actions (off-site — this is where most AI visibility comes from)**
- [ ] Get Trumee mentioned in Indian fashion publications/blogs and "best boho brands in India" listicles (LLMs cite these).
- [ ] Seed genuine conversations: r/IndianFashionAddicts, r/femalefashionadvice, Quora answers on boho/vacation outfits.
- [ ] Microsoft Merchant Center: add the same feed (`/feeds/google-merchant.xml`) — powers Bing & Copilot shopping.
- [ ] Monthly: ask ChatGPT / Perplexity / Gemini "best boho dresses brand India", "crochet tops online India" etc.; log whether Trumee is cited and which pages; add FAQs/guides for the gaps.
- [ ] Competitor gap: pull ranked keywords for 3 competitors (e.g. Bunaai, Pink Fort, Kaori by Shreya), group by intent, ship one collection guide/blog per gap.

## 9. Structured data map (what each page emits)

| Page | Schema.org types |
|---|---|
| Every page | `OnlineStore`/`ClothingStore` (Organization: logo, address, contact, sameAs, knowsAbout, priceRange, payment, **MerchantReturnPolicy**), `WebSite` + `SearchAction` |
| Product | `ProductGroup` (brand, category, material, colour, pattern, `PeopleAudience` female/adult, `additionalProperty` fabric/care/craft, `VideoObject`) → `hasVariant` `Product` per size (`SizeSpecification`, colour, sku, `inProductGroupWithID`) → `Offer` (price, `StrikethroughPrice` for sales, availability, `OfferShippingDetails` with handling/transit days, `MerchantReturnPolicy`), `AggregateRating` + `Review` **only from real reviews**, `BreadcrumbList` |
| Collection | `CollectionPage` + `ItemList` (url, name, image), `FAQPage`, `BreadcrumbList` |
| Journal post | `BlogPosting`, `BreadcrumbList` |

Validate after launch: Google Rich Results Test + Search Console → Shopping/Merchant listings, Products, FAQ, Breadcrumbs reports.

## 10. Go-live checklist

- [ ] `NEXT_PUBLIC_SITE_URL=https://trumee.in` (all canonicals, sitemap, schema and llms files use it)
- [ ] Hosting/CDN bot protection: make sure AI crawlers above are **not** challenged (Cloudflare "Block AI bots" off; Vercel firewall rules allow them)
- [ ] Search Console + Bing Webmaster: verify, submit `/sitemap.xml`
- [ ] Merchant Center (Google + Microsoft): add feed, enable free listings, set shipping (₹29 flat) and returns (7 days) to match the site
- [ ] Razorpay live keys, Resend domain, Shiprocket credentials + webhook (docs/SHIPROCKET_SETUP.md)
- [ ] Prepaid discount % set in Admin → Settings → Payments (shown on product pages, bag, checkout and in llms.txt)
- [ ] Rich Results Test on 3 products, 2 collections, home
