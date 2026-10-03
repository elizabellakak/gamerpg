"""Hero knight + town NPCs: rigid armor parts parented to bones of a shared humanoid rig."""
import math
from collections import defaultdict

from mathutils import Vector

from . import anim as A
from .anim import Animator, Solver, hand_rot, merge
from .core import (Builder, Rig, basis, empty, export_glb, glow, define, reset_scene, xform)

V = Vector


def L(a, b, t):
    return V(a).lerp(V(b), t)


# ---------------------------------------------------------------------------
# skeleton
# ---------------------------------------------------------------------------
HERO_P = dict(hip=0.98, spine=1.08, chest=1.26, neck=1.48, head=1.56, head_top=1.78,
              sh_x=0.2, sh_z=1.43, elbow=(0.26, 0.03, 1.15), wrist=(0.28, 0.0, 0.9),
              hand_end=(0.29, -0.01, 0.8), hip_x=0.1, hip_z=0.95, knee=(0.11, 0.0, 0.52),
              ankle=(0.11, 0.03, 0.09), toe=(0.11, -0.11, 0.02), cape=True)


def humanoid_bones(p):
    bones = [
        ("root", (0, 0, 0), (0, 0, 0.2), None),
        ("hips", (0, 0, p["hip"]), (0, 0, p["spine"]), "root"),
        ("spine", (0, 0, p["spine"]), (0, 0, p["chest"]), "hips"),
        ("chest", (0, 0, p["chest"]), (0, 0, p["neck"]), "spine"),
        ("neck", (0, 0, p["neck"]), (0, 0, p["head"]), "chest"),
        ("head", (0, 0, p["head"]), (0, 0, p["head_top"]), "neck"),
    ]
    for side, s in (("R", -1), ("L", 1)):
        sh = (s * p["sh_x"], 0, p["sh_z"])
        el = (s * p["elbow"][0], p["elbow"][1], p["elbow"][2])
        wr = (s * p["wrist"][0], p["wrist"][1], p["wrist"][2])
        he = (s * p["hand_end"][0], p["hand_end"][1], p["hand_end"][2])
        bones += [("upper_arm_" + side, sh, el, "chest"),
                  ("forearm_" + side, el, wr, "upper_arm_" + side),
                  ("hand_" + side, wr, he, "forearm_" + side)]
    for side, s in (("R", -1), ("L", 1)):
        hp = (s * p["hip_x"], 0, p["hip_z"])
        kn = (s * p["knee"][0], p["knee"][1], p["knee"][2])
        an = (s * p["ankle"][0], p["ankle"][1], p["ankle"][2])
        to = (s * p["toe"][0], p["toe"][1], p["toe"][2])
        bones += [("thigh_" + side, hp, kn, "hips"),
                  ("shin_" + side, kn, an, "thigh_" + side),
                  ("foot_" + side, an, to, "shin_" + side)]
    if p.get("cape"):
        z0 = p["sh_z"] + 0.01
        bones += [("cape_1", (0, 0.16, z0), (0, 0.2, 1.0), "chest"),
                  ("cape_2", (0, 0.2, 1.0), (0, 0.25, 0.48), "cape_1")]
    return bones


def grip_point(p, s=-1):
    wr = V((s * p["wrist"][0], p["wrist"][1], p["wrist"][2]))
    he = V((s * p["hand_end"][0], p["hand_end"][1], p["hand_end"][2]))
    return wr.lerp(he, 0.55)


def make_rig(name, p):
    rig = Rig(name, humanoid_bones(p))
    solver = Solver(rig, chains={"R": ("upper_arm_R", "forearm_R", "hand_R"),
                                 "L": ("upper_arm_L", "forearm_L", "hand_L")},
                    sockets={"R": grip_point(p, -1), "L": grip_point(p, 1)})
    return rig, solver


def add_socket(rig, p):
    g = grip_point(p, -1)
    sock = empty("weapon_socket", size=0.12)
    sock.matrix_world = basis(x=(0, 0, 1), z=(0, -1, 0), loc=g)
    rig.attach(sock, "hand_R")
    return sock


# ---------------------------------------------------------------------------
# shared part helpers
# ---------------------------------------------------------------------------
def fist(B, p, s, glove="leather_dark", plate="steel", cuff="gold"):
    g = grip_point(p, s)
    wr = V((s * p["wrist"][0], p["wrist"][1], p["wrist"][2]))
    he = V((s * p["hand_end"][0], p["hand_end"][1], p["hand_end"][2]))
    d = (he - wr).normalized()
    Mh = basis(z=d, x=(s, 0, 0), loc=g)
    B.box((0.072, 0.088, 0.088), matrix=Mh, m=glove, bevel=0.022, seg=2)
    if plate:
        B.box((0.024, 0.08, 0.066), matrix=Mh @ xform((0.034, 0, -0.008)), m=plate, bevel=0.009)
        B.box((0.03, 0.084, 0.022), matrix=Mh @ xform((0.024, 0, 0.034)), m=plate, bevel=0.007)
    B.box((0.03, 0.034, 0.05), matrix=Mh @ xform((-0.03, 0, -0.03), (0, 20, 0)), m=glove,
          bevel=0.01)
    if cuff:
        B.torus(0.044, 0.008, matrix=basis(z=d, x=(1, 0, 0), loc=wr + d * 0.005), m=cuff,
                segs=14, rsegs=5)


def feather_poly(B, origin, direction, normal, L_, w, m, thick=0.008):
    pts = [(0, -w * 0.4), (L_ * 0.3, -w * 0.65), (L_ * 0.8, -w * 0.4), (L_, 0.0),
           (L_ * 0.7, w * 0.55), (L_ * 0.2, w * 0.5)]
    B.poly(pts, thick, matrix=basis(x=direction, z=normal, loc=origin), m=m, bevel=0.002,
           thick_fn=lambda x, y: thick * (1 - 0.6 * x / L_))


# ---------------------------------------------------------------------------
# HERO
# ---------------------------------------------------------------------------
def hero_parts(p):
    P = defaultdict(Builder)

    # ---- head / helmet
    B = P["head"]
    ys = (1, 1.08)
    B.lathe([(0.0, 1.54), (0.1, 1.545), (0.122, 1.6), (0.13, 1.66), (0.123, 1.72),
             (0.098, 1.763), (0.052, 1.79), (0, 1.8)], m="steel", segs=18, scale=ys)
    B.lathe([(0.11, 1.53), (0.13, 1.57), (0.139, 1.63), (0.139, 1.69), (0.129, 1.725)],
            arc=(-165, -15), m="steel", segs=12, scale=ys, smooth=True)
    B.lathe([(0.138, 1.652), (0.1445, 1.656), (0.1445, 1.672), (0.138, 1.676)],
            arc=(-138, -42), m="glow_visor", segs=10, scale=ys)
    B.box((0.018, 0.022, 0.085), loc=(0, -0.148, 1.6), m="steel", bevel=0.007)
    B.box((0.12, 0.03, 0.022), loc=(0, -0.14, 1.703), rot=(10, 0, 0), m="gold", bevel=0.008)
    B.torus(0.118, 0.011, matrix=xform((0, 0, 1.548), scale=(1, 1.08, 1)), m="gold", segs=24,
            rsegs=6)
    crest = [(-0.11, 1.72), (-0.07, 1.8), (0.0, 1.845), (0.09, 1.85), (0.16, 1.8), (0.11, 1.79),
             (0.04, 1.8), (-0.03, 1.785)]
    B.poly(crest, 0.016, matrix=basis(x=(0, 1, 0), y=(0, 0, 1)), m="gold", bevel=0.004)
    B.sweep([(0, 0.12, 1.81), (0, 0.2, 1.77), (0, 0.255, 1.66), (0, 0.27, 1.54), (0, 0.265, 1.47)],
            [0.032, 0.036, 0.03, 0.018, 0.0], m="navy", segs=8, scale=(0.5, 1.0))
    for s in (-1, 1):
        for i, (ang, ln) in enumerate(((35, 0.12), (55, 0.1), (75, 0.075))):
            a = math.radians(ang)
            d = V((0, math.cos(a) * 0.9, math.sin(a)))
            feather_poly(B, V((s * 0.125, 0.02, 1.69 - 0.012 * i)), d, (1, 0, 0), ln, 0.026,
                         "gold" if i != 1 else "gold_pale", thick=0.01)
    # ---- neck
    P["neck"].cyl(0.066, 0.07, 0.13, loc=(0, 0, 1.52), m="navy_dark", segs=12)
    # ---- chest
    B = P["chest"]
    B.lathe([(0.15, 1.22), (0.176, 1.28), (0.198, 1.35), (0.205, 1.41), (0.186, 1.455),
             (0.13, 1.485), (0.075, 1.5)], m="steel", segs=20, scale=(1, 0.74))
    B.lathe([(0.15, 1.245), (0.19, 1.31), (0.208, 1.38), (0.2, 1.44), (0.175, 1.465)],
            arc=(-150, -30), segs=12, scale=(1, 0.8), m="steel")
    B.torus(0.148, 0.012, matrix=xform((0, 0, 1.478), scale=(1, 0.74, 1)), m="gold", segs=24,
            rsegs=6)
    B.torus(0.152, 0.011, matrix=xform((0, 0, 1.228), scale=(1, 0.76, 1)), m="gold", segs=24,
            rsegs=6)
    B.gem(0.034, loc=(0, -0.172, 1.37), rot=(90, 0, 0), m="glow_cyan", segs=8, h_bot=0.03)
    B.torus(0.042, 0.009, loc=(0, -0.166, 1.37), rot=(90, 0, 0), m="gold", segs=16, rsegs=6)
    for s in (-1, 1):
        feather_poly(B, V((s * 0.04, -0.163, 1.375)), V((s * 0.9, 0.25, 0.35)), (0, -1, 0.0),
                     0.09, 0.03, "gold", thick=0.012)
        B.sphere(0.022, loc=(s * 0.15, 0.13, 1.45), m="gold", segs=10, rings=6,
                 scale=(1, 0.6, 1))
    B.box((0.012, 0.03, 0.09), loc=(0, -0.17, 1.28), m="gold", bevel=0.005)
    # ---- spine
    B = P["spine"]
    B.lathe([(0.14, 1.06), (0.15, 1.12), (0.155, 1.2), (0.16, 1.26)], m="navy", segs=16,
            scale=(1, 0.76))
    for z in (1.115, 1.175):
        B.cyl(0.163, 0.159, 0.055, loc=(0, 0, z), m="steel", segs=18, scale=(1, 0.77, 1),
              bevel=0.01)
    # ---- hips
    B = P["hips"]
    B.lathe([(0.12, 0.86), (0.15, 0.92), (0.155, 1.0), (0.145, 1.08)], m="navy_dark", segs=16,
            scale=(1, 0.78))
    B.cyl(0.168, 0.168, 0.06, loc=(0, 0, 1.02), m="leather", segs=18, scale=(1, 0.78, 1),
          bevel=0.012)
    B.box((0.075, 0.026, 0.064), loc=(0, -0.132, 1.02), m="gold", bevel=0.009)
    B.gem(0.014, loc=(0, -0.146, 1.02), rot=(90, 0, 0), m="glow_cyan", segs=6)
    for s in (-1, 1):
        B.box((0.125, 0.022, 0.12), loc=(s * 0.086, -0.124, 0.95), rot=(-8, 0, s * 20),
              m="steel", bevel=0.01)
        B.box((0.118, 0.02, 0.1), loc=(s * 0.09, -0.134, 0.855), rot=(-12, 0, s * 20),
              m="steel", bevel=0.01)
        B.box((0.118, 0.026, 0.014), loc=(s * 0.09, -0.142, 0.807), rot=(-12, 0, s * 20),
              m="gold", bevel=0.005)
        B.box((0.024, 0.13, 0.15), loc=(s * 0.176, 0.0, 0.92), rot=(0, -s * 8, 0), m="steel",
              bevel=0.01)
        B.box((0.03, 0.134, 0.014), loc=(s * 0.183, 0.0, 0.843), rot=(0, -s * 8, 0), m="gold",
              bevel=0.005)
    B.box((0.25, 0.02, 0.2), loc=(0, 0.13, 0.9), rot=(8, 0, 0), m="navy", bevel=0.008)
    # ---- arms
    for side, s in (("R", -1), ("L", 1)):
        sh = V((s * p["sh_x"], 0, p["sh_z"]))
        el = V((s * p["elbow"][0], p["elbow"][1], p["elbow"][2]))
        wr = V((s * p["wrist"][0], p["wrist"][1], p["wrist"][2]))
        B = P["upper_arm_" + side]
        B.seg(sh + V((0, 0, 0.03)), el, [(0.055, 0), (0.058, 0.3), (0.05, 0.85), (0.046, 1.0)],
              m="navy", segs=10)
        B.seg(L(sh, el, 0.38), L(sh, el, 0.86), [(0.061, 0), (0.058, 1)], m="steel", segs=12)
        B.seg(L(sh, el, 0.86), L(sh, el, 0.9), [(0.062, 0), (0.062, 1)], m="gold", segs=12)
        c = V((s * 0.225, 0, 1.425))
        Mp = xform(c, (0, s * 30, 0), (1, 1.12, 1))
        B.lathe([(0.128, 0.0), (0.124, 0.035), (0.104, 0.074), (0.068, 0.1), (0.0, 0.11)],
                matrix=Mp, m="steel", segs=16)
        B.torus(0.128, 0.009, matrix=Mp, m="gold", segs=20, rsegs=5)
        for k, (r0, z0) in enumerate(((0.136, -0.045), (0.142, -0.09))):
            B.lathe([(r0 - 0.012, z0 + 0.045), (r0, z0 + 0.04), (r0 + 0.004, z0)],
                    matrix=Mp, m="steel", segs=16, caps=False)
            B.torus(r0 + 0.003, 0.007, matrix=Mp @ xform((0, 0, z0)), m="gold", segs=20, rsegs=5)
        B.poly([(-0.07, 0.0), (0.06, 0.0), (0.03, 0.045), (-0.02, 0.06)], 0.014,
               matrix=Mp @ basis(x=(0, -1, 0), y=(0, 0, 1), loc=(0, 0, 0.095)), m="gold",
               bevel=0.004)
        B = P["forearm_" + side]
        d = (wr - el).normalized()
        B.sphere(0.056, loc=el + V((0, 0.012, 0)), m="steel", segs=12, rings=8,
                 scale=(1, 1, 0.9))
        B.seg(el, wr, [(0.05, 0.05), (0.057, 0.25), (0.051, 0.8), (0.046, 0.96)], m="steel",
              segs=12)
        B.torus(0.049, 0.008, matrix=basis(z=d, x=(1, 0, 0), loc=L(el, wr, 0.93)), m="gold",
                segs=14, rsegs=5)
        B.torus(0.057, 0.007, matrix=basis(z=d, x=(1, 0, 0), loc=L(el, wr, 0.3)), m="gold",
                segs=14, rsegs=5)
        B.poly([(0, -0.02), (0.11, -0.01), (0.12, 0.012), (0, 0.02)], 0.012,
               matrix=basis(x=-d, z=(0, 1, 0), loc=L(el, wr, 0.75) + V((s * 0.052, 0, 0))),
               m="steel", bevel=0.003)
        fist(P["hand_" + side], p, s)
    # ---- legs
    for side, s in (("R", -1), ("L", 1)):
        hp = V((s * p["hip_x"], 0, p["hip_z"]))
        kn = V((s * p["knee"][0], p["knee"][1], p["knee"][2]))
        an = V((s * p["ankle"][0], p["ankle"][1], p["ankle"][2]))
        B = P["thigh_" + side]
        B.seg(hp + V((0, 0, 0.05)), kn, [(0.075, 0), (0.079, 0.25), (0.066, 0.8), (0.058, 1.0)],
              m="navy", segs=12)
        B.box((0.112, 0.05, 0.24), loc=L(hp, kn, 0.45) + V((0, -0.058, 0)), rot=(3, 0, 0),
              m="steel", bevel=0.02, taper=(1.15, 1.0))
        B.box((0.11, 0.054, 0.014), loc=L(hp, kn, 0.74) + V((0, -0.06, 0)), rot=(3, 0, 0),
              m="gold", bevel=0.005)
        B = P["shin_" + side]
        B.seg(kn, an, [(0.058, 0.0), (0.064, 0.2), (0.06, 0.5), (0.048, 0.85), (0.053, 1.02)],
              m="steel", segs=12, scale=(1, 1.1))
        B.sphere(0.058, loc=kn + V((0, -0.035, 0.012)), scale=(1, 0.8, 1.05), m="steel", segs=12,
                 rings=8)
        B.torus(0.05, 0.008, loc=kn + V((0, -0.045, 0.012)), rot=(90, 0, 0), m="gold", segs=14,
                rsegs=5)
        B.poly([(0, -0.025), (0.07, -0.01), (0.075, 0.02), (0, 0.03)], 0.012,
               matrix=basis(x=(s, 0.0, 0.5), z=(0, 1, 0), loc=kn + V((s * 0.05, 0, 0.0))),
               m="steel", bevel=0.003)
        B.box((0.024, 0.02, 0.3), loc=L(kn, an, 0.45) + V((0, -0.066, 0)), m="steel",
              bevel=0.008)
        B.seg(L(kn, an, 0.1), L(kn, an, 0.14), [(0.066, 0), (0.066, 1)], m="gold", segs=12,
              scale=(1, 1.1))
        B = P["foot_" + side]
        x = s * p["ankle"][0]
        B.box((0.1, 0.21, 0.07), loc=(x, -0.035, 0.04), m="leather_dark", bevel=0.022)
        B.box((0.104, 0.215, 0.016), loc=(x, -0.035, 0.008), m="black_metal", bevel=0.005)
        B.box((0.106, 0.075, 0.04), loc=(x, -0.105, 0.058), rot=(-16, 0, 0), m="steel",
              bevel=0.013)
        B.box((0.108, 0.07, 0.04), loc=(x, -0.05, 0.074), rot=(-8, 0, 0), m="steel",
              bevel=0.013)
        B.cyl(0.06, 0.064, 0.05, loc=(x, 0.025, 0.1), m="steel", segs=12, bevel=0.01)
        B.cyl(0.066, 0.066, 0.012, loc=(x, 0.025, 0.128), m="gold", segs=12, bevel=0.004)
    # ---- cape
    if p.get("cape"):
        def c1(u, v):
            z = p["sh_z"] + 0.03 - (p["sh_z"] + 0.03 - 1.0) * v
            w = 0.16 + 0.06 * v
            y = 0.168 + 0.052 * v - 0.05 * u * u * (0.6 + 0.4 * v)
            return V((u * w, y, z)), V((u * 0.35, 1, 0))

        def zb(u):
            return 0.43 + 0.13 * max(0.0, 1 - abs(u) * 2.4)

        def c2(u, v):
            z = 1.0 + (zb(u) - 1.0) * v
            w = 0.22 + 0.05 * v
            y = 0.22 + 0.05 * v - 0.05 * u * u
            return V((u * w, y, z)), V((u * 0.35, 1, 0))
        P["cape_1"].sheet(c1, 8, 4, 0.016, "navy", "crimson_cloth", m_edge="gold")
        P["cape_2"].sheet(c2, 10, 6, 0.016, "navy", "crimson_cloth", m_edge="gold")
        for (fn, B, steps) in ((c2, P["cape_2"], 10),):
            pts = [fn(-1 + 2 * i / steps, 1.0)[0] + V((0, 0.0, 0.012)) for i in range(steps + 1)]
            B.sweep(pts, 0.011, m="gold", segs=5)
        for s in (-1, 1):
            P["cape_1"].sweep([c1(s, v / 4)[0] for v in range(5)], 0.01, m="gold", segs=5)
            P["cape_2"].sweep([c2(s, v / 6)[0] for v in range(7)], 0.01, m="gold", segs=5)
        yc = c1(0, 0.45)[0].y + 0.012
        P["cape_1"].poly([(0, 0.07), (0.04, 0), (0, -0.07), (-0.04, 0)], 0.008,
                         matrix=basis(x=(1, 0, 0), z=(0, 1, 0), loc=(0, yc, 1.24)), m="gold",
                         bevel=0.003)
        P["cape_1"].gem(0.02, loc=(0, yc + 0.006, 1.24), rot=(-90, 0, 0), m="glow_cyan", segs=6)
    return P


# ---------------------------------------------------------------------------
# hero animations
# ---------------------------------------------------------------------------
def legs(bend=12.0, spread=4.0, back=0.0):
    """knee-bent stance; returns spec (hips drop computed from bend)."""
    drop = 0.86 * (1 - math.cos(math.radians(bend)))
    return {
        "hips": {"l": (0, 0, -drop)},
        "thigh_R": {"r": (-bend + back, spread, 0)}, "shin_R": {"r": (2 * bend, 0, 0)},
        "foot_R": {"r": (-bend - back, -spread, 0)},
        "thigh_L": {"r": (-bend - back, -spread, 0)}, "shin_L": {"r": (2 * bend, 0, 0)},
        "foot_L": {"r": (-bend + back, spread, 0)},
    }


def hero_poses():
    P = {}
    P["ready"] = merge(legs(12, 5), {
        "spine": {"r": (4, 0, 8)}, "chest": {"r": (2, 0, 6)},
        "neck": {"r": (0, 0, -6)}, "head": {"r": (-4, 0, -8)},
        "ikR": {"grip": (-0.25, -0.3, 1.02), "rot": hand_rot((0.12, -0.55, 0.83), (1, 0, 0)),
                "pole": (-0.5, 0.5, -0.7)},
        "ikL": {"grip": (0.27, -0.1, 0.97), "pole": (0.5, 0.6, -0.6)},
        "cape_1": {"r": (4, 0, 0)}, "cape_2": {"r": (2, 0, 0)},
    })
    return P


def hero_anims(rig, solver):
    an = Animator(rig, solver)
    P = hero_poses()
    R = P["ready"]

    def with_(base, **kw):
        return merge(base, kw)

    # ---- Idle (2s)
    def idle(ph):
        b = math.sin(2 * math.pi * ph)
        c = math.sin(2 * math.pi * ph + 1.2)
        s = merge(R)
        A.add_r(s, "chest", (1.6 * b, 0, 0))
        A.add_r(s, "spine", (0.8 * b, 0, 0))
        A.add_r(s, "head", (-1.0 * b, 0, 0.8 * c))
        s["hips"]["l"] = (0, 0, s["hips"]["l"][2] + 0.006 * b)
        g = s["ikR"]["grip"]
        s["ikR"]["grip"] = (g[0], g[1], g[2] + 0.01 * b)
        s["ikR"]["rot"] = hand_rot((0.12, -0.55 - 0.03 * b, 0.83), (1, 0, 0))
        gl = s["ikL"]["grip"]
        s["ikL"]["grip"] = (gl[0], gl[1], gl[2] + 0.008 * b)
        s["cape_1"] = {"r": (4 + 1.5 * c, 0, 1.0 * b)}
        s["cape_2"] = {"r": (2 + 2.5 * math.sin(2 * math.pi * ph + 2.0), 0, 0)}
        return s
    an.loop("Idle", 60, idle)

    # ---- Run (0.7s)
    def run(ph):
        a = 2 * math.pi * ph
        s_ = math.sin(a)
        thR = -38 * s_ - 4
        thL = 38 * s_ - 4
        knR = 18 + 75 * max(0.0, math.cos(a)) ** 1.3
        knL = 18 + 75 * max(0.0, -math.cos(a)) ** 1.3
        bob = 0.03 * math.cos(2 * a) - 0.035
        spec = {
            "hips": {"l": (0, 0, bob), "r": (0, 0, 8 * s_)},
            "spine": {"r": (14, 0, -5 * s_)}, "chest": {"r": (4, 0, -7 * s_)},
            "neck": {"r": (-6, 0, 3 * s_)}, "head": {"r": (-8, 0, 3 * s_)},
            "thigh_R": {"r": (thR, 3, 0)}, "shin_R": {"r": (knR, 0, 0)},
            "foot_R": {"r": (-thR * 0.3 - knR * 0.25, -3, 0)},
            "thigh_L": {"r": (thL, -3, 0)}, "shin_L": {"r": (knL, 0, 0)},
            "foot_L": {"r": (-thL * 0.3 - knL * 0.25, 3, 0)},
            "upper_arm_L": {"r": (-42 * s_, -10, 0)}, "forearm_L": {"r": (-55 - 15 * s_, 0, 0)},
            "ikR": {"grip": (-0.3, 0.1, 0.97 + 0.03 * math.cos(2 * a)),
                    "rot": hand_rot((-0.45, 0.72, -0.38), (0, 0, 1)),
                    "pole": (-0.6, 0.3, -0.6)},
            "cape_1": {"r": (32 + 5 * math.sin(2 * a), 0, 3 * s_)},
            "cape_2": {"r": (22 + 9 * math.sin(2 * a + 1.3), 0, 0)},
        }
        return spec
    an.loop("Run", 21, run)

    # ---- Attack1: horizontal slash right -> left (0.5s)
    k1 = with_(R, hips={"l": (0, 0, -0.03), "r": (0, 0, -10)}, spine={"r": (2, 0, -22)},
               chest={"r": (0, 0, -25)}, head={"r": (-4, 0, 20)}, neck={"r": (0, 0, 10)},
               ikR={"grip": (-0.44, 0.04, 1.25), "rot": hand_rot((-0.7, 0.55, 0.45), (0.6, 0.75, 0)),
                    "pole": (-0.3, 0.3, -1)},
               ikL={"grip": (0.2, -0.28, 1.12), "pole": (0.6, 0.3, -0.6)})
    k2 = with_(R, hips={"l": (0, 0, -0.04), "r": (0, 0, -4)}, spine={"r": (4, 0, -8)},
               chest={"r": (2, 0, -12)}, head={"r": (-4, 0, 10)},
               ikR={"grip": (-0.44, -0.3, 1.17), "rot": hand_rot((-0.85, -0.5, 0.05), (0.5, -0.85, 0)),
                    "pole": (-0.3, 0.2, -1)},
               ikL={"grip": (0.25, -0.15, 1.05), "pole": (0.6, 0.3, -0.6)})
    k3 = with_(R, hips={"l": (0, 0, -0.05), "r": (0, 0, 6)}, spine={"r": (6, 0, 10)},
               chest={"r": (2, 0, 16)}, head={"r": (-4, 0, -12)},
               ikR={"grip": (-0.05, -0.52, 1.13), "rot": hand_rot((0.15, -1, 0.0), (1, 0.15, 0)),
                    "pole": (-0.3, 0.0, -1)},
               ikL={"grip": (0.32, 0.0, 1.05), "pole": (0.6, 0.3, -0.6)})
    k4 = with_(R, hips={"l": (0, 0, -0.045), "r": (0, 0, 12)}, spine={"r": (6, 0, 18)},
               chest={"r": (2, 0, 34)}, head={"r": (-4, 0, -30)}, neck={"r": (0, 0, -10)},
               ikR={"grip": (0.3, -0.32, 1.1), "rot": hand_rot((0.9, 0.4, -0.05), (-0.4, 0.9, 0)),
                    "pole": (0.0, 0.2, -1)},
               ikL={"grip": (0.35, 0.12, 1.05), "pole": (0.6, 0.3, -0.6)})
    an.keyposes("Attack1", [(0, R), (4, k1), (6, k2), (8, k3), (10, k4), (15, R)],
                ["smooth", "in", "linear", "out", "smooth"])

    # ---- Attack2: backhand slash left -> right (0.5s)
    b1 = with_(R, hips={"l": (0, 0, -0.03), "r": (0, 0, 10)}, spine={"r": (2, 0, 16)},
               chest={"r": (0, 0, 30)}, head={"r": (-4, 0, -26)}, neck={"r": (0, 0, -8)},
               ikR={"grip": (0.2, -0.16, 1.36), "rot": hand_rot((0.75, 0.45, 0.45), (0.45, -0.75, 0)),
                    "pole": (-0.2, -0.3, -1)},
               ikL={"grip": (0.3, 0.12, 1.0), "pole": (0.6, 0.3, -0.6)})
    b2 = with_(R, hips={"l": (0, 0, -0.04), "r": (0, 0, 5)}, spine={"r": (4, 0, 8)},
               chest={"r": (2, 0, 14)}, head={"r": (-4, 0, -12)},
               ikR={"grip": (0.14, -0.42, 1.25), "rot": hand_rot((0.7, -0.7, 0.1), (-0.7, -0.7, 0)),
                    "pole": (-0.3, -0.2, -1)},
               ikL={"grip": (0.32, 0.05, 1.0), "pole": (0.6, 0.3, -0.6)})
    b3 = with_(R, hips={"l": (0, 0, -0.05), "r": (0, 0, -5)}, spine={"r": (6, 0, -8)},
               chest={"r": (2, 0, -12)}, head={"r": (-4, 0, 10)},
               ikR={"grip": (-0.16, -0.5, 1.15), "rot": hand_rot((-0.3, -0.95, 0.0), (-0.95, 0.3, 0)),
                    "pole": (-0.5, 0.2, -1)},
               ikL={"grip": (0.3, -0.05, 1.02), "pole": (0.6, 0.3, -0.6)})
    b4 = with_(R, hips={"l": (0, 0, -0.045), "r": (0, 0, -10)}, spine={"r": (6, 0, -14)},
               chest={"r": (2, 0, -30)}, head={"r": (-4, 0, 24)},
               ikR={"grip": (-0.44, -0.18, 1.06), "rot": hand_rot((-0.9, 0.35, -0.15), (0.35, 0.9, 0)),
                    "pole": (-0.5, 0.4, -1)},
               ikL={"grip": (0.22, -0.25, 1.08), "pole": (0.6, 0.3, -0.6)})
    an.keyposes("Attack2", [(0, R), (5, b1), (7, b2), (9, b3), (11, b4), (15, R)],
                ["smooth", "in", "linear", "out", "smooth"])

    # ---- Attack3: overhead smash (0.7s)
    up = merge(legs(8, 6, back=6), {
        "spine": {"r": (-8, 0, 4)}, "chest": {"r": (-8, 0, 0)}, "head": {"r": (4, 0, 0)},
        "ikR": {"grip": (-0.05, 0.02, 1.86), "rot": hand_rot((0, 0.55, 0.83), (1, 0, 0)),
                "pole": (-1, 0.3, 0.3)},
        "ikL": {"follow": 0.1, "pole": (1, 0.3, 0.3)},
        "cape_1": {"r": (6, 0, 0)}, "cape_2": {"r": (4, 0, 0)}})
    smash = merge(legs(32, 7, back=10), {
        "hips": {"l": (0, 0, -0.16)},
        "spine": {"r": (28, 0, 2)}, "chest": {"r": (14, 0, 0)}, "head": {"r": (-22, 0, 0)},
        "ikR": {"grip": (-0.04, -0.56, 0.82), "rot": hand_rot((0, -0.72, -0.69), (1, 0, 0)),
                "pole": (-1, 0.3, -0.2)},
        "ikL": {"follow": 0.1, "pole": (1, 0.3, -0.2)},
        "cape_1": {"r": (-14, 0, 0)}, "cape_2": {"r": (-10, 0, 0)}})
    smash2 = merge(smash, {"hips": {"l": (0, 0, -0.15)}, "spine": {"r": (26, 0, 2)}})
    an.keyposes("Attack3", [(0, R), (8, up), (11, smash), (15, smash2), (21, R)],
                ["smooth", "in3", "out", "smooth"])

    # ---- Skill: 360 spin slash (0.8s)
    spin = merge(legs(18, 9), {
        "spine": {"r": (6, 0, 0)}, "chest": {"r": (0, 0, 4)}, "head": {"r": (-4, 0, -4)},
        "ikR": {"grip": (-0.58, -0.16, 1.22), "rot": hand_rot((-0.95, -0.3, 0.05), (0.3, -0.95, 0)),
                "pole": (-0.2, 0.3, -1)},
        "ikL": {"grip": (0.5, 0.08, 1.18), "pole": (0.2, 0.3, -1)},
        "cape_1": {"r": (24, 0, -12)}, "cape_2": {"r": (16, 0, -8)}})
    s0 = merge(spin, {"root": {"r": (0, 0, -30)}, "hips": {"l": (0, 0, -0.06)}})
    s1 = merge(spin, {"root": {"r": (0, 0, 150)}, "hips": {"l": (0, 0, 0.04)}})
    s2 = merge(spin, {"root": {"r": (0, 0, 360)}, "hips": {"l": (0, 0, -0.05)}})
    s3 = merge(R, {"root": {"r": (0, 0, 360)}})
    an.keyposes("Skill", [(0, merge(R, {"root": {"r": (0, 0, 0)}})), (4, s0), (12, s1), (19, s2),
                          (24, s3)], ["smooth", "in", "out", "smooth"])

    # ---- Cast: raise weapon to the sky (0.9s)
    cast = merge(legs(4, 6), {
        "spine": {"r": (-8, 0, 0)}, "chest": {"r": (-10, 0, 0)}, "neck": {"r": (-8, 0, 0)},
        "head": {"r": (-16, 0, 0)},
        "ikR": {"grip": (-0.03, -0.1, 2.0), "rot": hand_rot((0, -0.05, 1), (1, 0, 0)),
                "pole": (-1, 0.2, 0.0)},
        "ikL": {"follow": 0.1, "pole": (1, 0.2, 0.0)},
        "cape_1": {"r": (12, 0, 0)}, "cape_2": {"r": (10, 0, 0)}})
    cast2 = merge(cast, {"hips": {"l": (0, 0, 0.015)}, "cape_1": {"r": (16, 0, 0)},
                         "cape_2": {"r": (16, 0, 0)}})
    crouch = merge(legs(22, 6), {"spine": {"r": (14, 0, 0)}, "chest": {"r": (6, 0, 0)},
                                 "ikR": {"grip": (-0.1, -0.35, 0.95),
                                         "rot": hand_rot((0, -0.3, 0.95), (1, 0, 0)),
                                         "pole": (-1, 0.3, -0.3)},
                                 "ikL": {"follow": 0.1, "pole": (1, 0.3, -0.3)}})
    an.keyposes("Cast", [(0, R), (6, crouch), (13, cast), (27, cast2)],
                ["smooth", "out", "smooth"])

    # ---- Dash (0.3s)
    dash = {
        "hips": {"l": (0, 0, -0.1)},
        "spine": {"r": (30, 0, 0)}, "chest": {"r": (10, 0, 0)}, "neck": {"r": (-12, 0, 0)},
        "head": {"r": (-22, 0, 0)},
        "thigh_R": {"r": (38, 4, 0)}, "shin_R": {"r": (62, 0, 0)}, "foot_R": {"r": (-30, 0, 0)},
        "thigh_L": {"r": (-55, -4, 0)}, "shin_L": {"r": (55, 0, 0)}, "foot_L": {"r": (5, 0, 0)},
        "ikR": {"grip": (-0.32, 0.26, 1.0), "rot": hand_rot((-0.35, 0.85, 0.3), (0, 0, 1)),
                "pole": (-0.6, 0.2, -0.6)},
        "ikL": {"grip": (0.3, 0.2, 1.0), "pole": (0.6, 0.2, -0.6)},
        "cape_1": {"r": (30, 0, 0)}, "cape_2": {"r": (18, 0, 0)}}
    dash2 = merge(dash, {"cape_1": {"r": (36, 0, 0)}, "cape_2": {"r": (24, 0, 0)}})
    an.keyposes("Dash", [(0, R), (3, dash), (9, dash2)], ["out", "smooth"])

    # ---- Hit (0.3s)
    hit = merge(legs(16, 6), {
        "spine": {"r": (-14, 0, -6)}, "chest": {"r": (-10, 0, -4)}, "head": {"r": (-18, 0, 8)},
        "ikR": {"grip": (-0.36, -0.12, 1.15), "rot": hand_rot((-0.3, -0.3, 0.9), (1, 0, 0)),
                "pole": (-0.6, 0.4, -0.6)},
        "ikL": {"grip": (0.35, -0.12, 1.1), "pole": (0.6, 0.4, -0.6)},
        "cape_1": {"r": (6, 0, 0)}, "cape_2": {"r": (2, 0, 0)}})
    an.keyposes("Hit", [(0, R), (3, hit), (9, R)], ["out", "smooth"])

    # ---- Die (1.2s, holds last frame)
    kneel = merge(legs(52, 8), {
        "hips": {"l": (0, 0, -0.3)},
        "spine": {"r": (30, 0, 5)}, "chest": {"r": (12, 0, 0)}, "head": {"r": (22, 0, 0)},
        "ikR": {"grip": (-0.32, -0.3, 0.62), "rot": hand_rot((0.0, -0.8, -0.6), (1, 0, 0)),
                "pole": (-0.6, 0.3, -0.6)},
        "ikL": {"grip": (0.3, -0.2, 0.62), "pole": (0.6, 0.3, -0.6)},
        "cape_1": {"r": (-6, 0, 0)}, "cape_2": {"r": (-4, 0, 0)}})
    fall = merge(legs(25, 10), {
        "root": {"r": (-84, 0, 0), "l": (0, 0, 0.12)},
        "hips": {"l": (0, 0, -0.12)},
        "spine": {"r": (-6, 0, 0)}, "chest": {"r": (-4, 0, 0)}, "head": {"r": (-12, 0, 10)},
        "ikR": {"grip": (-0.62, 0.1, 1.28), "rot": hand_rot((-0.5, -0.2, 0.5), (0, -1, 0)),
                "pole": (-0.3, 0.5, -0.8)},
        "ikL": {"grip": (0.6, 0.05, 1.22), "pole": (0.3, 0.5, -0.8)},
        "cape_1": {"r": (-18, 0, 0)}, "cape_2": {"r": (-6, 0, 0)}})
    rest = merge(fall, {"root": {"r": (-90, 0, 0), "l": (0, 0, 0.15)}})
    an.keyposes("Die", [(0, R), (9, kneel), (24, fall), (36, rest)], ["smooth", "in", "out"])


# ---------------------------------------------------------------------------
# NPCs
# ---------------------------------------------------------------------------
SMITH_P = dict(HERO_P, hip=0.94, spine=1.04, chest=1.22, neck=1.44, head=1.52, head_top=1.76,
               sh_x=0.25, sh_z=1.4, elbow=(0.32, 0.04, 1.12), wrist=(0.34, 0.0, 0.87),
               hand_end=(0.35, -0.01, 0.76), hip_x=0.11, hip_z=0.92, knee=(0.12, 0.0, 0.5),
               ankle=(0.12, 0.03, 0.09), toe=(0.12, -0.12, 0.02), cape=False)

MAIDEN_P = dict(HERO_P, hip=0.9, spine=1.0, chest=1.16, neck=1.36, head=1.43, head_top=1.66,
                sh_x=0.16, sh_z=1.33, elbow=(0.21, 0.03, 1.08), wrist=(0.23, 0.0, 0.85),
                hand_end=(0.235, -0.01, 0.76), hip_x=0.085, hip_z=0.88, knee=(0.09, 0.0, 0.48),
                ankle=(0.09, 0.03, 0.08), toe=(0.09, -0.09, 0.02), cape=False)


def face(B, c, r, skin="skin", eyes=True, brows="hair_black"):
    """Stylized head: sphere skull + eyes + nose + ears. c = head center."""
    c = V(c)
    B.sphere(r, loc=c, scale=(0.92, 0.95, 1.05), m=skin, segs=16, rings=12)
    B.sphere(r * 0.6, loc=c + V((0, -r * 0.42, -r * 0.42)), scale=(1.0, 0.9, 0.8), m=skin,
             segs=12, rings=8)
    if eyes:
        for s in (-1, 1):
            B.sphere(r * 0.13, loc=c + V((s * r * 0.36, -r * 0.84, r * 0.05)),
                     scale=(1, 0.6, 1.25), m="eye_black", segs=8, rings=6)
            B.box((r * 0.36, r * 0.08, r * 0.08), loc=c + V((s * r * 0.38, -r * 0.86, r * 0.3)),
                  rot=(0, s * -10, 0), m=brows, bevel=r * 0.03)
            B.sphere(r * 0.16, loc=c + V((s * r * 0.9, 0, 0)), scale=(0.5, 0.8, 1.1), m=skin,
                     segs=8, rings=6)
    B.sphere(r * 0.12, loc=c + V((0, -r * 0.95, -r * 0.15)), scale=(0.9, 1, 1.1), m=skin, segs=8,
             rings=6)


def smith_parts(p):
    define("apron", color="#6b4423", rough=0.75)
    define("shirt", color="#c9b48a", rough=0.85)
    define("beard", color="#7a3f1f", rough=0.8)
    P = defaultdict(Builder)
    hc = V((0, -0.01, 1.62))
    face(P["head"], hc, 0.115, skin="skin_dark", brows="beard")
    B = P["head"]
    B.sphere(0.1, loc=hc + V((0, -0.06, -0.09)), scale=(1.0, 0.75, 1.0), m="beard", segs=12,
             rings=8)
    B.cyl(0.07, 0.02, 0.13, loc=hc + V((0, -0.08, -0.18)), rot=(15, 0, 0), m="beard", segs=10)
    B.box((0.13, 0.03, 0.03), loc=hc + V((0, -0.11, -0.04)), m="beard", bevel=0.012)
    B.torus(0.112, 0.016, loc=hc + V((0, 0, 0.03)), m="red_cloth", segs=18, rsegs=6)
    P["neck"].cyl(0.085, 0.09, 0.12, loc=(0, 0, 1.49), m="skin_dark", segs=12)
    B = P["chest"]
    B.lathe([(0.2, 1.2), (0.24, 1.3), (0.26, 1.38), (0.23, 1.44), (0.12, 1.48), (0.06, 1.49)],
            m="shirt", segs=18, scale=(1, 0.8))
    B.box((0.3, 0.03, 0.3), loc=(0, -0.205, 1.31), m="apron", bevel=0.012)
    for s in (-1, 1):
        B.box((0.03, 0.27, 0.025), loc=(s * 0.12, -0.04, 1.47), rot=(0, 0, 0), m="leather_dark",
              bevel=0.006)
    B = P["spine"]
    B.lathe([(0.22, 1.02), (0.25, 1.1), (0.24, 1.22)], m="shirt", segs=18, scale=(1, 0.85))
    B.box((0.32, 0.03, 0.22), loc=(0, -0.215, 1.12), m="apron", bevel=0.012)
    B = P["hips"]
    B.lathe([(0.16, 0.84), (0.21, 0.92), (0.23, 1.02), (0.22, 1.06)], m="leather_dark",
            segs=16, scale=(1, 0.85))
    B.cyl(0.235, 0.235, 0.06, loc=(0, 0, 1.0), m="leather", segs=18, scale=(1, 0.86, 1),
          bevel=0.012)
    B.box((0.08, 0.03, 0.065), loc=(0, -0.2, 1.0), m="iron", bevel=0.008)
    B.box((0.34, 0.025, 0.42), loc=(0, -0.215, 0.76), rot=(-4, 0, 0), m="apron", bevel=0.01)
    B.box((0.08, 0.04, 0.1), loc=(0.16, -0.17, 0.92), m="leather", bevel=0.01)
    for side, s in (("R", -1), ("L", 1)):
        sh = V((s * p["sh_x"], 0, p["sh_z"]))
        el = V((s * p["elbow"][0], p["elbow"][1], p["elbow"][2]))
        wr = V((s * p["wrist"][0], p["wrist"][1], p["wrist"][2]))
        P["upper_arm_" + side].seg(sh + V((0, 0, 0.04)), el,
                                   [(0.08, 0), (0.085, 0.3), (0.07, 0.9), (0.065, 1)],
                                   m="shirt", segs=12)
        P["upper_arm_" + side].sphere(0.1, loc=sh + V((s * 0.02, 0, 0.0)), m="shirt", segs=12,
                                      rings=8)
        B = P["forearm_" + side]
        B.seg(el, wr, [(0.066, 0), (0.074, 0.3), (0.058, 0.9), (0.054, 1)], m="skin_dark",
              segs=12)
        d = (wr - el).normalized()
        B.seg(L(el, wr, 0.62), L(el, wr, 1.0), [(0.064, 0), (0.06, 1)], m="leather", segs=12)
        fist(P["hand_" + side], p, s, glove="skin_dark", plate=None, cuff="iron")
    for side, s in (("R", -1), ("L", 1)):
        hp = V((s * p["hip_x"], 0, p["hip_z"]))
        kn = V((s * p["knee"][0], p["knee"][1], p["knee"][2]))
        an = V((s * p["ankle"][0], p["ankle"][1], p["ankle"][2]))
        P["thigh_" + side].seg(hp + V((0, 0, 0.06)), kn, [(0.09, 0), (0.088, 0.4), (0.07, 1)],
                               m="leather_dark", segs=12)
        P["shin_" + side].seg(kn, an, [(0.07, 0), (0.068, 0.3), (0.06, 0.7), (0.066, 1.0)],
                              m="leather_dark", segs=12)
        B = P["foot_" + side]
        x = s * p["ankle"][0]
        B.box((0.11, 0.22, 0.08), loc=(x, -0.04, 0.045), m="leather", bevel=0.025)
        B.cyl(0.07, 0.072, 0.07, loc=(x, 0.02, 0.11), m="leather", segs=12, bevel=0.012)
    return P


def hammer(parent_sock):
    B = Builder()
    B.cyl(0.018, 0.016, 0.5, loc=(0, 0, 0.14), m="wood", segs=10)
    B.box((0.2, 0.07, 0.08), loc=(0, 0, 0.4), m="iron", bevel=0.012)
    B.box((0.03, 0.08, 0.09), loc=(0.09, 0, 0.4), m="steel_dark", bevel=0.01)
    B.box((0.03, 0.08, 0.09), loc=(-0.09, 0, 0.4), m="steel_dark", bevel=0.01)
    B.cyl(0.022, 0.022, 0.06, loc=(0, 0, -0.1), m="leather", segs=10, bevel=0.005)
    ob = B.to_object("smith_hammer")
    ob.parent = parent_sock
    return ob


def maiden_parts(p):
    define("hakama", color="#c41e2e", rough=0.75)
    define("robe_white", color="#f6f3ee", rough=0.8)
    define("ribbon", color="#d4243a", rough=0.6)
    P = defaultdict(Builder)
    hc = V((0, 0, 1.52))
    face(P["head"], hc, 0.1, skin="skin")
    B = P["head"]
    B.sphere(0.108, loc=hc + V((0, 0.032, 0.035)), scale=(1.02, 0.95, 1.0), m="hair_black",
             segs=16, rings=10)
    B.box((0.19, 0.045, 0.035), loc=hc + V((0, -0.082, 0.085)), rot=(-25, 0, 0),
          m="hair_black", bevel=0.015)
    for s in (-1, 1):
        B.sweep([hc + V((s * 0.085, -0.04, 0.02)), hc + V((s * 0.095, -0.05, -0.08)),
                 hc + V((s * 0.09, -0.04, -0.17))], [0.03, 0.028, 0.012], m="hair_black", segs=8)
    B.sweep([hc + V((0, 0.06, 0.02)), hc + V((0, 0.11, -0.08)), hc + V((0, 0.12, -0.25)),
             hc + V((0, 0.13, -0.45)), hc + V((0, 0.12, -0.6))],
            [0.07, 0.08, 0.075, 0.06, 0.02], m="hair_black", segs=10, scale=(1.0, 0.5))
    B.box((0.08, 0.03, 0.04), loc=hc + V((0, 0.13, -0.12)), m="ribbon", bevel=0.01)
    for s in (-1, 1):
        B.poly([(0, 0), (0.08, 0.03), (0.09, -0.03)], 0.012,
               matrix=basis(x=(s, 0, 0.3), z=(0, 1, 0), loc=hc + V((0, 0.14, -0.12))),
               m="ribbon", bevel=0.003)
    B.poly([(0, 0), (0.04, 0.03), (0.06, 0), (0.04, -0.01)], 0.006,
           matrix=basis(x=(0.4, 0, 1), z=(0, 1, 0), loc=hc + V((0.08, -0.02, 0.08))),
           m="gold", bevel=0.002)
    P["neck"].cyl(0.04, 0.045, 0.1, loc=(0, 0, 1.4), m="skin", segs=10)
    B = P["chest"]
    B.lathe([(0.13, 1.12), (0.15, 1.2), (0.16, 1.28), (0.14, 1.34), (0.08, 1.38), (0.045, 1.39)],
            m="robe_white", segs=16, scale=(1, 0.8))
    for s in (-1, 1):
        B.box((0.025, 0.012, 0.25), loc=(s * 0.04, -0.125, 1.25), rot=(0, s * 25, 0),
              m="hakama", bevel=0.004)
    B = P["spine"]
    B.lathe([(0.12, 0.98), (0.13, 1.06), (0.13, 1.16)], m="robe_white", segs=16, scale=(1, 0.8))
    B = P["hips"]
    B.lathe([(0.0, 0.06), (0.3, 0.06), (0.29, 0.25), (0.25, 0.55), (0.18, 0.85), (0.14, 0.98),
             (0.0, 0.99)], m="hakama", segs=20, scale=(1, 0.85))
    B.cyl(0.145, 0.145, 0.06, loc=(0, 0, 0.99), m="hakama", segs=16, scale=(1, 0.82, 1),
          bevel=0.01)
    B.box((0.08, 0.03, 0.05), loc=(0, -0.125, 0.99), m="gold", bevel=0.008)
    for side, s in (("R", -1), ("L", 1)):
        sh = V((s * p["sh_x"], 0, p["sh_z"]))
        el = V((s * p["elbow"][0], p["elbow"][1], p["elbow"][2]))
        wr = V((s * p["wrist"][0], p["wrist"][1], p["wrist"][2]))
        P["upper_arm_" + side].seg(sh + V((0, 0, 0.03)), el,
                                   [(0.05, 0), (0.06, 0.4), (0.07, 1.0)], m="robe_white",
                                   segs=12)
        B = P["forearm_" + side]
        B.seg(el, wr + (wr - el).normalized() * 0.02,
              [(0.07, 0), (0.1, 0.4), (0.13, 0.9), (0.12, 1.0)], m="robe_white", segs=12,
              scale=(0.7, 1.0), caps=True)
        B.seg(L(el, wr, 0.93), L(el, wr, 1.0), [(0.125, 0), (0.125, 1)], m="ribbon", segs=12,
              scale=(0.72, 1.02))
        fist(P["hand_" + side], p, s, glove="skin", plate=None, cuff=None)
    for side, s in (("R", -1), ("L", 1)):
        an = V((s * p["ankle"][0], p["ankle"][1], p["ankle"][2]))
        B = P["foot_" + side]
        x = s * p["ankle"][0]
        B.box((0.075, 0.17, 0.05), loc=(x, -0.03, 0.03), m="white_cloth", bevel=0.018)
        B.box((0.085, 0.19, 0.02), loc=(x, -0.03, 0.01), m="wood", bevel=0.006)
    return P


def staff(parent_sock):
    glow("glow_spirit", "#ff8ad8", 5.0, color="#ffffff")
    B = Builder()
    B.cyl(0.014, 0.012, 1.55, loc=(0, 0, 0.18), m="wood_red", segs=10)
    for z in (-0.5, 0.5, 0.9):
        B.cyl(0.018, 0.018, 0.02, loc=(0, 0, z), m="gold", segs=10, bevel=0.004)
    B.torus(0.09, 0.008, loc=(0, 0, 1.06), rot=(90, 0, 0), m="gold", segs=24, rsegs=6)
    B.sphere(0.055, loc=(0, 0, 1.06), m="glow_spirit", segs=14, rings=10)
    for k in range(4):
        a = math.radians(90 * k)
        B.poly([(0, -0.01), (0.07, 0.0), (0, 0.01)], 0.004,
               matrix=xform((0, 0, 0.95), (0, 0, 0)) @ basis(x=(math.cos(a), math.sin(a), -2),
                                                            z=(-math.sin(a), math.cos(a), 0)),
               m="white_cloth")
    ob = B.to_object("maiden_staff")
    ob.parent = parent_sock
    return ob


def npc_anims(rig, solver, kind):
    an = Animator(rig, solver)
    if kind == "smith":
        base = merge(legs(6, 6), {
            "spine": {"r": (2, 0, 0)}, "chest": {"r": (-2, 0, 0)},
            "ikR": {"grip": (-0.32, -0.12, 0.9), "rot": hand_rot((-0.2, -0.3, 0.93), (0, -1, 0)),
                    "pole": (-0.6, 0.5, -0.6)},
            "ikL": {"grip": (0.24, -0.16, 1.0), "pole": (0.6, 0.5, -0.6)}})
    else:
        base = merge(legs(3, 2), {
            "spine": {"r": (0, 0, 0)}, "head": {"r": (4, 0, 6)},
            "ikR": {"grip": (-0.2, -0.16, 1.0), "rot": hand_rot((0, -0.08, 1), (1, 0, 0)),
                    "pole": (-0.6, 0.5, -0.6)},
            "ikL": {"grip": (0.08, -0.22, 1.06), "pole": (0.7, 0.4, -0.6)}})

    def idle(ph):
        b = math.sin(2 * math.pi * ph)
        c = math.sin(2 * math.pi * ph + 1.0)
        s = merge(base)
        A.add_r(s, "chest", (1.5 * b, 0, 0))
        A.add_r(s, "spine", (0.8 * b, 0, 0))
        A.add_r(s, "head", (-1.2 * b, 0, 3 * c))
        s["hips"]["l"] = (0, 0, s["hips"]["l"][2] + 0.005 * b)
        for k in ("ikR", "ikL"):
            g = s[k]["grip"]
            s[k]["grip"] = (g[0], g[1], g[2] + 0.008 * b)
        return s
    an.loop("Idle", 72, idle)


# ---------------------------------------------------------------------------
# builders
# ---------------------------------------------------------------------------
def build_hero(export=True, anims=True):
    reset_scene()
    rig, solver = make_rig("HeroRig", HERO_P)
    rig.attach_builders(hero_parts(HERO_P), "hero")
    sock = add_socket(rig, HERO_P)
    if anims:
        hero_anims(rig, solver)
    if export:
        return export_glb("models/hero.glb", animations=True)
    return rig, solver, sock


def build_npc(kind, export=True):
    reset_scene()
    p = SMITH_P if kind == "smith" else MAIDEN_P
    name = "SmithRig" if kind == "smith" else "MaidenRig"
    rig, solver = make_rig(name, p)
    parts = smith_parts(p) if kind == "smith" else maiden_parts(p)
    rig.attach_builders(parts, "npc_" + kind)
    sock = add_socket(rig, p)
    (hammer if kind == "smith" else staff)(sock)
    npc_anims(rig, solver, kind)
    if export:
        return export_glb("models/npc_%s.glb" % kind, animations=True)
    return rig, solver, sock


CHARACTERS = {
    "hero": build_hero,
    "npc_smith": lambda: build_npc("smith"),
    "npc_maiden": lambda: build_npc("maiden"),
}


def build(cid):
    return CHARACTERS[cid]()
