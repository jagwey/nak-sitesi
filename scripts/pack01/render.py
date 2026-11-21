import math, numpy as np, cv2
import pyembroidery as pe


def thread_layer(pattern, target=2000, margin_mm=7):
    ex = pattern.extents()
    wmm, hmm = (ex[2] - ex[0]) / 10, (ex[3] - ex[1]) / 10
    ppm = target / (max(wmm, hmm) + 2 * margin_mm)
    SS = 2
    W = int((wmm + 2 * margin_mm) * ppm); H = int((hmm + 2 * margin_mm) * ppm)
    img = np.zeros((H * SS, W * SS, 3), np.float32)
    alpha = np.zeros((H * SS, W * SS), np.uint8)
    s = ppm * SS / 10.0
    ox = -ex[0] * s + margin_mm * ppm * SS; oy = -ex[1] * s + margin_mm * ppm * SS
    tw = max(3, int(round(0.42 * ppm * SS)))
    rng = np.random.default_rng(3)
    for block, thread in pattern.get_as_colorblocks():
        col = np.array([thread.get_blue(), thread.get_green(), thread.get_red()], np.float32)
        prev = None
        for x, y, cmd in block:
            if cmd == pe.STITCH and prev is not None:
                dx, dy = x - prev[0], y - prev[1]
                if abs(dx) + abs(dy) < 127:
                    a = (int(prev[0] * s + ox), int(prev[1] * s + oy)); b = (int(x * s + ox), int(y * s + oy))
                    ang = math.atan2(dy, dx)
                    sheen = 0.5 + 0.5 * math.cos(2 * (ang - math.radians(-50)))   # directional light on thread
                    k = 0.82 + 0.30 * sheen + rng.normal(0, 0.03)
                    base = np.clip(col * k, 0, 255)
                    dark = tuple(float(v) for v in base * 0.62)
                    lite = tuple(float(v) for v in np.clip(base * 1.18 + 18 * sheen, 0, 255))
                    cv2.line(img, a, b, dark, tw, cv2.LINE_AA)
                    cv2.line(img, a, b, tuple(float(v) for v in base), max(2, tw - 2), cv2.LINE_AA)
                    cv2.line(img, a, b, lite, max(1, tw // 3), cv2.LINE_AA)
                    cv2.line(alpha, a, b, 255, tw, cv2.LINE_AA)
            if cmd in (pe.STITCH, pe.JUMP):
                prev = (x, y)
            elif cmd == pe.TRIM:
                prev = None
    img = cv2.resize(img, (W, H), interpolation=cv2.INTER_AREA)
    alpha = cv2.resize(alpha, (W, H), interpolation=cv2.INTER_AREA).astype(np.float32) / 255
    # alpha-weighted colour was blended with black: un-premultiply
    return img, alpha


def composite(img, alpha, bg):
    a = np.clip(alpha * 1.6, 0, 1)[..., None]
    col = img / np.maximum(alpha[..., None], 0.02)
    col = np.clip(col, 0, 255)
    return bg * (1 - a) + col * a


def plain_bg(shape, rgb=(248, 246, 241)):
    bg = np.empty(shape + (3,), np.float32); bg[:] = np.array(rgb[::-1], np.float32)
    return bg


def linen_bg(shape, rgb=(226, 214, 192), seed=7):
    H, W = shape
    rng = np.random.default_rng(seed)
    bg = np.empty((H, W, 3), np.float32); bg[:] = np.array(rgb[::-1], np.float32)
    # slubby warp/weft threads: low-freq stripes with random strength
    cols = cv2.resize(rng.normal(0, 1, (1, W // 3 + 2)).astype(np.float32), (W, 1), interpolation=cv2.INTER_LINEAR)
    rows = cv2.resize(rng.normal(0, 1, (H // 3 + 2, 1)).astype(np.float32), (1, H), interpolation=cv2.INTER_LINEAR)
    weave = 0.0
    n1 = rng.normal(0, 1, (H, W)).astype(np.float32)
    fine = (cv2.GaussianBlur(n1, (0, 0), sigmaX=0.6, sigmaY=9) + cv2.GaussianBlur(n1[::-1].copy(), (0, 0), sigmaX=9, sigmaY=0.6)) * 9
    # woven checker micro-pattern
    yy, xx = np.mgrid[0:H, 0:W]
    checker = 3.0 * np.sin(xx * 2 * np.pi / 5.0) * np.sin(yy * 2 * np.pi / 5.0)
    vign = 1 - 0.10 * (((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
    bg = (bg + (weave + fine + checker)[..., None]) * vign[..., None]
    return np.clip(bg, 0, 255)


def render_all(vp3, out_normal, out_fabric, target=2000):
    p = pe.read(vp3)
    img, alpha = thread_layer(p, target)
    H, W = alpha.shape
    n = composite(img, alpha, plain_bg((H, W)))
    cv2.imwrite(out_normal, np.clip(n, 0, 255).astype(np.uint8))
    bg = linen_bg((H, W))
    # soft shadow + thread relief
    sh = cv2.GaussianBlur(alpha, (0, 0), 5)
    M = np.float32([[1, 0, 5], [0, 1, 7]])
    sh = cv2.warpAffine(sh, M, (W, H))
    bg = bg * (1 - 0.35 * sh[..., None])
    # fabric puckers slightly around the dense thread
    f = composite(img, alpha, bg)
    cv2.imwrite(out_fabric, np.clip(f, 0, 255).astype(np.uint8))


def qa(vp3, hoops):
    p = pe.read(vp3)
    ex = p.extents(); w = (ex[2] - ex[0]) / 10; h = (ex[3] - ex[1]) / 10
    st = p.stitches
    n = sum(1 for s in st if s[2] == pe.STITCH)
    trims = sum(1 for s in st if s[2] == pe.TRIM); jumps = sum(1 for s in st if s[2] == pe.JUMP)
    cc = sum(1 for s in st if s[2] == pe.COLOR_CHANGE)
    lens = []; prev = None; longj = 0; afterjump = True
    for x, y, c in st:
        if c == pe.STITCH:
            if prev is not None and not afterjump:
                lens.append(math.hypot(x - prev[0], y - prev[1]) / 10)
            afterjump = False; prev = (x, y)
        elif c == pe.JUMP:
            if prev is not None and math.hypot(x - prev[0], y - prev[1]) / 10 > 12: longj += 1
            afterjump = True; prev = (x, y)
        elif c in (pe.TRIM, pe.COLOR_CHANGE):
            afterjump = True
    L = np.array(lens)
    fits = [name for name, (hw, hh) in hoops.items() if (w <= hw - 6 and h <= hh - 6) or (h <= hw - 6 and w <= hh - 6 and False)]
    return dict(width_mm=round(w, 1), height_mm=round(h, 1), stitches=n, colors=len(p.threadlist), color_changes=cc, trims=trims, jumps=jumps,
                long_jumps_gt12mm=longj, min_len=round(float(L.min()), 2), p1_len=round(float(np.percentile(L, 1)), 2), median_len=round(float(np.median(L)), 2),
                max_len=round(float(L.max()), 2), n_lt03=int((L < 0.3).sum()), n_gt7=int((L > 7.0).sum()),
                density_st_per_cm2=round(n / max(w * h / 100 * 0.5, 1), 0), hoops=fits,
                threads=[(t.description, t.hex_color()) for t in p.threadlist])
