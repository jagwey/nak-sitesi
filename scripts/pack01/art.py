"""Original layered vector artwork for Pack 1 (units: mm, y down, authored near L size).

Painter model: items are listed back to front as (colour, geometry, outline?). Visible parts become
colour layers; outlined shapes get a navy contour (satin) on top, cini/tezhip style.
"""
import math
import numpy as np
from shapely.geometry import Polygon, LineString, Point
from shapely.ops import unary_union
from shapely import affinity

NAVY = (27, 48, 92); RED = (192, 40, 45); DRED = (128, 24, 38); CORAL = (226, 100, 78)
GOLD = (212, 168, 76); TEAL = (30, 142, 150); GRN = (68, 112, 64); CREAM = (240, 226, 196)
ORDER = [("Krem", CREAM, 45), ("Turkuaz", TEAL, 60), ("Yesil", GRN, 100), ("Koyu kirmizi", DRED, 80),
         ("Kirmizi", RED, 45), ("Mercan", CORAL, 120), ("Altin", GOLD, 20), ("Lacivert kontur", NAVY, 0)]
KEYS = {"cream": 0, "teal": 1, "grn": 2, "dred": 3, "red": 4, "coral": 5, "gold": 6, "navy": 7}
OW = 1.7  # contour width


def bz3(p0, p1, p2, p3, n=60):
    t = np.linspace(0, 1, n)[:, None]
    p0, p1, p2, p3 = (np.array(p, float) for p in (p0, p1, p2, p3))
    return (1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t ** 2 * p2 + t ** 3 * p3


def bez(p0, p1, p2, n=60):
    return bz3(p0, (np.array(p0) + 2 * np.array(p1)) / 3, (np.array(p2) + 2 * np.array(p1)) / 3, p2, n)


def line(p0, p1, n=30):
    return np.linspace(p0, p1, n)


def blade(c, w, pw=0.7):
    c = np.asarray(c, float)
    n = len(c)
    t = np.linspace(0, 1, n)
    d = np.gradient(c, axis=0)
    d /= (np.hypot(d[:, 0], d[:, 1])[:, None] + 1e-9)
    nrm = np.stack([-d[:, 1], d[:, 0]], 1)
    hw = (w / 2 * np.sin(np.pi * t) ** pw)[:, None]
    return Polygon(np.vstack([c + nrm * hw, (c - nrm * hw)[::-1]])).buffer(0)


def stroke(pts, w):
    return LineString(np.asarray(pts, float)).buffer(w / 2, cap_style=1, join_style=1, resolution=12)


def circ(c, r):
    return Point(c).buffer(r, resolution=24)


def U(*g):
    return unary_union(list(g))


def rim(g, w=OW):
    return g.buffer(w / 2).difference(g.buffer(-w / 2))


def mirror(g):
    return affinity.scale(g, -1, 1, origin=(0, 0))


def spiral(c, r0, r1, a0, turns, n=70, sgn=1):
    a = np.linspace(0, turns * 2 * math.pi, n)
    r = np.linspace(r0, r1, n)
    return np.stack([c[0] + r * np.cos(a0 + sgn * a), c[1] + r * np.sin(a0 + sgn * a)], 1)


def fan(c, a0, a1, R, teeth, depth):
    pts = [tuple(c)]
    for i in range(2 * teeth + 1):
        ang = math.radians(a0 + (a1 - a0) * i / (2 * teeth))
        r = R if i % 2 == 0 else R - depth
        pts.append((c[0] + r * math.sin(ang), c[1] - r * math.cos(ang)))
    return Polygon(pts).buffer(-0.7).buffer(0.7)


def rosette(c, r, petals=8, pw=.6):
    ps = [blade(line(c, (c[0] + r * math.cos(2 * math.pi * k / petals), c[1] + r * math.sin(2 * math.pi * k / petals)), 24), r * 0.62, pw)
          for k in range(petals)]
    return U(*ps)


def hancer(curve, w):
    body = blade(curve, w, 0.62)
    mid = blade(np.asarray(curve)[3:-3], w * 0.36, 0.5)
    vein = stroke(np.asarray(curve)[2:-4], 1.2)
    return body, mid, vein


def paint(items, ow=OW):
    """items: (key, geom, outline) back to front -> list of layers."""
    vis = {k: [] for k in KEYS}
    for i, (k, g, o) in enumerate(items):
        later = unary_union([x[1] for x in items[i + 1:] if x[0] != "navy"] or [Point(1e6, 1e6).buffer(0.1)])
        if k == "navy":
            vis["navy"].append(g)
        else:
            vis[k].append(g.difference(later))
        if o:
            vis["navy"].append(rim(g, ow).difference(later))
    out = []
    for name, rgb, ang in ORDER:
        key = [k for k, v in KEYS.items() if ORDER[v][0] == name][0]
        if vis[key]:
            g = unary_union(vis[key])
            if not g.is_empty:
                out.append(dict(name=name, rgb=rgb, geom=g, angle=ang))
    return out


def Ls(*a, **k):
    return dict(name=a[0], rgb=a[1], geom=a[2], angle=a[3] if len(a) > 3 else 45)


def stack(layers):
    out = []
    for i, l in enumerate(layers):
        g = l["geom"]
        if i < len(layers) - 1:
            g = g.difference(unary_union([m["geom"] for m in layers[i + 1:]]))
        out.append({**l, "geom": g.buffer(-0.05).buffer(0.05)})
    return out


def tulip(s=1.0, dx=0.0, dy=0.0, flip=False):
    """Ottoman tulip; base at (0,0), tip near (0,-100*s). Returns painter items."""
    L = blade(bz3((0, -8), (-36, -10), (-34, -54), (-31, -86)), 28, .55)
    R = mirror(L)
    C = blade(line((0, -6), (0, -102), 60), 27, .6)
    Li = blade(bz3((0, -16), (-27, -17), (-26, -52), (-24, -76)), 9, .55)
    Ri = mirror(Li)
    Gi = blade(line((0, -16), (0, -72), 40), 7, .55)
    cal = blade(bz3((-21, -3), (-9, 9), (9, 9), (21, -3)), 9, .5)
    dots = U(circ((0, -82), 2.0))
    veinL = stroke(bz3((0, -20), (-18, -24), (-19, -54), (-17, -80)), 1.1)
    items = [("red", L, True), ("red", R, True), ("coral", C, True), ("dred", Li, False), ("dred", Ri, False),
             ("gold", Gi, True), ("gold", cal, True)]
    out = []
    for k, g, o in items:
        g = affinity.scale(g, s, s, origin=(0, 0))
        if flip:
            g = affinity.scale(g, 1, -1, origin=(0, 0))
        out.append((k, affinity.translate(g, dx, dy), o))
    return out


def lale():
    stem = stroke(bez((0, 130), (3, 112), (0, 92)), 4.2)
    leaves = []
    for sg, ln in ((1, 1.0), (-1, 0.9)):
        cv = bz3((0, 122), (sg * 36 * ln, 118), (sg * 62 * ln, 86), (sg * 56 * ln, 30 + 8 * (1 - ln) * 10))
        leaves.append(hancer(cv, 17))
    items = []
    for b, m, v in leaves:
        items += [("teal", b, True), ("grn", m, False), ("navy", v, False)]
    items.append(("grn", stem, True))
    items += tulip(1.0, 0, 92)
    # side tendrils and rosettes
    for sg in (1, -1):
        sp = spiral((sg * 44, 104), 1.5, 9.5, math.pi if sg > 0 else 0, 1.7, sgn=sg)
        items.append(("navy", stroke(sp, 1.8), False))
        items.append(("gold", circ((sg * 44, 104), 3.4), True))
    return paint(items)


def karanfil():
    items = []
    stem = stroke(bez((0, 134), (-2, 118), (0, 96)), 4.2)
    for sg in (1, -1):
        cv = bz3((0, 124), (sg * 34, 122), (sg * 56, 92), (sg * 52, 52))
        b, m, v = hancer(cv, 15)
        items += [("teal", b, True), ("grn", m, False), ("navy", v, False)]
    items.append(("grn", stem, True))
    # side bud
    br = stroke(bz3((0, 110), (14, 104), (30, 106), (40, 92)), 2.8)
    items.append(("grn", br, True))
    bud = affinity.translate(fan((0, 0), -50, 50, 17, 3, 4), 40, 92)
    items += [("dred", bud, True), ("coral", affinity.translate(fan((0, 0), -28, 28, 10, 2, 3), 40, 92), True)]
    # head: three serrated fans
    c = (0, 72)
    items += [("dred", fan(c, -66, 66, 62, 11, 7), True), ("red", fan(c, -52, 52, 51, 9, 6), True),
              ("coral", fan(c, -34, 34, 40, 5, 5), True)]
    for a in (-40, -20, 0, 20, 40):
        r = math.radians(a)
        items.append(("navy", stroke(line((c[0] + 8 * math.sin(r), c[1] - 8 * math.cos(r)), (c[0] + 40 * math.sin(r), c[1] - 40 * math.cos(r))), 1.2), False))
    cal = U(blade(line((0, 92), (0, 62)), 15, .55), blade(line((0, 84), (-12, 66)), 9, .5), blade(line((0, 84), (12, 66)), 9, .5))
    items.append(("gold", cal, True))
    for sg in (1, -1):
        items.append(("navy", stroke(spiral((sg * 30, 118), 1.2, 7.5, 0, 1.6, sgn=sg), 1.7), False))
    return paint(items)


def nar():
    items = []
    for sg in (1, -1):
        cv = bz3((sg * 8, 62), (sg * 30, 44), (sg * 52, 46), (sg * 62, 66))
        b, m, v = hancer(cv, 15)
        items += [("teal", b, True), ("grn", m, False), ("navy", v, False)]
    body = U(circ((0, 90), 42), blade(line((0, 50), (0, 100)), 60, .35).intersection(circ((0, 90), 55)))
    body = body.intersection(Polygon([(-60, 50), (60, 50), (60, 140), (-60, 140)]))
    items.append(("red", body, True))
    shade = body.difference(affinity.translate(body, -9, -7))
    items.append(("dred", shade.buffer(-0.3).buffer(0.3), False))
    # crown (calyx)
    crown = []
    for ang, ln in ((-72, 20), (-40, 27), (0, 31), (40, 27), (72, 20)):
        r = math.radians(ang)
        tip = (ln * math.sin(r) * 1.0, 52 - ln * math.cos(r))
        crown.append(blade(bez((0, 54), (tip[0] * 0.2, 54 - ln * 0.7), tip), 8.5, .7))
    ring = affinity.scale(circ((0, 53), 9), 1.0, 0.6, origin=(0, 53))
    items.append(("gold", U(*crown, ring), True))
    # cleft with arils
    cleft = affinity.scale(circ((0, 94), 25), 1.0, 0.95, origin=(0, 94)).intersection(Polygon([(-40, 82), (40, 82), (40, 130), (-40, 130)])).union(
        blade(line((0, 70), (0, 100)), 36, .5))
    cleft = cleft.intersection(circ((0, 90), 38))
    items.append(("gold", cleft.buffer(3.4), True))
    items.append(("cream", cleft, True))
    seeds = []
    for row, y in enumerate((80, 89, 98, 107, 115)):
        n = (3, 4, 5, 4, 3)[row]
        for k in range(n):
            x = (k - (n - 1) / 2) * 9.4
            p = Point(x, y)
            if cleft.buffer(-4.5).contains(p):
                seeds.append(circ((x, y), 4.0))
    for sd in seeds:
        items.append(("red", sd, True))
    items += [("gold", U(*[circ((s.centroid.x - 1.3, s.centroid.y - 1.3), 1.0) for s in seeds]), False)]
    return paint(items)


def hatayi_kose():
    items = []
    # vine arm
    cv = bz3((20, 20), (54, 2), (84, 44), (122, 26))
    vine = stroke(cv, 3.4)
    arm = [("navy", vine, False)]
    for i, t in enumerate((0.22, 0.42, 0.62, 0.8)):
        k = int(t * (len(cv) - 1)); p = cv[k]; d = cv[min(k + 1, len(cv) - 1)] - cv[k - 1]
        d /= np.hypot(*d); nr = np.array([-d[1], d[0]]) * (1 if i % 2 == 0 else -1)
        tip = p + nr * 22 + d * 8
        b, m, v = hancer(bez(p, p + nr * 12 + d * 2, tip, 30), 10.5)
        arm = [("teal", b, True), ("grn", m, False), ("navy", v, False)] + arm
    arm += [("red", rosette((72, 30), 11, 8), True), ("coral", rosette((72, 30), 6.5, 8), True), ("gold", circ((72, 30), 2.8), True),
            ("red", rosette((112, 18), 8, 6), True), ("gold", circ((112, 18), 2.2), True),
            ("navy", stroke(spiral((124, 40), 1.4, 11, -math.pi / 2, 1.9, sgn=1), 3.0), False),
            ("gold", circ((124, 40), 3.6), True)]
    # corner palmette
    pal = []
    for off, ln in zip((-76, -38, 0, 38, 76), (36, 48, 56, 48, 36)):
        r = math.radians(45 + off)
        tip = (6 + ln * math.cos(r), 6 + ln * math.sin(r))
        pal.append(blade(line((6, 6), tip), 10, .6))
    pal_items = [("gold", g, True) for g in pal]
    for off, ln in zip((-76, -38, 0, 38, 76), (36, 48, 56, 48, 36)):
        r = math.radians(45 + off)
        pal_items.append(("coral", blade(line((14, 14), (6 + 0.75 * ln * math.cos(r), 6 + 0.75 * ln * math.sin(r))), 5, .55), False))
        pass  # ("red", blade(line((12, 12), (6 + 0.5 * ln * math.cos(r), 6 + 0.5 * ln * math.sin(r))), 3.4, .55), False))
    pal_items.append(("dred", circ((8, 8), 7), True))
    sw = [0, 1, 1, 0, 0, 0]
    for k, g, o in arm + pal_items:
        items.append((k, g, o))
    for k, g, o in arm + pal_items:
        items.append((k, affinity.affine_transform(g, sw), o))
    # order: navy lines last are handled by paint()
    return paint(items)


def bordur(n=5, unit=38.0):
    items = []
    xs = np.linspace(0, n * unit, 500)
    vine = stroke(np.stack([xs, 4.5 * np.sin(2 * np.pi * xs / unit)], 1), 2.6)
    items.append(("grn", vine, True))
    for k in range(n):
        xu = (k + .75) * unit; xd = (k + .25) * unit
        yu = 4.5 * math.sin(2 * math.pi * xu / unit); yd = 4.5 * math.sin(2 * math.pi * xd / unit)
        items += tulip(0.34, xu, yu)
        for sg in (1, -1):
            b, m, v = hancer(bez((xd, yd), (xd + sg * 14, yd + 2), (xd + sg * 20, yd + 22), 30), 10)
            items += [("teal", b, True), ("grn", m, False)]
        items.append(("coral", circ((xd, yd + 31), 3.0), True))
        items.append(("gold", circ((xd, yd), 2.8), True))
        # small leaves tucked beside tulip base
        for sg in (1, -1):
            b, m, v = hancer(bez((xu, yu - 2), (xu + sg * 8, yu - 6), (xu + sg * 14, yu - 14), 24), 5.5)
            items += [("teal", b, False)]
    return paint(items)


def monogram():
    rx, ry = 50.0, 56.0
    pts = [(rx * math.cos(a), ry * math.sin(a)) for a in np.linspace(0, 2 * math.pi, 300)]
    ring = stroke(pts, 3.2)
    ring2 = stroke([(x * 0.86, y * 0.86) for x, y in pts], 1.2)
    items = [("gold", ring, True)]
    for side in (1, -1):
        for k, a in enumerate(np.radians(np.arange(78, -76, -20.0))):
            P = np.array([rx * math.cos(a), ry * math.sin(a)])
            tg = np.array([rx * math.sin(a), -ry * math.cos(a)]); tg /= np.hypot(*tg)
            nm = np.array([ry * math.cos(a), rx * math.sin(a)]); nm /= np.hypot(*nm)
            s = 1 if k % 2 == 0 else -1
            q = [P - s * nm * 1.5, P + s * nm * 11 + tg * 8, P + s * nm * 20 + tg * 22]
            if side == -1:
                q = [(-x, y) for x, y in q]
            cvv = bez(q[0], q[1], q[2], 28)
            items += [("teal", blade(cvv, 13, .6), True), ("grn", blade(cvv[2:-3], 4.6, .5), False)]
            if k % 2 == 0:
                b = P + nm * 12 - tg * 12
                items.append(("coral", circ((side * b[0], b[1]), 3.4), True))
    items += tulip(0.52, 0, -ry - 2)
    for sg in (1, -1):
        sp = spiral((sg * 20, -ry - 2), 1.2, 7, math.pi if sg > 0 else 0, 1.6, sgn=sg)
        items.append(("navy", stroke(sp, 1.7), False))
    bow = U(blade(bez((0, ry), (-14, ry + 8), (-30, ry + 2)), 9, .5), blade(bez((0, ry), (14, ry + 8), (30, ry + 2)), 9, .5))
    items += [("red", bow, True), ("gold", circ((0, ry), 4.4), True)]
    return paint(items)


DESIGNS = {
    "lale": dict(fn=lale, title="Lale", fit="h", S=96, L=124),
    "karanfil": dict(fn=karanfil, title="Karanfil", fit="h", S=96, L=124),
    "nar": dict(fn=nar, title="Nar", fit="h", S=96, L=124),
    "hatayi-kose": dict(fn=hatayi_kose, title="Hatayi Kose Motifi", fit="w", S=100, L=120),
    "bordur": dict(fn=bordur, title="Lale Bordur", fit="w", S=100, L=170),
    "monogram-cerceve": dict(fn=monogram, title="Monogram Cerceve", fit="h", S=96, L=124),
}
