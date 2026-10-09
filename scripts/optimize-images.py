"""Re-encode heavy WebP images in public/images.

Caps the long side (2000px for lifestyle/scenic backdrops, 1600px for everything else) and re-encodes at
quality 82. A file is only replaced when it gets >=15% smaller AND stays visually equivalent (SSIM >= 0.97
on a luminance comparison at display size). Safe to re-run: already-optimal files are left alone.

    python scripts/optimize-images.py            # dry run
    python scripts/optimize-images.py --write    # replace files
"""
import io
import os
import sys

from PIL import Image, ImageFilter, ImageStat

ROOT = os.path.join(os.path.dirname(__file__), "..", "public", "images")
WRITE = "--write" in sys.argv
MIN_KB = 120


def ssim(a: Image.Image, b: Image.Image) -> float:
    """Global SSIM on greyscale, downsized to 800px — enough to catch visible damage."""
    a = a.convert("L")
    b = b.convert("L").resize(a.size)
    a.thumbnail((800, 800))
    b = b.resize(a.size)
    blur = ImageFilter.GaussianBlur(1.5)
    ma, mb = ImageStat.Stat(a.filter(blur)).mean[0], ImageStat.Stat(b.filter(blur)).mean[0]
    va, vb = ImageStat.Stat(a).var[0], ImageStat.Stat(b).var[0]
    pa, pb = a.tobytes(), b.tobytes()
    n = len(pa)
    cov = sum((x - ma) * (y - mb) for x, y in zip(pa, pb)) / n
    c1, c2 = (0.01 * 255) ** 2, (0.03 * 255) ** 2
    return ((2 * ma * mb + c1) * (2 * cov + c2)) / ((ma * ma + mb * mb + c1) * (va + vb + c2))


before = after = changed = 0
for dirpath, _, files in os.walk(ROOT):
    for f in files:
        if not f.endswith(".webp"):
            continue
        p = os.path.join(dirpath, f)
        size = os.path.getsize(p)
        before += size
        if size < MIN_KB * 1024:
            after += size
            continue
        im = Image.open(p)
        im.load()
        cap = 2000 if ("lifestyle" in p or "scenic" in p) else 1600
        out = im.convert("RGB") if im.mode not in ("RGB", "RGBA") else im.copy()
        if max(out.size) > cap:
            out.thumbnail((cap, cap), Image.LANCZOS)
        buf = io.BytesIO()
        out.save(buf, "WEBP", quality=82, method=6)
        new = buf.tell()
        ok = new <= size * 0.85
        score = ssim(im, Image.open(io.BytesIO(buf.getvalue()))) if ok else 0
        if ok and score >= 0.97:
            changed += 1
            after += new
            print(f"{os.path.relpath(p, ROOT)}: {size // 1024} -> {new // 1024} KB  ssim {score:.3f}")
            if WRITE:
                with open(p, "wb") as fh:
                    fh.write(buf.getvalue())
        else:
            after += size

print(f"\n{changed} files {'re-encoded' if WRITE else 'would change'}: {before / 1e6:.1f} MB -> {after / 1e6:.1f} MB")
