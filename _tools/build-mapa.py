#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build-mapa.py -- staticky obrazek mapy atelieru pro /atelier

Proc staticky obrazek misto vlozene mapy: mapy.com pri nacteni BEZ cookies
presmeruje pres login.seznam.cz, ktery vraci X-Frame-Options: DENY. Novy
navstevnik proto videl rozbity ramecek, vraceny navstevnik mapu videl.
Staticky obrazek tenhle problem obchazi uplne.

Sklada dlazdice OpenStreetMap (licence ODbL, atribuce je vypalena do obrazku).

Pouziti:
    python _tools/build-mapa.py
"""

import io
import math
import os
import sys
import time
import urllib.request

from PIL import Image, ImageDraw, ImageFont

LAT, LON = 50.0697802, 14.4597550     # Nam. Svatopluka Cecha 1350/5, Praha 10
ZOOM = 17
OUT_W, OUT_H = 1280, 960              # 4:3 -- kontejner .atelier-block__map
TILE = 256

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "mapa-atelier.jpg")

# OSM vyzaduje identifikujici User-Agent
UA = "dhouse.cz-map-builder/1.0 (+https://www.dhouse.cz; kontakt team@rennymarx.com)"

INK = (22, 21, 18)
BRASS = (138, 106, 59)
PAPER = (245, 243, 238)


def deg2num(lat, lon, z):
    n = 2.0 ** z
    x = (lon + 180.0) / 360.0 * n
    lat_r = math.radians(lat)
    y = (1.0 - math.asinh(math.tan(lat_r)) / math.pi) / 2.0 * n
    return x, y


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def main():
    cx, cy = deg2num(LAT, LON, ZOOM)
    # levy horni roh vyrezu v pixelech globalni mapy
    px0 = cx * TILE - OUT_W / 2.0
    py0 = cy * TILE - OUT_H / 2.0
    tx0, ty0 = int(math.floor(px0 / TILE)), int(math.floor(py0 / TILE))
    tx1, ty1 = int(math.floor((px0 + OUT_W) / TILE)), int(math.floor((py0 + OUT_H) / TILE))

    cols, rows = tx1 - tx0 + 1, ty1 - ty0 + 1
    canvas = Image.new("RGB", (cols * TILE, rows * TILE), PAPER)
    total = cols * rows
    print("skladam %d dlazdic (%dx%d) na zoomu %d" % (total, cols, rows, ZOOM))

    done = 0
    for ty in range(ty0, ty1 + 1):
        for tx in range(tx0, tx1 + 1):
            url = "https://tile.openstreetmap.org/%d/%d/%d.png" % (ZOOM, tx, ty)
            try:
                img = Image.open(io.BytesIO(fetch(url))).convert("RGB")
            except Exception as exc:
                print("  CHYBA dlazdice %d/%d: %s" % (tx, ty, exc))
                return 1
            canvas.paste(img, ((tx - tx0) * TILE, (ty - ty0) * TILE))
            done += 1
            if done % 8 == 0 or done == total:
                print("  ... %d/%d" % (done, total))
            time.sleep(0.12)          # ohleduplnost k OSM serverum

    # vyriznout presny 4:3 vyrez okolo adresy
    ox = int(round(px0 - tx0 * TILE))
    oy = int(round(py0 - ty0 * TILE))
    im = canvas.crop((ox, oy, ox + OUT_W, oy + OUT_H))

    d = ImageDraw.Draw(im, "RGBA")
    mx, my = OUT_W // 2, OUT_H // 2

    # jemny mosazny kruh mistoduraznou spicku - drzi znackovy vzhled
    d.ellipse([mx - 46, my - 46, mx + 46, my + 46], fill=(138, 106, 59, 38))
    d.ellipse([mx - 15, my - 15, mx + 15, my + 15], fill=BRASS + (255,), outline=PAPER + (255,), width=4)
    d.ellipse([mx - 5, my - 5, mx + 5, my + 5], fill=PAPER + (255,))

    # atribuce OSM (licencni povinnost) + popisek adresy
    try:
        f_small = ImageFont.truetype("segoeui.ttf", 19)
        f_label = ImageFont.truetype("segoeuisl.ttf", 27)
    except Exception:
        f_small = ImageFont.load_default()
        f_label = f_small

    txt = "(c) OpenStreetMap contributors"
    tb = d.textbbox((0, 0), txt, font=f_small)
    tw, th = tb[2] - tb[0], tb[3] - tb[1]
    d.rectangle([OUT_W - tw - 20, OUT_H - th - 18, OUT_W, OUT_H], fill=(245, 243, 238, 205))
    d.text((OUT_W - tw - 10, OUT_H - th - 12), txt, font=f_small, fill=(90, 86, 78))

    lab = "atelier dhouse"
    lb = d.textbbox((0, 0), lab, font=f_label)
    lw, lh = lb[2] - lb[0], lb[3] - lb[1]
    d.rectangle([mx - lw // 2 - 16, my + 30, mx + lw // 2 + 16, my + 30 + lh + 20],
                fill=(245, 243, 238, 232))
    d.text((mx - lw // 2, my + 39), lab, font=f_label, fill=INK)

    im.save(OUT, "JPEG", quality=86, optimize=True, progressive=True)
    print("hotovo: %s (%dx%d, %.0f kB)" % (OUT, OUT_W, OUT_H, os.path.getsize(OUT) / 1024.0))
    return 0


if __name__ == "__main__":
    sys.exit(main())
