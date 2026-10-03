"""Weapon-class additions: bows, staves, spears, a claymore and shields.

Weapon contract as in weapons.py (origin = grip, length along Blender +Z / glTF +Y, empties
`tip` and `base`). Bows: limbs along +-Z, bow face toward Blender -Y (glTF +Z, the target),
string on the +Y side (toward the archer); extra empty `string_mid`.
Shields: origin = forearm/handle, face toward Blender -Y (glTF +Z), height along +Z.
"""
import math

from mathutils import Vector

from .core import Builder, basis, define, glow, xform
from .weapons import (bezel_gem, bolt_pts, crescent_pts, filigree, fuller, ring_of, straight_blade,
                      wrapped_grip)

V = Vector


def _mats():
    define("white_wood", color="#efe4cf", rough=0.55)
    define("bowstring", color="#e9e2cc", rough=0.6)
    define("white_enamel", color="#f4f1ea", rough=0.3, metal=0.1)
    define("crimson_enamel", color="#7a0f18", rough=0.3, metal=0.4)
    glow("glow_string_cyan", "#38dcff", 2.0)
    glow("glow_string_gold", "#ffc838", 2.0)
    glow("glow_string_violet", "#9a5cff", 2.0)
    glow("glow_leaf", "#3cff6a", 2.0)
    define("same_dark", color="#1a2230", rough=0.5)


def smoothstep(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


# ===========================================================================
# bows
# ===========================================================================
def limb_curve(half, brace=0.16, recurve=0.06, n=12, z0=0.1):
    """Upper limb centerline (y, z) from riser end to tip. Limbs bend back toward the string
    (+Y); recurve tips flick forward (-Y)."""
    pts = []
    for i in range(n + 1):
        u = i / n
        z = z0 + (half - z0) * u
        y = brace * u ** 1.7 - recurve * smoothstep(0.78, 1.0, u) ** 2
        pts.append(V((0, y, z)))
    return pts


def bow_core(B, half, limb_m, riser_m, grip_m, string_m, width=0.022, thick=0.4, brace=0.16,
             recurve=0.06, tip_m=None, riser_w=0.03, wrap=None):
    up = limb_curve(half, brace, recurve)
    widths = [width * (1.0 - 0.55 * (i / (len(up) - 1)) ** 1.2) for i in range(len(up))]
    for sgn in (1, -1):
        pts = [V((p.x, p.y, p.z * sgn)) for p in up]
        B.sweep(pts, widths, m=limb_m, segs=6, scale=(1.0, thick), up=(1, 0, 0), angle=60)
        if tip_m:
            t = pts[-1]
            B.sphere(width * 0.55, loc=t, m=tip_m, segs=8, rings=6, scale=(1, 0.8, 1.6))
    # riser: thick tapered body bridging both limbs, grip in the middle, arrow shelf
    B.box((riser_w * 1.6, 0.05, 0.24), loc=(0, -0.006, 0), m=riser_m, bevel=0.012, seg=2,
          taper=(0.8, 0.9))
    B.box((riser_w * 1.2, 0.04, 0.06), loc=(0, -0.012, 0.15), m=riser_m, bevel=0.01, seg=1)
    B.box((riser_w * 1.2, 0.04, 0.06), loc=(0, -0.012, -0.15), m=riser_m, bevel=0.01, seg=1)
    if wrap:
        wrapped_grip(B, -0.065, 0.065, 0.021, core=grip_m, wrap=wrap[0], ring=wrap[1], turns=3,
                     segs=8)
    else:
        B.cyl(0.022, 0.022, 0.13, loc=(0, 0.004, 0), m=grip_m, segs=8, bevel=0.005, seg=1)
    B.box((0.012, 0.03, 0.012), loc=(-0.024, 0.0, 0.075), m=riser_m, smooth=False)
    tip_u = V((0, up[-1].y, up[-1].z))
    tip_d = V((0, up[-1].y, -up[-1].z))
    # string (straight, slightly behind the nocks)
    s_top = tip_u + V((0, 0.006, -0.01))
    s_bot = tip_d + V((0, 0.006, 0.01))
    B.cyl(0.0028, 0.0028, (s_top - s_bot).length, loc=(s_top + s_bot) / 2, m=string_m, segs=5)
    return dict(tip=tip_u, base=tip_d, string_mid=(s_top + s_bot) / 2, up=up)


def hunter_bow(B):
    i = bow_core(B, 0.65, "wood", "wood_dark", "leather", "bowstring", tip_m="leather_dark")
    return dict(tip=i["tip"], base=i["base"], extra={"string_mid": i["string_mid"]})


def elven_longbow(B):
    i = bow_core(B, 0.8, "white_wood", "white_wood", "leaf_dark", "bowstring", width=0.02,
                 brace=0.15, recurve=0.07, tip_m="gold", wrap=("gold", "gold"))
    for sgn in (1, -1):
        for k, u in enumerate((0.25, 0.45, 0.65, 0.85)):
            p = i["up"][int(u * 12)]
            p = V((0, p.y - 0.009, p.z * sgn))
            ang = 40 if k % 2 else -40
            B.poly([(0, 0), (0.025, 0.012), (0.05, 0), (0.025, -0.012)], 0.003,
                   matrix=xform(p, (90, 0, ang + (0 if sgn > 0 else 180))), m="glow_leaf",
                   smooth=False)
    bezel_gem(B, (0, -0.033, 0.0), (90, 0, 0), 0.012, "glow_green")
    filigree(B, (0.0, -0.03, 0.09), (0, 0, 1), (0, -1, 0), 0.03, m="gold", mirror=False)
    filigree(B, (0.0, -0.03, -0.09), (0, 0, -1), (0, -1, 0), 0.03, m="gold", mirror=False)
    return dict(tip=i["tip"], base=i["base"], extra={"string_mid": i["string_mid"]})


def gale_bow(B):
    i = bow_core(B, 0.72, "storm_metal", "black_metal", "leather_dark", "glow_string_violet",
                 width=0.024, recurve=0.09, tip_m="glow_violet", wrap=("leather", "black_metal"))
    for sgn in (1, -1):
        for k in range(4):
            p = i["up"][2 + k * 2]
            p = V((0, p.y - 0.011, p.z * sgn))
            B.poly(bolt_pts(0.06, 0.014), 0.003, matrix=xform(p, (90, 0, 70 * sgn)),
                   m="glow_violet", smooth=False)
        t = i["up"][-2]
        B.blade([(0, 0.016, 0.004, 0), (0.07, 0.012, 0.003, 0.0), (0.12, 0, 0, 0.02)],
                m="storm_metal", edge_m="glow_electric",
                matrix=basis(z=(0, -1, 0.5 * sgn), x=(1, 0, 0), loc=V((0, t.y, t.z * sgn))))
    bezel_gem(B, (0, -0.033, 0.0), (90, 0, 0), 0.013, "glow_electric", bezel_m="gold")
    return dict(tip=i["tip"], base=i["base"], extra={"string_mid": i["string_mid"]})


def star_pts(r, n=5, inner=0.42):
    pts = []
    for k in range(n * 2):
        a = math.pi / 2 + math.pi * k / n
        rr = r if k % 2 == 0 else r * inner
        pts.append((math.cos(a) * rr, math.sin(a) * rr))
    return pts


def starfall_bow(B):
    i = bow_core(B, 0.75, "moon_silver", "moon_silver", "same_dark", "glow_string_cyan",
                 width=0.026, brace=0.17, recurve=0.05, tip_m="glow_ice",
                 wrap=("white_cloth", "moon_silver"))
    # crescent limb blades on the face side
    for sgn in (1, -1):
        mid = i["up"][6]
        B.poly(crescent_pts(0.085, n=10), 0.008,
               matrix=basis(x=(0, -1, 0), y=(0, 0, 1), loc=V((0, mid.y + 0.005, mid.z * sgn))) @
               xform((0, 0, 0), (0, 0, 0), (1.0, 2.2, 1.0)),
               m="moon_silver", bevel=0.002)
        for k, u in enumerate((0.3, 0.55, 0.8)):
            p = i["up"][int(u * 12)]
            B.poly(star_pts(0.022 - k * 0.004), 0.004, matrix=xform(V((0, p.y - 0.012, p.z * sgn)),
                                                                   (90, 0, 0)),
                   m="glow_ice", smooth=False)
    bezel_gem(B, (0, -0.034, 0.0), (90, 0, 0), 0.016, "glow_ice", bezel_m="moon_silver")
    return dict(tip=i["tip"], base=i["base"], extra={"string_mid": i["string_mid"]})


def seraph_bow(B):
    i = bow_core(B, 0.76, "white_enamel", "gold", "white_cloth", "glow_string_gold", width=0.024,
                 brace=0.16, recurve=0.07, tip_m="glow_holy", wrap=("gold", "gold"))
    for sgn in (1, -1):
        for k in range(7):
            u = 0.15 + k * 0.11
            p = i["up"][int(u * 12)]
            base = V((0, p.y - 0.008, p.z * sgn))
            ln = 0.16 - k * 0.014
            d = V((0, -0.85, 0.5 * sgn)).normalized()
            w = 0.022
            pts = [(0, -w * 0.4), (ln * 0.3, -w * 0.7), (ln * 0.8, -w * 0.4), (ln, 0.0),
                   (ln * 0.7, w * 0.5), (ln * 0.2, w * 0.5)]
            B.poly(pts, 0.006, matrix=basis(x=d, z=(1, 0, 0), loc=base),
                   m="holy_feather" if k % 2 == 0 else "gold", bevel=0.0015,
                   thick_fn=lambda x, y, ln=ln: 0.008 * (1 - 0.6 * x / ln))
    B.torus(0.11, 0.006, loc=(0, -0.06, 0), rot=(90, 0, 0), m="glow_holy", segs=32, rsegs=5)
    B.torus(0.095, 0.003, loc=(0, -0.06, 0), rot=(90, 0, 0), m="gold", segs=32, rsegs=4)
    bezel_gem(B, (0, -0.034, 0.0), (90, 0, 0), 0.016, "glow_holy_white")
    for z in (0.1, -0.1):
        filigree(B, (0.0, -0.03, z), (0, 0, 1 if z > 0 else -1), (0, -1, 0), 0.03,
                 mirror=False)
    return dict(tip=i["tip"], base=i["base"], extra={"string_mid": i["string_mid"]})


# ===========================================================================
# staves
# ===========================================================================
def ember_staff(B):
    n = 14
    pts = [(0.008 * math.sin(i * 1.3), 0.007 * math.cos(i * 0.9), -0.6 + 1.48 * i / n)
           for i in range(n + 1)]
    B.sweep(pts, [0.02 + 0.004 * (i / n) for i in range(n + 1)], m="wood_dark", segs=8, angle=60)
    wrapped_grip(B, -0.1, 0.1, 0.022, core="wood_dark", wrap="crimson_cloth", ring="iron",
                 turns=3, segs=8)
    B.cyl(0.026, 0.0, 0.08, loc=(0, 0, -0.64), rot=(180, 0, 0), m="iron", segs=8)
    B.lathe([(0.022, 0.84), (0.04, 0.88), (0.035, 0.92), (0.02, 0.94)], m="iron", segs=10)

    def prong(a):
        r = math.radians(a)
        d = V((math.cos(r), math.sin(r), 0))
        p = [V((0, 0, 0.9)) + d * 0.03, V((0, 0, 0.97)) + d * 0.08, V((0, 0, 1.06)) + d * 0.085,
             V((0, 0, 1.14)) + d * 0.05, V((0, 0, 1.18)) + d * 0.0]
        B.sweep(p, [0.01, 0.009, 0.008, 0.006, 0.004], m="iron", segs=6)
    ring_of(B, 4, prong)
    B.torus(0.075, 0.006, loc=(0, 0, 1.0), m="iron", segs=20, rsegs=5)
    B.lathe([(0, 0.93), (0.042, 1.02), (0.032, 1.08), (0, 1.15)], m="glow_fire", segs=6,
            smooth=False)
    for k in range(3):
        a = math.radians(120 * k)
        B.crystal(0.008, 0.04, loc=(math.cos(a) * 0.11, math.sin(a) * 0.11, 1.05 + 0.02 * k),
                  m="glow_fire_soft", segs=4)
    return dict(tip=(0, 0, 1.19), base=(0, 0, 0.92))


def astral_scepter(B):
    B.cyl(0.015, 0.013, 1.42, loc=(0, 0, 0.17), m="gold", segs=10)
    wrapped_grip(B, -0.1, 0.1, 0.017, core="enamel_blue", wrap="gold", ring="gold", turns=3,
                 segs=8, diamonds="glow_violet")
    for z in (-0.35, 0.35, 0.6, 0.78):
        B.cyl(0.022, 0.022, 0.02, loc=(0, 0, z), m="gold", segs=10, bevel=0.004, seg=1)
    B.lathe([(0, -0.58), (0.024, -0.52), (0.03, -0.48), (0.016, -0.45)], m="gold", segs=10)
    B.lathe([(0.015, 0.82), (0.04, 0.86), (0.05, 0.9), (0.03, 0.93)], m="gold", segs=12)
    B.poly(crescent_pts(0.085, n=10), 0.012,
           matrix=xform((0, 0, 1.0), (90, 0, 0)) @ xform((0, 0, 0), (0, 0, -90)),
           m="gold", bevel=0.002)
    B.sphere(0.055, loc=(0, 0, 1.02), m="glow_violet", segs=16, rings=12)
    for k, (rot, R) in enumerate((((70, 0, 0), 0.09), ((-60, 30, 0), 0.105), ((10, 75, 0), 0.12))):
        B.torus(R, 0.005, loc=(0, 0, 1.02), rot=rot, m="gold" if k != 1 else "glow_electric",
                segs=32, rsegs=4)
    for k in range(4):
        a = math.radians(90 * k + 45)
        B.gem(0.01, loc=(math.cos(a) * 0.12, math.sin(a) * 0.12, 1.02 + 0.03 * math.sin(a * 2)),
              m="glow_electric", segs=4, h_top=0.012, h_bot=0.012)
    return dict(tip=(0, 0, 1.14), base=(0, 0, 0.9))


def void_staff(B):
    n = 14
    pts = [(0.01 * math.sin(i * 0.8), 0.0, -0.66 + 1.56 * i / n) for i in range(n + 1)]
    B.sweep(pts, 0.019, m="obsidian", segs=8, angle=60)
    sp = []
    for i in range(49):
        u = i / 48
        a = u * TAU * 5
        sp.append((0.021 * math.cos(a) + 0.01 * math.sin(u * 14 * 0.8), 0.021 * math.sin(a),
                   -0.58 + 1.4 * u))
    B.sweep(sp, 0.003, m="glow_abyss_violet", segs=4, angle=70)
    wrapped_grip(B, -0.1, 0.1, 0.021, core="obsidian", wrap="leather_dark", ring="black_metal",
                 turns=3, segs=8, diamonds="glow_abyss")
    B.cyl(0.024, 0.0, 0.12, loc=(0, 0, -0.71), rot=(180, 0, 0), m="black_metal", segs=6)
    B.lathe([(0.02, 0.88), (0.045, 0.92), (0.035, 0.96), (0.015, 0.98)], m="black_metal",
            segs=10)
    for s in (-1, 1):
        B.sweep([(s * 0.02, 0, 0.92), (s * 0.08, 0, 0.98), (s * 0.1, 0, 1.08),
                 (s * 0.06, 0, 1.16)], [0.012, 0.01, 0.007, 0.0], m="black_metal", segs=6)
    B.sphere(0.06, loc=(0, 0, 1.06), m="glow_abyss", segs=16, rings=12)
    B.sphere(0.035, loc=(0, -0.035, 1.06), m="obsidian", segs=10, rings=8)
    for k in range(4):
        a = 90 * k + 20
        r = math.radians(a)
        c = V((math.cos(r) * 0.15, math.sin(r) * 0.15, 1.06 + 0.04 * math.sin(r * 2)))
        tb = Builder()
        tb.poly(crescent_pts(0.06, n=8), 0.006, m="obsidian", bevel=0.0015)
        tb.torus(0.058, 0.002, m="glow_abyss_violet", segs=16, rsegs=3)
        B.merge(tb, basis(x=(math.cos(r), math.sin(r), 0), z=(-math.sin(r), math.cos(r), 0.3),
                          loc=c))
    return dict(tip=(0, 0, 1.13), base=(0, 0, 0.9))


TAU = 2 * math.pi


# ===========================================================================
# spears / greatsword
# ===========================================================================
def iron_spear(B):
    B.cyl(0.019, 0.017, 1.8, loc=(0, 0, -0.15), m="wood", segs=8, angle=60)
    wrapped_grip(B, -0.1, 0.1, 0.02, core="wood", wrap="leather", ring="iron", turns=3, segs=8)
    B.cyl(0.022, 0.0, 0.1, loc=(0, 0, -1.08), rot=(180, 0, 0), m="iron", segs=8)
    B.cyl(0.024, 0.02, 0.1, loc=(0, 0, 0.78), m="iron", segs=8, bevel=0.005, seg=1)
    straight_blade(B, 0.82, 1.0, 0.03, 0.028, 0.008, "iron", "silver", tip=0.09)
    return dict(tip=(0, 0, 1.0), base=(0, 0, 0.8))


def dragon_lance(B):
    B.cyl(0.021, 0.019, 1.8, loc=(0, 0, -0.05), m="crimson_enamel", segs=10, angle=60)
    wrapped_grip(B, -0.13, 0.13, 0.022, core="black_metal", wrap="gold", ring="gold", turns=4,
                 segs=8, diamonds="glow_lava")
    for z in (-0.75, -0.45, 0.35, 0.6):
        B.cyl(0.026, 0.026, 0.024, loc=(0, 0, z), m="gold", segs=10, bevel=0.005, seg=1)
    B.lathe([(0, -1.0), (0.024, -0.92), (0.03, -0.9), (0.02, -0.88)], m="gold", segs=8)
    # dragon head socket biting the blade
    hc = V((0, 0, 0.94))
    B.lathe([(0.02, 0.82), (0.045, 0.86), (0.05, 0.9)], m="gold", segs=12)
    B.box((0.08, 0.1, 0.12), loc=hc, m="black_metal", bevel=0.02, taper=(0.9, 0.85))
    B.box((0.06, 0.12, 0.05), loc=hc + V((0, -0.06, 0.05)), rot=(-20, 0, 0), m="black_metal",
          bevel=0.015, taper=(0.8, 0.8))
    B.box((0.06, 0.1, 0.035), loc=hc + V((0, 0.06, 0.05)), rot=(20, 0, 0), m="black_metal",
          bevel=0.012, taper=(0.8, 0.8))
    for s in (-1, 1):
        B.sweep([hc + V((s * 0.035, 0.0, 0.05)), hc + V((s * 0.07, 0.0, 0.0)),
                 hc + V((s * 0.11, 0.0, -0.06))], [0.012, 0.009, 0.0], m="gold", segs=6)
        B.sphere(0.012, loc=hc + V((s * 0.037, -0.03, 0.03)), m="glow_lava", segs=6, rings=4)
        B.sweep([hc + V((s * 0.04, 0.02, -0.02)), hc + V((s * 0.09, 0.05, -0.08)),
                 hc + V((s * 0.12, 0.06, -0.14))], [0.01, 0.007, 0.0], m="gold", segs=5)
        for k in range(3):
            B.cyl(0.006, 0.0, 0.025, loc=hc + V((s * 0.02, -0.055 + k * 0.03, 0.065)),
                  m="bone", segs=4)
    st = [(1.0, 0.04, 0.012, 0), (1.06, 0.05, 0.011, 0), (1.2, 0.042, 0.009, 0),
          (1.32, 0.02, 0.007, 0), (1.4, 0, 0, 0)]
    B.blade(st, m="black_metal", edge_m="glow_fire", edge_frac=0.7)
    fuller(B, 1.02, 1.3, lambda z: 0.0, lambda z: 0.011 - 0.012 * (z - 1.0), 0.008,
           m_dark="glow_lava", m_line="gold", n=4)
    for s in (-1, 1):
        B.poly([(0, -0.02), (0.11, 0.0), (0.16, 0.06), (0.07, 0.03), (0, 0.025)], 0.008,
               matrix=basis(x=(s, 0, 0.9), z=(0, 1, 0), loc=(s * 0.03, 0, 1.0)),
               m="glow_fire_soft", bevel=0.002)
    return dict(tip=(0, 0, 1.4), base=(0, 0, 1.0))


def steel_claymore(B):
    wrapped_grip(B, -0.3, 0.06, 0.019, core="leather_dark", wrap="leather", ring="steel",
                 turns=6, segs=8)
    B.cyl(0.03, 0.03, 0.022, loc=(0, 0, -0.33), rot=(90, 0, 0), m="blue_steel", segs=14,
          bevel=0.006, seg=1)
    B.sphere(0.012, loc=(0, -0.012, -0.33), m="glow_sapphire", segs=8, rings=6)
    B.box((0.06, 0.04, 0.05), loc=(0, 0, 0.09), m="blue_steel", bevel=0.01, taper=(0.8, 0.85))
    for s in (-1, 1):
        q = [(s * 0.03, 0, 0.09), (s * 0.12, 0, 0.12), (s * 0.2, 0, 0.17), (s * 0.24, 0, 0.21)]
        B.sweep(q, [0.016, 0.013, 0.011, 0.009], m="blue_steel", segs=8)
        B.torus(0.022, 0.006, loc=(s * 0.255, 0, 0.225), rot=(90, 0, 0), m="blue_steel",
                segs=12, rsegs=5)
        for k in range(4):
            a = math.radians(90 * k)
            B.sphere(0.01, loc=(s * 0.255 + math.cos(a) * 0.024, 0, 0.225 + math.sin(a) * 0.024),
                     m="blue_steel", segs=6, rings=4)
    B.box((0.08, 0.05, 0.06), loc=(0, 0, 0.14), m="leather_dark", bevel=0.01)
    straight_blade(B, 0.16, 1.3, 0.042, 0.034, 0.009, "blue_steel", "silver", tip=0.15)
    fuller(B, 0.2, 0.95, lambda z: 0.0, lambda z: 0.0086, 0.009, m_dark="steel_dark",
           m_line="silver")
    return dict(tip=(0, 0, 1.3), base=(0, 0, 0.17))


# ===========================================================================
# shields
# ===========================================================================
def bend(tb, k):
    """Curve a builder's geometry back toward +Y at the sides (shield convexity)."""
    for v in tb.bm.verts:
        v.co.z -= k * (v.co.x ** 2 + 0.35 * v.co.y ** 2)


FACE = (90, 0, 0)   # rotate local +Z (lathe axis / poly normal) to -Y (shield face)


def shield_iron(B):
    tb = Builder()
    prof = [(0.0, 0.07), (0.12, 0.066), (0.24, 0.05), (0.31, 0.03), (0.33, 0.012),
            (0.33, -0.004), (0.3, -0.006), (0.0, 0.01)]
    tb.lathe(prof, m="wood", segs=24, angle=50)
    tb.torus(0.33, 0.014, loc=(0, 0, 0.004), m="iron", segs=32, rsegs=6)
    tb.sphere(0.07, loc=(0, 0, 0.06), scale=(1, 1, 0.6), m="iron", segs=14, rings=8)
    for k in range(12):
        a = TAU * k / 12
        tb.sphere(0.009, loc=(math.cos(a) * 0.29, math.sin(a) * 0.29, 0.034), m="iron", segs=6,
                  rings=4)
    for x in (-0.16, 0.0, 0.16):
        tb.box((0.004, 0.6 if x == 0 else 0.5, 0.004), loc=(x, 0, 0.058 if x == 0 else 0.05),
               m="wood_dark", smooth=False)
    B.merge(tb, xform((0, -0.05, 0.04), FACE))
    B.box((0.03, 0.05, 0.14), loc=(0, -0.025, 0.0), m="leather_dark", bevel=0.008)
    return dict(tip=(0, -0.12, 0.37), base=(0, -0.12, -0.29))


def kite_outline(w=0.3, top=0.38, bottom=-0.46, n=10):
    pts = []
    for i in range(n + 1):        # rounded top arc
        a = math.pi * i / n
        pts.append((math.cos(a) * w, top - 0.12 + math.sin(a) * 0.12))
    for i in range(1, n):         # tapering curved sides to the point
        t = i / n
        x = -w * (1 - t) ** 1.3
        pts.append((x, top - 0.12 + (bottom - top + 0.12) * t))
    pts.append((0, bottom))
    for i in range(n - 1, 0, -1):
        t = i / n
        x = w * (1 - t) ** 1.3
        pts.append((x, top - 0.12 + (bottom - top + 0.12) * t))
    return pts


def shield_knight(B):
    out = kite_outline()
    inner = [(x * 0.86, y * 0.88 + 0.0) for x, y in out]
    tb = Builder()
    tb.poly(out, 0.03, m="steel", bevel=0.006)
    tb.poly(inner, 0.012, loc=(0, 0, 0.018), m="enamel_blue", bevel=0.003)
    rim = [V((x, y, 0.016)) for x, y in out] + [V((out[0][0], out[0][1], 0.016))]
    tb.sweep(rim, 0.011, m="gold", segs=5, closed=False, caps=False, angle=60)
    tb.box((0.03, 0.62, 0.008), loc=(0, -0.04, 0.026), m="gold", bevel=0.003)
    tb.box((0.4, 0.03, 0.008), loc=(0, 0.12, 0.026), m="gold", bevel=0.003)
    for s in (-1, 1):
        filigree(tb, (s * 0.05, 0.2, 0.026), (s, 0.4, 0), (0, 0, 1), 0.05, mirror=False)
        filigree(tb, (s * 0.05, -0.18, 0.026), (s, -0.6, 0), (0, 0, 1), 0.045, mirror=False)
    bezel_gem(tb, (0, 0.12, 0.03), (0, 0, 0), 0.03, "glow_sapphire", bezel_m="gold")
    bend(tb, 0.35)
    B.merge(tb, xform((0, -0.05, 0.02), FACE))
    B.box((0.03, 0.05, 0.14), loc=(0, -0.025, 0.0), m="leather_dark", bevel=0.008)
    return dict(tip=(0, -0.08, 0.4), base=(0, -0.08, -0.44))


def shield_aegis(B):
    out = kite_outline(w=0.33, top=0.36, bottom=-0.44)
    inner = [(x * 0.84, y * 0.86) for x, y in out]
    tb = Builder()
    tb.poly(out, 0.034, m="gold", bevel=0.007)
    tb.poly(inner, 0.012, loc=(0, 0, 0.02), m="white_enamel", bevel=0.003)
    rim = [V((x, y, 0.018)) for x, y in out] + [V((out[0][0], out[0][1], 0.018))]
    tb.sweep(rim, 0.012, m="gold_pale", segs=5, caps=False, angle=60)
    # sun emblem
    c = V((0, 0.03, 0.03))
    tb.cyl(0.085, 0.085, 0.012, loc=c, m="gold", segs=24, bevel=0.003, seg=1)
    tb.cyl(0.06, 0.06, 0.016, loc=c, m="glow_holy", segs=24)
    for k in range(12):
        a = TAU * k / 12
        ln = 0.13 if k % 2 == 0 else 0.095
        tb.poly([(0.09, -0.016), (ln + 0.06, 0.0), (0.09, 0.016)], 0.008,
                matrix=xform(c, (0, 0, math.degrees(a))), m="glow_holy" if k % 2 == 0 else "gold",
                smooth=False)
    bezel_gem(tb, c + V((0, 0, 0.012)), (0, 0, 0), 0.025, "glow_holy_white", bezel_m="gold")
    for s in (-1, 1):
        for k, (ang, ln) in enumerate(((20, 0.2), (40, 0.17), (60, 0.13))):
            a = math.radians(ang)
            d = V((s * math.cos(a), math.sin(a), 0))
            pts = [(0, -0.018), (ln * 0.3, -0.026), (ln * 0.8, -0.015), (ln, 0.0),
                   (ln * 0.7, 0.02), (ln * 0.2, 0.018)]
            tb.poly(pts, 0.008, matrix=basis(x=d, z=(0, 0, 1), loc=V((s * 0.2, 0.28, 0.0))),
                    m="holy_feather" if k % 2 == 0 else "gold", bevel=0.0015)
        filigree(tb, (s * 0.07, -0.16, 0.028), (s, -0.5, 0), (0, 0, 1), 0.05, mirror=False)
    bend(tb, 0.3)
    B.merge(tb, xform((0, -0.05, 0.02), FACE))
    # small floating halo above the top edge
    B.torus(0.12, 0.007, loc=(0, -0.16, 0.05), rot=(90, 0, 0), m="glow_holy", segs=32, rsegs=5)
    B.torus(0.105, 0.0035, loc=(0, -0.16, 0.05), rot=(90, 0, 0), m="gold", segs=32, rsegs=4)
    B.box((0.03, 0.05, 0.14), loc=(0, -0.025, 0.0), m="leather_dark", bevel=0.008)
    return dict(tip=(0, -0.08, 0.38), base=(0, -0.08, -0.42))


NEW_WEAPONS = {
    "hunter_bow": hunter_bow, "elven_longbow": elven_longbow, "gale_bow": gale_bow,
    "starfall_bow": starfall_bow, "seraph_bow": seraph_bow,
    "ember_staff": ember_staff, "astral_scepter": astral_scepter, "void_staff": void_staff,
    "iron_spear": iron_spear, "dragon_lance": dragon_lance, "steel_claymore": steel_claymore,
}
SHIELDS = {"shield_iron": shield_iron, "shield_knight": shield_knight,
           "shield_aegis": shield_aegis}
