"""Boss dragon v2: digitigrade legs, S-curved neck, horned head with jaw/teeth, spine plates,
spade tail, layered belly plates, molten chest cracks, and bat wings whose membranes are a
skinned mesh (weighted between consecutive finger bones) so they never tear open.
All other parts are rigid meshes parented to bones."""
import math
import random

import bmesh
import bpy
from mathutils import Vector

from .anim import Animator, Solver, merge
from .core import M, Builder, Rig, basis, define, export_glb, glow, link, reset_scene, xform

V = Vector


def L(a, b, t):
    return V(a).lerp(V(b), t)


def _mats():
    define("drg_scale", color="#9c121c", rough=0.4, metal=0.15)
    define("drg_dark", color="#3e070c", rough=0.45, metal=0.1)
    define("drg_belly", color="#d89a5a", rough=0.55)
    define("drg_membrane", color="#5a0c14", rough=0.65)
    define("drg_horn", color="#231b1b", rough=0.3)
    define("drg_claw", color="#ece0c8", rough=0.35)
    define("drg_mouth", color="#4a0a10", rough=0.5)
    glow("drg_glow", "#ff5a10", 2.4)
    glow("drg_eye", "#ffa010", 2.5)
    define("nose", color="#101010", rough=0.3)


# ---------------------------------------------------------------------------
# skeleton
# ---------------------------------------------------------------------------
NECK = [(0, -0.85, 1.7), (0, -1.12, 2.1), (0, -1.24, 2.55), (0, -1.5, 2.86), (0, -1.85, 2.98)]
HEAD = ((0, -1.85, 2.98), (0, -2.55, 2.84))
TAIL = [(0, 0.85, 1.35), (0, 1.4, 1.15), (0, 1.95, 0.88), (0, 2.5, 0.6), (0, 3.0, 0.42),
        (0, 3.45, 0.34)]
FRONT = [(0.44, -0.55, 1.32), (0.52, -0.32, 0.82), (0.52, -0.58, 0.3), (0.52, -0.68, 0.08),
         (0.52, -0.92, 0.04)]
BACK = [(0.46, 0.75, 1.3), (0.56, 0.3, 0.86), (0.56, 0.82, 0.42), (0.56, 0.72, 0.08),
        (0.56, 0.45, 0.04)]
WING = dict(sh=(0.34, -0.5, 1.88), el=(1.15, -0.12, 2.45), wr=(2.15, 0.2, 2.72),
            f3=(3.35, 0.65, 2.45), f4=(2.95, 1.55, 1.9), f5=(2.05, 1.95, 1.55))


def mir(p, s):
    return V((p[0] * s, p[1], p[2]))


def bones():
    b = [("root", (0, 0, 0), (0, 0, 0.5), None),
         ("hips", (0, 0.8, 1.35), (0, 0.0, 1.45), "root"),
         ("chest", (0, 0.0, 1.45), (0, -0.85, 1.62), "hips")]
    par = "chest"
    for i in range(4):
        b.append(("neck_%d" % (i + 1), NECK[i], NECK[i + 1], par))
        par = "neck_%d" % (i + 1)
    b.append(("head", HEAD[0], HEAD[1], "neck_4"))
    b.append(("jaw", (0, -1.95, 2.86), (0, -2.55, 2.68), "head"))
    par = "hips"
    for i in range(5):
        b.append(("tail_%d" % (i + 1), TAIL[i], TAIL[i + 1], par))
        par = "tail_%d" % (i + 1)
    for side, s in (("L", 1), ("R", -1)):
        for fb, pts, par0 in (("F", FRONT, "chest"), ("B", BACK, "hips")):
            par = par0
            for i in range(4):
                nm = "leg_%s%s_%d" % (fb, side, i + 1)
                b.append((nm, mir(pts[i], s), mir(pts[i + 1], s), par))
                par = nm
        w = {k: mir(v, s) for k, v in WING.items()}
        b += [("wing_%s_1" % side, w["sh"], w["el"], "chest"),
              ("wing_%s_2" % side, w["el"], w["wr"], "wing_%s_1" % side),
              ("wing_%s_3" % side, w["wr"], w["f3"], "wing_%s_2" % side),
              ("wing_%s_4" % side, w["wr"], w["f4"], "wing_%s_2" % side),
              ("wing_%s_5" % side, w["wr"], w["f5"], "wing_%s_2" % side)]
    return b


# ---------------------------------------------------------------------------
# geometry helpers
# ---------------------------------------------------------------------------
def plate(B, p, d_back, h, w, m="drg_horn", up=(0, 0, 1)):
    """Triangular spine plate standing on point p, leaning toward d_back."""
    up = V(up).normalized()
    d = V(d_back).normalized()
    pts = [(-w * 0.5, 0), (w * 0.55, 0), (w * 0.35, h)]
    x = d
    y = (up - d * up.dot(d)).normalized()
    B.poly(pts, 0.035, matrix=basis(x=x, y=y, loc=p), m=m, bevel=0.008, smooth=False,
           thick_fn=lambda a, b_, hh=h: 0.05 * (1 - 0.8 * b_ / hh))


def claw(B, p, d, ln, r, m="drg_claw"):
    d = V(d).normalized()
    down = V((0, 0, -1))
    c = p + d * ln * 0.55 + down * ln * 0.12
    e = p + d * ln + down * ln * 0.45
    B.sweep([p, c, e], [r, r * 0.65, 0.0], m=m, segs=6, angle=70)


def belly_plates(B, p0, p1, r0, r1, n, side_down=(0, 0, -1), m="drg_belly", w=1.0):
    d = (V(p1) - V(p0)).normalized()
    dn = V(side_down).normalized()
    for k in range(n):
        t = (k + 0.5) / n
        r = r0 + (r1 - r0) * t
        c = L(p0, p1, t) + dn * r * 0.88
        x = V((1, 0, 0))
        z = dn.cross(x).normalized() * -1
        B.box((r * 1.25 * w, (V(p1) - V(p0)).length / n * 1.15, 0.06),
              matrix=basis(x=x, z=-dn, loc=c) @ xform((0, 0, 0), (-12, 0, 0)), m=m,
              bevel=0.02, seg=1, angle=50)


def spine_row(B, p0, p1, r0, r1, n, h0, h1):
    d = (V(p1) - V(p0)).normalized()
    up = V((0, 0, 1))
    upn = (up - d * up.dot(d)).normalized()
    for k in range(n):
        t = (k + 0.5) / n
        r = r0 + (r1 - r0) * t
        plate(B, L(p0, p1, t) + upn * r * 0.8, d, h0 + (h1 - h0) * t, 0.11 + 0.18 * (h0 + (h1 - h0) * t),
              up=upn)


# ---------------------------------------------------------------------------
# skinned wing membranes
# ---------------------------------------------------------------------------
def _poly_at(pts, t):
    """point + segment index on a polyline at normalized arc length t"""
    segl = [(pts[i + 1] - pts[i]).length for i in range(len(pts) - 1)]
    tot = sum(segl)
    d = t * tot
    for i, l_ in enumerate(segl):
        if d <= l_ or i == len(segl) - 1:
            return pts[i].lerp(pts[i + 1], min(1.0, d / max(l_, 1e-6))), i
        d -= l_


def panel(verts, faces, weights, A, B_, wA, wB, nu, nv, scallop=0.0, scallop_from=0.0,
          toward=None):
    """Grid between polylines A (v=0) and B_ (v=1), parameter t along both.
    wA(t)/wB(t) -> {bone: w}. Rows near t=1 get the free edge scalloped toward `toward`."""
    base = len(verts)
    for i in range(nu + 1):
        t = i / nu
        a, _ = _poly_at(A, t)
        b, _ = _poly_at(B_, t)
        wa, wb = wA(t), wB(t)
        for j in range(nv + 1):
            v = j / nv
            p = a.lerp(b, v)
            if scallop and t >= scallop_from:
                k = (t - scallop_from) / max(1e-6, 1 - scallop_from)
                p = p.lerp(toward, scallop * math.sin(math.pi * v) * k ** 3)
            verts.append(p)
            w = {}
            for bn, x in wa.items():
                w[bn] = w.get(bn, 0) + x * (1 - v)
            for bn, x in wb.items():
                w[bn] = w.get(bn, 0) + x * v
            weights.append(w)
    for i in range(nu):
        for j in range(nv):
            a = base + i * (nv + 1) + j
            faces.append((a, a + nv + 1, a + nv + 2, a + 1))


def membrane_object(rig, side, s):
    w = {k: mir(v, s) for k, v in WING.items()}
    b1, b2, b3, b4, b5 = ("wing_%s_%d" % (side, i) for i in range(1, 6))
    verts, faces, weights = [], [], []
    wr = w["wr"]
    # finger panels
    for fa, fb_, ba, bb in (("f3", "f4", b3, b4), ("f4", "f5", b4, b5)):
        panel(verts, faces, weights, [wr, w[fa]], [wr, w[fb_]], lambda t, ba=ba: {ba: 1.0},
              lambda t, bb=bb: {bb: 1.0}, 8, 6, scallop=0.28, scallop_from=0.4, toward=wr)
    # inner panel: arm (shoulder->elbow->wrist) to body flank -> finger 5 tip
    flank_f = V((s * 0.36, -0.35, 1.72))
    flank_r = V((s * 0.4, 1.0, 1.5))
    A = [w["sh"], w["el"], wr]
    Bp = [flank_f, flank_r, L(flank_r, w["f5"], 0.5), w["f5"]]
    la = (w["el"] - w["sh"]).length
    lb = (wr - w["el"]).length

    def wA(t):
        if t >= 0.999:
            return {b5: 1.0}
        if t * (la + lb) <= la:
            return {b1: 1.0}
        return {b2: 1.0}

    def wB(t):
        if t < 0.35:
            return {"chest": 1.0 - t / 0.35 * 0.5, "hips": t / 0.35 * 0.5}
        if t < 0.5:
            return {"hips": 1.0}
        k = (t - 0.5) / 0.5
        return {"hips": (1 - k) ** 2, b5: 1 - (1 - k) ** 2}
    base = len(verts)
    panel(verts, faces, weights, A, Bp, wA, wB, 12, 7)
    # scallop the free trailing edge (v=1 row, t in 0.5..1) toward the arm
    for i in range(13):
        t = i / 12
        if 0.5 < t < 1.0:
            k = math.sin(math.pi * (t - 0.5) / 0.5)
            idx = base + i * 8 + 7
            verts[idx] = verts[idx].lerp(verts[base + i * 8 + 3], 0.22 * k)
    me = bpy.data.meshes.new("dragon_wing_%s" % side)
    me.from_pydata([tuple(v) for v in verts], [], faces)
    me.update()
    for poly in me.polygons:
        poly.use_smooth = True
    me.materials.append(M("drg_membrane"))
    ob = bpy.data.objects.new("dragon_wing_%s" % side, me)
    link(ob)
    groups = {}
    for i, wd in enumerate(weights):
        tot = sum(wd.values())
        for bn, x in wd.items():
            if x / tot < 1e-4:
                continue
            g = groups.get(bn)
            if g is None:
                g = groups[bn] = ob.vertex_groups.new(name=bn)
            g.add([i], x / tot, "REPLACE")
    mod = ob.modifiers.new("Armature", "ARMATURE")
    mod.object = rig.arm
    ob.parent = rig.arm
    return ob


# ---------------------------------------------------------------------------
# build
# ---------------------------------------------------------------------------
def build_parts():
    P = {}

    def B(name):
        if name not in P:
            P[name] = Builder()
        return P[name]
    sc, dk, gl, be = "drg_scale", "drg_dark", "drg_glow", "drg_belly"
    # ---- chest: muscular barrel + pecs + molten core cracks
    c = B("chest")
    c.sphere(0.62, loc=(0, -0.38, 1.5), scale=(0.9, 1.1, 0.88), m=sc, segs=20, rings=14)
    for s in (-1, 1):
        c.sphere(0.3, loc=(s * 0.26, -0.74, 1.32), scale=(0.85, 0.85, 1.0), m=sc, segs=14, rings=10)
        c.sphere(0.26, loc=(s * 0.4, -0.5, 1.5), scale=(0.65, 1.0, 1.0), m=sc, segs=12, rings=8)
    c.sphere(0.42, loc=(0, -0.7, 1.12), scale=(0.75, 0.9, 0.45), m=gl, segs=14, rings=8)
    for k in range(5):
        y = -0.2 - k * 0.15
        c.box((0.5 - k * 0.02, 0.17, 0.06), loc=(0, y, 0.98 + k * 0.035), rot=(-14, 0, 0),
              m=be, bevel=0.025, seg=1)
    for k in range(6):
        a = math.radians(-50 + k * 20)
        c.box((0.025, 0.02, 0.2), loc=(math.sin(a) * 0.32, -0.95, 1.38 + math.cos(a) * 0.1),
              rot=(70, k * 13 - 30, 0), m=gl, smooth=False)
    spine_row(c, (0, 0.0, 1.55), (0, -0.85, 1.75), 0.55, 0.5, 4, 0.36, 0.3)
    # ---- hips
    h = B("hips")
    h.sphere(0.55, loc=(0, 0.45, 1.4), scale=(0.88, 1.15, 0.82), m=sc, segs=18, rings=12)
    for k in range(4):
        h.box((0.46 - k * 0.04, 0.17, 0.06), loc=(0, 0.1 + k * 0.17, 0.98 + k * 0.03),
              rot=(-6, 0, 0), m=be, bevel=0.025, seg=1)
    spine_row(h, (0, 0.85, 1.5), (0, 0.0, 1.6), 0.5, 0.55, 4, 0.26, 0.34)
    # ---- neck (S curve): thick segments, belly plates, glowing throat seams, plates on top
    for i in range(4):
        p0, p1 = V(NECK[i]), V(NECK[i + 1])
        r0, r1 = 0.36 - i * 0.05, 0.31 - i * 0.05
        n = B("neck_%d" % (i + 1))
        d = (p1 - p0).normalized()
        n.seg(p0 - d * 0.12, p1 + d * 0.05, [(r0, 0), (r0 * 1.04, 0.45), (r1, 1.0)], m=sc,
              segs=14)
        n.sphere(r1 * 0.98, loc=p1, m=sc, segs=12, rings=8)
        fwd = V((0, -1, 0))
        dn = (fwd.cross(d).cross(d)).normalized() * -1 if i < 3 else V((0, -0.2, -1)).normalized()
        dn = (V((0, -1, -0.4)) - d * V((0, -1, -0.4)).dot(d)).normalized()
        belly_plates(n, p0, p1, r0, r1, 2, side_down=dn, w=0.95)
        n.seg(p0 + dn * r0 * 0.78, p1 + dn * r1 * 0.78, [(r0 * 0.42, 0), (r1 * 0.42, 1)], m=gl,
              segs=8, scale=(1.0, 0.5), xref=(1, 0, 0))
        spine_row(n, p0, p1, r0, r1, 2, 0.24 - i * 0.03, 0.22 - i * 0.03)
    # ---- head
    hd = B("head")
    hc = V((0, -2.02, 3.0))
    hd.box((0.44, 0.48, 0.34), loc=hc, rot=(-6, 0, 0), m=sc, bevel=0.09, seg=2, taper=(0.85, 1.0))
    hd.box((0.3, 0.56, 0.2), loc=hc + V((0, -0.44, -0.07)), rot=(-7, 0, 0), m=sc, bevel=0.06,
           seg=2, taper=(0.8, 0.9))
    hd.box((0.28, 0.5, 0.05), loc=hc + V((0, -0.36, 0.06)), rot=(-9, 0, 0), m=dk, bevel=0.02,
           seg=1)
    for s in (-1, 1):
        # brow ridge + deep-set glowing eyes
        hd.box((0.12, 0.26, 0.08), loc=hc + V((s * 0.15, -0.18, 0.15)), rot=(14, s * 6, s * -16),
               m=dk, bevel=0.025, seg=1)
        hd.sphere(0.05, loc=hc + V((s * 0.19, -0.2, 0.07)), scale=(0.55, 1.25, 0.55), m="drg_eye",
                  segs=10, rings=6)
        # horns: two big swept-back, two smaller, cheek spikes
        hd.sweep([hc + V((s * 0.14, 0.1, 0.16)), hc + V((s * 0.25, 0.38, 0.3)),
                  hc + V((s * 0.28, 0.7, 0.3)), hc + V((s * 0.22, 0.98, 0.32)),
                  hc + V((s * 0.15, 1.16, 0.36))], [0.09, 0.075, 0.055, 0.03, 0.0], m="drg_horn",
                 segs=8)
        hd.sweep([hc + V((s * 0.2, 0.05, 0.04)), hc + V((s * 0.38, 0.3, 0.06)),
                  hc + V((s * 0.48, 0.55, 0.14)), hc + V((s * 0.5, 0.7, 0.26))],
                 [0.06, 0.045, 0.025, 0.0], m="drg_horn", segs=7)
        hd.sweep([hc + V((s * 0.08, 0.15, 0.17)), hc + V((s * 0.1, 0.38, 0.28)),
                  hc + V((s * 0.08, 0.58, 0.34))], [0.04, 0.025, 0.0], m="drg_horn", segs=6)
        for k, (ln, zz) in enumerate(((0.26, -0.02), (0.2, -0.1), (0.15, -0.17))):
            hd.cyl(0.035, 0.0, ln, matrix=basis(z=(s * 0.8, 0.6, -0.1 * k), x=(0, 0, 1),
                                                 loc=hc + V((s * 0.21, 0.12, zz))),
                   m=dk, segs=5, smooth=False)
        hd.sphere(0.024, loc=hc + V((s * 0.075, -0.71, 0.02)), m="nose", segs=6, rings=4)
        for k in range(6):
            hd.cyl(0.022, 0.0, 0.09 if k % 2 == 0 else 0.065,
                   loc=hc + V((s * (0.12 - k * 0.002), -0.68 + k * 0.1, -0.18)), rot=(180, 0, 0),
                   m="drg_claw", segs=4, smooth=False)
    hd.box((0.22, 0.5, 0.04), loc=hc + V((0, -0.42, -0.17)), rot=(-7, 0, 0), m="drg_mouth",
           smooth=False)
    spine_row(hd, hc + V((0, -0.1, 0.12)), hc + V((0, 0.25, 0.12)), 0.1, 0.1, 2, 0.16, 0.14)
    # ---- jaw
    j = B("jaw")
    jp0, jp1 = V((0, -1.98, 2.84)), V((0, -2.6, 2.66))
    j.box((0.3, 0.64, 0.12), loc=L(jp0, jp1, 0.5) + V((0, 0, -0.04)), rot=(-16, 0, 0), m=sc,
          bevel=0.04, seg=1, taper=(0.82, 0.95))
    j.box((0.32, 0.5, 0.05), loc=L(jp0, jp1, 0.45) + V((0, 0, -0.1)), rot=(-16, 0, 0), m=be,
          bevel=0.015, seg=1)
    j.box((0.2, 0.55, 0.03), loc=L(jp0, jp1, 0.5) + V((0, 0, 0.025)), rot=(-16, 0, 0),
          m="drg_mouth", smooth=False)
    j.sweep([L(jp0, jp1, 0.15) + V((0, 0, 0.04)), L(jp0, jp1, 0.5) + V((0, 0, 0.06)),
             L(jp0, jp1, 0.8) + V((0, 0, 0.05))], [0.06, 0.05, 0.0], m="drg_glow", segs=6,
            scale=(1.0, 0.4))
    for s in (-1, 1):
        for k in range(6):
            q = L(jp0, jp1, 0.25 + k * 0.12) + V((s * 0.115, 0, 0.05))
            j.cyl(0.02, 0.0, 0.08 if k % 2 else 0.06, loc=q, rot=(-16, 0, 0), m="drg_claw",
                  segs=4, smooth=False)
        j.cyl(0.03, 0.0, 0.16, matrix=basis(z=(s * 0.7, 0.7, -0.3), x=(0, 0, 1),
                                             loc=jp0 + V((s * 0.13, 0.02, -0.05))),
              m=dk, segs=5, smooth=False)
    # ---- tail
    for i in range(5):
        p0, p1 = V(TAIL[i]), V(TAIL[i + 1])
        r0 = 0.36 * (1 - i * 0.19)
        r1 = 0.36 * (1 - (i + 1) * 0.19)
        t = B("tail_%d" % (i + 1))
        d = (p1 - p0).normalized()
        t.seg(p0 - d * 0.08, p1 + d * 0.04, [(r0, 0), (r0 * 1.02, 0.4), (max(r1, 0.04), 1.0)],
              m=sc, segs=12, scale=(1.0, 0.92))
        t.sphere(max(r1, 0.04) * 0.97, loc=p1, m=sc, segs=10, rings=8)
        dn = (V((0, 0, -1)) - d * V((0, 0, -1)).dot(d)).normalized()
        belly_plates(t, p0, p1, r0, max(r1, 0.05), 2, side_down=dn, w=0.9)
        spine_row(t, p0, p1, r0, max(r1, 0.05), 2, 0.28 - i * 0.045, 0.24 - i * 0.045)
    sp = B("tail_5")
    tip = V(TAIL[5])
    sp.poly([(0, -0.02), (0.12, 0.2), (0.42, 0.0), (0.12, -0.2)], 0.06,
            matrix=basis(x=(0, 1, -0.15), z=(0, 0.15, 1), loc=tip + V((0, -0.05, 0))), m="drg_horn",
            bevel=0.02, smooth=False, thick_fn=lambda x, y: 0.07 * (1 - x / 0.5))
    sp.poly([(0, -0.02), (0.12, 0.2), (0.42, 0.0), (0.12, -0.2)], 0.03,
            matrix=basis(x=(0, 1, -0.15), z=(1, 0, 0), loc=tip + V((0, -0.05, 0))), m="drg_horn",
            bevel=0.01, smooth=False)
    # ---- legs (digitigrade)
    for side, s in (("L", 1), ("R", -1)):
        for fb, pts in (("F", FRONT), ("B", BACK)):
            P_ = [mir(p, s) for p in pts]
            n1, n2, n3, n4 = ["leg_%s%s_%d" % (fb, side, i) for i in (1, 2, 3, 4)]
            big = fb == "B"
            thick = 0.3 if big else 0.24
            u = B(n1)
            u.sphere(0.34 if big else 0.26, loc=L(P_[0], P_[1], 0.3) + V((s * 0.02, 0, 0.06)),
                     scale=(0.6, 0.95, 1.3), m=sc, segs=14, rings=10)
            u.seg(P_[0], P_[1], [(thick, 0), (thick * 1.0, 0.4), (thick * 0.6, 1.0)], m=sc,
                  segs=12)
            u.sphere(thick * 0.62, loc=P_[1], m=sc, segs=10, rings=8)
            l2 = B(n2)
            l2.seg(P_[1], P_[2], [(thick * 0.6, 0), (thick * 0.48, 0.5), (thick * 0.38, 1)],
                   m=sc, segs=10)
            l2.sphere(thick * 0.4, loc=P_[2], m=dk, segs=10, rings=6)
            if big:
                plate(l2, L(P_[1], P_[2], 0.25) + V((0, 0.05, 0.12)), V((0, 1, 0.4)), 0.16, 0.14,
                      up=(0, 1, 0.6))
            l3 = B(n3)
            l3.seg(P_[2], P_[3], [(thick * 0.38, 0), (thick * 0.34, 1)], m=sc, segs=10)
            l3.sphere(thick * 0.36, loc=P_[3], m=dk, segs=8, rings=6)
            f = B(n4)
            fwd = (P_[4] - P_[3])
            fwd.z = 0
            fwd.normalize()
            f.box((thick * 1.15, 0.3, 0.12), matrix=basis(x=(1, 0, 0), y=fwd,
                                                          loc=P_[3].lerp(P_[4], 0.4) + V((0, 0, 0.0))),
                  m=dk, bevel=0.04, seg=1)
            right = V((fwd.y, -fwd.x, 0))
            for k in (-1, 0, 1):
                base = P_[3] + fwd * 0.2 + right * k * thick * 0.42 + V((0, 0, 0.06))
                claw(f, base, fwd + right * k * 0.25, 0.28 if big else 0.24, 0.05)
            claw(f, P_[3] - fwd * 0.08 + V((0, 0, 0.08)), -fwd + V((0, 0, -0.2)), 0.14, 0.035)
    # ---- wing arms (rigid); membranes are skinned separately
    for side, s in (("L", 1), ("R", -1)):
        w = {k: mir(v, s) for k, v in WING.items()}
        a1 = B("wing_%s_1" % side)
        a1.seg(w["sh"], w["el"], [(0.15, 0), (0.13, 0.5), (0.09, 1)], m=sc, segs=10)
        a1.sphere(0.11, loc=w["el"], m=dk, segs=10, rings=8)
        plate(a1, L(w["sh"], w["el"], 0.5) + V((0, 0, 0.11)), w["el"] - w["sh"], 0.14, 0.15)
        a2 = B("wing_%s_2" % side)
        a2.seg(w["el"], w["wr"], [(0.095, 0), (0.07, 0.6), (0.07, 1)], m=sc, segs=10)
        a2.sphere(0.085, loc=w["wr"], m=dk, segs=10, rings=8)
        claw(a2, w["wr"] + V((0, -0.06, 0.06)), V((s * 0.2, -0.7, 0.5)), 0.26, 0.045,
             m="drg_claw")
        for nm, tipk, r0 in (("wing_%s_3" % side, "f3", 0.06), ("wing_%s_4" % side, "f4", 0.05),
                             ("wing_%s_5" % side, "f5", 0.045)):
            fb = B(nm)
            fb.seg(w["wr"], w[tipk], [(r0, 0), (r0 * 0.7, 0.55), (0.014, 1.0)], m=dk, segs=6)
            fb.cyl(0.025, 0.0, 0.1, matrix=basis(z=(w[tipk] - w["wr"]), x=(0, 0, 1),
                                                  loc=w[tipk]), m="drg_claw", segs=4,
                   smooth=False)
    return P


def wings(fold=0.0, flap=0.0, spread=0.0):
    """fold: 0 spread .. 1 folded back along the body; flap: degrees (+ up)."""
    out = {}
    for side, s in (("L", 1), ("R", -1)):
        out["wing_%s_1" % side] = {"r": (fold * 10, -s * (flap - fold * 25), s * 40 * fold)}
        out["wing_%s_2" % side] = {"r": (0, -s * flap * 0.35, s * 75 * fold)}
        out["wing_%s_3" % side] = {"r": (0, -s * flap * 0.2, s * (35 * fold - 8 * spread))}
        out["wing_%s_4" % side] = {"r": (0, -s * flap * 0.15, s * (25 * fold - 4 * spread))}
        out["wing_%s_5" % side] = {"r": (0, -s * flap * 0.1, s * 15 * fold)}
    return out


def legs_quad(ph, amp=20, lift=30, phases=None):
    phases = phases or {"FL": 0.0, "BR": 0.05, "FR": 0.5, "BL": 0.55}
    out = {}
    for leg, off in phases.items():
        a = 2 * math.pi * (ph + off)
        sw = -amp * math.sin(a)
        up = max(0.0, math.cos(a))
        if leg[0] == "F":
            out["leg_%s_1" % leg] = {"r": (sw, 0, 0)}
            out["leg_%s_2" % leg] = {"r": (-lift * up, 0, 0)}
            out["leg_%s_3" % leg] = {"r": (lift * up * 0.6, 0, 0)}
            out["leg_%s_4" % leg] = {"r": (-sw * 0.5 + lift * up * 0.3, 0, 0)}
        else:
            out["leg_%s_1" % leg] = {"r": (sw, 0, 0)}
            out["leg_%s_2" % leg] = {"r": (lift * up, 0, 0)}
            out["leg_%s_3" % leg] = {"r": (-lift * up * 0.8, 0, 0)}
            out["leg_%s_4" % leg] = {"r": (-sw * 0.6 + lift * up * 0.4, 0, 0)}
    return out


def neck_pose(n1=0, n2=0, n3=0, n4=0, head=0, jaw=0, yaw=0.0):
    return {"neck_1": {"r": (n1, 0, yaw * 0.25)}, "neck_2": {"r": (n2, 0, yaw * 0.25)},
            "neck_3": {"r": (n3, 0, yaw * 0.25)}, "neck_4": {"r": (n4, 0, yaw * 0.25)},
            "head": {"r": (head, 0, 0)}, "jaw": {"r": (-jaw, 0, 0)}}


def tail_pose(swing=0.0, lift=0.0, phase=0.0):
    out = {}
    for i in range(5):
        out["tail_%d" % (i + 1)] = {"r": (lift * (1 - i * 0.15),
                                          0, swing * math.sin(phase - i * 0.7) * (0.6 + i * 0.15))}
    return out


def animations(rig):
    an = Animator(rig, Solver(rig))
    base_w = wings(0.85, -6)
    stand = merge(base_w, neck_pose(), tail_pose())

    def idle(ph):
        a = 2 * math.pi * ph
        b = math.sin(a)
        s = merge(wings(0.85 + 0.04 * b, -6 + 3 * b),
                  neck_pose(3 * b, -2 * b, -3 * b, 2 * b, -2 * b, 4 + 4 * max(0.0, math.sin(2 * a)),
                            yaw=10 * math.sin(a + 0.6)),
                  tail_pose(10, 0, a))
        s["chest"] = {"r": (1.5 * b, 0, 0), "s": (1 + 0.025 * b, 1, 1 + 0.025 * b)}
        s["hips"] = {"l": (0, 0, 0.012 * b)}
        return s
    an.loop("Idle", 90, idle)

    def move(ph):
        a = 2 * math.pi * ph
        s = merge(legs_quad(ph, amp=22, lift=35), wings(0.8, -4 + 4 * math.sin(2 * a)),
                  neck_pose(5 * math.sin(2 * a), -3 * math.sin(2 * a), -4 * math.sin(2 * a), 2, 0,
                            6, yaw=8 * math.sin(a)),
                  tail_pose(14, 0, a))
        s["hips"] = {"l": (0, 0, -0.03 + 0.05 * math.cos(2 * a)), "r": (2 * math.sin(2 * a), 0,
                                                                         5 * math.sin(a))}
        s["chest"] = {"r": (-2 * math.sin(2 * a), 0, -6 * math.sin(a))}
        return s
    an.loop("Move", 36, move)

    # Attack: coil back then lunge bite (1.0s)
    coil = merge(wings(0.55, 18, 0.5), neck_pose(-22, -14, 14, 18, 12, 22), tail_pose(0, 8))
    coil["hips"] = {"l": (0, 0, -0.08), "r": (-4, 0, 0)}
    coil["chest"] = {"r": (-6, 0, 0)}
    coil.update({"leg_FL_1": {"r": (-25, 0, 0)}, "leg_FL_2": {"r": (-35, 0, 0)},
                 "leg_FL_3": {"r": (25, 0, 0)}})
    lunge = merge(wings(0.6, 10, 0.3), neck_pose(22, 14, -16, -16, -8, 40), tail_pose(0, -6))
    lunge["hips"] = {"l": (0, 0, -0.12), "r": (6, 0, 0)}
    lunge["chest"] = {"r": (12, 0, 0)}
    lunge.update({"leg_FL_1": {"r": (-30, 0, 0)}, "leg_FL_2": {"r": (-10, 0, 0)},
                  "leg_FR_1": {"r": (10, 0, 0)}, "leg_BL_1": {"r": (12, 0, 0)},
                  "leg_BR_1": {"r": (12, 0, 0)}})
    snap = merge(lunge, neck_pose(24, 15, -16, -16, -10, 0))
    an.keyposes("Attack", [(0, stand), (11, coil), (16, lunge), (19, snap), (30, stand)],
                ["smooth", "in3", "out", "smooth"])

    # Attack2: rear up, spread wings, then fire-breath pose with jaw wide open (1.5s)
    rear = merge(wings(0.05, 30, 1.0), neck_pose(-30, -18, 12, 16, 14, 14), tail_pose(0, 16))
    rear["hips"] = {"r": (-24, 0, 0), "l": (0, 0, 0.05)}
    rear["chest"] = {"r": (-10, 0, 0), "s": (1.05, 1, 1.05)}
    for side in ("L", "R"):
        rear["leg_B%s_1" % side] = {"r": (22, 0, 0)}
        rear["leg_B%s_2" % side] = {"r": (8, 0, 0)}
        rear["leg_B%s_4" % side] = {"r": (-6, 0, 0)}
        rear["leg_F%s_1" % side] = {"r": (-45, 0, 0)}
        rear["leg_F%s_2" % side] = {"r": (-55, 0, 0)}
        rear["leg_F%s_3" % side] = {"r": (40, 0, 0)}
    breath = merge(wings(0.15, 12, 1.0), neck_pose(34, 10, -10, -16, -18, 48), tail_pose(0, 8))
    breath["hips"] = {"r": (-3, 0, 0), "l": (0, 0, -0.06)}
    breath["chest"] = {"r": (8, 0, 0)}
    breath.update({"leg_FL_1": {"r": (-12, 0, 0)}, "leg_FR_1": {"r": (-12, 0, 0)}})
    breath2 = merge(breath, neck_pose(34, 10, -10, -16, -18, 50, yaw=-14))
    an.keyposes("Attack2", [(0, stand), (14, rear), (21, breath), (38, breath2), (45, stand)],
                ["smooth", "in", "smooth", "smooth"])

    hit = merge(wings(0.6, 20, 0.5), neck_pose(-16, -8, 10, 12, 10, 26, yaw=24), tail_pose(18, 6, 1))
    hit["chest"] = {"r": (-8, 6, 8)}
    hit["hips"] = {"l": (0, 0, -0.05)}
    an.keyposes("Hit", [(0, stand), (4, hit), (12, stand)], ["out", "smooth"])

    # Die: stagger, then collapse onto its side (1.6s, holds last frame)
    fold = {}
    for side in ("L", "R"):
        fold["leg_F%s_1" % side] = {"r": (-30, 0, 0)}
        fold["leg_F%s_2" % side] = {"r": (-60, 0, 0)}
        fold["leg_F%s_3" % side] = {"r": (40, 0, 0)}
        fold["leg_B%s_1" % side] = {"r": (-35, 0, 0)}
        fold["leg_B%s_2" % side] = {"r": (40, 0, 0)}
        fold["leg_B%s_3" % side] = {"r": (-20, 0, 0)}
    stagger = merge(wings(0.4, 25, 0.5), neck_pose(-20, -10, 15, 18, 18, 30, yaw=-20),
                    tail_pose(10, 4, 2))
    stagger["hips"] = {"l": (0, 0, -0.15), "r": (0, -6, 0)}
    dead = merge(wings(0.2, -30, 0.0), fold, neck_pose(28, 22, 10, -6, 6, 22, yaw=-40),
                 tail_pose(16, -4, 0.5))
    dead["root"] = {"r": (0, 78, 0), "l": (0, 0, 0.42)}
    dead["hips"] = {"l": (0, 0, -0.2)}
    dead["wing_L_1"] = {"r": (0, -40, 30)}
    an.keyposes("Die", [(0, stand), (12, stagger), (32, dead), (48, dead)], ["smooth", "in", "out"])

    def fly(ph):
        a = 2 * math.pi * ph
        f = 38 * math.sin(a)
        s = merge(wings(0.0, f, 0.6 + 0.4 * math.sin(a)),
                  neck_pose(-10 + 3 * math.sin(a + 1), -6, 6, 6, 6, 8), tail_pose(6, -10, a))
        s["hips"] = {"l": (0, 0, 0.45 - 0.14 * math.sin(a)), "r": (-4, 0, 0)}
        s["chest"] = {"r": (-4 + 2 * math.sin(a), 0, 0)}
        for side in ("L", "R"):
            s["leg_F%s_1" % side] = {"r": (-25, 0, 0)}
            s["leg_F%s_2" % side] = {"r": (-60, 0, 0)}
            s["leg_F%s_3" % side] = {"r": (40, 0, 0)}
            s["leg_B%s_1" % side] = {"r": (30, 0, 0)}
            s["leg_B%s_2" % side] = {"r": (25, 0, 0)}
            s["leg_B%s_4" % side] = {"r": (30, 0, 0)}
        return s
    an.loop("Fly", 30, fly)


def build_dragon(export=True):
    reset_scene()
    _mats()
    rig = Rig("DragonRig", bones())
    rig.attach_builders(build_parts(), "dragon")
    for side, s in (("L", 1), ("R", -1)):
        membrane_object(rig, side, s)
    animations(rig)
    if export:
        return export_glb("models/monsters/dragon.glb", animations=True)
    return rig
