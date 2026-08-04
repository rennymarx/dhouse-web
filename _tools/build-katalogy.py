#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build-katalogy.py -- pipeline pro katalogy SACHSENKUECHEN na dhouse.cz

Stahne PDF katalogy od vyrobce, overi jejich integritu, vyrenderuje stranky
do WebP (dve sirky) a zapise metadata pro listovaci prohlizec na /galerie.

Princip je stejny jako u vyrobce (1000 ePaper CMS): PDF se v prohlizeci
NERENDERUJE. Listuje se predrenderovanymi obrazky, plne PDF je jen ke stazeni.
Diky tomu je listovani rychle i na mobilu.

Pouziti:
    python _tools/build-katalogy.py                 # vse (cache: preskoci hotove)
    python _tools/build-katalogy.py --only <slug>
    python _tools/build-katalogy.py --force         # ignoruj cache, prerenderuj
    python _tools/build-katalogy.py --probe         # jen stahni a zmer, nerenderuj

Zavislosti (uz nainstalovane): pypdfium2 (render, BSD), pillow (WebP), pypdf (kontrola).

POZOR: konzolovy vystup je zamerne ASCII-only -- Windows konzole je cp1250
a diakritika by shodila skript na UnicodeEncodeError. Soubory se zapisuji UTF-8.
"""

import argparse
import hashlib
import io
import json
import os
import shutil
import sys
import urllib.request

import pypdfium2 as pdfium
from PIL import Image
from pypdf import PdfReader

# ---------------------------------------------------------------- konfigurace

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "assets", "katalogy")
CACHE_DIR = os.path.join(ROOT, "_tools", "_cache", "katalogy")

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0 Safari/537.36")

# Sirky pro cteni. 1400 pokryje A4 fit-to-height na 1080p pri DPR2
# i telefon 390 CSS px pri DPR3. 800 je mobil/pomale pripojeni.
TIERS = [(1400, 78), (800, 74)]
COVER = (900, 82)

BUDGET_MB = 60          # tvrdy strop pro vystupni obrazky, jinak abort

CATALOGS = [
    {
        "slug": "look-book-no-1",
        "title": "Look Book No. 1",
        "lang": "de",
        "lang_label": "nemecky",
        "kicker": "Hlavni katalog",
        "url": "https://epaper.sachsenkuechen.de/look-book-no-1/epaper/SK_LookBook_No1.pdf",
        "expect_bytes": 19892262,
        "expect_pages": 96,
    },
    {
        "slug": "news-features-2026",
        "title": "News & Features 2026",
        "lang": "en",
        "lang_label": "anglicky",
        "kicker": "Novinky sezony",
        "url": "https://epaper.sachsenkuechen.de/news-features-2026-EN/epaper/SK_News_Features_2026_EN.pdf",
        "expect_bytes": 15338224,
        "expect_pages": None,      # neznamy, skript zmeri
    },
]


def log(msg):
    """ASCII-only vypis (Windows cp1250 konzole)."""
    try:
        print(msg, flush=True)
    except UnicodeEncodeError:
        print(msg.encode("ascii", "replace").decode("ascii"), flush=True)


def mb(n):
    return "%.1f MB" % (n / 1048576.0)


# ------------------------------------------------------------------- stahovani

def http(url, headers=None):
    h = {"User-Agent": UA}
    if headers:
        h.update(headers)
    return urllib.request.Request(url, headers=h)


def preflight(url):
    """Levna kontrola pred stazenim 20 MB: hlavicky + prvni a posledni bajty.

    Uriznute PDF se takhle odhali za 2 kB misto za cely soubor. Repo si tenhle
    problem uz jednou vytrpelo u archivnich PDF z Wayback.
    """
    with urllib.request.urlopen(http(url), timeout=60) as r:
        ctype = r.headers.get("Content-Type", "")
        clen = int(r.headers.get("Content-Length") or 0)
        lastmod = r.headers.get("Last-Modified", "")
    if "pdf" not in ctype.lower():
        raise RuntimeError("neni PDF, Content-Type=%s" % ctype)
    if clen < 1048576:
        raise RuntimeError("podezrele maly soubor: %d B" % clen)

    with urllib.request.urlopen(http(url, {"Range": "bytes=0-15"}), timeout=60) as r:
        head = r.read()
    if not head.startswith(b"%PDF-"):
        raise RuntimeError("nezacina %%PDF- (dostal jsem %r)" % head[:8])

    with urllib.request.urlopen(http(url, {"Range": "bytes=-2048"}), timeout=60) as r:
        tail = r.read()
    if b"%%EOF" not in tail:
        raise RuntimeError("v poslednich 2 kB neni %%EOF -- soubor je uriznuty")

    return clen, lastmod


def download(url, dest, expect_bytes):
    tmp = dest + ".part"
    sha = hashlib.sha256()
    total = 0
    with urllib.request.urlopen(http(url), timeout=300) as r, open(tmp, "wb") as f:
        while True:
            chunk = r.read(262144)
            if not chunk:
                break
            f.write(chunk)
            sha.update(chunk)
            total += len(chunk)
    if expect_bytes and total != expect_bytes:
        os.remove(tmp)
        raise RuntimeError("velikost nesedi: %d != ocekavanych %d" % (total, expect_bytes))
    with open(tmp, "rb") as f:
        if f.read(5) != b"%PDF-":
            os.remove(tmp)
            raise RuntimeError("stazeny soubor nezacina %%PDF-")
        f.seek(max(0, total - 2048))
        if b"%%EOF" not in f.read():
            os.remove(tmp)
            raise RuntimeError("stazeny soubor nema %%EOF")
    os.replace(tmp, dest)          # atomicky -- v cache nikdy nelezi polovicaty soubor
    return total, sha.hexdigest()


def sha256_of(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(262144), b""):
            h.update(chunk)
    return h.hexdigest()


# ---------------------------------------------------------------------- render

def render_catalog(cat, pdf_path, out_dir, probe=False):
    doc = pdfium.PdfDocument(pdf_path)
    n = len(doc)
    if n < 1:
        raise RuntimeError("PDF nema zadne stranky")
    if cat["expect_pages"] and n != cat["expect_pages"]:
        log("    UPOZORNENI: stran %d, ocekavano %d" % (n, cat["expect_pages"]))

    p0 = doc[0]
    w0, h0 = p0.get_size()
    ratio = round(w0 / h0, 4)

    # nekonzistentni pomer stran by rozbil layout prohlizece
    odd = []
    for i in range(n):
        pw, ph = doc[i].get_size()
        if abs((pw / ph) - ratio) > 0.02:
            odd.append(i + 1)
    if odd:
        log("    UPOZORNENI: jiny pomer stran u stran %s" % odd[:10])

    log("    stran: %d | pomer %.4f (%.0fx%.0f pt)" % (n, ratio, w0, h0))
    if probe:
        return None

    pages = []
    written = 0
    max_w = TIERS[0][0]

    for i in range(n):
        page = doc[i]
        pw, _ = page.get_size()
        scale = max_w / pw
        pil = page.render(scale=scale, may_draw_forms=False).to_pil().convert("RGB")

        for width, q in TIERS:
            if width == max_w:
                img = pil
            else:
                h = int(round(pil.height * width / pil.width))
                img = pil.resize((width, h), Image.LANCZOS)
            path = os.path.join(out_dir, "strana-%03d-%d.webp" % (i + 1, width))
            img.save(path, "WEBP", quality=q, method=6)
            written += os.path.getsize(path)

        if i == 0:
            ch = int(round(pil.height * COVER[0] / pil.width))
            pil.resize((COVER[0], ch), Image.LANCZOS).save(
                os.path.join(out_dir, "obalka.webp"), "WEBP", quality=COVER[1], method=6)
            written += os.path.getsize(os.path.join(out_dir, "obalka.webp"))

        pages.append({"n": i + 1, "w": max_w, "h": pil.height})

        if written > BUDGET_MB * 1048576:
            raise RuntimeError("prekrocen rozpocet %d MB u strany %d" % (BUDGET_MB, i + 1))
        if (i + 1) % 10 == 0 or i + 1 == n:
            log("    ... %d/%d stran (%s)" % (i + 1, n, mb(written)))

    # kontrola, ze posledni stranky nejsou prazdne (typicky priznak uriznuti)
    for probe_i in (0, n // 2, n - 1):
        chk = os.path.join(out_dir, "strana-%03d-%d.webp" % (probe_i + 1, TIERS[-1][0]))
        with Image.open(chk) as im:
            lo, hi = im.convert("L").getextrema()
        if lo == hi:
            log("    UPOZORNENI: strana %d je jednolita (prazdna?)" % (probe_i + 1))

    return {"pages": pages, "count": n, "ratio": ratio, "bytes": written}


# ------------------------------------------------------------------------ main

def process(cat, force=False, probe=False):
    slug = cat["slug"]
    log("[%s] %s" % (slug, cat["title"]))

    out_dir = os.path.join(OUT_DIR, slug)
    os.makedirs(out_dir, exist_ok=True)
    os.makedirs(CACHE_DIR, exist_ok=True)
    cache_pdf = os.path.join(CACHE_DIR, slug + ".pdf")

    log("    preflight...")
    clen, lastmod = preflight(cat["url"])
    log("    zdroj OK: %s, Last-Modified: %s" % (mb(clen), lastmod or "?"))

    if os.path.exists(cache_pdf) and not force:
        size = os.path.getsize(cache_pdf)
        if size == clen:
            log("    PDF uz je v cache (%s), nestahuji" % mb(size))
            digest = sha256_of(cache_pdf)
        else:
            log("    cache ma jinou velikost, stahuji znovu")
            size, digest = download(cat["url"], cache_pdf, clen)
    else:
        log("    stahuji %s ..." % mb(clen))
        size, digest = download(cat["url"], cache_pdf, clen)
    log("    sha256: %s" % digest[:16])

    # druhy, nezavisly parser jako kontrola (jine slabiny nez pdfium)
    try:
        n_pypdf = len(PdfReader(cache_pdf, strict=False).pages)
        log("    pypdf hlasi stran: %d" % n_pypdf)
    except Exception as exc:
        raise RuntimeError("pypdf nedokazal PDF precist: %s" % exc)

    # cache renderu podle hashe zdroje
    meta_path = os.path.join(out_dir, "meta.json")
    if os.path.exists(meta_path) and not force and not probe:
        with open(meta_path, encoding="utf-8") as f:
            old = json.load(f)
        if old.get("source", {}).get("sha256") == digest:
            log("    render je aktualni (shodny sha256), preskakuji")
            return old

    log("    renderuji...")
    res = render_catalog(cat, cache_pdf, out_dir, probe=probe)
    if probe:
        return None

    # plne PDF ke stazeni vedle obrazku
    pdf_out = os.path.join(out_dir, slug + ".pdf")
    shutil.copyfile(cache_pdf, pdf_out)

    meta = {
        "slug": slug,
        "title": cat["title"],
        "kicker": cat["kicker"],
        "lang": cat["lang"],
        "langLabel": cat["lang_label"],
        "pageCount": res["count"],
        "pageRatio": res["ratio"],
        "widths": [w for w, _ in TIERS],
        "pattern": "/assets/katalogy/%s/strana-{n}-{w}.webp" % slug,
        "cover": "/assets/katalogy/%s/obalka.webp" % slug,
        "pdf": {
            "url": "/assets/katalogy/%s/%s.pdf" % (slug, slug),
            "bytes": size,
            "sizeLabel": mb(size).replace(".", ","),
        },
        "source": {"url": cat["url"], "sha256": digest, "lastModified": lastmod},
        "imageBytes": res["bytes"],
        "pages": res["pages"],
    }
    with open(meta_path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    log("    hotovo: %d stran, obrazky %s, PDF %s" % (res["count"], mb(res["bytes"]), mb(size)))
    return meta


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--probe", action="store_true")
    args = ap.parse_args()

    todo = [c for c in CATALOGS if not args.only or c["slug"] == args.only]
    if not todo:
        log("CHYBA: slug '%s' neznam" % args.only)
        return 1

    metas = []
    for cat in todo:
        try:
            m = process(cat, force=args.force, probe=args.probe)
            if m:
                metas.append(m)
        except Exception as exc:
            log("CHYBA [%s]: %s" % (cat["slug"], exc))
            return 1
        log("")

    if args.probe:
        return 0

    # rozcestnik pro frontend (jen kdyz jsme delali vsechny)
    if not args.only:
        index = {"catalogs": [{
            "slug": m["slug"], "title": m["title"], "kicker": m["kicker"],
            "lang": m["lang"], "langLabel": m["langLabel"],
            "pageCount": m["pageCount"], "pageRatio": m["pageRatio"],
            "cover": m["cover"], "pdf": m["pdf"],
        } for m in metas]}
        with open(os.path.join(OUT_DIR, "index.json"), "w", encoding="utf-8", newline="\n") as f:
            json.dump(index, f, ensure_ascii=False, indent=2)

    total = sum(m["imageBytes"] for m in metas)
    pdfs = sum(m["pdf"]["bytes"] for m in metas)
    log("=" * 60)
    log("HOTOVO. Obrazky celkem: %s, PDF celkem: %s" % (mb(total), mb(pdfs)))
    for m in metas:
        log("  %-22s %3d stran  %10s" % (m["slug"], m["pageCount"], mb(m["imageBytes"])))
    log("")
    log("DALSI KROKY:")
    log("  1) powershell -NoProfile -ExecutionPolicy Bypass -File _launch.ps1")
    log("  2) git add assets/katalogy")
    log("  3) git add -f _deploy/prod     <-- BEZ -f se prod NEPRIDA (je v .gitignore)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
