"""256x256 transparent item icons rendered with Cycles (CPU)."""
import math
import os

import bpy
from mathutils import Matrix, Vector

from . import render as R
from .core import OUT, Builder, define, glow, reset_scene, xform
from .weapons import WEAPONS, weapon_object

ITEMS = ["stone", "stone_blessed", "scroll_protect", "gem", "gold", "potion_hp", "potion_mp",
         "ticket"]
ICON_IDS = list(WEAPONS) + ITEMS
SIZE = 256
SAMPLES = 64


def _item_mats():
    define("crystal_blue", color="#5aa0ff", rough=0.08, emit="#2a6bff", strength=2.5)
    define("gem_pink", color="#e23cb8", rough=0.03, emit="#c030ff", strength=0.7)
    define("gem_gold", color="#ffc02a", rough=0.06, metal=0.2, emit="#ff9a10", strength=1.6)
    define("parchment", color="#efdcae", rough=0.8)
    define("wax", color="#b0141e", rough=0.35)
    define("potion_red", color="#ff2238", rough=0.05, emit="#ff1030", strength=1.6)
    define("potion_blue", color="#2a7bff", rough=0.05, emit="#1a5cff", strength=1.6)
    define("glass_hi", color="#ffffff", rough=0.05, emit="#ffffff", strength=1.5)
    define("cork", color="#a77b4f", rough=0.8)
    define("ticket_red", color="#9c1424", rough=0.5)
    glow("glow_star", "#ffd84a", 6.0, color="#ffffff")
    glow("glow_blue_rune", "#40b0ff", 4.0)


def sparkle(B, loc, s, m="glow_star"):
    pts = []
    for k in range(8):
        a = math.pi * 2 * k / 8
        r = s if k % 2 == 0 else s * 0.22
        pts.append((math.cos(a) * r, math.sin(a) * r))
    B.poly(pts, s * 0.08, loc=loc, rot=(90, 0, 0), m=m, smooth=False)


def item_stone(B):
    B.sphere(0.45, loc=(0, 0, 0), scale=(1.2, 1.0, 0.8), m="stone_dark", ico=2, jitter=0.2,
             seed=3, smooth=False)
    for r, h, rot, off in ((0.16, 0.85, (0, 10, 0), (0, 0, 0.1)), (0.12, 0.6, (-10, -35, 0),
                                                                   (-0.2, -0.05, 0.05)),
                           (0.11, 0.55, (10, 40, 0), (0.22, -0.05, 0.05)),
                           (0.08, 0.4, (-40, 10, 0), (0.0, -0.25, 0.0))):
        B.crystal(r, h, loc=off, rot=rot, m="crystal_blue", segs=6)


def item_stone_blessed(B):
    B.gem(0.42, loc=(0, 0, 0), rot=(-18, 0, 0), m="gem_gold", segs=10, h_top=0.2, h_bot=0.5)
    B.torus(0.6, 0.025, loc=(0, 0, -0.05), rot=(75, 0, 15), m="gold", segs=40, rsegs=6)
    for p, s in (((0.45, -0.3, 0.45), 0.14), ((-0.5, -0.3, -0.3), 0.1), ((0.4, -0.3, -0.5), 0.08)):
        sparkle(B, p, s)


def item_scroll(B):
    M = xform((0, 0, 0), (0, 0, 0))
    B.cyl(0.18, 0.18, 1.0, rot=(0, 90, 0), m="parchment", segs=20)
    B.lathe([(0.0, -0.02), (0.18, -0.02), (0.18, 0.02), (0.0, 0.02)], m="parchment", segs=20)
    B.box((0.5, 0.01, 0.35), loc=(0.1, -0.16, -0.28), rot=(-15, 0, 0), m="parchment", bevel=0.005)
    for s in (-1, 1):
        B.cyl(0.05, 0.05, 0.14, loc=(s * 0.56, 0, 0), rot=(0, 90, 0), m="wood_red", segs=10)
        B.sphere(0.07, loc=(s * 0.66, 0, 0), m="gold", segs=12, rings=8)
    B.cyl(0.185, 0.185, 0.08, loc=(0, 0, 0), rot=(0, 90, 0), m="red_cloth", segs=20)
    B.cyl(0.12, 0.12, 0.04, loc=(0, -0.2, 0), rot=(90, 0, 0), m="wax", segs=14, bevel=0.012)
    B.poly([(0, 0.07), (0.06, 0.04), (0.05, -0.04), (0, -0.08), (-0.05, -0.04), (-0.06, 0.04)],
           0.02, loc=(0, -0.225, 0), rot=(90, 0, 0), m="glow_blue_rune", smooth=False)


def item_gem(B):
    B.gem(0.5, loc=(0, 0, 0), rot=(-18, 0, 0), m="gem_pink", segs=12, h_top=0.22, h_bot=0.55,
          table=0.55)
    for p, s in (((0.5, -0.4, 0.4), 0.13), ((-0.45, -0.4, 0.35), 0.08), ((0.3, -0.4, -0.55), 0.1)):
        sparkle(B, p, s)


def item_gold(B):
    for k in range(5):
        B.cyl(0.32, 0.32, 0.07, loc=(0.02 * math.sin(k * 2), 0.02 * math.cos(k * 1.7), k * 0.075),
              m="gold", segs=24, bevel=0.012, seg=1)
    B.torus(0.25, 0.015, loc=(0, 0, 0.34), m="gold_pale", segs=24, rsegs=4)
    for k in range(3):
        B.cyl(0.3, 0.3, 0.07, loc=(0.45 + 0.02 * k, -0.15, k * 0.075 - 0.04), m="gold", segs=24,
              bevel=0.012, seg=1)
    B.cyl(0.3, 0.3, 0.07, loc=(-0.38, -0.3, 0.05), rot=(70, 0, 20), m="gold", segs=24,
          bevel=0.012, seg=1)
    B.torus(0.23, 0.014, loc=(-0.38, -0.335, 0.05), rot=(70, 0, 20), m="gold_pale", segs=24,
            rsegs=4)
    sparkle(B, (0.3, -0.5, 0.45), 0.1)


def item_potion(B, liquid):
    B.lathe([(0, -0.45), (0.25, -0.43), (0.36, -0.3), (0.38, -0.12), (0.3, 0.06), (0.12, 0.16),
             (0.1, 0.32), (0.0, 0.32)], m=liquid, segs=24, angle=60)
    B.cyl(0.13, 0.13, 0.05, loc=(0, 0, 0.3), m="gold", segs=16, bevel=0.01, seg=1)
    B.cyl(0.09, 0.11, 0.16, loc=(0, 0, 0.4), m="cork", segs=12, bevel=0.015)
    B.sphere(0.09, loc=(-0.17, -0.27, 0.0), scale=(0.5, 0.3, 1.0), rot=(0, 20, 0), m="glass_hi",
             segs=10, rings=6)
    B.torus(0.37, 0.02, loc=(0, 0, -0.15), m="gold", segs=24, rsegs=4)
    B.box((0.08, 0.3, 0.02), loc=(0.12, -0.03, 0.2), rot=(0, 30, 0), m="red_cloth", bevel=0.005)


def item_ticket(B):
    B.box((1.2, 0.04, 0.62), m="gold", bevel=0.03, seg=2)
    B.box((1.02, 0.05, 0.46), loc=(0, -0.006, 0), m="ticket_red", bevel=0.01, seg=1)
    pts = []
    for k in range(10):
        a = math.pi / 2 + math.pi * 2 * k / 10
        r = 0.17 if k % 2 == 0 else 0.07
        pts.append((math.cos(a) * r, math.sin(a) * r))
    B.poly(pts, 0.03, loc=(-0.22, -0.035, 0), rot=(90, 0, 0), m="glow_star", bevel=0.005)
    for k in range(3):
        B.box((0.36 - k * 0.08, 0.02, 0.035), loc=(0.2, -0.03, 0.1 - k * 0.09), m="gold_pale",
              bevel=0.005)
    for k in range(6):
        B.cyl(0.025, 0.025, 0.06, loc=(0.42, -0.0, -0.2 + k * 0.08), rot=(90, 0, 0), m="eye_black",
              segs=8)


ITEM_FNS = {
    "stone": item_stone, "stone_blessed": item_stone_blessed, "scroll_protect": item_scroll,
    "gem": item_gem, "gold": item_gold, "potion_hp": lambda B: item_potion(B, "potion_red"),
    "potion_mp": lambda B: item_potion(B, "potion_blue"), "ticket": item_ticket,
}
ITEM_ROT = {"stone": (15, 0, 20), "stone_blessed": (0, 0, 0), "scroll_protect": (10, 30, -15),
            "gem": (0, 0, 0), "gold": (25, 0, 0), "potion_hp": (8, -12, 0),
            "potion_mp": (8, -12, 0), "ticket": (0, -25, 0)}


def setup_icon_scene(objs, size=SIZE, samples=SAMPLES, focus=None):
    R.setup_cycles(size, size, samples=samples, transparent=True)
    R.studio_world(top="#e4ecff", horizon="#9a9488", bottom="#2a2622", strength=1.0)
    bpy.context.view_layer.update()
    pts = R.mesh_points(objs)
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    c = (lo + hi) / 2
    ext = max((hi - lo).length, 0.3)
    cam = R.camera(c + Vector((0, -1, 0.0)) * ext * 3, c, ortho=ext)
    R.frame_ortho(cam, objs, 1.1, points=focus)
    d = ext * 1.6
    k = ext * ext
    R.area_light("Key", c + Vector((-0.9, -1.2, 1.1)) * d, c, 140 * k, "#fff2e0", size=ext * 0.8)
    R.area_light("Fill", c + Vector((1.3, -1.0, -0.2)) * d, c, 45 * k, "#b8ccff", size=ext)
    R.area_light("Rim", c + Vector((0.6, 1.4, 0.9)) * d, c, 220 * k, "#ffffff", size=ext * 0.5)
    R.area_light("Rim2", c + Vector((-1.2, 1.0, -0.6)) * d, c, 90 * k, "#ffd7a0", size=ext * 0.5)
    return cam


def build(iid, out_dir=None, samples=SAMPLES):
    reset_scene()
    _item_mats()
    if iid in WEAPONS:
        ob, tip, base = weapon_object(iid)
        ob.matrix_world = xform((0, 0, 0), (0, 45, 0)) @ xform((0, 0, 0), (0, 0, 18))
        objs = [ob]
        zs = [v.co.z for v in ob.data.vertices]
        zmin, zmax = min(zs), max(zs)
        focus = None
        if zmax - zmin > 1.9:   # polearms: frame the head, let the shaft run out of frame
            cut = zmax - (zmax - zmin) * 0.58
            mw = ob.matrix_world
            focus = [mw @ v.co for v in ob.data.vertices if v.co.z > cut]
    else:
        B = Builder()
        ITEM_FNS[iid](B)
        ob = B.to_object(iid)
        ob.rotation_euler = [math.radians(a) for a in ITEM_ROT[iid]]
        objs = [ob]
        focus = None
    setup_icon_scene(objs, samples=samples, focus=focus)
    path = os.path.join(out_dir or os.path.join(OUT, "icons"), iid + ".png")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    return R.render(path)
