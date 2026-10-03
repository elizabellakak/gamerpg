"""Static environment props. Origin = base center on the ground, front faces -Y."""
import math
import random

from mathutils import Vector

from .core import Builder, basis, define, export_glb, glow, reset_scene, xform

V = Vector


def _mats():
    from .weapons import _mats as wmats
    wmats()
    define("roof_red_under", color="#8c1c18", rough=0.6)
    define("tile_ridge", color="#1f2838", rough=0.5)
    glow("glow_portal", "#8a5cff", 6.0, color="#d0b8ff")
    glow("glow_portal_cyan", "#40e0ff", 5.0, color="#c8f8ff")
    define("crystal_gacha", color="#ff9cf0", rough=0.05, emit="#d86bff", strength=5.0)
    define("crystal_gacha2", color="#a8f0ff", rough=0.05, emit="#5ad8ff", strength=4.0)
    define("stone_moss", color="#6b7a5a", rough=0.9)
    define("water", color="#3a6a8a", rough=0.05, metal=0.0)
    define("bamboo", color="#9a8a4a", rough=0.6)


# ---------------------------------------------------------------------------
# shared builders
# ---------------------------------------------------------------------------
def hip_roof(B, ax, ay, top_z, h, ridge=0.0, curl=0.35, thick=0.14, m_out="roof_tile",
             m_in="roof_red_under", m_edge="wood_dark", tiles=True, loc=(0, 0, 0), nu=10, nv=6,
             hip_pts=7):
    """Curved Asian hip roof. ax, ay = eave half extents; ridge = half length of the top ridge
    along X (0 for a pyramidal roof). Eave corners curl up by `curl`."""
    loc = V(loc)
    run = ay  # horizontal run from ridge line to eave on the long sides
    ax_top = ridge
    ay_top = 0.0

    def zf(v, u):
        return top_z - h * (v ** 1.6) + curl * (abs(u) ** 4) * (v ** 3)

    def side(axis, sgn):
        def fn(u, v):
            if axis == "y":
                hx = ax_top + (ax - ax_top) * v
                hy = ay_top + (ay - ay_top) * v
                p = V((u * hx, sgn * hy, zf(v, u)))
                n = V((0, sgn * h, run)).normalized()
            else:
                hx = ax_top + (ax - ax_top) * v
                hy = ay_top + (ay - ay_top) * v
                p = V((sgn * hx, u * hy, zf(v, u)))
                n = V((sgn * h, 0, run)).normalized()
            return p + loc, n
        return fn
    for axis, sgn in (("y", -1), ("y", 1), ("x", -1), ("x", 1)):
        B.sheet(side(axis, sgn), nu, nv, thick, m_out, m_in, m_edge=m_edge, angle=50)
    if tiles:
        # tile ridges on the long faces
        for sgn in (-1, 1):
            n = max(6, int(ax * 3.2))
            for i in range(n + 1):
                u = -0.92 + 1.84 * i / n
                pts = []
                for k in range(6):
                    v = 0.05 + 0.95 * k / 5
                    hx = ax_top + (ax - ax_top) * v
                    hy = ay * v
                    if abs(u * hx) > hx - (hy - 0.0) * 0.0 and ridge == 0:
                        pass
                    pts.append(V((u * hx, sgn * hy, zf(v, u) + thick * 0.55)) + loc)
                B.sweep(pts, 0.035, m="tile_ridge", segs=4, angle=60)
    # ridge + hip ridges
    if ridge > 0:
        B.cyl(0.09, 0.09, ridge * 2 + 0.2, loc=loc + V((0, 0, top_z + 0.05)), rot=(0, 90, 0),
              m="tile_ridge", segs=8)
        for s in (-1, 1):
            B.sweep([loc + V((s * (ridge + 0.1), 0, top_z + 0.05)),
                     loc + V((s * (ridge + 0.3), 0, top_z + 0.3)),
                     loc + V((s * (ridge + 0.2), 0, top_z + 0.5))], [0.1, 0.07, 0.0], m="gold",
                    segs=6)
    for sx in (-1, 1):
        for sy in (-1, 1):
            pts = []
            for k in range(hip_pts):
                v = k / (hip_pts - 1)
                hx = ax_top + (ax - ax_top) * v
                hy = ay * v
                pts.append(loc + V((sx * hx, sy * hy, zf(v, 1.0) + thick * 0.6)))
            pts.append(pts[-1] + V((sx * 0.12, sy * 0.12, 0.18)))
            B.sweep(pts, [0.07] * hip_pts + [0.03], m="tile_ridge", segs=5)


def stone_block(B, size, loc, rot=(0, 0, 0), m="stone", bevel=0.05):
    B.box(size, loc=loc, rot=rot, m=m, bevel=bevel, seg=1, smooth=False)


# ---------------------------------------------------------------------------
# trees
# ---------------------------------------------------------------------------
def canopy(B, center, rad, n, mats, rnd, squash=0.8, spread=1.0, ico=2, jitter=0.12):
    c = V(center)
    for i in range(n):
        a = rnd.uniform(0, math.pi * 2)
        r = rnd.uniform(0.2, 1.0) * rad * spread
        z = rnd.uniform(-0.35, 0.45) * rad
        p = c + V((math.cos(a) * r, math.sin(a) * r, z))
        s = rad * rnd.uniform(0.45, 0.7)
        B.sphere(s, loc=p, scale=(1, 1, squash), m=mats[i % len(mats)], ico=ico, jitter=jitter,
                 seed=rnd.randint(0, 999), smooth=True, angle=70)


def trunk(B, pts, r0, r1, m="bark", segs=8):
    n = len(pts)
    B.sweep(pts, [r0 + (r1 - r0) * i / (n - 1) for i in range(n)], m=m, segs=segs, angle=60)


def tree_oak(B):
    rnd = random.Random(11)
    trunk(B, [(0, 0, -0.1), (0.05, 0, 1.0), (-0.05, 0.05, 2.0), (0.0, 0.0, 2.8)], 0.38, 0.2)
    for k in range(5):
        a = math.radians(30 + k * 72)
        B.cyl(0.16, 0.0, 0.7, matrix=basis(z=(math.cos(a), math.sin(a), -0.35), x=(0, 0, 1),
                                             loc=(math.cos(a) * 0.3, math.sin(a) * 0.3, 0.12)),
              m="bark", segs=6, smooth=False)
    for k in range(4):
        a = math.radians(20 + k * 90)
        d = V((math.cos(a), math.sin(a), 0))
        trunk(B, [V((0, 0, 1.9)), V((0, 0, 2.3)) + d * 0.5, V((0, 0, 2.9)) + d * 1.1],
              0.16, 0.06)
    canopy(B, (0, 0, 3.55), 1.45, 11, ["leaf", "leaf_dark", "leaf"], rnd, squash=0.78)
    B.sphere(1.25, loc=(0, 0, 3.7), scale=(1, 1, 0.8), m="leaf_dark", ico=2, jitter=0.08, seed=3,
             angle=70)


def tree_pine(B):
    rnd = random.Random(5)
    B.cyl(0.26, 0.05, 5.6, loc=(0, 0, 2.7), m="bark", segs=8, smooth=False)
    tiers = [(1.2, 1.7, 1.6), (2.2, 1.45, 1.5), (3.15, 1.15, 1.4), (4.05, 0.85, 1.25),
             (4.85, 0.55, 1.1)]
    for z, r, h in tiers:
        tb = Builder()
        n = 9
        prof = []
        for k in range(3):
            prof = None
        tb.cyl(r, 0.0, h, loc=(0, 0, z + h / 2), m="pine", segs=n, smooth=False)
        B.merge(tb)
        B.cyl(r * 1.04, r * 0.7, 0.18, loc=(0, 0, z + 0.05), m="leaf_dark", segs=n, smooth=False,
              rot=(0, 0, 20))
    B.cyl(0.35, 0.0, 0.8, loc=(0, 0, 5.6), m="pine", segs=7, smooth=False)


def tree_sakura(B):
    rnd = random.Random(21)
    define("bark_sakura", color="#3d2a26", rough=0.85)
    trunk(B, [(0, 0, -0.1), (0.12, 0, 0.8), (-0.1, 0.05, 1.6), (0.05, 0, 2.2)], 0.3, 0.16,
          m="bark_sakura")
    for k in range(5):
        a = math.radians(k * 72 + 15)
        d = V((math.cos(a), math.sin(a), 0))
        trunk(B, [V((0, 0, 1.7)), V((0, 0, 2.2)) + d * 0.7, V((0, 0, 2.6)) + d * 1.4,
                  V((0, 0, 2.75)) + d * 1.9], 0.14, 0.04, m="bark_sakura")
        canopy(B, V((0, 0, 3.0)) + d * 1.5, 0.95, 4, ["sakura", "sakura_light"], rnd, squash=0.6,
               spread=0.6)
    canopy(B, (0, 0, 3.4), 1.3, 7, ["sakura_light", "sakura", "sakura"], rnd, squash=0.65)
    for i in range(30):
        a = rnd.uniform(0, math.pi * 2)
        r = rnd.uniform(0.5, 2.6)
        B.poly([(0, 0), (0.06, 0.03), (0.1, 0), (0.06, -0.03)], 0.004,
               loc=(math.cos(a) * r, math.sin(a) * r, 0.01), rot=(0, 0, rnd.uniform(0, 360)),
               m="sakura_light", smooth=False)


# ---------------------------------------------------------------------------
# rocks / crystals / ruins
# ---------------------------------------------------------------------------
def rock(B, r, loc, scale, seed, moss=True, m="stone"):
    B.sphere(r, loc=loc, scale=scale, m=m, ico=2, jitter=0.18, seed=seed, smooth=False)
    if moss:
        B.sphere(r * 0.86, loc=V(loc) + V((0, 0, r * scale[2] * 0.32)),
                 scale=(scale[0] * 0.95, scale[1] * 0.95, scale[2] * 0.6), m="moss", ico=2,
                 jitter=0.15, seed=seed + 1, smooth=False)


def rock_a(B):
    rock(B, 0.8, (0, 0, 0.5), (1.1, 0.9, 0.85), 1)
    rock(B, 0.35, (0.75, -0.3, 0.15), (1, 1, 0.7), 4, moss=False)


def rock_b(B):
    rock(B, 0.7, (0, 0, 1.1), (0.85, 0.75, 1.75), 7, m="stone_dark")
    rock(B, 0.5, (0.55, 0.2, 0.35), (1, 0.9, 0.9), 8)
    rock(B, 0.3, (-0.5, -0.3, 0.18), (1, 1, 0.8), 9, moss=False)


def rock_c(B):
    rock(B, 0.55, (-0.5, 0, 0.3), (1.2, 1.0, 0.7), 12, m="stone_warm")
    rock(B, 0.45, (0.55, 0.15, 0.25), (1.0, 1.1, 0.75), 13, m="stone_warm")
    rock(B, 0.3, (0.1, -0.5, 0.15), (1.1, 1.0, 0.7), 14, moss=False, m="stone_warm")


def crystal(B):
    rock(B, 0.5, (0, 0, 0.12), (1.2, 1.1, 0.45), 21, moss=False, m="stone_dark")
    rnd = random.Random(4)
    specs = [(0.16, 1.5, 0, 0, 0), (0.11, 1.0, 25, 40, 0.12), (0.12, 1.1, 28, 160, 0.12),
             (0.09, 0.8, 35, 270, 0.15), (0.07, 0.55, 50, 100, 0.25), (0.08, 0.6, 45, 210, 0.25),
             (0.06, 0.45, 55, 320, 0.3)]
    for r, h, tilt, az, off in specs:
        M = xform((0, 0, 0.1), (0, 0, az)) @ xform((off, 0, 0), (0, tilt, 0))
        B.crystal(r, h, matrix=M, m="crystal_cyan", segs=6)


def pillar_ruin(B):
    stone_block(B, (1.2, 1.2, 0.3), (0, 0, 0.15), m="stone_warm")
    stone_block(B, (1.0, 1.0, 0.25), (0, 0, 0.42), m="stone_warm")
    B.lathe([(0.42, 0.55), (0.4, 0.7), (0.37, 2.4), (0.36, 2.9)], m="stone_warm", segs=12,
            smooth=False)
    # broken jagged top
    pts = []
    for k in range(12):
        a = 2 * math.pi * k / 12
        pts.append((math.cos(a) * 0.36, math.sin(a) * 0.36))
    tb = Builder()
    tb.poly(pts, 0.2, m="stone_warm", smooth=False)
    B.merge(tb, xform((0, 0, 2.95), (6, 4, 0)))
    for k, (h, a) in enumerate(((0.45, 20), (0.25, 140), (0.6, 250))):
        stone_block(B, (0.3, 0.25, h), (math.cos(math.radians(a)) * 0.18,
                                         math.sin(math.radians(a)) * 0.18, 3.0 + h / 2 - 0.05),
                    rot=(5, -8, a), m="stone_warm", bevel=0.03)
    for k in range(12):
        a = 2 * math.pi * k / 12
        B.box((0.05, 0.05, 2.2), loc=(math.cos(a) * 0.375, math.sin(a) * 0.375, 1.7),
              rot=(0, 0, math.degrees(a)), m="stone", smooth=False)
    B.sphere(0.4, loc=(0.1, 0, 0.62), scale=(1.4, 1.4, 0.3), m="moss", ico=1, jitter=0.2,
             smooth=False)
    stone_block(B, (0.7, 0.55, 0.5), (1.0, 0.6, 0.25), rot=(0, 10, 30), m="stone_warm")
    B.cyl(0.36, 0.36, 0.7, loc=(-0.9, 0.8, 0.33), rot=(90, 0, 40), m="stone_warm", segs=12,
          smooth=False)


def arch_ruin(B):
    for s in (-1, 1):
        stone_block(B, (1.0, 1.0, 0.4), (s * 2.0, 0, 0.2), m="stone_warm")
        for k in range(4 if s < 0 else 3):
            stone_block(B, (0.75, 0.75, 0.62), (s * 2.0, 0, 0.71 + k * 0.62),
                        rot=(0, 0, (k % 2) * 4 - 2), m="stone_warm" if k % 2 else "stone")
    R0, R1 = 1.6, 2.4
    cz = 3.1
    n = 11
    for k in range(n):
        if k >= n - 3:
            continue
        a0 = math.pi * k / n
        a1 = math.pi * (k + 1) / n
        am = (a0 + a1) / 2
        rm = (R0 + R1) / 2
        p = V((-math.cos(am) * rm, 0, cz + math.sin(am) * rm))
        w = (a1 - a0) * rm * 0.96
        stone_block(B, (w, 0.75, R1 - R0), p, rot=(0, -(90 - math.degrees(am)), 0) if False else
                    (0, math.degrees(am) - 90, 0), m="stone_warm" if k % 2 else "stone",
                    bevel=0.04)
    stone_block(B, (0.6, 0.6, 0.55), (2.3, -0.8, 0.27), rot=(20, 10, 35), m="stone_warm")
    stone_block(B, (0.5, 0.7, 0.4), (1.5, 0.9, 0.2), rot=(0, 15, 70), m="stone")
    B.sphere(0.5, loc=(-2.0, 0, 3.2), scale=(1.0, 1.0, 0.25), m="moss", ico=1, jitter=0.2,
             smooth=False)


# ---------------------------------------------------------------------------
# town props
# ---------------------------------------------------------------------------
def lantern(B):
    st = "stone"
    B.lathe([(0.3, 0.0), (0.3, 0.1), (0.22, 0.18), (0.14, 0.24)], m=st, segs=6, smooth=False)
    B.cyl(0.1, 0.09, 0.55, loc=(0, 0, 0.5), m=st, segs=8, smooth=False)
    B.lathe([(0.12, 0.76), (0.3, 0.84), (0.3, 0.92), (0.12, 0.94)], m=st, segs=6, smooth=False)
    B.cyl(0.21, 0.21, 0.32, loc=(0, 0, 1.1), m="paper", segs=6, smooth=False)
    for k in range(6):
        a = math.radians(k * 60)
        B.box((0.06, 0.06, 0.34), loc=(math.cos(a) * 0.21, math.sin(a) * 0.21, 1.1), m=st,
              smooth=False)
    B.cyl(0.12, 0.12, 0.25, loc=(0, 0, 1.1), m="glow_warm", segs=6, smooth=False)
    B.lathe([(0.0, 1.25), (0.42, 1.25), (0.46, 1.3), (0.3, 1.38), (0.12, 1.47), (0.06, 1.5)],
            m=st, segs=6, smooth=False)
    for k in range(6):
        a = math.radians(k * 60)
        B.cyl(0.04, 0.0, 0.12, matrix=basis(z=(math.cos(a), math.sin(a), 0.9), x=(0, 0, 1),
                                              loc=(math.cos(a) * 0.43, math.sin(a) * 0.43, 1.3)),
              m=st, segs=4, smooth=False)
    B.sphere(0.07, loc=(0, 0, 1.55), m=st, segs=8, rings=6)
    B.cyl(0.04, 0.0, 0.1, loc=(0, 0, 1.64), m=st, segs=6, smooth=False)


def house(B):
    stone_block(B, (6.6, 5.6, 0.45), (0, 0, 0.22), m="stone_warm", bevel=0.06)
    stone_block(B, (1.6, 0.6, 0.22), (0, -2.95, 0.11), m="stone_warm")
    W, D, H = 5.6, 4.6, 2.7
    B.box((W, D, H), loc=(0, 0, 0.45 + H / 2), m="plaster", bevel=0.02, seg=1)
    for x in (-W / 2, -W / 6, W / 6, W / 2):
        for y in (-D / 2, D / 2):
            B.box((0.2, 0.2, H + 0.1), loc=(x, y, 0.45 + H / 2), m="wood_dark", bevel=0.02, seg=1)
    for y in (-D / 2 + D / 3, D / 2 - D / 3):
        for x in (-W / 2, W / 2):
            B.box((0.2, 0.2, H + 0.1), loc=(x, y, 0.45 + H / 2), m="wood_dark", bevel=0.02, seg=1)
    for z in (0.6, 0.45 + H * 0.62, 0.45 + H - 0.05):
        B.box((W + 0.1, 0.16, 0.16), loc=(0, -D / 2 - 0.03, z), m="wood_dark", bevel=0.02, seg=1)
        B.box((W + 0.1, 0.16, 0.16), loc=(0, D / 2 + 0.03, z), m="wood_dark", bevel=0.02, seg=1)
        B.box((0.16, D + 0.1, 0.16), loc=(-W / 2 - 0.03, 0, z), m="wood_dark", bevel=0.02, seg=1)
        B.box((0.16, D + 0.1, 0.16), loc=(W / 2 + 0.03, 0, z), m="wood_dark", bevel=0.02, seg=1)
    # door + windows
    B.box((1.4, 0.08, 2.0), loc=(0, -D / 2 - 0.04, 0.45 + 1.0), m="paper", bevel=0.01, seg=1)
    for x in (-0.35, 0.35):
        B.box((0.06, 0.12, 2.0), loc=(x, -D / 2 - 0.06, 1.45), m="wood_dark", smooth=False)
    B.box((1.4, 0.12, 0.06), loc=(0, -D / 2 - 0.06, 1.45), m="wood_dark", smooth=False)
    for sx in (-1, 1):
        cx = sx * W / 3
        B.box((0.9, 0.08, 0.7), loc=(cx, -D / 2 - 0.04, 2.1), m="paper", smooth=False)
        for k in (-1, 0, 1):
            B.box((0.04, 0.11, 0.7), loc=(cx + k * 0.22, -D / 2 - 0.06, 2.1), m="wood_dark",
                  smooth=False)
        B.box((0.9, 0.11, 0.04), loc=(cx, -D / 2 - 0.06, 2.1), m="wood_dark", smooth=False)
        B.box((0.9, 0.08, 0.7), loc=(sx * (W / 2 + 0.04), 0, 2.1), rot=(0, 0, 90), m="paper",
              smooth=False)
    # noren curtain + lanterns
    define("noren", color="#22305a", rough=0.8)
    B.box((1.5, 0.03, 0.5), loc=(0, -D / 2 - 0.15, 2.25), m="noren", bevel=0.005)
    for sx in (-1, 1):
        B.sphere(0.18, loc=(sx * 1.0, -D / 2 - 0.4, 2.5), scale=(1, 1, 1.3), m="glow_warm",
                 segs=10, rings=8)
        B.cyl(0.1, 0.1, 0.05, loc=(sx * 1.0, -D / 2 - 0.4, 2.75), m="wood_dark", segs=8)
        B.cyl(0.1, 0.1, 0.05, loc=(sx * 1.0, -D / 2 - 0.4, 2.25), m="wood_dark", segs=8)
        B.box((0.06, 0.45, 0.06), loc=(sx * 1.0, -D / 2 - 0.2, 2.82), m="wood_dark",
              smooth=False)
    hip_roof(B, 3.6, 3.05, 5.0, 1.8, ridge=1.3, curl=0.4)


def pagoda(B):
    stone_block(B, (6.8, 6.8, 0.4), (0, 0, 0.2), m="stone_warm")
    stone_block(B, (6.0, 6.0, 0.4), (0, 0, 0.6), m="stone_warm")
    stone_block(B, (2.0, 1.2, 0.4), (0, -3.6, 0.2), m="stone_warm")
    z = 0.8
    tiers = [(4.6, 2.4, 3.5, 1.3), (3.6, 1.9, 2.85, 1.1), (2.8, 1.6, 2.2, 0.95)]
    for i, (w, h, rw, rh) in enumerate(tiers):
        B.box((w, w, h), loc=(0, 0, z + h / 2), m="plaster", bevel=0.02, seg=1)
        n = 4
        for k in range(n + 1):
            t = -w / 2 + w * k / n
            for (x, y) in ((t, -w / 2), (t, w / 2), (-w / 2, t), (w / 2, t)):
                B.box((0.18, 0.18, h), loc=(x, y, z + h / 2), m="wood_red", smooth=False)
        for s in (-1, 1):
            B.box((w + 0.1, 0.16, 0.2), loc=(0, s * (w / 2 + 0.02), z + h - 0.1), m="wood_red",
                  smooth=False)
            B.box((0.16, w + 0.1, 0.2), loc=(s * (w / 2 + 0.02), 0, z + h - 0.1), m="wood_red",
                  smooth=False)
            B.box((w * 0.3, 0.06, h * 0.55), loc=(0, s * (w / 2 + 0.03), z + h * 0.45),
                  m="paper", smooth=False)
            B.box((0.06, w * 0.3, h * 0.55), loc=(s * (w / 2 + 0.03), 0, z + h * 0.45),
                  m="paper", smooth=False)
        if i > 0:
            # balcony rail
            bw = w / 2 + 0.35
            for s in (-1, 1):
                B.box((bw * 2, 0.08, 0.08), loc=(0, s * bw, z + 0.5), m="wood_red", smooth=False)
                B.box((0.08, bw * 2, 0.08), loc=(s * bw, 0, z + 0.5), m="wood_red", smooth=False)
                for k in range(5):
                    t = -bw + 2 * bw * k / 4
                    B.box((0.06, 0.06, 0.5), loc=(t, s * bw, z + 0.25), m="wood_red", smooth=False)
                    B.box((0.06, 0.06, 0.5), loc=(s * bw, t, z + 0.25), m="wood_red", smooth=False)
            B.box((bw * 2, bw * 2, 0.1), loc=(0, 0, z + 0.02), m="wood_dark", smooth=False)
        z += h
        hip_roof(B, rw, rw, z + rh, rh, ridge=0.0, curl=0.5, thick=0.16, tiles=False,
                 loc=(0, 0, 0), nu=6, nv=4, hip_pts=5)
        z += rh * 0.55
    top = z + 0.45
    B.cyl(0.08, 0.06, 2.6, loc=(0, 0, top + 1.0), m="gold", segs=8)
    for k in range(7):
        B.cyl(0.24 - k * 0.02, 0.24 - k * 0.02, 0.06, loc=(0, 0, top + 0.1 + k * 0.25),
              m="gold", segs=10, bevel=0.015, seg=1)
    B.gem(0.18, loc=(0, 0, top + 2.4), m="glow_warm", segs=8, h_top=0.18, h_bot=0.3)
    B.torus(0.3, 0.025, loc=(0, 0, top + 2.4), rot=(90, 0, 0), m="gold", segs=20, rsegs=5)


def forge(B):
    # furnace
    for k in range(3):
        stone_block(B, (1.8 - k * 0.15, 1.6 - k * 0.1, 0.45), (-0.9, 0.3, 0.22 + k * 0.45),
                    rot=(0, 0, k * 2 - 2), m="stone_dark" if k % 2 else "stone")
    # glowing mouth (arched opening) on the front face
    mouth = [(-0.38, 0.0), (0.38, 0.0), (0.38, 0.4), (0.27, 0.62), (0.0, 0.72), (-0.27, 0.62),
             (-0.38, 0.4)]
    B.poly(mouth, 0.06, matrix=basis(x=(1, 0, 0), y=(0, 0, 1), loc=(-0.9, -0.5, 0.25)),
           m="glow_coal", smooth=False)
    for k in range(9):
        a = math.pi * k / 8
        B.box((0.16, 0.14, 0.16), loc=(-0.9 + math.cos(a) * 0.47, -0.55,
                                        0.25 + min(0.4, 0.4 * 1.0) * 0 + 0.36 + math.sin(a) * 0.45),
              rot=(0, -math.degrees(a) + 90, 0), m="stone_dark", smooth=False)
    stone_block(B, (1.0, 0.35, 0.12), (-0.9, -0.65, 0.2), m="stone_dark")
    for k in range(5):
        B.sphere(0.07, loc=(-1.1 + k * 0.1, -0.62, 0.3 + (k % 2) * 0.03), m="glow_coal", ico=1,
                 smooth=False)
    B.cyl(0.35, 0.25, 2.2, loc=(-1.05, 0.55, 2.1), m="stone_dark", segs=8, smooth=False)
    B.cyl(0.4, 0.4, 0.15, loc=(-1.05, 0.55, 3.2), m="stone", segs=8, smooth=False)
    # anvil on stump
    B.cyl(0.32, 0.36, 0.55, loc=(0.6, -0.2, 0.27), m="wood", segs=10, smooth=False)
    B.cyl(0.31, 0.31, 0.02, loc=(0.6, -0.2, 0.555), m="wood_dark", segs=10, smooth=False)
    B.box((0.3, 0.24, 0.2), loc=(0.6, -0.2, 0.66), m="iron", bevel=0.03, taper=(0.75, 0.75))
    B.box((0.55, 0.26, 0.14), loc=(0.6, -0.2, 0.83), m="iron", bevel=0.03)
    B.cyl(0.12, 0.0, 0.32, loc=(0.97, -0.2, 0.84), rot=(0, 90, 0), m="iron", segs=8,
          scale=(1, 1.0, 1))
    B.sphere(0.08, loc=(0.55, -0.2, 0.93), scale=(1, 0.6, 0.3), m="glow_coal", segs=8, rings=4)
    # weapon rack
    for x in (1.4, 2.2):
        B.box((0.1, 0.1, 1.6), loc=(x, 0.6, 0.8), m="wood_dark", bevel=0.015)
    B.box((0.95, 0.08, 0.08), loc=(1.8, 0.6, 1.45), m="wood_dark", bevel=0.01)
    B.box((0.95, 0.3, 0.06), loc=(1.8, 0.65, 0.1), m="wood_dark", bevel=0.01)
    for k, x in enumerate((1.55, 1.8, 2.05)):
        B.blade([(0.12, 0.035, 0.007, 0), (0.95, 0.03, 0.006, 0), (1.05, 0, 0, 0)], m="steel",
                edge_m="silver", matrix=xform((x, 0.55, 0.15), (-12, 0, 0)))
        B.box((0.18, 0.04, 0.03), loc=(x, 0.53, 0.27), rot=(-12, 0, 0), m="gold" if k == 1 else
              "iron", bevel=0.008)
        B.cyl(0.018, 0.018, 0.14, loc=(x, 0.56, 0.18), rot=(-12, 0, 0), m="leather", segs=6)
    # water barrel
    B.lathe([(0.0, 0.0), (0.3, 0.0), (0.34, 0.3), (0.3, 0.6), (0.0, 0.6)], loc=(0.2, 0.75, 0),
            m="wood", segs=12)
    B.cyl(0.29, 0.29, 0.02, loc=(0.2, 0.75, 0.56), m="water", segs=12)
    for z in (0.1, 0.5):
        B.torus(0.33, 0.02, loc=(0.2, 0.75, z), m="iron", segs=16, rsegs=4)
    B.cyl(0.02, 0.02, 0.4, loc=(0.6, -0.5, 0.9), rot=(0, 70, 30), m="wood", segs=6)
    B.box((0.12, 0.06, 0.07), loc=(0.78, -0.43, 0.97), rot=(0, 70, 30), m="iron", bevel=0.01)


def torii(B, w=4.8, h=6.0, red="wood_red"):
    for s in (-1, 1):
        B.cyl(0.24, 0.2, h - 0.6, loc=(s * w / 2, 0, (h - 0.6) / 2), m=red, segs=12)
        B.cyl(0.3, 0.3, 0.4, loc=(s * w / 2, 0, 0.2), m="black_metal", segs=12, bevel=0.03)
    B.box((w + 0.9, 0.25, 0.35), loc=(0, 0, h * 0.72), m=red, bevel=0.03)
    pts = []
    for k in range(13):
        u = -1 + 2 * k / 12
        pts.append(V((u * (w / 2 + 1.0), 0, h - 0.35 + 0.35 * abs(u) ** 2.2)))
    B.sweep(pts, 0.22, m=red, segs=8, scale=(1.0, 0.75), up=(0, 1, 0))
    B.sweep([p + V((0, 0, 0.22)) for p in pts], 0.2, m="black_metal", segs=8, scale=(1.3, 0.55),
            up=(0, 1, 0))
    B.box((0.7, 0.12, 0.9), loc=(0, -0.1, h * 0.72 + 0.62), m="black_metal", bevel=0.03)
    B.box((0.5, 0.14, 0.7), loc=(0, -0.12, h * 0.72 + 0.62), m="gold", bevel=0.02)


def torii_prop(B):
    torii(B)


def fence(B):
    for x in (-1.45, 0.0, 1.45):
        B.box((0.14, 0.14, 1.15), loc=(x, 0, 0.575), m="wood_dark", bevel=0.02)
        B.cyl(0.0, 0.0, 0.0, loc=(x, 0, 1.2), m="wood_dark", segs=4) if False else None
        B.box((0.18, 0.18, 0.06), loc=(x, 0, 1.18), m="wood_dark", bevel=0.02, taper=(0.5, 0.5))
    for z in (0.45, 0.95):
        B.box((3.0, 0.08, 0.1), loc=(0, 0, z), m="wood", bevel=0.015)
    for k in range(14):
        x = -1.35 + k * (2.7 / 13)
        if abs(x) < 0.1:
            continue
        B.cyl(0.03, 0.03, 0.9, loc=(x, 0.06, 0.5), m="bamboo", segs=6)


def gacha_shrine(B):
    # octagonal stepped platform
    for k, (r, h) in enumerate(((2.6, 0.3), (2.2, 0.3), (1.8, 0.3))):
        B.cyl(r, r, h, loc=(0, 0, h / 2 + k * 0.3), m="stone_warm" if k % 2 else "stone",
              segs=8, bevel=0.04, seg=1, smooth=False, rot=(0, 0, 22.5))
        B.torus(r + 0.01, 0.03, loc=(0, 0, (k + 1) * 0.3 - 0.02), m="gold", segs=8, rsegs=4,
                rot=(0, 0, 22.5), smooth=False)
    # altar pedestal
    B.lathe([(0.7, 0.9), (0.75, 1.0), (0.5, 1.1), (0.4, 1.5), (0.6, 1.7), (0.65, 1.8),
             (0.0, 1.8)], m="stone_warm", segs=8, smooth=False)
    B.torus(0.62, 0.04, loc=(0, 0, 1.75), m="gold", segs=16, rsegs=5)
    B.lathe([(0.0, 1.8), (0.4, 1.8), (0.5, 1.9), (0.3, 1.95), (0.0, 1.95)], m="gold", segs=12)
    # torii frame behind
    tb = Builder()
    torii(tb, w=3.6, h=5.0)
    B.merge(tb, xform((0, 1.4, 0.9)))
    # side lanterns
    for s in (-1, 1):
        lb = Builder()
        lantern(lb)
        B.merge(lb, xform((s * 1.9, -0.9, 0.3), (0, 0, 0), 0.9))


def gacha_float(B):
    c = V((0, 0, 0))
    B.lathe([(0, -0.75), (0.42, 0.0), (0.33, 0.45), (0, 0.85)], loc=c, m="crystal_gacha", segs=8,
            smooth=False)
    B.torus(0.75, 0.04, loc=c, rot=(70, 0, 20), m="gold", segs=32, rsegs=5)
    B.torus(0.9, 0.025, loc=c, rot=(-60, 20, 0), m="gold", segs=32, rsegs=5)
    B.torus(0.62, 0.02, loc=c, rot=(0, 0, 0), m="glow_holy", segs=32, rsegs=4)
    for k in range(6):
        a = math.radians(60 * k)
        B.lathe([(0, -0.15), (0.07, 0.0), (0, 0.18)],
                loc=c + V((math.cos(a) * 1.1, math.sin(a) * 1.1, 0.25 * math.sin(a * 2))),
                m="crystal_gacha2" if k % 2 else "crystal_gacha", segs=5, smooth=False)


def portal(B):
    stone_block(B, (5.6, 2.0, 0.3), (0, 0, 0.15), m="stone_dark")
    stone_block(B, (4.6, 1.6, 0.3), (0, 0, 0.45), m="stone")
    cz = 2.85
    R0, R1 = 1.85, 2.35
    n = 16
    for k in range(n):
        a = 2 * math.pi * (k + 0.5) / n
        rm = (R0 + R1) / 2
        p = V((math.cos(a) * rm, 0, cz + math.sin(a) * rm))
        w = 2 * math.pi * rm / n * 0.94
        stone_block(B, (w, 0.7, R1 - R0), p, rot=(0, -math.degrees(a) + 90, 0),
                    m="stone" if k % 2 else "stone_dark", bevel=0.05)
    for k in range(4):
        a = math.pi / 2 + k * math.pi / 2
        p = V((math.cos(a) * 2.4, 0, cz + math.sin(a) * 2.4))
        stone_block(B, (0.55, 0.8, 0.5), p, rot=(0, -math.degrees(a) + 90, 0), m="stone_warm",
                    bevel=0.06)
        B.gem(0.12, loc=p + V((0, -0.42, 0)), rot=(90, 0, 0), m="glow_portal", segs=6)
    B.torus(1.82, 0.05, loc=(0, 0, cz), rot=(90, 0, 0), m="glow_portal", segs=48, rsegs=6)
    B.torus(1.82, 0.05, loc=(0, 0.25, cz), rot=(90, 0, 0), m="glow_portal_cyan", segs=48, rsegs=6)
    B.torus(1.82, 0.05, loc=(0, -0.25, cz), rot=(90, 0, 0), m="glow_portal_cyan", segs=48,
            rsegs=6)
    for k in range(16):
        a = 2 * math.pi * k / 16
        p = V((math.cos(a) * 2.1, -0.36, cz + math.sin(a) * 2.1))
        rot = (90, 0, 0)
        if k % 2:
            B.box((0.06, 0.02, 0.22), loc=p, rot=(0, -math.degrees(a), 0), m="glow_portal",
                  smooth=False)
            B.box((0.16, 0.02, 0.05), loc=p, rot=(0, -math.degrees(a), 0), m="glow_portal",
                  smooth=False)
        else:
            B.box((0.12, 0.02, 0.12), loc=p, rot=(0, 45 - math.degrees(a), 0), m="glow_portal",
                  smooth=False)
    for s in (-1, 1):
        stone_block(B, (0.7, 0.9, 1.2), (s * 2.4, 0, 1.2), m="stone_dark")


def bridge(B):
    L_, H = 8.0, 1.2
    n = 24

    def deck(x):
        return H * (1 - (2 * x / L_) ** 2) + 0.25

    for k in range(n):
        x0 = -L_ / 2 + L_ * k / n
        x1 = -L_ / 2 + L_ * (k + 1) / n
        xm = (x0 + x1) / 2
        ang = math.degrees(math.atan2(deck(x1) - deck(x0), x1 - x0))
        B.box((L_ / n * 0.95, 2.0, 0.12), loc=(xm, 0, deck(xm)), rot=(0, -ang, 0),
              m="wood" if k % 2 else "wood_dark", smooth=False)
    for s in (-1, 1):
        pts = [V((-L_ / 2 + L_ * k / 16, s * 1.0, deck(-L_ / 2 + L_ * k / 16) + 0.85))
               for k in range(17)]
        B.sweep(pts, 0.05, m="wood_red", segs=5)
        pts2 = [p - V((0, 0, 0.45)) for p in pts]
        B.sweep(pts2, 0.035, m="wood_red", segs=4)
        for k in range(9):
            x = -L_ / 2 + L_ * k / 8
            z0 = deck(x)
            B.box((0.12, 0.12, 0.95), loc=(x, s * 1.0, z0 + 0.45), m="wood_red", smooth=False)
            B.sphere(0.08, loc=(x, s * 1.0, z0 + 0.98), scale=(1, 1, 1.4), m="gold", segs=8,
                     rings=6)
        for x in (-2.0, 0.0, 2.0):
            B.box((0.25, 0.25, deck(x)), loc=(x, s * 0.85, deck(x) / 2 - 0.05), m="wood_dark",
                  bevel=0.02)


PROPS = {
    "tree_oak": tree_oak, "tree_pine": tree_pine, "tree_sakura": tree_sakura,
    "rock_a": rock_a, "rock_b": rock_b, "rock_c": rock_c, "crystal": crystal,
    "pillar_ruin": pillar_ruin, "arch_ruin": arch_ruin, "lantern": lantern, "house": house,
    "pagoda": pagoda, "forge": forge, "gacha_shrine": gacha_shrine, "portal": portal,
    "fence": fence, "torii": torii_prop, "bridge": bridge,
}


def prop_objects(pid, loc=(0, 0, 0), rot_z=0.0, scale=1.0):
    """Build prop into the current scene; returns list of objects (main mesh first)."""
    _mats()
    B = Builder()
    PROPS[pid](B)
    ob = B.to_object(pid)
    objs = [ob]
    if pid == "gacha_shrine":
        F = Builder()
        gacha_float(F)
        fo = F.to_object("gacha_crystal")
        fo.parent = ob
        fo.location = (0, 0, 3.0)
        objs.append(fo)
    ob.location = loc
    ob.rotation_euler = (0, 0, math.radians(rot_z))
    ob.scale = (scale, scale, scale)
    return objs


def build(pid):
    reset_scene()
    prop_objects(pid)
    return export_glb("models/props/%s.glb" % pid)
