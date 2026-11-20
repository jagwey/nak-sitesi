#!/usr/bin/env python3
"""Özgün monogram ve geometrik nakış dosyaları üretir.

Çıktı gerçek VP3/PES/DST/JEF dikişidir (pyembroidery). PNG/SVG uzantısı değiştirilmez.
Fiziksel kumaş provası yoktur; katalog kaydı satışa kapalı önizlemedir.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import pyembroidery
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "catalog" / "open-license"
PUBLIC = ROOT / "public" / "images" / "open-license"
MANIFEST = ROOT / "src" / "data" / "open-license-catalog.json"

# 5×7 özgün piksel harf. Her dolu hücre saten dolgu olur.
FONT = {
    "A": ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
    "B": ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
    "C": ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
    "D": ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
    "E": ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
    "F": ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
    "G": ["01111", "10000", "10000", "10011", "10001", "10001", "01111"],
    "H": ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
    "I": ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
    "J": ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
    "K": ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
    "L": ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
    "M": ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
    "N": ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
    "O": ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
    "P": ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
    "Q": ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
    "R": ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
    "S": ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
    "T": ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
    "U": ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
    "V": ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
    "W": ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
    "X": ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
    "Y": ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
    "Z": ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
}

CELL = 60  # 6.0 mm
GAP = 4
ROW_STEP = 8  # 0.8 mm saten aralığı


def new_pattern() -> pyembroidery.EmbPattern:
    pattern = pyembroidery.EmbPattern()
    pattern.add_thread({"color": 0x4A372C, "description": "Espresso"})
    return pattern


def fill_rect(pattern: pyembroidery.EmbPattern, x0: float, y0: float, x1: float, y1: float) -> None:
    if x1 < x0:
        x0, x1 = x1, x0
    if y1 < y0:
        y0, y1 = y1, y0
    pattern.add_stitch_absolute(pyembroidery.JUMP, x0, y0)
    y = y0
    left = True
    while y <= y1 + 0.1:
        if left:
            pattern.add_stitch_absolute(pyembroidery.STITCH, x0, y)
            pattern.add_stitch_absolute(pyembroidery.STITCH, x1, y)
        else:
            pattern.add_stitch_absolute(pyembroidery.STITCH, x1, y)
            pattern.add_stitch_absolute(pyembroidery.STITCH, x0, y)
        left = not left
        y += ROW_STEP


def letter_pattern(rows: list[str]) -> pyembroidery.EmbPattern:
    pattern = new_pattern()
    height = len(rows)
    for r, row in enumerate(rows):
        y1 = (height - r) * (CELL + GAP)
        y0 = y1 - CELL
        c = 0
        while c < len(row):
            if row[c] != "1":
                c += 1
                continue
            start = c
            while c < len(row) and row[c] == "1":
                c += 1
            x0 = start * (CELL + GAP)
            x1 = (c - 1) * (CELL + GAP) + CELL
            fill_rect(pattern, x0, y0, x1, y1)
    pattern.end()
    return pattern


def stroke(pattern: pyembroidery.EmbPattern, points: list[tuple[float, float]], half: float = 14) -> None:
    if len(points) < 2:
        return
    samples: list[tuple[float, float]] = []
    for (x0, y0), (x1, y1) in zip(points, points[1:]):
        dist = math.hypot(x1 - x0, y1 - y0)
        steps = max(1, int(dist / 18))
        for i in range(steps):
            t = i / steps
            samples.append((x0 + (x1 - x0) * t, y0 + (y1 - y0) * t))
    samples.append(points[-1])
    pattern.add_stitch_absolute(pyembroidery.JUMP, samples[0][0], samples[0][1])
    for x, y in samples:
        pattern.add_stitch_absolute(pyembroidery.STITCH, x, y)
    left = True
    for i in range(len(samples) - 1):
        x0, y0 = samples[i]
        x1, y1 = samples[i + 1]
        dx, dy = x1 - x0, y1 - y0
        length = math.hypot(dx, dy) or 1
        nx, ny = -dy / length * half, dx / length * half
        a = (x0 - nx, y0 - ny)
        b = (x0 + nx, y0 + ny)
        pattern.add_stitch_absolute(pyembroidery.STITCH, *(a if left else b))
        pattern.add_stitch_absolute(pyembroidery.STITCH, *(b if left else a))
        left = not left


def circle_points(cx: float, cy: float, r: float, n: int = 48) -> list[tuple[float, float]]:
    return [
        (cx + math.cos(math.tau * i / n) * r, cy + math.sin(math.tau * i / n) * r)
        for i in range(n + 1)
    ]


def motif_pattern(kind: str) -> pyembroidery.EmbPattern:
    pattern = new_pattern()
    if kind == "halk-rozet":
        stroke(pattern, circle_points(0, 0, 180), 16)
        for i in range(8):
            ang = math.tau * i / 8
            x = math.cos(ang) * 90
            y = math.sin(ang) * 90
            stroke(pattern, circle_points(x, y, 42), 12)
        stroke(pattern, circle_points(0, 0, 28), 10)
    elif kind == "geometrik-madalyon":
        diamond = [(0, 220), (220, 0), (0, -220), (-220, 0), (0, 220)]
        inner = [(0, 120), (120, 0), (0, -120), (-120, 0), (0, 120)]
        stroke(pattern, diamond, 16)
        stroke(pattern, inner, 12)
    elif kind == "defne-dal":
        stroke(pattern, [(-20, -200), (10, 200)], 10)
        stroke(pattern, [(-10, 40), (-110, 110), (-20, 20)], 12)
        stroke(pattern, [(0, -20), (120, 70), (10, -40)], 12)
        stroke(pattern, [(-16, 120), (-90, 180), (-8, 100)], 11)
    elif kind == "yildiz-cerceve":
        pts = []
        for i in range(12):
            ang = -math.pi / 2 + math.tau * i / 12
            radius = 200 if i % 2 == 0 else 80
            pts.append((math.cos(ang) * radius, math.sin(ang) * radius))
        pts.append(pts[0])
        stroke(pattern, pts, 12)
    elif kind == "halka-cift":
        stroke(pattern, circle_points(-70, 0, 110), 14)
        stroke(pattern, circle_points(70, 0, 110), 14)
    elif kind == "ucgen-kenar":
        for i in range(5):
            x = -200 + i * 100
            stroke(pattern, [(x, -40), (x + 50, 50), (x + 100, -40)], 12)
    else:
        raise ValueError(kind)
    pattern.end()
    return pattern


def measures(pattern: pyembroidery.EmbPattern) -> tuple[int, int, int]:
    min_x, min_y, max_x, max_y = pattern.bounds()
    width = max(1, round((max_x - min_x) / 10))
    height = max(1, round((max_y - min_y) / 10))
    stitches = sum(1 for stitch in pattern.stitches if stitch[2] == pyembroidery.STITCH)
    return width, height, stitches


def write_design(slug: str, pattern: pyembroidery.EmbPattern) -> dict[str, str]:
    folder = CATALOG / slug
    folder.mkdir(parents=True, exist_ok=True)
    PUBLIC.mkdir(parents=True, exist_ok=True)
    paths = {
        "VP3": folder / f"{slug}.vp3",
        "PES": folder / f"{slug}.pes",
        "DST": folder / f"{slug}.dst",
        "JEF": folder / f"{slug}.jef",
    }
    pyembroidery.write_vp3(pattern, str(paths["VP3"]))
    pyembroidery.write_pes(pattern, str(paths["PES"]))
    pyembroidery.write_dst(pattern, str(paths["DST"]))
    pyembroidery.write_jef(pattern, str(paths["JEF"]))
    png = folder / f"{slug}.png"
    pyembroidery.write_png(pattern, str(png))
    image = Image.open(png).convert("RGBA")
    image.thumbnail((640, 640))
    webp = PUBLIC / f"{slug}.webp"
    image.save(webp, "WEBP", quality=78, method=6)
    png.unlink()
    return {fmt: str(path.relative_to(ROOT)) for fmt, path in paths.items()}


def entry(slug: str, name: str, summary: str, kind: str, pattern: pyembroidery.EmbPattern, letter: str | None = None) -> dict:
    width, height, stitches = measures(pattern)
    return {
        "slug": slug,
        "name": name,
        "summary": summary,
        "kind": kind,
        "letter": letter,
        "widthMm": width,
        "heightMm": height,
        "stitchCount": stitches,
        "formats": ["VP3", "PES", "DST", "JEF"],
        "files": write_design(slug, pattern),
        "preview": f"/images/open-license/{slug}.webp",
        "sourceName": "Özgün üretim — Nakış Sitesi",
        "license": "Özgün eser. Ticari kullanım ve yeniden satış hakları mağaza sahibine aittir.",
        "licenseId": "original-commercial",
        "commercialUse": True,
        "resaleAllowed": True,
        "saleStatus": "preview",
        "physicalProof": False,
        "note": "pyembroidery ile üretilen gerçek dikiş dosyası. Fiziksel kumaş provası yapılmadı. Satışa açılmadan önce dikiş kontrolü gerekir.",
    }


def main() -> None:
    designs = []
    for letter, rows in FONT.items():
        slug = f"monogram-{letter.lower()}"
        designs.append(
            entry(
                slug,
                f"Monogram {letter}",
                f"Özgün tek renk saten dolgulu {letter} harfi. Pfaff için VP3 dosyası önizlemedir.",
                "monogram",
                letter_pattern(rows),
                letter,
            )
        )
    motifs = [
        ("halk-rozet", "Halk çiçeği rozet", "Sekiz yapraklı özgün rozet. Marka veya karakter içermez.", "halk-rozet"),
        ("geometrik-madalyon", "Geometrik madalyon", "İç içe baklava madalyon. Özgün geometri.", "geometrik-madalyon"),
        ("defne-dal", "Defne dalı", "Kısa defne dalı. Belirli bir arma veya logo değildir.", "defne-dal"),
        ("yildiz-cerceve", "Yıldız çerçeve", "On iki köşeli çerçeve yıldız. Bayrak veya arma değildir.", "yildiz-cerceve"),
        ("halka-cift", "Çift halka", "İki kesişen halka. Marka işareti değildir.", "halka-cift"),
        ("ucgen-kenar", "Üçgen kenar suyu", "Beş üçgenden oluşan kısa kenar suyu.", "ucgen-kenar"),
    ]
    for slug, name, summary, kind in motifs:
        designs.append(entry(slug, name, summary, "motif", motif_pattern(kind)))
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(
        json.dumps(
            {
                "generator": "scripts/generate-open-license-catalog.py",
                "saleStatus": "preview",
                "designs": designs,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"{len(designs)} desen yazıldı")


if __name__ == "__main__":
    main()
