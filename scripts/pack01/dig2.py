"""Raster logo -> professional VP3 embroidery digitizer.

Per thread colour: thick areas -> tatami fill (edge-run + zigzag underlay, pull comp),
medium strokes -> satin columns along skeleton (centre-walk underlay),
hairlines -> triple (bean) run. Lower layers overlap into upper layers so no gaps show.
Units: mm internally, pyembroidery 0.1 mm on output.
"""
import math, sys, json
import numpy as np, cv2
from PIL import Image
from skimage.morphology import skeletonize
from shapely.geometry import Polygon, MultiPolygon, LineString, Point
from shapely import affinity
from shapely.ops import unary_union
import pyembroidery as pe

# ---------------- geometry helpers ----------------

def mask_to_polys(mask, mmpp, eps_px=0.6):
    cs, hier = cv2.findContours(mask.astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    if hier is None:
        return MultiPolygon()
    hier = hier[0]
    polys = []
    for i, c in enumerate(cs):
        if hier[i][3] != -1 or len(c) < 4:
            continue
        outer = cv2.approxPolyDP(c, eps_px, True).reshape(-1, 2) * mmpp
        holes = []
        j = hier[i][2]
        while j != -1:
            h = cv2.approxPolyDP(cs[j], eps_px, True).reshape(-1, 2) * mmpp
            if len(h) >= 4:
                holes.append(h)
            j = hier[j][0]
        if len(outer) >= 4:
            p = Polygon(outer, holes).buffer(0)
            if not p.is_empty:
                polys.append(p)
    return unary_union(polys)


def as_list(g):
    if g.is_empty:
        return []
    if hasattr(g, "geoms"):
        return [x for x in g.geoms if x.geom_type == "Polygon" and not x.is_empty]
    return [g] if g.geom_type == "Polygon" else []


def dist(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


def resample(pts, step):
    pts = np.asarray(pts, float)
    if len(pts) < 2:
        return pts
    seg = np.hypot(*np.diff(pts, axis=0).T)
    s = np.concatenate([[0], np.cumsum(seg)])
    L = s[-1]
    if L < 1e-6:
        return pts[:1]
    n = max(1, int(round(L / step)))
    t = np.linspace(0, L, n + 1)
    return np.stack([np.interp(t, s, pts[:, 0]), np.interp(t, s, pts[:, 1])], 1)


def run_points(pts, step):
    """running stitch keeping corners."""
    out = [tuple(pts[0])]
    for a, b in zip(pts[:-1], pts[1:]):
        d = dist(a, b)
        n = max(1, int(math.ceil(d / step)))
        for k in range(1, n + 1):
            out.append((a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n))
    return out

# ---------------- stitch objects ----------------
# Each object: list of "runs"; a run = list of points stitched continuously.
# Between runs the sequencer decides travel vs trim+jump.


def tatami_rows(poly, angle, spacing, stitch_len, offset_pattern=(0, 1/3, 2/3), min_edge=0.5):
    rot = affinity.rotate(poly, -angle, origin=(0, 0))
    minx, miny, maxx, maxy = rot.bounds
    rows = []
    y = miny + spacing * 0.5
    k = 0
    while y < maxy:
        inter = rot.intersection(LineString([(minx - 1, y), (maxx + 1, y)]))
        segs = []
        for g in (inter.geoms if hasattr(inter, "geoms") else [inter]):
            if g.is_empty or g.geom_type != "LineString":
                continue
            xs = [c[0] for c in g.coords]
            a, b = min(xs), max(xs)
            if b - a > 0.15:
                segs.append((a, b))
        rows.append((k, y, sorted(segs)))
        y += spacing
        k += 1
    # build spans
    spans = []
    for k, y, segs in rows:
        for a, b in segs:
            spans.append(dict(k=k, y=y, a=a, b=b))
    by_row = {}
    for i, s in enumerate(spans):
        by_row.setdefault(s["k"], []).append(i)
    unv = set(range(len(spans)))
    runs = []
    cur_run = []
    pos = None

    def span_pts(s, left_to_right):
        a, b = s["a"], s["b"]
        off = offset_pattern[s["k"] % len(offset_pattern)] * stitch_len
        xs = [a]
        g = math.floor((a - off) / stitch_len) + 1
        while True:
            x = off + g * stitch_len
            if x >= b - min_edge:
                break
            if x > a + min_edge:
                xs.append(x)
            g += 1
        xs.append(b)
        if not left_to_right:
            xs = xs[::-1]
        return [(x, s["y"]) for x in xs]

    while unv:
        if pos is None:
            i = min(unv, key=lambda i: (spans[i]["k"], spans[i]["a"]))
        else:
            cands = []
            lastk = spans[last]["k"]
            for kk in (lastk + 1, lastk - 1):
                for i in by_row.get(kk, []):
                    if i in unv:
                        s = spans[i]
                        if min(s["b"], spans[last]["b"]) - max(s["a"], spans[last]["a"]) > -0.2:
                            d = min(dist(pos, (s["a"], s["y"])), dist(pos, (s["b"], s["y"])))
                            cands.append((d, i))
                if cands:
                    break
            if cands:
                d, i = min(cands)
                if d > 2.0:
                    cands = []
            if not cands:
                i = min(unv, key=lambda i: min(dist(pos, (spans[i]["a"], spans[i]["y"])),
                                               dist(pos, (spans[i]["b"], spans[i]["y"]))))
                if cur_run:
                    runs.append(cur_run)
                cur_run = []
        s = spans[i]
        ltr = pos is None or dist(pos, (s["a"], s["y"])) <= dist(pos, (s["b"], s["y"]))
        pts = span_pts(s, ltr)
        cur_run.extend(pts)
        pos = pts[-1]
        last = i
        unv.discard(i)
    if cur_run:
        runs.append(cur_run)
    # rotate back
    ca, sa = math.cos(math.radians(angle)), math.sin(math.radians(angle))
    return [[(x * ca - y * sa, x * sa + y * ca) for x, y in r] for r in runs]


def fill_object(poly, angle, P):
    runs_under = []
    inset = poly.buffer(-0.35, join_style=2)
    for p in as_list(inset):
        for ring in [p.exterior] + list(p.interiors):
            pts = list(ring.coords)
            runs_under.append(run_points(pts, 2.2))
        # zigzag underlay for wider areas
        if p.buffer(-1.2).area > 0:
            runs_under += tatami_rows(p.buffer(-0.2), angle + 90, 1.8, 4.0, (0,), 0.3)
            if p.buffer(-3).area > 4:
                runs_under += tatami_rows(p.buffer(-0.4), angle + 45, 2.6, 4.0, (0,), 0.3)
    top = tatami_rows(poly.buffer(P["pull_fill"], join_style=1), angle, P["fill_spacing"], P["fill_len"])
    return dict(kind="fill", under=runs_under, top=top, region=poly.buffer(0.1))


def satin_path(path_mm, widths, P):
    """path_mm: Nx2 centreline, widths: full widths (mm). returns (underlay_run, satin_run)."""
    pts = np.asarray(path_mm, float)
    step = P["satin_step"]
    s = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(pts, axis=0).T))])
    L = s[-1]
    n = max(2, int(round(L / step)) + 1)
    t = np.linspace(0, L, n)
    cx = np.interp(t, s, pts[:, 0]); cy = np.interp(t, s, pts[:, 1]); w = np.interp(t, s, widths)
    # tangents (smoothed)
    tx = np.gradient(cx); ty = np.gradient(cy)
    k = max(5, int(round(1.6 / step)) | 1)   # direction smoothed over ~1.6 mm -> straight, parallel columns
    ker = np.ones(k) / k
    kw = max(3, int(round(1.0 / step)) | 1)
    if n > kw:
        w = np.convolve(np.pad(w, kw // 2, mode="edge"), np.ones(kw) / kw, "valid")
    if n > k:
        tx = np.convolve(np.pad(tx, k // 2, mode="edge"), ker, "valid")
        ty = np.convolve(np.pad(ty, k // 2, mode="edge"), ker, "valid")
    nn = np.hypot(tx, ty) + 1e-9
    nx, ny = -ty / nn, tx / nn
    hw = (np.clip(w, P["satin_min_w"], P["satin_max_w"]) + P["pull_satin"]) / 2
    sat = []
    # paired satin: L_i -> R_i at the same station (perpendicular column), next pair one step further
    for i in range(n):
        a = (cx[i] + nx[i] * hw[i], cy[i] + ny[i] * hw[i])
        b = (cx[i] - nx[i] * hw[i], cy[i] - ny[i] * hw[i])
        sat.append(a if i % 2 == 0 else b)   # classic zigzag satin: one crossing per step, no edge-hop micro stitches
    centre = list(zip(cx, cy))
    under = run_points(resample(centre, 1.8), 1.8) if np.median(w) >= 1.0 else []
    return under, sat


def bean_run(path_mm, step=1.4):
    pts = resample(path_mm, step)
    out = [tuple(pts[0])]
    for a, b in zip(pts[:-1], pts[1:]):
        out += [tuple(b), tuple(a), tuple(b)]
    return out

# ---------------- skeleton tracing ----------------

NB = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]


def trace_skeleton(sk):
    H, W = sk.shape
    ys, xs = np.nonzero(sk)
    S = set(zip(ys.tolist(), xs.tolist()))
    deg = {}
    for p in S:
        deg[p] = sum((p[0] + dy, p[1] + dx) in S for dy, dx in NB)
    nodes = {p for p, d in deg.items() if d != 2}
    used = set()
    paths = []

    def nbrs(p):
        return [(p[0] + dy, p[1] + dx) for dy, dx in NB if (p[0] + dy, p[1] + dx) in S]

    for n0 in nodes:
        for nb in nbrs(n0):
            e = frozenset((n0, nb))
            if e in used:
                continue
            used.add(e)
            path = [n0, nb]
            prev, cur = n0, nb
            while cur not in nodes:
                nxt = [q for q in nbrs(cur) if q != prev and frozenset((cur, q)) not in used]
                if not nxt:
                    break
                q = nxt[0]
                used.add(frozenset((cur, q)))
                path.append(q)
                prev, cur = cur, q
            paths.append(path)
    # cycles (no nodes)
    rem = {p for p in S if p not in nodes and not any(frozenset((p, q)) in used for q in nbrs(p))}
    while rem:
        p0 = rem.pop()
        path = [p0]
        prev, cur = None, p0
        while True:
            nxt = [q for q in nbrs(cur) if q != prev and q in rem]
            if not nxt:
                break
            prev, cur = cur, nxt[0]
            rem.discard(cur)
            path.append(cur)
        path.append(p0)
        paths.append(path)
    return paths, deg


def smooth(pts, k=5):
    pts = np.asarray(pts, float)
    if len(pts) <= k:
        return pts
    closed = np.allclose(pts[0], pts[-1])
    ker = np.ones(k) / k
    if closed:
        ext = np.concatenate([pts[-k:-1], pts, pts[1:k]])
        out = np.stack([np.convolve(ext[:, i], ker, "same") for i in range(2)], 1)[k - 1:-(k - 1)]
        out[-1] = out[0]
    else:
        ext = np.concatenate([np.repeat(pts[:1], k // 2, 0), pts, np.repeat(pts[-1:], k // 2, 0)])
        out = np.stack([np.convolve(ext[:, i], ker, "valid") for i in range(2)], 1)
        out[0], out[-1] = pts[0], pts[-1]
    return out

# ---------------- per-colour digitizing ----------------


def digitize_layer(mask, mmpp, P, angle):
    objs = []
    px = 1.0 / mmpp
    m8 = mask.astype(np.uint8)
    dt = cv2.distanceTransform(m8, cv2.DIST_L2, 5)
    thick_r = P["fill_min_w"] / 2 * px
    core = (dt > thick_r).astype(np.uint8)
    rk = int(round(thick_r))
    thick = cv2.dilate(core, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * rk + 1, 2 * rk + 1))) & m8
    # absorb thin slivers hugging thick parts
    thin = (m8 & (1 - thick)).astype(np.uint8)
    thin = cv2.morphologyEx(thin, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
    # fills
    for poly in as_list(mask_to_polys(thick, mmpp)):
        if poly.area < 0.3:
            continue
        objs.append(fill_object(poly, angle, P))
    # thin components
    n, lab, stats, _ = cv2.connectedComponentsWithStats(thin, connectivity=8)
    for ci in range(1, n):
        x, y, w, h, area = stats[ci]
        if area * mmpp * mmpp < 0.05:
            continue
        sub = (lab[y:y + h, x:x + w] == ci)
        subp = np.pad(sub, 2)
        sk = skeletonize(subp)
        paths, deg = trace_skeleton(sk)
        sk_len = sk.sum() * mmpp
        blob = area * mmpp * mmpp / max(sk_len, 0.1) ** 2 > 0.12 and area * mmpp * mmpp > 1.0
        if blob:
            for poly in as_list(mask_to_polys(subp.astype(np.uint8), mmpp)):
                objs.append(fill_object(affinity.translate(poly, (x - 2) * mmpp, (y - 2) * mmpp), angle, P))
            continue
        if sk_len < 1.2:  # dots -> tiny fill
            for poly in as_list(mask_to_polys(subp.astype(np.uint8), mmpp, 0.3)):
                poly = affinity.translate(poly, (x - 2) * mmpp, (y - 2) * mmpp)
                top = tatami_rows(poly.buffer(0.1), angle, 0.3, 1.5, (0,), 0.2)
                objs.append(dict(kind="fill", under=[], top=top, region=poly.buffer(0.1)))
            continue
        subdt = np.pad(dt[y:y + h, x:x + w], 2)
        for path in paths:
            if len(path) < 3:
                continue
            arr = np.array(path, float)
            wds = np.array([subdt[p] for p in path]) * 2 * mmpp
            endA, endB = path[0], path[-1]
            closed = endA == endB
            # prune spurs: short path ending at a free end
            plen = len(path) * mmpp
            free = (deg.get(endA, 2) == 1) or (deg.get(endB, 2) == 1)
            if not closed and free and plen < max(0.6, 0.9 * np.median(wds)) and len(paths) > 1:
                continue
            xy = np.stack([arr[:, 1] + x - 2, arr[:, 0] + y - 2], 1) * mmpp
            ks = max(3, int(round(P.get("centre_smooth", 1.0) / mmpp)) | 1)
            xy = smooth(xy, ks if len(xy) > 2 * ks else 3)
            # extend ends into junctions / tips
            if not closed and len(xy) > 2:
                for end in (0, -1):
                    j = 1 if end == 0 else -2
                    d = xy[end] - xy[j if len(xy) < 6 else (5 if end == 0 else -6)]
                    nd = np.hypot(*d) + 1e-9
                    pend = path[end]
                    ext = wds[end] * (0.35 if deg.get(pend, 2) == 1 else 0.5)
                    newp = xy[end] + d / nd * ext
                    if end == 0:
                        xy = np.vstack([newp, xy]); wds = np.concatenate([[wds[0] * (0.6 if deg.get(pend, 2) == 1 else 1)], wds])
                    else:
                        xy = np.vstack([xy, newp]); wds = np.concatenate([wds, [wds[-1] * (0.6 if deg.get(pend, 2) == 1 else 1)]])
            wds = np.convolve(np.pad(wds, 2, mode="edge"), np.ones(5) / 5, "valid")
            if not closed and len(xy) * mmpp < 0.8 and np.median(wds) < P["run_max_w"]:
                continue
            if np.median(wds) < P["run_max_w"]:
                objs.append(dict(kind="run", runs=[bean_run(xy)], ends=(tuple(xy[0]), tuple(xy[-1]))))
            else:
                under, sat = satin_path(xy, wds, P)
                objs.append(dict(kind="satin", under=under, sat=sat, ends=(tuple(xy[0]), tuple(xy[-1]))))
    return objs


def order_objects(objs, start=(0, 0)):
    """nearest-neighbour sequencing; returns list of runs (with flags whether travel allowed)."""
    seq = []
    pos = start
    rem = list(range(len(objs)))
    while rem:
        def entry_cost(i):
            o = objs[i]
            if o["kind"] == "fill":
                r = (o["under"] or o["top"])[0]
                return dist(pos, r[0]), False
            a, b = o["ends"]
            da, db = dist(pos, a), dist(pos, b)
            return min(da, db), db < da
        best = min(rem, key=lambda i: entry_cost(i)[0])
        rev = entry_cost(best)[1]
        o = objs[best]
        rem.remove(best)
        if o["kind"] == "fill":
            for r in o["under"]:
                seq.append(("under", r, o["region"]))
            for r in o["top"]:
                seq.append(("top", r, None))
        elif o["kind"] == "run":
            r = o["runs"][0]
            seq.append(("line", r[::-1] if rev else r, None))
        else:
            under, sat = o["under"], o["sat"]
            if rev:
                under, sat = under[::-1], sat[::-1]
            if under:
                seq.append(("line", under, None))
                seq.append(("line", sat[::-1], None))
            else:
                seq.append(("line", sat, None))
        pos = seq[-1][1][-1]
    return seq


def emit(pattern, seq, P, cx, cy):
    pos = None

    def put(cmd, p):
        pattern.add_stitch_absolute(cmd, round((p[0] - cx) * 10), round((p[1] - cy) * 10))

    for kind, run, region in seq:
        if not run:
            continue
        p0 = run[0]
        if pos is not None:
            d = dist(pos, p0)
            inside = region is not None and region.contains(LineString([pos, p0])) if d > 0.01 else True
            if d <= P["max_travel"] or (kind == "under" and inside):
                for q in run_points([pos, p0], 2.5)[1:]:
                    put(pe.STITCH, q)
            else:
                pattern.add_command(pe.TRIM)
                put(pe.JUMP, p0)
                put(pe.STITCH, p0)
        else:
            put(pe.JUMP, p0)
            put(pe.STITCH, p0)
        last = p0
        for q in run[1:]:
            d = dist(last, q)
            if d < P["min_stitch"]:
                continue
            if d > 6.8:
                for qq in run_points([last, q], 6.0)[1:]:
                    put(pe.STITCH, qq)
            else:
                put(pe.STITCH, q)
            last = q
        pos = last
    pattern.add_command(pe.TRIM)


DEFAULT_P = dict(fill_spacing=0.36, fill_len=3.2, fill_min_w=6.5, satin_step=0.30, satin_min_w=0.8,
                 satin_max_w=6.0, run_max_w=0.5, pull_fill=0.15, pull_satin=0.18, max_travel=1.6,
                 min_stitch=0.3, overlap=0.35)


def build(layers, mmpp, out_path, P=None, name="design"):
    """layers: list of dict(name, rgb, mask(bool HxW), angle) in stitch order (bottom first)."""
    P = {**DEFAULT_P, **(P or {})}
    H, W = layers[0]["mask"].shape
    ov = max(1, int(round(P["overlap"] / mmpp)))
    ker = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * ov + 1, 2 * ov + 1))
    masks = [l["mask"].astype(np.uint8) for l in layers]
    # layered underlap: each lower layer grows under everything stitched after it
    final = []
    for i, m in enumerate(masks):
        upper = np.zeros_like(m)
        for u in masks[i + 1:]:
            upper |= u
        final.append(m | (cv2.dilate(m, ker) & upper))
    allm = np.zeros_like(masks[0])
    for m in masks:
        allm |= m
    ys, xs = np.nonzero(allm)
    cx = (xs.min() + xs.max()) / 2 * mmpp
    cy = (ys.min() + ys.max()) / 2 * mmpp
    pattern = pe.EmbPattern()
    pos = (xs.min() * mmpp, ys.min() * mmpp)
    stats = []
    for li, (l, m) in enumerate(zip(layers, final)):
        objs = []
        for sel, over in l.get("parts", [(None, {})]):
            mm = m.astype(bool) if sel is None else (m.astype(bool) & sel)
            objs += digitize_layer(mm, mmpp, {**P, **over}, l.get("angle", 45))
        seq = order_objects(objs, pos)
        if li > 0:
            pattern.add_command(pe.COLOR_CHANGE)
        th = pe.EmbThread()
        th.set_color(*l["rgb"])
        th.description = l["name"]
        th.catalog_number = l.get("code", "")
        th.brand = l.get("brand", "Isacord")
        pattern.add_thread(th)
        n0 = len(pattern.stitches)
        emit(pattern, seq, P, cx, cy)
        if seq:
            pos = seq[-1][1][-1]
        stats.append(dict(layer=l["name"], objects=len(objs),
                          kinds={k: sum(o["kind"] == k for o in objs) for k in ("fill", "satin", "run")},
                          stitches=sum(1 for s in pattern.stitches[n0:] if s[2] == pe.STITCH)))
    pattern.add_command(pe.END)
    kept = []
    for s in pattern.stitches:
        if s[2] == pe.STITCH and kept and kept[-1][2] == pe.STITCH and math.hypot(s[0] - kept[-1][0], s[1] - kept[-1][1]) < 3.0:
            continue
        kept.append(s)
    pattern.stitches = kept
    pe.write_vp3(pattern, out_path, {"tie_on": pe.CONTINGENCY_TIE_ON_THREE_SMALL,
                                     "tie_off": pe.CONTINGENCY_TIE_OFF_THREE_SMALL})
    return pattern, stats
