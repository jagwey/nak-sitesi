"""Original flat-colour vector artwork for Pack 1 (units: mm, y down, authored at L size)."""
import math
import numpy as np
from shapely.geometry import Polygon, LineString, Point
from shapely.ops import unary_union
from shapely import affinity

RED = (184, 32, 42); DRED = (122, 21, 35); GOLD = (201, 160, 72); GRN = (79, 107, 58); DGRN = (47, 74, 44)
NAVY = (31, 58, 95); TEAL = (42, 140, 140)


def bez(p0, p1, p2, n=48):
    t = np.linspace(0, 1, n)[:, None]
    return (1 - t) ** 2 * np.array(p0, float) + 2 * (1 - t) * t * np.array(p1, float) + t ** 2 * np.array(p2, float)


def blade(p0, p1, p2, w, pw=0.75, n=48):
    c = bez(p0, p1, p2, n)
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
    return unary_union([x for x in g])


def Ls(name, rgb, g, angle=45):
    return dict(name=name, rgb=rgb, geom=g, angle=angle)


def stack(layers):
    out = []
    for i, l in enumerate(layers):
        g = l["geom"]
        if i < len(layers) - 1:
            g = g.difference(unary_union([m["geom"] for m in layers[i + 1:]]))
        out.append({**l, "geom": g.buffer(-0.05).buffer(0.05)})
    return out


def rim(g, w=1.9):
    return g.buffer(w / 2).difference(g.buffer(-w / 2))


def leaf(p0, p1, p2, w):
    return blade(p0, p1, p2, w), blade(p0, p1, p2, 2.4, 0.35)


def lale():
    l1, m1 = leaf((0, 120), (-36, 112), (-44, 58), 17); l2, m2 = leaf((0, 106), (34, 98), (42, 52), 15)
    stem = stroke(bez((0, 126), (2, 104), (0, 88)), 3.6)
    cen = blade((0, 76), (0, 40), (0, 0), 28, 0.6)
    side = U(blade((0, 72), (-34, 62), (-23, 10), 24), blade((0, 72), (34, 62), (23, 10), 24)).difference(cen)
    gold = U(blade((-9, 66), (-18, 52), (-15, 28), 3.4, 0.5), blade((9, 66), (18, 52), (15, 28), 3.4, 0.5), circ((0, 80), 3.0))
    dgrn = U(stem, m1, m2, rim(U(l1, l2), 1.7))
    return [Ls("Yaprak yesil", GRN, U(l1, l2), 70), Ls("Kirmizi", RED, cen, 80), Ls("Koyu kirmizi", DRED, U(side, rim(cen, 1.9)), 100),
            Ls("Altin", GOLD, gold, 45), Ls("Koyu yesil", DGRN, dgrn, 70)]


def karanfil():
    stem = stroke(bez((0, 126), (-2, 106), (0, 90)), 3.6)
    l1, m1 = leaf((0, 112), (-34, 108), (-40, 66), 15); l2, m2 = leaf((0, 98), (32, 92), (38, 56), 14)
    calyx = blade((0, 88), (-7, 80), (0, 68), 11, 0.6)
    petals = []; veins = []
    for a, ln in zip([-62, -42, -21, 0, 21, 42, 62], [40, 46, 52, 56, 52, 46, 40]):
        r = math.radians(a - 90)
        tip = (ln * math.cos(r), 70 + ln * math.sin(r))
        mid = (0.5 * tip[0], 70 + (tip[1] - 70) * 0.55)
        petals.append(blade((0, 70), mid, tip, 17 + 4 * math.cos(math.radians(a)), 0.55))
        veins.append(blade((0, 68), (0.4 * tip[0], 70 + (tip[1] - 70) * 0.45), (tip[0] * 0.78, 70 + (tip[1] - 70) * 0.8), 3.2, 0.5))
    head = U(*petals)
    return [Ls("Yaprak yesil", GRN, U(l1, l2), 70), Ls("Kirmizi", RED, head, 90),
            Ls("Koyu kirmizi", DRED, U(*veins, rim(head, 1.8)), 90), Ls("Altin tac", GOLD, calyx, 0),
            Ls("Koyu yesil", DGRN, U(stem, m1, m2, rim(U(l1, l2), 1.7)), 70)]


def nar():
    l1, m1 = leaf((-8, 52), (-48, 50), (-52, 12), 17); l2, m2 = leaf((8, 52), (48, 50), (52, 12), 17)
    body = circ((0, 82), 42)
    crown = U(blade((0, 46), (-14, 36), (-24, 22), 9, 0.6), blade((0, 46), (0, 32), (0, 16), 9, 0.6), blade((0, 46), (14, 36), (24, 22), 9, 0.6))
    arcs = U(*[stroke([(r * math.cos(a), 82 + r * math.sin(a)) for a in np.linspace(math.radians(200), math.radians(340), 40)], 3.4) for r in (27,)])
    seeds = U(*[circ(p, 3.6) for p in [(-20, 88), (0, 92), (20, 88), (-10, 104), (10, 104), (0, 74)]])
    lv = U(l1, l2)
    return [Ls("Yaprak yesil", GRN, lv, 60), Ls("Kirmizi", RED, body, 45), Ls("Koyu kirmizi", DRED, U(arcs, rim(body, 2.2)), 60),
            Ls("Altin", GOLD, U(crown, seeds), 0), Ls("Koyu yesil", DGRN, U(m1, m2, rim(lv, 1.7)), 60)]


def hatayi_kose():
    t1 = bez((16, 16), (46, 6), (78, 28)); t2 = bez((78, 28), (104, 46), (118, 34))
    stem = stroke(np.vstack([t1, t2[1:]]), 4.0)
    sp = [(116 + r * math.cos(a), 48 + r * math.sin(a)) for a, r in
          ((a, 12 - 9.0 * (a + math.pi / 2) / (2.1 * math.pi)) for a in np.linspace(-math.pi / 2, -math.pi / 2 + 2.1 * math.pi, 80))]
    curl = stroke(sp, 3.8)
    leafs = U(blade((38, 14), (52, 2), (70, 4), 12), blade((100, 40), (108, 54), (106, 70), 11))
    flower = circ((90, 22), 9)
    pet = []; inner = []
    for off, ln in zip((-60, -30, 0, 30, 60), (34, 46, 54, 46, 34)):
        r = math.radians(45 + off)
        tip = (6 + ln * math.cos(r), 6 + ln * math.sin(r)); mid = (6 + 0.5 * ln * math.cos(r), 6 + 0.5 * ln * math.sin(r))
        pet.append(blade((6, 6), mid, tip, 10.5, .6)); inner.append(blade((8, 8), mid, (6 + 0.72 * ln * math.cos(r), 6 + 0.72 * ln * math.sin(r)), 3.4, .5))
    dot = circ((90, 22), 2.8)

    def full(g):
        return U(g, affinity.affine_transform(g, [0, 1, 1, 0, 0, 0]))
    return [Ls("Lacivert dal", NAVY, full(U(stem, curl)), 45), Ls("Turkuaz yaprak", TEAL, full(leafs), 90),
            Ls("Altin palmet", GOLD, U(*pet, full(U(dot))).difference(U(*inner)), 45),
            Ls("Kirmizi", RED, U(*inner, full(flower).difference(full(dot).buffer(0.9))), 45)]


def bordur(n=5, unit=34.0):
    xs = np.linspace(0, n * unit, 400)
    vine = stroke(np.stack([xs, 7 * np.sin(2 * np.pi * xs / unit)], 1), 3.2)
    tul = []; leaf = []; gold = []
    for k in range(n):
        xu = (k + .75) * unit; yu = -7.0
        xd = (k + .25) * unit; yd = 7.0
        tul += [blade((xu, yu), (xu - 11, yu - 4), (xu - 8, yu - 27), 11, .6), blade((xu, yu), (xu + 11, yu - 4), (xu + 8, yu - 27), 11, .6),
                blade((xu, yu), (xu, yu - 14), (xu, yu - 33), 12, .6)]
        gold += [circ((xu, yu + 0.5), 3.0), circ((xd, yd + 20), 2.8)]
        leaf += [blade((xd, yd), (xd - 7, yd + 4), (xd - 11, yd + 17), 7.5), blade((xd, yd), (xd + 7, yd + 4), (xd + 11, yd + 17), 7.5)]
    return [Ls("Dal yesil", GRN, vine, 0), Ls("Yaprak koyu yesil", DGRN, U(*leaf), 60),
            Ls("Kirmizi lale", RED, U(*tul), 90), Ls("Altin nokta", GOLD, U(*gold), 0)]


def monogram():
    rx, ry = 42.0, 52.0
    ring = stroke([(rx * math.cos(a), ry * math.sin(a)) for a in np.linspace(0, 2 * math.pi, 240)], 2.8)
    leaves = []; berries = []
    for side in (1, -1):
        for k, a in enumerate(np.radians(np.arange(80, -75, -22.0))):
            P = np.array([rx * math.cos(a), ry * math.sin(a)])
            tg = np.array([rx * math.sin(a), -ry * math.cos(a)]); tg /= np.hypot(*tg)
            nm = np.array([ry * math.cos(a), rx * math.sin(a)]); nm /= np.hypot(*nm)
            s = 1 if k % 2 == 0 else -1
            p1 = P + s * nm * 11 + tg * 6; p2 = P + s * nm * 18 + tg * 20
            q = [P - s * nm * 1.5, p1, p2]
            if side == -1:
                q = [(-x, y) for x, y in q]
            leaves.append(blade(q[0], q[1], q[2], 11))
            if k % 2 == 0:
                b = P + nm * 12 - tg * 12
                berries.append(circ((side * b[0], b[1]), 3.1))
    tul = U(blade((0, -50), (-9, -58), (-8, -74), 9, .6), blade((0, -50), (9, -58), (8, -74), 9, .6), blade((0, -50), (0, -62), (0, -80), 10, .6))
    bow = U(blade((0, 53), (-12, 58), (-26, 54), 8), blade((0, 53), (12, 58), (26, 54), 8), circ((0, 53), 4))
    return [Ls("Yaprak yesil", GRN, U(*leaves), 70), Ls("Altin halka", GOLD, U(ring, bow, *berries), 0), Ls("Kirmizi lale", RED, tul, 90)]


DESIGNS = {
    "lale": dict(fn=lale, title="Lale", fit="h", S=96, L=120),
    "karanfil": dict(fn=karanfil, title="Karanfil", fit="h", S=96, L=120),
    "nar": dict(fn=nar, title="Nar", fit="h", S=96, L=120),
    "hatayi-kose": dict(fn=hatayi_kose, title="Hatayi Kose Motifi", fit="w", S=96, L=120),
    "bordur": dict(fn=bordur, title="Lale Bordur", fit="w", S=100, L=170),
    "monogram-cerceve": dict(fn=monogram, title="Monogram Cerceve", fit="h", S=96, L=120),
}
