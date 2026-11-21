import sys, os, json
import numpy as np, cv2
from PIL import Image, ImageDraw
from shapely import affinity
from shapely.ops import unary_union
sys.path.insert(0, r"C:\Users\Osman\OneDrive\Belgeler\ChatGPT\Nakış desen üretimi\araç")
sys.path.insert(0, os.path.dirname(__file__))
from dig2 import build
import art
import pyembroidery as pe

OUT = sys.argv[1]
ONLY = sys.argv[2].split(",") if len(sys.argv) > 2 else list(art.DESIGNS)
MMPP = 0.07
FILLW = 2.6
STYLE = dict(fill_min_w=7.0, centre_smooth=1.0, satin_max_w=6.8, satin_step=0.35, run_max_w=0.55,
             fill_spacing=0.38, pull_fill=0.25, pull_satin=0.25)


def norm_layers(layers, size_mm, fit):
    allg = unary_union([l["geom"] for l in layers])
    x0, y0, x1, y1 = allg.bounds
    s = size_mm / ((y1 - y0) if fit == "h" else (x1 - x0))
    out = []
    for l in layers:
        g = affinity.scale(l["geom"], s, s, origin=(0, 0))
        out.append({**l, "geom": g})
    allg = unary_union([l["geom"] for l in out])
    x0, y0, x1, y1 = allg.bounds
    pad = 2.0
    out = [{**l, "geom": affinity.translate(l["geom"], -x0 + pad, -y0 + pad)} for l in out]
    return out, (x1 - x0 + 2 * pad, y1 - y0 + 2 * pad)


def raster(geom, W, H):
    im = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(im)
    for p in (geom.geoms if hasattr(geom, "geoms") else [geom]):
        if p.is_empty or p.geom_type != "Polygon":
            continue
        d.polygon([(x / MMPP, y / MMPP) for x, y in p.exterior.coords], fill=255)
        for h in p.interiors:
            d.polygon([(x / MMPP, y / MMPP) for x, y in h.coords], fill=0)
    return np.array(im) > 0


def make(key, tag, size):
    D = art.DESIGNS[key]
    art.MINW = 0.0
    layers = art.stack(D["fn"]())
    allg = unary_union([l["geom"] for l in layers])
    x0, y0, x1, y1 = allg.bounds
    s0 = size / ((y1 - y0) if D["fit"] == "h" else (x1 - x0))
    art.MINW = 1.0 / s0  # no stroked detail thinner than ~1.0 mm in the final size
    layers = art.stack(D["fn"]())
    layers, (wmm, hmm) = norm_layers(layers, size, D["fit"])
    W, H = int(wmm / MMPP) + 1, int(hmm / MMPP) + 1
    ls = []
    for l in layers:
        m = raster(l["geom"], W, H)
        ls.append(dict(name=l["name"], rgb=l["rgb"], mask=m, angle=l["angle"], parts=[(None, {} if l["name"].startswith("Lacivert") else {"fill_min_w": FILLW})]))
    path = os.path.join(OUT, f"{key}_{tag}.vp3")
    pat, st = build(ls, MMPP, path, STYLE)
    # preview mask (flat artwork) for the normal image
    flat = np.full((H, W, 3), 250, np.uint8)
    for l in ls:
        flat[l["mask"]] = l["rgb"]
    Image.fromarray(flat).save(os.path.join(OUT, f"{key}_{tag}_duz.png"))
    return path, st


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for k in ONLY:
        D = art.DESIGNS[k]
        for tag in ("S", "L"):
            p, st = make(k, tag, D[tag])
            print(k, tag, "ok")
