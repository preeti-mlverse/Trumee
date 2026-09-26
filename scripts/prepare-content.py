"""
One-off content migration from the old Shopify store (trumee.in) + local media folders.

Outputs:
  seed/catalog.json                 products, collections, pages, blog posts (clean HTML)
  public/images/products/<handle>/  optimised product images (webp)
  public/images/lifestyle/          editorial shoot images (webp)
  public/images/drafts/<slug>/      2026 collection photos for draft products

Usage:  python scripts/prepare-content.py   (run from repo root; needs Pillow)
"""
import html
import io
import json
import os
import re
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor

from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MEDIA = os.path.dirname(ROOT)  # website_shopify/
EXPORT = os.path.join(MEDIA, "_export")
PUBLIC = os.path.join(ROOT, "public", "images")
SEED = os.path.join(ROOT, "seed")
UA = {"User-Agent": "Mozilla/5.0"}

ALLOWED = {"h2", "h3", "h4", "p", "ul", "ol", "li", "strong", "b", "em", "i", "a", "br",
           "table", "thead", "tbody", "tr", "td", "th", "blockquote", "img"}


def clean_html(s: str) -> str:
    s = re.sub(r"<(script|style|svg|iframe)[^>]*>.*?</\1>", "", s, flags=re.S | re.I)
    s = re.sub(r"<!--.*?-->", "", s, flags=re.S)

    def tag(m):
        closing, name, attrs = m.group(1), m.group(2).lower(), m.group(3) or ""
        if name == "b":
            name = "strong"
        if name not in ALLOWED:
            return ""
        if closing:
            return f"</{name}>"
        if name == "a":
            href = re.search(r'href="([^"]*)"', attrs)
            url = href.group(1) if href else "#"
            url = url.replace("https://trumee.in", "").replace("https://www.trumee.in", "") or "/"
            return f'<a href="{url}">'
        if name == "img":
            src = re.search(r'src="([^"]*)"', attrs)
            return f'<img src="{src.group(1)}" alt="" />' if src else ""
        return f"<{name}>"

    s = re.sub(r"<(/?)([a-zA-Z0-9]+)([^>]*)>", tag, s)
    s = s.replace("�", "'").replace("\xa0", " ")
    s = re.sub(r"<(p|li|h3|strong)>\s*</\1>", "", s)
    s = re.sub(r"\n\s*\n+", "\n", s)
    return s.strip()


def fetch(url: str) -> bytes:
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        return r.read()


def save_webp(img: Image.Image, path: str, max_side: int = 1600, quality: int = 80):
    img = ImageOps.exif_transpose(img).convert("RGB")
    img.thumbnail((max_side, max_side), Image.LANCZOS)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, "WEBP", quality=quality, method=6)
    return img.size


# ---------------------------------------------------------------- products
def product_images(p):
    out = []
    for i, im in enumerate(p["images"], 1):
        rel = f"/images/products/{p['handle']}/{i}.webp"
        dest = os.path.join(ROOT, "public", rel.lstrip("/"))
        if not os.path.exists(dest):
            size = save_webp(Image.open(io.BytesIO(fetch(im["src"]))), dest)
        else:
            size = Image.open(dest).size
        out.append({"url": rel, "alt": im.get("alt") or p["title"], "width": size[0], "height": size[1],
                    "variantIds": im.get("variant_ids", [])})
    return out


def main():
    products = json.load(open(os.path.join(EXPORT, "products.json"), encoding="utf8"))["products"]
    collections = json.load(open(os.path.join(EXPORT, "collections.json"), encoding="utf8"))["collections"]

    print(f"Downloading images for {len(products)} products…")
    with ThreadPoolExecutor(8) as ex:
        imgs = list(ex.map(product_images, products))

    catalog_products = []
    for p, images in zip(products, imgs):
        catalog_products.append({
            "shopifyId": p["id"], "handle": p["handle"], "title": p["title"].strip(),
            "bodyHtml": clean_html(p["body_html"] or ""), "productType": p["product_type"],
            "tags": p["tags"], "createdAt": p["created_at"], "publishedAt": p["published_at"],
            "options": [{"name": o["name"], "values": o["values"]} for o in p["options"]],
            "variants": [{
                "shopifyId": v["id"], "title": v["title"], "sku": v["sku"], "price": v["price"],
                "compareAtPrice": v["compare_at_price"], "option1": v["option1"], "option2": v["option2"],
                "option3": v["option3"], "available": v["available"], "grams": v.get("grams", 0),
            } for v in p["variants"]],
            "images": images,
        })

    catalog_collections = []
    for c in collections:
        if c["handle"].startswith("tax_rates"):
            continue
        path = os.path.join(EXPORT, f"col_{c['handle']}.json")
        members = [x["handle"] for x in json.load(open(path, encoding="utf8"))["products"]] if os.path.exists(path) else []
        catalog_collections.append({"handle": c["handle"], "title": c["title"],
                                    "descriptionHtml": clean_html(c.get("description") or ""),
                                    "products": members})

    # ------------------------------------------------------------ pages
    pages = []
    titles = {"about-us": "About Us", "terms-and-conditions": "Terms and Conditions",
              "shipping-policy": "Shipping Policy", "privacy-policy": "Privacy Policy",
              "returns-policy": "Returns Policy", "sizing-chart": "Sizing Chart"}
    for handle, title in titles.items():
        s = open(os.path.join(EXPORT, "pages", f"{handle}.html"), encoding="utf8", errors="replace").read()
        m = re.search(r'__main-page"[^>]*>(.*?)<div id="shopify-section-[^"]*__(?!main-page)', s, re.S)
        if not m:
            m = re.search(r"<main[^>]*>(.*?)</main>", s, re.S)
        body = m.group(1)
        body = re.sub(r"<header>.*?</header>", "", body, count=1, flags=re.S)
        body = re.sub(r"<nav[^>]*breadcrumbs.*?</nav>", "", body, flags=re.S)
        pages.append({"handle": handle, "title": title, "bodyHtml": clean_html(body)})

    # ------------------------------------------------------------ blog
    atom = open(os.path.join(EXPORT, "blog.atom"), encoding="utf8").read()
    posts = []
    for e in re.findall(r"<entry>(.*?)</entry>", atom, re.S):
        link = re.search(r'<link rel="alternate" type="text/html" href="([^"]+)"', e).group(1)
        content = html.unescape(re.search(r'<content type="html">(.*?)</content>', e, re.S).group(1))
        summary = re.search(r'<summary type="html">(.*?)</summary>', e, re.S)
        posts.append({
            "handle": link.rsplit("/", 1)[-1],
            "title": html.unescape(re.search(r"<title>(.*?)</title>", e).group(1)),
            "publishedAt": re.search(r"<published>(.*?)</published>", e).group(1),
            "author": "Team Trumee",
            "bodyHtml": clean_html(content),
            "excerpt": re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", html.unescape(summary.group(1) if summary and summary.group(1).strip() else content))).strip()[:200],
        })

    # ------------------------------------------------------------ lifestyle shoot
    life = {
        "hero-balcony": "Devanshi/third/IMG_0001.JPG",
        "hero-pink-wall": "Devanshi/pink dress/1.jpg",
        "pink-stairs": "Devanshi/pink dress/3.jpg",
        "pink-back": "Devanshi/pink dress/7.jpg",
        "cafe-chair": "Devanshi/third/IMG_0005.JPG",
        "forest-blue": "Devanshi/third/IMG_0015.JPG",
        "forest-walk": "Devanshi/third/IMG_0018.JPG",
        "stone-rust": "Devanshi/third/IMG_9953.JPG",
        "stone-wall": "Devanshi/third/IMG_9955.JPG",
        "lake-rust": "Devanshi/third/IMG_9974.JPG",
        "lake-wide": "Devanshi/third/IMG_9971.JPG",
        "terrace-red": "Devanshi/third/IMG_9997.JPG",
    }
    lifestyle = {}
    for name, src in life.items():
        dest = os.path.join(PUBLIC, "lifestyle", f"{name}.webp")
        if not os.path.exists(dest):
            size = save_webp(Image.open(os.path.join(MEDIA, src)), dest, max_side=2000, quality=78)
        else:
            size = Image.open(dest).size
        lifestyle[name] = {"url": f"/images/lifestyle/{name}.webp", "width": size[0], "height": size[1]}

    # ------------------------------------------------------------ 2026 collection -> draft products
    d = "2026 collection - photos-home/"
    drafts = [
        ("rust-red-peplum-top-with-tie-back", "Rust Red Peplum Top with Tie-Back Keyhole", "Tops",
         ["IMG20260307181533.jpg", "IMG20260307181548.jpg", "IMG20260307181409.jpg", "IMG20260307180952.jpg"]),
        ("plaid-denim-patchwork-shirt", "Plaid & Denim Patchwork Shirt", "Shirts",
         ["IMG20260311111532.jpg", "IMG20260311111333.jpg", "IMG20260311111544.jpg", "IMG20260311111557.jpg", "IMG20260311111340.jpg"]),
        ("geometric-print-tie-waist-mini-skirt", "Geometric Print Tie-Waist Mini Skirt", "Skirts",
         ["WhatsApp Image 2026-03-11 at 3.23.38 skirt PM.jpeg", "WhatsApp Image 2026-03-11 at 3.23.38 PM.jpeg", "IMG20260311112628.jpg", "IMG20260311112532.jpg"]),
        ("peach-sleeveless-top-with-crochet-floral-neckline", "Peach Sleeveless Top with Crochet Floral Neckline", "Tops",
         ["WhatsApp Image 2026-03-11 at 3.22.54 PM.jpeg", "WhatsApp Image 2026-03-11 at 3.22.55_pink_topPM.jpeg", "WhatsApp Image 2026-03-11 at 3.22.55 PM.jpeg"]),
        ("mustard-floral-embroidered-balloon-sleeve-dress", "Mustard Floral Embroidered Balloon-Sleeve Dress", "Dresses",
         ["WhatsApp Image 2026-03-11 at 3.23.35_mustard PM.jpeg", "WhatsApp Image 2026-03-11 at 3.23.35 PM_mustard_dress_sleeves.jpeg", "WhatsApp Image 2026-03-11 at 3.23.34 PM.jpeg", "mustard_dress_top view.jpeg"]),
        ("pink-ditsy-floral-boho-dress", "Pink Ditsy Floral Boho Dress", "Dresses",
         ["WhatsApp Image 2026-03-11 at 3.23.36 PM pink dress.jpeg", "WhatsApp Image 2026-03-11 at 3.23.36 pink boho PM.jpeg", "WhatsApp Image 2026-03-11 at 3.23.36 PM.jpeg", "pink boho dress top view .jpeg"]),
    ]
    draft_products = []
    for handle, title, ptype, files in drafts:
        images = []
        for i, f in enumerate(files, 1):
            dest = os.path.join(PUBLIC, "drafts", handle, f"{i}.webp")
            if not os.path.exists(dest):
                size = save_webp(Image.open(os.path.join(MEDIA, d + f)), dest)
            else:
                size = Image.open(dest).size
            images.append({"url": f"/images/drafts/{handle}/{i}.webp", "alt": title, "width": size[0], "height": size[1]})
        draft_products.append({"handle": handle, "title": title, "productType": ptype, "images": images})

    os.makedirs(SEED, exist_ok=True)
    json.dump({"products": catalog_products, "collections": catalog_collections, "pages": pages,
               "posts": posts, "lifestyle": lifestyle, "drafts": draft_products},
              open(os.path.join(SEED, "catalog.json"), "w", encoding="utf8"), ensure_ascii=False, indent=1)
    print(f"products={len(catalog_products)} collections={len(catalog_collections)} pages={len(pages)} "
          f"posts={len(posts)} lifestyle={len(lifestyle)} drafts={len(draft_products)}")


if __name__ == "__main__":
    sys.exit(main())
