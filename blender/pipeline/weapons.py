"""Procedural weapons. Origin = grip point, blade along +Z, width along X, thickness along Y.
Each builder fills a Builder and returns dict(tip=Vector, base=Vector)."""
import math

from mathutils import Vector

from .core import Builder, basis, empty, export_glb, glow, define, reset_scene, xform

# ---------------------------------------------------------------------------
# element materials
# ---------------------------------------------------------------------------


def _mats():
    glow("glow_green", "#5cff7a", 4.0)
    glow("glow_sapphire", "#3a7bff", 3.5, color="#5e9bff")
    glow("glow_sapphire_soft", "#3a7bff", 1.6, color="#2a4f9e")
    glow("glow_fire", "#ff5a14", 6.0, color="#ffb060")
    glow("glow_fire_soft", "#ff4a10", 2.5, color="#ff7a30")
    glow("glow_lava", "#ff6a10", 7.0, color="#ffa040")
    glow("glow_ice", "#5ef2ff", 5.0, color="#c8fbff")
    define("ice_crystal", color="#a8ecff", rough=0.06, emit="#40d8ff", strength=2.2)
    glow("glow_electric", "#4aa8ff", 6.0, color="#c8e6ff")
    glow("glow_violet", "#9a5cff", 6.0, color="#d8c4ff")
    glow("glow_holy", "#ffd25a", 5.0, color="#fff1c0")
    glow("glow_holy_white", "#fff4d0", 6.0, color="#ffffff")
    glow("glow_abyss", "#e0185a", 5.5, color="#ff5a8a")
    glow("glow_abyss_violet", "#8a20ff", 5.0, color="#c08aff")
    glow("glow_moon", "#bff6ff", 5.0, color="#f0fdff")
    define("ember_steel", color="#5a2a24", metal=1.0, rough=0.32)
    define("frost_metal", color="#bfdcef", metal=1.0, rough=0.25)
    define("storm_metal", color="#3a3f5c", metal=1.0, rough=0.3)
    define("moon_silver", color="#e8eef6", metal=1.0, rough=0.16)
    define("enamel_blue", color="#1b3d8f", metal=0.5, rough=0.3)
    define("bone", color="#e6dcc3", rough=0.6)
    define("fang", color="#efe6cf", rough=0.45)
    define("phoenix_core", color="#f2b54a", metal=1.0, rough=0.25)
    for i, (c, s) in enumerate((("#ffe27a", 4.0), ("#ffc040", 4.5), ("#ff8a26", 5.0),
                                ("#ff5020", 5.5), ("#e8203a", 6.0))):
        glow("glow_phoenix_%d" % i, c, s)


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------


def grip(B, z0, z1, r, wrap="leather_dark", ring="gold", ridges=6, segs=10, rings=True):
    prof = [(0, z0)]
    n = ridges * 2
    for i in range(n + 1):
        z = z0 + (z1 - z0) * i / n
        prof.append((r * (1.09 if i % 2 else 0.95), z))
    prof.append((0, z1))
    B.lathe(prof, m=wrap, segs=segs, angle=70)
    if rings:
        for z in (z0, z1):
            B.cyl(r * 1.3, r * 1.3, 0.014, loc=(0, 0, z), m=ring, segs=segs, bevel=0.003, seg=1)


def straight_blade(B, z0, z1, w0, w1, t, core, edge, tip=0.12, frac=0.78):
    st = [(z0, w0, t, 0), (z0 + (z1 - z0) * 0.35, (w0 + w1) * 0.5, t * 0.95, 0),
          (z1 - tip, w1, t * 0.9, 0), (z1 - tip * 0.45, w1 * 0.62, t * 0.7, 0), (z1, 0, 0, 0)]
    B.blade(st, m=core, edge_m=edge, edge_frac=frac)


def curved_stations(z0, z1, w0, wmax, t, curve, n=10, tip_len=0.1, swell=0.75, tip_back=0.6):
    st = []
    L = z1 - z0
    for i in range(n):
        u = i / (n - 1)
        z = z0 + (L - tip_len) * u
        w = w0 + (wmax - w0) * min(1.0, u / swell)
        xo = -curve * u * u
        st.append((z, w, t * (1 - 0.25 * u), xo))
    zt, wt, tt, xt = st[-1]
    st.append((zt + tip_len * 0.55, wt * 0.6, tt * 0.75, xt - wt * 0.15))
    st.append((z1, 0, 0, xt - wt * tip_back))
    return st


def feather(B, origin, ang, L, w, m, thick=0.006, mirror=True, droop=0.0):
    a = math.radians(ang)
    d = Vector((math.cos(a), 0, math.sin(a)))
    pts = [(0, -w * 0.35), (L * 0.25, -w * 0.7), (L * 0.75, -w * 0.55), (L, 0.0),
           (L * 0.7, w * 0.6 + droop), (L * 0.2, w * 0.55)]
    M = basis(x=d, z=(0, 1, 0), loc=origin)
    B.poly(pts, thick, matrix=M, m=m, bevel=0.0015, seg=1, mirror=mirror,
           thick_fn=lambda x, y: thick * (1.0 - 0.6 * x / L))


def crescent_pts(R, n=14, k=0.8, k2=0.9, a0=-140, a1=140):
    c = 0.766 * (k - 1)
    pts = []
    for i in range(n + 1):
        a = math.radians(a0 + (a1 - a0) * i / n)
        pts.append((R * math.cos(a), R * math.sin(a)))
    for i in range(n, -1, -1):
        a = math.radians(a0 + (a1 - a0) * i / n)
        pts.append((R * (c + k * math.cos(a)), R * k2 * math.sin(a)))
    return pts


def bolt_pts(L, w):
    """zig-zag lightning bolt outline along +X."""
    return [(0, -w * 0.5), (L * 0.45, -w * 0.2), (L * 0.38, -w * 0.9), (L, w * 0.3),
            (L * 0.55, w * 0.05), (L * 0.62, w * 0.8), (0, w * 0.5)]


def flame_pts(L, w):
    return [(0, -w), (L * 0.35, -w * 0.9), (L * 0.6, -w * 0.3), (L * 0.55, -w * 0.75),
            (L, 0), (L * 0.7, w * 0.55), (L * 0.75, w * 0.15), (L * 0.4, w * 0.9), (0, w)]


def rune_column(B, z0, z1, step, y, m, w=0.008, glyph=0.012):
    z = z0
    i = 0
    while z < z1:
        if i % 3 == 0:
            B.box((w, 0.002, glyph), loc=(0, y, z), m=m, smooth=False)
        elif i % 3 == 1:
            B.box((glyph, 0.002, w * 0.6), loc=(0, y, z), m=m, smooth=False)
            B.box((w * 0.6, 0.002, glyph * 0.8), loc=(0, y, z), m=m, smooth=False)
        else:
            B.box((w * 1.1, 0.002, w * 1.1), loc=(0, y, z), rot=(0, 45, 0), m=m, smooth=False)
        z += step
        i += 1


def ring_of(B, n, fn):
    for i in range(n):
        fn(360.0 * i / n)


# ---------------------------------------------------------------------------
# weapons
# ---------------------------------------------------------------------------


def iron_sword(B):
    grip(B, -0.1, 0.065, 0.016, "leather", "iron")
    B.sphere(0.03, loc=(0, 0, -0.128), scale=(1, 0.75, 0.85), m="iron", segs=12, rings=8)
    B.box((0.21, 0.034, 0.026), loc=(0, 0, 0.082), m="iron", bevel=0.007)
    B.box((0.05, 0.042, 0.038), loc=(0, 0, 0.082), m="iron", bevel=0.009)
    straight_blade(B, 0.095, 0.87, 0.026, 0.022, 0.006, "steel", "silver", tip=0.1)
    return dict(tip=(0, 0, 0.87), base=(0, 0, 0.1))


def bronze_axe(B):
    B.cyl(0.0195, 0.017, 0.88, loc=(0, 0, 0.2), m="wood", segs=10, angle=60)
    grip(B, -0.09, 0.08, 0.0205, "leather", "bronze", ridges=5)
    B.cyl(0.024, 0.02, 0.03, loc=(0, 0, -0.245), m="bronze", segs=10, bevel=0.004)
    pts = [(0.02, -0.045), (0.08, -0.055), (0.15, -0.115), (0.19, -0.07), (0.205, 0.0),
           (0.19, 0.075), (0.155, 0.125), (0.08, 0.055), (0.02, 0.05), (-0.03, 0.04),
           (-0.075, 0.026), (-0.085, 0.0), (-0.075, -0.026), (-0.03, -0.04)]
    B.poly(pts, 0.03, loc=(0, 0, 0.55), rot=(90, 0, 0), m="bronze", bevel=0.004,
           thick_fn=lambda x, y: 0.034 if x < 0.06 else max(0.006, 0.034 - (x - 0.06) * 0.2))
    B.cyl(0.03, 0.03, 0.12, loc=(0, 0, 0.55), m="bronze", segs=10, bevel=0.006)
    B.sphere(0.024, loc=(0, 0, 0.645), m="bronze", segs=10, rings=6)
    return dict(tip=(0, 0, 0.67), base=(0, 0, 0.45))


def oak_staff(B):
    pts, rad = [], []
    n = 18
    for i in range(n + 1):
        z = -0.62 + 1.52 * i / n
        pts.append((0.012 * math.sin(z * 7.0), 0.01 * math.cos(z * 5.0), z))
        r = 0.021 + 0.006 * (i / n)
        if i in (4, 9, 13):
            r += 0.007
        rad.append(r)
    B.sweep(pts, rad, m="wood", segs=8, angle=60)
    B.cyl(0.024, 0.022, 0.05, loc=(0, 0, -0.62), m="iron", segs=8, bevel=0.004)
    top = Vector(pts[-1])
    for k in range(3):
        a = math.radians(120 * k + 20)
        d = Vector((math.cos(a), math.sin(a), 0))
        p = [top + Vector((0, 0, -0.04)), top + d * 0.03 + Vector((0, 0, 0.03)),
             top + d * 0.06 + Vector((0, 0, 0.09)), top + d * 0.045 + Vector((0, 0, 0.15)),
             top + d * 0.012 + Vector((0, 0, 0.18))]
        B.sweep(p, [0.02, 0.016, 0.013, 0.009, 0.0], m="wood", segs=7, angle=60)
    B.gem(0.035, loc=top + Vector((0, 0, 0.1)), m="glow_green", segs=8)
    for k in range(3):
        a = 120 * k + 70
        B.poly([(0, 0), (0.03, -0.015), (0.07, 0), (0.03, 0.016)], 0.003,
               matrix=xform(top + Vector((0, 0, -0.06 - 0.03 * k)), (90, 0, a)) @ xform(
                   (0.015, 0, 0), (0, -25, 0)), m="leaf", bevel=0.0)
    return dict(tip=top + Vector((0, 0, 0.17)), base=top + Vector((0, 0, -0.02)))


def knight_blade(B):
    grip(B, -0.12, 0.07, 0.017, "navy", "gold", ridges=7)
    B.torus(0.028, 0.006, loc=(0, 0, -0.155), rot=(90, 0, 0), m="gold", segs=16, rsegs=6)
    B.gem(0.022, loc=(0, 0, -0.155), rot=(90, 0, 0), m="glow_sapphire", h_top=0.012,
          h_bot=0.012, segs=8)
    B.cyl(0.02, 0.012, 0.02, loc=(0, 0, -0.13), m="gold", segs=10)
    B.box((0.06, 0.046, 0.05), loc=(0, 0, 0.09), m="gold", bevel=0.01, taper=(0.8, 0.85))
    B.gem(0.012, loc=(0, -0.024, 0.09), rot=(90, 0, 0), m="glow_sapphire", segs=8)
    B.gem(0.012, loc=(0, 0.024, 0.09), rot=(-90, 0, 0), m="glow_sapphire", segs=8)
    q = [(0.025, 0, 0.088), (0.07, 0, 0.09), (0.11, 0, 0.1), (0.14, 0, 0.12)]
    B.sweep(q, [0.015, 0.012, 0.01, 0.007], m="gold", segs=8, mirror=True)
    B.sphere(0.012, loc=(0.142, 0, 0.123), m="gold", segs=8, rings=6, mirror=True)
    straight_blade(B, 0.11, 1.0, 0.033, 0.027, 0.0068, "blue_steel", "silver", tip=0.13)
    for y in (-0.0062, 0.0062):
        B.box((0.011, 0.0025, 0.6), loc=(0, y, 0.46), m="glow_sapphire_soft", smooth=False)
    return dict(tip=(0, 0, 1.0), base=(0, 0, 0.115))


def steel_halberd(B):
    B.cyl(0.021, 0.019, 1.96, loc=(0, 0, -0.2), m="wood_dark", segs=10, angle=60)
    grip(B, -0.12, 0.12, 0.022, "leather", "steel", ridges=6)
    for z in (-0.95, -0.55, 0.35, 0.5):
        B.cyl(0.025, 0.025, 0.025, loc=(0, 0, z), m="steel", segs=10, bevel=0.004)
    B.cyl(0.024, 0.0, 0.12, loc=(0, 0, -1.24), m="steel", segs=8)
    B.cyl(0.03, 0.025, 0.16, loc=(0, 0, 0.69), m="steel", segs=10, bevel=0.006)
    pts = [(0.02, -0.12), (0.08, -0.1), (0.165, -0.165), (0.2, -0.06), (0.212, 0.04),
           (0.19, 0.14), (0.13, 0.115), (0.06, 0.05), (0.02, 0.045)]
    B.poly(pts, 0.03, loc=(0, 0, 0.7), rot=(90, 0, 0), m="steel", bevel=0.003,
           thick_fn=lambda x, y: max(0.006, 0.03 - x * 0.12))
    B.sweep([(-0.02, 0, 0.72), (-0.09, 0, 0.71), (-0.15, 0, 0.68), (-0.19, 0, 0.63)],
            [0.022, 0.016, 0.009, 0.0], m="steel", segs=8, scale=(1, 0.5))
    straight_blade(B, 0.76, 1.02, 0.03, 0.026, 0.008, "steel", "silver", tip=0.11)
    B.sphere(0.03, loc=(0, 0, 0.775), m="steel", scale=(1, 1, 0.6), segs=10, rings=6)
    return dict(tip=(0, 0, 1.02), base=(0, 0, 0.62))


def sapphire_rod(B):
    B.cyl(0.014, 0.012, 1.12, loc=(0, 0, 0.13), m="silver", segs=10)
    grip(B, -0.09, 0.08, 0.016, "navy", "gold", ridges=5)
    for z in (-0.25, 0.3, 0.55):
        B.cyl(0.02, 0.02, 0.018, loc=(0, 0, z), m="gold", segs=10, bevel=0.004)
    B.lathe([(0, -0.45), (0.02, -0.43), (0.026, -0.4), (0.016, -0.37), (0.014, -0.35)],
            m="gold", segs=10)
    B.gem(0.016, loc=(0, 0, -0.41), m="glow_sapphire", segs=6)
    B.lathe([(0.014, 0.66), (0.03, 0.7), (0.035, 0.72), (0.0, 0.73)], m="gold", segs=12)

    def prong(a):
        r = math.radians(a)
        d = Vector((math.cos(r), math.sin(r), 0))
        p = [Vector((0, 0, 0.71)) + d * 0.03, Vector((0, 0, 0.76)) + d * 0.075,
             Vector((0, 0, 0.84)) + d * 0.075, Vector((0, 0, 0.9)) + d * 0.05]
        B.sweep(p, [0.009, 0.007, 0.006, 0.0], m="gold", segs=6)
    ring_of(B, 4, prong)
    B.torus(0.07, 0.005, loc=(0, 0, 0.79), m="gold", segs=24, rsegs=6)
    B.lathe([(0, 0.75), (0.035, 0.84), (0.028, 0.9), (0, 0.97)], m="glow_sapphire", segs=6,
            smooth=False)
    for k in range(3):
        a = math.radians(120 * k + 30)
        B.crystal(0.008, 0.035, loc=(math.cos(a) * 0.1, math.sin(a) * 0.1, 0.83 + 0.02 * k),
                  rot=(15, 0, 0), m="glow_sapphire", segs=4)
    return dict(tip=(0, 0, 0.97), base=(0, 0, 0.72))


def flame_saber(B):
    grip(B, -0.12, 0.065, 0.017, "crimson_cloth", "gold", ridges=7)
    B.cyl(0.022, 0.0, 0.05, loc=(0, 0, -0.145), rot=(180, 0, 0), m="gold", segs=8)
    B.gem(0.016, loc=(0, 0, -0.125), m="glow_fire", segs=6)
    B.cyl(0.04, 0.04, 0.018, loc=(0, 0, 0.08), m="gold", segs=14, bevel=0.005, scale=(1.3, 0.6, 1))
    B.poly(flame_pts(0.1, 0.022), 0.012, matrix=basis(x=(1, 0, 0.35), z=(0, 1, 0),
                                                       loc=(0.035, 0, 0.08)),
           m="gold", bevel=0.002, mirror=True)
    B.gem(0.014, loc=(0, -0.012, 0.08), rot=(90, 0, 0), m="glow_fire", segs=8)
    B.gem(0.014, loc=(0, 0.012, 0.08), rot=(-90, 0, 0), m="glow_fire", segs=8)
    st = curved_stations(0.09, 0.99, 0.022, 0.03, 0.0065, 0.08, n=10, tip_len=0.13)
    B.blade(st, m="ember_steel", edge_m="glow_fire", spine_frac=0.4, edge_frac=0.62)
    for i, z in enumerate((0.22, 0.38, 0.54)):
        u = (z - 0.09) / 0.77
        xo = -0.08 * u * u - 0.004
        for y, rx in ((-0.0055, 90), (0.0055, -90)):
            B.gem(0.006, loc=(xo, y, z), rot=(rx, 0, 0), m="glow_fire", segs=4,
                  h_top=0.002, h_bot=0.002)
    for i, z in enumerate((0.13, 0.2, 0.27)):
        u = (z - 0.09) / 0.77
        xo = -0.08 * u * u - 0.026 * 0.4
        B.poly(flame_pts(0.035 - 0.006 * i, 0.008), 0.004,
               matrix=basis(x=(-1, 0, 0.9), z=(0, 1, 0), loc=(xo, 0, z)), m="glow_fire_soft")
    return dict(tip=(st[-1][3], 0, 0.99), base=(0, 0, 0.1))


def frost_glaive(B):
    B.cyl(0.02, 0.018, 1.55, loc=(0, 0, -0.225), m="frost_metal", segs=10, angle=60)
    grip(B, -0.13, 0.13, 0.021, "white_cloth", "silver", ridges=7)
    for z in (-0.6, -0.45, 0.35):
        grip(B, z, z + 0.08, 0.021, "white_cloth", "silver", ridges=3)
    B.crystal(0.022, 0.12, loc=(0, 0, -1.0), rot=(180, 0, 0), m="ice_crystal", segs=6)
    B.cyl(0.026, 0.024, 0.04, loc=(0, 0, -0.98), m="silver", segs=10, bevel=0.005)
    B.lathe([(0.02, 0.5), (0.034, 0.54), (0.036, 0.6), (0.028, 0.63), (0.015, 0.64)],
            m="silver", segs=12)
    for y, rx in ((-0.034, 90), (0.034, -90)):
        B.gem(0.014, loc=(0, y, 0.57), rot=(rx, 0, 0), m="glow_ice", segs=6)
    st = curved_stations(0.62, 1.07, 0.04, 0.055, 0.011, 0.07, n=8, tip_len=0.12, swell=0.6)
    B.blade(st, m="ice_crystal", edge_m="glow_ice", spine_frac=0.55, edge_frac=0.7, smooth=False)
    shards = [(-60, 0.11, 25), (-35, 0.08, 120), (-75, 0.07, 200), (-50, 0.09, 280),
              (-20, 0.06, 330)]
    for tilt, h, az in shards:
        M = xform((0, 0, 0.6), (0, 0, az)) @ xform((0.02, 0, 0), (0, 90 + tilt, 0))
        B.crystal(0.012, h, matrix=M, m="ice_crystal", segs=5)
    B.crystal(0.01, 0.08, matrix=xform((0.03, 0, 0.66), (0, 35, 0)), m="glow_ice", segs=4)
    return dict(tip=(st[-1][3], 0, 1.07), base=(0, 0, 0.62))


def storm_scythe(B):
    n = 12
    pts = [(0.015 * math.sin(i / n * math.pi * 2), 0, -0.92 + 1.9 * i / n) for i in range(n + 1)]
    B.sweep(pts, 0.02, m="storm_metal", segs=10, angle=60)
    grip(B, -0.12, 0.12, 0.021, "leather_dark", "black_metal", ridges=6)
    for z in (-0.6, -0.35, 0.3, 0.55, 0.78):
        x = 0.015 * math.sin((z + 0.92) / 1.9 * math.pi * 2)
        B.torus(0.023, 0.004, loc=(x, 0, z), m="glow_violet", segs=14, rsegs=5)
    B.cyl(0.022, 0.0, 0.14, loc=(0, 0, -0.99), rot=(180, 0, 0), m="black_metal", segs=8)
    B.box((0.07, 0.05, 0.09), loc=(-0.01, 0, 0.99), m="black_metal", bevel=0.012,
          taper=(0.7, 0.8))
    B.gem(0.016, loc=(-0.01, -0.026, 0.99), rot=(90, 0, 0), m="glow_violet", segs=6)
    B.gem(0.016, loc=(-0.01, 0.026, 0.99), rot=(-90, 0, 0), m="glow_violet", segs=6)
    B.cyl(0.018, 0.0, 0.12, loc=(0.0, 0, 1.08), m="black_metal", segs=6)
    Mb = basis(x=(0, 0, -1), z=(-1, 0, 0), loc=(-0.03, 0, 1.0))
    st = []
    nst = 10
    for i in range(nst):
        u = i / (nst - 1)
        st.append((0.72 * u * 0.9, 0.065 - 0.02 * u, 0.008, 0.16 * u * u))
    st.append((0.72, 0, 0, 0.16 + 0.02))
    tb = Builder()
    tb.blade(st, m="storm_metal", edge_m="glow_electric", spine_frac=0.5, edge_frac=0.7)
    for k in range(6):
        u = 0.1 + k * 0.13
        z = 0.72 * u * 0.9
        xo = 0.16 * u * u + 0.012
        for y in (-0.0075, 0.0075):
            tb.poly(bolt_pts(0.045, 0.012), 0.002, matrix=xform((xo, y, z), (90, 0, 70 + 20 * (k % 2))),
                    m="glow_violet", smooth=False)
    B.merge(tb, Mb)
    tip = Mb @ Vector((st[-1][3], 0, 0.72))
    return dict(tip=tip, base=Mb @ Vector((0.02, 0, 0.02)))


def dragonfang_greatsword(B):
    grip(B, -0.26, 0.08, 0.02, "leather_dark", "black_metal", ridges=10)
    B.cyl(0.03, 0.0, 0.07, loc=(0, 0, -0.3), rot=(180, 0, 0), m="black_metal", segs=6)
    B.box((0.05, 0.05, 0.04), loc=(0, 0, -0.275), m="black_metal", bevel=0.008)
    B.gem(0.014, loc=(0, -0.026, -0.275), rot=(90, 0, 0), m="glow_lava", segs=6)
    B.box((0.11, 0.07, 0.07), loc=(0, 0, 0.11), m="black_metal", bevel=0.012, taper=(1.3, 0.8))
    B.sphere(0.022, loc=(0, -0.03, 0.11), scale=(1, 0.5, 0.7), m="glow_lava", segs=10, rings=6)
    B.sphere(0.022, loc=(0, 0.03, 0.11), scale=(1, 0.5, 0.7), m="glow_lava", segs=10, rings=6)
    h = [(0.05, 0, 0.1), (0.12, 0, 0.1), (0.19, 0, 0.13), (0.23, 0, 0.19), (0.235, 0, 0.24)]
    B.sweep(h, [0.028, 0.024, 0.018, 0.01, 0.0], m="fang", segs=8, mirror=True)
    B.poly([(0, -0.04), (0.17, -0.02), (0.2, 0.03), (0.08, 0.05), (0, 0.04)], 0.04,
           loc=(0.04, 0, 0.1), rot=(90, 0, 0), m="black_metal", bevel=0.006, mirror=True)
    st = [(0.14, 0.072, 0.015, 0), (0.5, 0.078, 0.014, 0), (1.05, 0.07, 0.013, 0),
          (1.26, 0.052, 0.011, 0), (1.36, 0.03, 0.009, 0), (1.42, 0, 0, 0)]
    B.blade(st, m="black_metal", edge_m="glow_fire_soft", edge_frac=0.86)
    for y in (-0.0135, 0.0135):
        B.box((0.016, 0.004, 1.02), loc=(0, y, 0.68), m="glow_lava", smooth=False)
        for k in range(7):
            z = 0.25 + k * 0.14
            sgn = 1 if k % 2 else -1
            B.box((0.006, 0.003, 0.06), loc=(sgn * 0.02, y, z), rot=(0, sgn * 40, 0),
                  m="glow_lava", smooth=False)
    for k in range(9):
        z = 0.22 + k * 0.115
        w = 0.074 if z < 1.05 else 0.06
        L = 0.04 if k % 2 == 0 else 0.03
        pts = [(0, -0.018), (L, 0.012), (0, 0.016)]
        B.poly(pts, 0.008, matrix=xform((w - 0.004, 0, z), (90, 0, 0)), m="fang", mirror=True,
               thick_fn=lambda x, y: 0.012 - x * 0.2, smooth=False)
    return dict(tip=(0, 0, 1.42), base=(0, 0, 0.15))


def moonlight_katana(B):
    grip(B, -0.27, 0.03, 0.017, "white_cloth", "moon_silver", ridges=11)
    B.sphere(0.02, loc=(0, 0, -0.283), scale=(1, 0.75, 0.6), m="moon_silver", segs=10, rings=6)
    B.torus(0.011, 0.002, loc=(0, 0, -0.3), rot=(90, 0, 0), m="glow_moon", segs=10, rsegs=4)
    B.sweep([(0, 0, -0.31), (0.01, -0.01, -0.37), (0.0, -0.02, -0.44), (0.005, -0.02, -0.48)],
            [0.004, 0.004, 0.004, 0.0], m="glow_moon", segs=5)
    B.cyl(0.03, 0.03, 0.008, loc=(0, 0, 0.042), m="moon_silver", segs=20, scale=(1.25, 0.85, 1),
          bevel=0.002, seg=1)
    B.poly(crescent_pts(0.055), 0.007, matrix=xform((0, 0, 0.042), (0, 0, 0)) @ xform(
        (0, 0, 0), (0, 0, 90)), m="moon_silver", bevel=0.0015)
    B.gem(0.01, loc=(0.0, -0.005, 0.047), rot=(0, 0, 0), m="glow_moon", segs=6)
    B.box((0.024, 0.014, 0.022), loc=(-0.003, 0, 0.058), m="gold", bevel=0.003)
    st = curved_stations(0.065, 0.92, 0.0165, 0.0165, 0.0048, 0.035, n=10, tip_len=0.08,
                         tip_back=0.9)
    B.blade(st, m="moon_silver", edge_m="glow_moon", spine_frac=0.35, edge_frac=0.55)
    for i, z in enumerate((0.13, 0.19, 0.25)):
        u = (z - 0.065) / 0.79
        xo = -0.035 * u * u - 0.003
        for y in (-0.0046, 0.0046):
            B.poly(crescent_pts(0.0065, n=5), 0.0015, matrix=xform((xo, y, z), (90, 0, 90 * i)),
                   m="glow_moon", smooth=False)
    return dict(tip=(st[-1][3], 0, 0.92), base=(0, 0, 0.07))


def thunder_god_spear(B):
    B.cyl(0.02, 0.018, 1.95, loc=(0, 0, -0.125), m="enamel_blue", segs=10, angle=60)
    grip(B, -0.13, 0.13, 0.021, "gold", "gold", ridges=8)
    for z in (-0.9, -0.6, -0.35, 0.35, 0.6):
        B.cyl(0.024, 0.024, 0.022, loc=(0, 0, z), m="gold", segs=10, bevel=0.004)
    B.lathe([(0, -1.12), (0.02, -1.05), (0.026, -1.02), (0.018, -1.0)], m="gold", segs=8)
    B.lathe([(0.018, 0.8), (0.034, 0.86), (0.03, 0.9), (0.04, 0.93), (0.022, 0.96)], m="gold",
            segs=12)
    for y, rx in ((-0.034, 90), (0.034, -90)):
        B.gem(0.014, loc=(0, y, 0.89), rot=(rx, 0, 0), m="glow_electric", segs=6)
    B.poly([(0, -0.02), (0.1, 0.03), (0.13, 0.09), (0.06, 0.04), (0, 0.03)], 0.012,
           loc=(0.02, 0, 0.88), rot=(90, 0, 0), m="gold", bevel=0.003, mirror=True)
    st = [(0.95, 0.03, 0.011, 0), (1.0, 0.045, 0.011, 0), (1.1, 0.038, 0.009, 0),
          (1.18, 0.02, 0.007, 0), (1.24, 0, 0, 0)]
    B.blade(st, m="gold", edge_m="glow_electric", edge_frac=0.6)
    for y in (-0.0095, 0.0095):
        B.poly([(0, -0.012), (0.2, 0), (0, 0.012)], 0.002,
               matrix=xform((0, y, 0.97), (90, 0, 90)), m="glow_electric", smooth=False)
    B.poly(bolt_pts(0.16, 0.035), 0.01, matrix=basis(x=(0.8, 0, 1), z=(0, 1, 0),
                                                       loc=(0.03, 0, 0.92)),
           m="glow_violet", mirror=True, smooth=False)
    B.torus(0.065, 0.006, loc=(0, 0, 0.76), m="gold", segs=24, rsegs=6)
    B.torus(0.058, 0.003, loc=(0, 0, 0.76), m="glow_electric", segs=24, rsegs=4)
    B.torus(0.05, 0.005, loc=(0, 0, 1.05), rot=(12, 0, 0), m="gold", segs=24, rsegs=6)
    B.torus(0.045, 0.0025, loc=(0, 0, 1.05), rot=(12, 0, 0), m="glow_violet", segs=24, rsegs=4)
    return dict(tip=(0, 0, 1.24), base=(0, 0, 0.9))


def celestial_excalibur(B):
    grip(B, -0.13, 0.07, 0.017, "white_cloth", "gold", ridges=7)
    B.sphere(0.026, loc=(0, 0, -0.16), m="gold", segs=12, rings=8)
    B.gem(0.016, loc=(0, -0.022, -0.16), rot=(90, 0, 0), m="glow_holy_white", segs=8)
    B.gem(0.016, loc=(0, 0.022, -0.16), rot=(-90, 0, 0), m="glow_holy_white", segs=8)
    feather(B, (0.02, 0, -0.16), -150 + 180 - 30, 0.06, 0.012, "gold_pale")
    B.box((0.075, 0.05, 0.06), loc=(0, 0, 0.095), m="gold", bevel=0.012, taper=(0.75, 0.85))
    B.gem(0.022, loc=(0, -0.026, 0.1), rot=(90, 0, 0), m="glow_holy_white", segs=8)
    B.gem(0.022, loc=(0, 0.026, 0.1), rot=(-90, 0, 0), m="glow_holy_white", segs=8)
    for i, (ang, L) in enumerate(((8, 0.2), (24, 0.17), (40, 0.135), (56, 0.1))):
        feather(B, (0.03, 0, 0.09 + 0.004 * i), ang, L, 0.022 - 0.002 * i,
                "gold_pale" if i % 2 == 0 else "gold", thick=0.008)
    B.sweep([(0.03, 0, 0.075), (0.1, 0, 0.07), (0.16, 0, 0.08)], [0.009, 0.007, 0.0],
            m="glow_holy", segs=6, mirror=True)
    st = [(0.12, 0.037, 0.0075, 0), (0.35, 0.034, 0.007, 0), (0.96, 0.029, 0.0065, 0),
          (1.1, 0.021, 0.0055, 0), (1.17, 0.012, 0.004, 0), (1.22, 0, 0, 0)]
    B.blade(st, m="silver", edge_m="glow_holy", edge_frac=0.8)
    for y in (-0.0072, 0.0072):
        rune_column(B, 0.17, 0.78, 0.055, y, "glow_holy", w=0.007, glyph=0.016)
    B.torus(0.085, 0.006, loc=(0, 0, 0.25), rot=(0, 0, 0), m="glow_holy", segs=32, rsegs=6)
    B.torus(0.072, 0.003, loc=(0, 0, 0.27), rot=(0, 0, 0), m="gold", segs=32, rsegs=4)
    for k in range(4):
        a = math.radians(45 + 90 * k)
        B.gem(0.009, loc=(math.cos(a) * 0.085, math.sin(a) * 0.085, 0.25), m="glow_holy_white",
              segs=4, h_top=0.012, h_bot=0.012)
    return dict(tip=(0, 0, 1.22), base=(0, 0, 0.13))


def abyss_reaper(B):
    n = 14
    pts = [(0.012 * math.sin(i / n * 5.0), 0.006 * math.cos(i / n * 3.0), -0.95 + 1.95 * i / n)
           for i in range(n + 1)]
    B.sweep(pts, 0.022, m="obsidian", segs=10, angle=60)
    sp = []
    for i in range(61):
        u = i / 60.0
        z = -0.85 + 1.75 * u
        a = u * math.pi * 2 * 5
        sp.append((0.024 * math.cos(a), 0.024 * math.sin(a), z))
    B.sweep(sp, 0.0035, m="glow_abyss", segs=4, angle=70)
    grip(B, -0.12, 0.12, 0.024, "leather_dark", "bone", ridges=6)
    for z in (-0.6, -0.3, 0.35, 0.65):
        B.torus(0.028, 0.008, loc=(0, 0, z), m="bone", segs=10, rsegs=5)
        for k in range(3):
            a = math.radians(120 * k + z * 100)
            d = Vector((math.cos(a), math.sin(a), 0.5)).normalized()
            B.cyl(0.008, 0.0, 0.06, matrix=basis(z=d, x=(0, 0, 1),
                                                   loc=Vector((0, 0, z)) + d * 0.03),
                  m="obsidian", segs=5, smooth=False)
    B.lathe([(0, -1.1), (0.026, -0.98), (0.03, -0.95)], m="obsidian", segs=6, smooth=False)
    B.sphere(0.012, loc=(0, 0, -0.97), m="glow_abyss", segs=6, rings=4)
    # skull
    sk = (0, 0, 1.03)
    B.sphere(0.06, loc=sk, scale=(0.9, 1.0, 0.95), m="bone", segs=12, rings=8)
    B.box((0.07, 0.05, 0.035), loc=(0, -0.03, 0.98), m="bone", bevel=0.01, taper=(0.8, 1))
    for x in (-0.022, 0.022):
        B.sphere(0.014, loc=(x, -0.05, 1.035), m="glow_abyss", segs=8, rings=6)
    B.cyl(0.006, 0.0, 0.03, loc=(0, -0.058, 1.005), rot=(-90, 0, 0), m="obsidian", segs=4)
    for s in (-1, 1):
        B.sweep([(s * 0.045, 0, 1.06), (s * 0.08, 0.01, 1.1), (s * 0.09, 0.03, 1.16),
                 (s * 0.07, 0.05, 1.2)], [0.014, 0.011, 0.007, 0.0], m="obsidian", segs=6)
    Mb = basis(x=(0, 0, -1), z=(-1, 0, 0), loc=(-0.04, 0, 1.06))
    st = []
    nst = 11
    for i in range(nst):
        u = i / (nst - 1)
        st.append((0.85 * u * 0.92, 0.09 - 0.035 * u, 0.01, 0.3 * u * u))
    st.append((0.85, 0, 0, 0.3 + 0.03))
    tb = Builder()
    tb.blade(st, m="obsidian", edge_m="glow_abyss", spine_frac=0.45, edge_frac=0.72)
    for k in range(7):
        u = 0.08 + k * 0.12
        z = 0.85 * u * 0.92
        xo = 0.3 * u * u
        for y in (-0.0095, 0.0095):
            tb.box((0.003, 0.003, 0.07), loc=(xo + 0.01, y, z), rot=(0, 25 if k % 2 else -25, 0),
                   m="glow_abyss_violet", smooth=False)
            tb.box((0.003, 0.003, 0.035), loc=(xo + 0.03, y, z + 0.02), rot=(0, 70, 0),
                   m="glow_abyss_violet", smooth=False)
    for k in range(4):
        u = 0.15 + k * 0.2
        z = 0.85 * u * 0.92
        xo = 0.3 * u * u - 0.09 * 0.45 * (1 - 0.4 * u)
        tb.cyl(0.012, 0.0, 0.06, loc=(xo - 0.02, 0, z), rot=(0, -90, 0), m="obsidian", segs=5,
               smooth=False)
    B.merge(tb, Mb)
    st2 = [(0, 0.03, 0.008, 0), (0.12, 0.025, 0.007, -0.02), (0.22, 0, 0, -0.06)]
    B.blade(st2, m="obsidian", edge_m="glow_abyss", spine_frac=0.5,
            matrix=basis(x=(0, 0, 1), z=(1, 0, 0.25), loc=(0.04, 0, 1.03)))
    tip = Mb @ Vector((st[-1][3], 0, 0.85))
    return dict(tip=tip, base=Mb @ Vector((0.02, 0, 0.03)))


def phoenix_wing(B):
    grip(B, -0.12, 0.07, 0.017, "crimson_cloth", "gold", ridges=7)
    B.lathe([(0, -0.22), (0.012, -0.19), (0.026, -0.16), (0.024, -0.14), (0.015, -0.125)],
            m="gold", segs=10)
    B.gem(0.012, loc=(0, -0.022, -0.155), rot=(90, 0, 0), m="glow_phoenix_3", segs=6)
    B.gem(0.012, loc=(0, 0.022, -0.155), rot=(-90, 0, 0), m="glow_phoenix_3", segs=6)
    B.box((0.06, 0.044, 0.05), loc=(0, 0, 0.09), m="gold", bevel=0.01, taper=(0.7, 0.8))
    B.gem(0.02, loc=(0, -0.023, 0.095), rot=(90, 0, 0), m="glow_phoenix_2", segs=8)
    B.gem(0.02, loc=(0, 0.023, 0.095), rot=(-90, 0, 0), m="glow_phoenix_2", segs=8)
    for i, (ang, L) in enumerate(((-12, 0.17), (2, 0.19), (16, 0.16), (30, 0.12), (44, 0.08))):
        feather(B, (0.025, 0, 0.09), ang, L, 0.02, "glow_phoenix_%d" % min(4, i + 1)
                if i % 2 else "gold", thick=0.008)
    # feather blade
    B.blade([(0.1, 0.02, 0.006, 0), (0.6, 0.016, 0.006, 0), (1.1, 0.008, 0.004, 0),
             (1.22, 0, 0, 0)], m="phoenix_core", edge_m=None)
    nb = 16
    for i in range(nb):
        u = i / (nb - 1)
        z = 0.13 + u * 1.0
        L = 0.012 + 0.05 * math.sin(math.pi * min(1.0, (u * 0.92 + 0.08))) ** 0.7
        mat = "glow_phoenix_%d" % min(4, int(u * 5))
        ang = 30 + 25 * u
        a = math.radians(ang)
        d = Vector((math.cos(a), 0, math.sin(a)))
        pts = [(0, -0.008), (L * 0.6, -0.012), (L, 0.004), (L * 0.5, 0.012), (0, 0.01)]
        B.poly(pts, 0.004, matrix=basis(x=d, z=(0, 1, 0), loc=(0.004, 0, z)), m=mat,
               mirror=True, smooth=False, thick_fn=lambda x, y, L=L: 0.006 * (1 - 0.7 * x / L))
    B.cyl(0.004, 0.0015, 1.06, loc=(0, -0.006, 0.64), m="glow_holy", segs=5)
    B.cyl(0.004, 0.0015, 1.06, loc=(0, 0.006, 0.64), m="glow_holy", segs=5)
    return dict(tip=(0, 0, 1.22), base=(0, 0, 0.12))


WEAPONS = {
    "iron_sword": iron_sword,
    "bronze_axe": bronze_axe,
    "oak_staff": oak_staff,
    "knight_blade": knight_blade,
    "steel_halberd": steel_halberd,
    "sapphire_rod": sapphire_rod,
    "flame_saber": flame_saber,
    "frost_glaive": frost_glaive,
    "storm_scythe": storm_scythe,
    "dragonfang_greatsword": dragonfang_greatsword,
    "moonlight_katana": moonlight_katana,
    "thunder_god_spear": thunder_god_spear,
    "celestial_excalibur": celestial_excalibur,
    "abyss_reaper": abyss_reaper,
    "phoenix_wing": phoenix_wing,
}


def weapon_object(wid, parent=None):
    """Build weapon `wid` into the current scene. Returns (mesh_obj, tip_empty, base_empty)."""
    _mats()
    B = Builder()
    info = WEAPONS[wid](B)
    ob = B.to_object(wid)
    tip = empty("tip", tuple(info["tip"]), size=0.05)
    base = empty("base", tuple(info["base"]), size=0.05)
    if parent is not None:
        ob.parent = parent
        tip.parent = parent
        base.parent = parent
    return ob, tip, base


def build(wid):
    reset_scene()
    weapon_object(wid)
    return export_glb("models/weapons/%s.glb" % wid)
