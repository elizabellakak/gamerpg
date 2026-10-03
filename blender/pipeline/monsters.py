"""Monsters: slime, wolf, goblin, golem, dragon (rigid parts on bones, in-place animations).
All face Blender -Y with feet at Z=0. Animations: Idle, Move, Attack, Hit, Die (+ dragon Attack2, Fly).
"""
import math
from collections import defaultdict

from mathutils import Vector

from .anim import Animator, Solver, hand_rot, merge
from .characters import HERO_P, add_socket, face, fist, humanoid_bones, legs
from .core import Builder, Rig, basis, define, export_glb, glow, reset_scene, xform

V = Vector


def L(a, b, t):
    return V(a).lerp(V(b), t)


def _mats():
    define("slime", color="#55d86a", rough=0.12, emit="#2aff5a", strength=0.7)
    define("slime_dark", color="#2c9a46", rough=0.2, emit="#1aff4a", strength=0.4)
    glow("slime_shine", "#ffffff", 2.0)
    define("blush", color="#ff8fa8", rough=0.6)
    define("fur", color="#3e4149", rough=0.85)
    define("fur_dark", color="#25272d", rough=0.9)
    define("fur_light", color="#8b8e96", rough=0.85)
    define("nose", color="#101010", rough=0.3)
    define("tooth", color="#f2ecdc", rough=0.4)
    define("gob_skin", color="#6fa83a", rough=0.65)
    define("gob_skin_dark", color="#4d7f27", rough=0.7)
    define("golem_stone", color="#6f747e", rough=0.9)
    define("golem_stone_dark", color="#4a4e57", rough=0.92)
    define("drg_scale", color="#a3141e", rough=0.42, metal=0.15)
    define("drg_dark", color="#4f0a10", rough=0.5, metal=0.1)
    define("drg_membrane", color="#6e1018", rough=0.7)
    define("drg_horn", color="#2b2222", rough=0.35)
    define("drg_claw", color="#e8dcc6", rough=0.4)
    glow("drg_glow", "#ff6a14", 4.0, color="#ff9a40")
    glow("drg_eye", "#ffb020", 7.0, color="#fff0a0")


# ===========================================================================
# SLIME
# ===========================================================================
def build_slime():
    reset_scene()
    _mats()
    rig = Rig("SlimeRig", [("root", (0, 0, 0), (0, 0, 0.15), None),
                           ("body", (0, 0, 0.0), (0, 0, 0.45), "root")])
    P = defaultdict(Builder)
    B = P["body"]
    B.lathe([(0, 0.0), (0.3, 0.012), (0.4, 0.09), (0.43, 0.22), (0.4, 0.36), (0.33, 0.5)],
            m="slime", segs=24, caps=False, angle=60)
    T = P["body"]
    T.lathe([(0.33, 0.5), (0.24, 0.63), (0.13, 0.73), (0.05, 0.785), (0, 0.8)], m="slime",
            segs=24, caps=False, angle=60)
    T.sweep([(0, 0, 0.78), (0.02, -0.01, 0.84), (0.0, -0.02, 0.88)], [0.03, 0.025, 0.0],
            m="slime_dark", segs=6)
    for s in (-1, 1):
        B.sphere(0.075, loc=(s * 0.14, -0.35, 0.36), scale=(0.9, 0.55, 1.15), m="eye_white",
                 segs=14, rings=10)
        B.sphere(0.048, loc=(s * 0.135, -0.385, 0.35), scale=(0.9, 0.5, 1.15), m="eye_black",
                 segs=12, rings=8)
        B.sphere(0.016, loc=(s * 0.12, -0.405, 0.385), scale=(1, 0.5, 1), m="slime_shine", segs=8,
                 rings=6)
        B.sphere(0.045, loc=(s * 0.25, -0.31, 0.27), scale=(1, 0.4, 0.6), m="blush", segs=10,
                 rings=6)
    B.sweep([(-0.05, -0.395, 0.25), (0, -0.405, 0.225), (0.05, -0.395, 0.25)], 0.011,
            m="eye_black", segs=6)
    T.sphere(0.07, loc=(-0.12, -0.22, 0.6), scale=(1, 0.5, 0.7), rot=(0, 0, 25),
             m="slime_shine", segs=10, rings=6)
    rig.attach_builders(P, "slime")
    an = Animator(rig, Solver(rig))

    def sq(sx, sz):
        return {"body": {"s": (sx, sz, sx)}}

    def idle(ph):
        b = math.sin(2 * math.pi * ph)
        return merge(sq(1 + 0.05 * b, 1 - 0.07 * b), {"body": {"r": (2 * b, 0, 0)}})
    an.loop("Idle", 45, idle)

    def move(ph):
        # hop: squash (0-0.15) -> air (0.15-0.75) -> land squash (0.75-1)
        if ph < 0.15:
            t = ph / 0.15
            return merge(sq(1 + 0.18 * math.sin(math.pi * t), 1 - 0.25 * math.sin(math.pi * t)))
        if ph < 0.8:
            t = (ph - 0.15) / 0.65
            h = 0.32 * math.sin(math.pi * t)
            st = 0.15 * math.cos(math.pi * t)
            return merge(sq(1 - st * 0.5, 1 + st), {"root": {"l": (0, 0, h)},
                                                     "body": {"r": (8 * math.sin(math.pi * t), 0, 0)}})
        t = (ph - 0.8) / 0.2
        return merge(sq(1 + 0.2 * math.sin(math.pi * t), 1 - 0.28 * math.sin(math.pi * t)))
    an.loop("Move", 18, move)
    rest = sq(1, 1)
    crouch = merge(sq(1.25, 0.68), {"body": {"r": (-10, 0, 0), "s": (1.25, 0.68, 1.25)}})
    lunge = {"root": {"l": (0, 0, 0.22)}, "body": {"r": (28, 0, 0), "s": (0.82, 1.35, 0.82)}}
    an.keyposes("Attack", [(0, rest), (7, crouch), (11, lunge), (16, sq(1.15, 0.85)),
                           (21, rest)], ["smooth", "out", "in", "smooth"])
    hit = {"body": {"r": (-18, 0, 0), "s": (1.3, 0.7, 1.3)}}
    an.keyposes("Hit", [(0, rest), (3, hit), (9, rest)], ["out", "smooth"])
    an.keyposes("Die", [(0, rest), (6, merge(sq(0.85, 1.25), {"root": {"l": (0, 0, 0.08)}})),
                        (14, sq(1.5, 0.35)), (30, sq(1.75, 0.12))], ["out", "in", "out"])
    return export_glb("models/monsters/slime.glb", animations=True)


# ===========================================================================
# quadruped helpers
# ===========================================================================
def quad_leg_spec(name, swing, bend, foot=None):
    foot = -swing * 0.5 - bend * 0.3 if foot is None else foot
    return {name + "_1": {"r": (swing, 0, 0)}, name + "_2": {"r": (bend, 0, 0)},
            name + "_3": {"r": (foot, 0, 0)}}


def trot(ph, amp=28, knee=40, back_sign=-1, phases=None):
    """Diagonal-pair gait. Front legs bend 'backwards' (+X) at the knee, back legs at the hock
    bend the other way (back_sign)."""
    phases = phases or {"FL": 0.0, "BR": 0.0, "FR": 0.5, "BL": 0.5}
    out = {}
    for leg, off in phases.items():
        a = 2 * math.pi * (ph + off)
        sw = -amp * math.sin(a)
        lift = max(0.0, math.cos(a))
        if leg[0] == "F":
            out.update(quad_leg_spec("leg_" + leg, sw, knee * lift + 5,
                                     foot=-sw * 0.4 - knee * lift * 0.8))
        else:
            out.update(quad_leg_spec("leg_" + leg, sw * 0.9, back_sign * knee * lift * 0.9,
                                     foot=-sw * 0.5 + knee * lift * 0.6))
    return out


# ===========================================================================
# WOLF
# ===========================================================================
def wolf_bones():
    b = [("root", (0, 0, 0), (0, 0, 0.2), None),
         ("hips", (0, 0.38, 0.8), (0, 0.0, 0.84), "root"),
         ("chest", (0, 0.0, 0.84), (0, -0.3, 0.88), "hips"),
         ("neck", (0, -0.3, 0.9), (0, -0.5, 1.04), "chest"),
         ("head", (0, -0.5, 1.04), (0, -0.78, 0.98), "neck"),
         ("jaw", (0, -0.56, 0.96), (0, -0.8, 0.92), "head"),
         ("tail_1", (0, 0.45, 0.82), (0, 0.66, 0.76), "hips"),
         ("tail_2", (0, 0.66, 0.76), (0, 0.86, 0.62), "tail_1")]
    for side, s in (("L", 1), ("R", -1)):
        x = 0.12 * s
        b += [("leg_F%s_1" % side, (x, -0.24, 0.74), (x, -0.21, 0.42), "chest"),
              ("leg_F%s_2" % side, (x, -0.21, 0.42), (x, -0.24, 0.08), "leg_F%s_1" % side),
              ("leg_F%s_3" % side, (x, -0.24, 0.08), (x, -0.33, 0.02), "leg_F%s_2" % side),
              ("leg_B%s_1" % side, (x, 0.36, 0.76), (x, 0.26, 0.46), "hips"),
              ("leg_B%s_2" % side, (x, 0.26, 0.46), (x, 0.42, 0.2), "leg_B%s_1" % side),
              ("leg_B%s_3" % side, (x, 0.42, 0.2), (x, 0.36, 0.02), "leg_B%s_2" % side)]
    return b


def build_wolf():
    reset_scene()
    _mats()
    rig = Rig("WolfRig", wolf_bones())
    P = defaultdict(Builder)
    F = dict(smooth=False)
    B = P["chest"]
    B.sphere(0.3, loc=(0, -0.1, 0.8), scale=(0.78, 1.1, 1.0), m="fur", ico=2, jitter=0.06,
             seed=1, **F)
    B.sphere(0.24, loc=(0, -0.16, 0.64), scale=(0.72, 1.0, 0.7), m="fur_light", ico=1, **F)
    for i in range(9):
        a = math.radians(-80 + i * 20)
        d = V((math.sin(a) * 0.9, 0.55, math.cos(a) * 0.9)).normalized()
        base = V((0, -0.26, 0.9)) + V((math.sin(a) * 0.17, 0.0, math.cos(a) * 0.15))
        B.cyl(0.07, 0.0, 0.22, matrix=basis(z=d, x=(1, 0, 0), loc=base + d * 0.06), m="fur_dark",
              segs=4, **F)
    for i in range(4):
        B.cyl(0.05, 0.0, 0.16, matrix=basis(z=(0, 0.6, 1), x=(1, 0, 0),
                                              loc=(0, -0.15 + i * 0.1, 1.04 - i * 0.015)),
              m="fur_dark", segs=4, **F)
    B = P["hips"]
    B.sphere(0.25, loc=(0, 0.3, 0.78), scale=(0.78, 1.1, 0.9), m="fur", ico=2, jitter=0.06, seed=2,
             **F)
    B.sphere(0.2, loc=(0, 0.1, 0.76), scale=(0.75, 1.2, 0.85), m="fur", ico=1, **F)
    for i in range(3):
        B.cyl(0.045, 0.0, 0.13, matrix=basis(z=(0, 0.8, 1), x=(1, 0, 0),
                                               loc=(0, 0.12 + i * 0.12, 0.98 - i * 0.02)),
              m="fur_dark", segs=4, **F)
    B = P["neck"]
    B.seg((0, -0.28, 0.88), (0, -0.52, 1.04), [(0.15, 0), (0.13, 0.6), (0.1, 1.0)], m="fur",
          segs=7, scale=(0.85, 1.0), **F)
    B = P["head"]
    B.sphere(0.13, loc=(0, -0.56, 1.06), scale=(0.95, 1.05, 0.85), m="fur", ico=1, **F)
    B.box((0.12, 0.24, 0.09), loc=(0, -0.73, 1.0), rot=(-8, 0, 0), m="fur", bevel=0.02, seg=1,
          taper=(0.8, 0.85), **F)
    B.box((0.13, 0.12, 0.05), loc=(0, -0.62, 1.1), rot=(-12, 0, 0), m="fur_dark", bevel=0.015,
          seg=1, **F)
    B.sphere(0.03, loc=(0, -0.855, 1.02), scale=(1.1, 0.8, 0.8), m="nose", segs=8, rings=6)
    for s in (-1, 1):
        B.cyl(0.05, 0.0, 0.14, matrix=basis(z=(s * 0.35, 0.25, 1), x=(0, 1, 0),
                                              loc=(s * 0.07, -0.53, 1.15)), m="fur_dark", segs=4,
              **F)
        B.sphere(0.022, loc=(s * 0.055, -0.665, 1.075), scale=(1.2, 0.7, 0.7), m="glow_red",
                 segs=8, rings=6)
        B.cyl(0.08, 0.0, 0.16, matrix=basis(z=(s * 1, 0.6, -0.2), x=(0, 0, 1),
                                              loc=(s * 0.1, -0.5, 1.0)), m="fur", segs=4, **F)
        B.cyl(0.008, 0.0, 0.04, loc=(s * 0.04, -0.82, 0.95), rot=(180, 0, 0), m="tooth", segs=4)
    B = P["jaw"]
    B.box((0.1, 0.22, 0.04), loc=(0, -0.7, 0.93), rot=(-10, 0, 0), m="fur_light", bevel=0.012,
          seg=1, taper=(0.8, 0.8), **F)
    for s in (-1, 1):
        B.cyl(0.008, 0.0, 0.035, loc=(s * 0.035, -0.79, 0.955), m="tooth", segs=4)
    for name, p0, p1, r in (("tail_1", (0, 0.42, 0.83), (0, 0.67, 0.75), 0.07),
                            ("tail_2", (0, 0.64, 0.77), (0, 0.9, 0.6), 0.075)):
        P[name].seg(p0, p1, [(r * 0.7, 0), (r, 0.45), (r * 0.5, 0.9), (0, 1.05)], m="fur_dark",
                    segs=6, **F)
    for side, s in (("L", 1), ("R", -1)):
        x = 0.12 * s
        P["leg_F%s_1" % side].seg((x, -0.24, 0.8), (x, -0.21, 0.42),
                                  [(0.11, 0), (0.1, 0.4), (0.065, 1.0)], m="fur", segs=6, **F)
        P["leg_F%s_2" % side].seg((x, -0.21, 0.44), (x, -0.24, 0.08),
                                  [(0.062, 0), (0.055, 0.6), (0.048, 1.0)], m="fur", segs=6, **F)
        P["leg_F%s_3" % side].box((0.095, 0.14, 0.06), loc=(x, -0.29, 0.03), m="fur_dark",
                                  bevel=0.015, seg=1, **F)
        P["leg_B%s_1" % side].seg((x, 0.38, 0.84), (x, 0.26, 0.46),
                                  [(0.14, 0), (0.12, 0.4), (0.07, 1.0)], m="fur", segs=6, **F)
        P["leg_B%s_2" % side].seg((x, 0.26, 0.46), (x, 0.42, 0.2),
                                  [(0.065, 0), (0.05, 1.0)], m="fur", segs=6, **F)
        P["leg_B%s_3" % side].seg((x, 0.42, 0.21), (x, 0.38, 0.04),
                                  [(0.048, 0), (0.044, 1.0)], m="fur", segs=6, **F)
        P["leg_B%s_3" % side].box((0.095, 0.14, 0.06), loc=(x, 0.32, 0.03), m="fur_dark",
                                  bevel=0.015, seg=1, **F)
        for k in (-1, 0, 1):
            P["leg_F%s_3" % side].cyl(0.008, 0.0, 0.03, loc=(x + k * 0.028, -0.36, 0.02),
                                      rot=(90, 0, 0), m="tooth", segs=4)
    rig.attach_builders(P, "wolf")
    an = Animator(rig, Solver(rig))
    stand = {"neck": {"r": (0, 0, 0)}, "tail_1": {"r": (-10, 0, 0)}}

    def idle(ph):
        b = math.sin(2 * math.pi * ph)
        c = math.sin(2 * math.pi * ph * 2)
        return {"chest": {"r": (1.5 * b, 0, 0), "s": (1 + 0.02 * b, 1, 1 + 0.02 * b)},
                "hips": {"l": (0, 0, 0.005 * b)},
                "neck": {"r": (2 * b, 0, 6 * math.sin(2 * math.pi * ph + 1))},
                "head": {"r": (-2 * b, 0, 4 * math.sin(2 * math.pi * ph + 1))},
                "jaw": {"r": (-4 - 3 * max(0.0, c), 0, 0)},
                "tail_1": {"r": (-10, 0, 12 * math.sin(2 * math.pi * ph))},
                "tail_2": {"r": (-5, 0, 18 * math.sin(2 * math.pi * ph - 0.8))}}
    an.loop("Idle", 60, idle)

    def move(ph):
        a = 2 * math.pi * ph
        s = trot(ph, amp=34, knee=55, back_sign=-1,
                 phases={"FL": 0.0, "FR": 0.12, "BL": 0.5, "BR": 0.62})
        s.update({"hips": {"l": (0, 0, 0.03 * math.cos(2 * a)), "r": (6 * math.sin(a), 0, 0)},
                  "chest": {"r": (-8 * math.sin(a), 0, 0)},
                  "neck": {"r": (6 * math.sin(a), 0, 0)}, "head": {"r": (-6 * math.sin(a), 0, 0)},
                  "jaw": {"r": (-12, 0, 0)},
                  "tail_1": {"r": (10 + 10 * math.sin(a), 0, 0)},
                  "tail_2": {"r": (8 * math.sin(a - 1), 0, 0)}})
        return s
    an.loop("Move", 18, move)
    crouch = merge(stand, {"hips": {"l": (0, 0, -0.1), "r": (-6, 0, 0)},
                           "chest": {"r": (8, 0, 0)},
                           "neck": {"r": (18, 0, 0)}, "head": {"r": (-10, 0, 0)},
                           "jaw": {"r": (-10, 0, 0)},
                           "leg_FL_1": {"r": (-20, 0, 0)}, "leg_FL_2": {"r": (35, 0, 0)},
                           "leg_FR_1": {"r": (-20, 0, 0)}, "leg_FR_2": {"r": (35, 0, 0)},
                           "leg_BL_1": {"r": (-25, 0, 0)}, "leg_BL_2": {"r": (-25, 0, 0)},
                           "leg_BR_1": {"r": (-25, 0, 0)}, "leg_BR_2": {"r": (-25, 0, 0)}})
    bite = merge(stand, {"hips": {"l": (0, 0, 0.12), "r": (14, 0, 0)},
                         "chest": {"r": (-6, 0, 0)},
                         "neck": {"r": (-25, 0, 0)}, "head": {"r": (20, 0, 0)},
                         "jaw": {"r": (-38, 0, 0)},
                         "leg_FL_1": {"r": (-60, 0, 0)}, "leg_FL_2": {"r": (50, 0, 0)},
                         "leg_FR_1": {"r": (-50, 0, 0)}, "leg_FR_2": {"r": (60, 0, 0)},
                         "leg_BL_1": {"r": (20, 0, 0)}, "leg_BR_1": {"r": (25, 0, 0)},
                         "tail_1": {"r": (20, 0, 0)}})
    snap = merge(bite, {"jaw": {"r": (0, 0, 0)}, "head": {"r": (26, 0, 0)}})
    an.keyposes("Attack", [(0, stand), (7, crouch), (11, bite), (14, snap), (22, stand)],
                ["smooth", "out", "in", "smooth"])
    hit = merge(stand, {"hips": {"r": (-6, 0, 0)}, "chest": {"r": (-10, 0, 8)},
                        "neck": {"r": (-20, 0, 10)}, "head": {"r": (-10, 0, 10)},
                        "jaw": {"r": (-20, 0, 0)}, "tail_1": {"r": (30, 0, 0)}})
    an.keyposes("Hit", [(0, stand), (3, hit), (9, stand)], ["out", "smooth"])
    fold = {"leg_FL_1": {"r": (-30, 0, 0)}, "leg_FL_2": {"r": (50, 0, 0)},
            "leg_FR_1": {"r": (-10, 0, 0)}, "leg_FR_2": {"r": (30, 0, 0)},
            "leg_BL_1": {"r": (-40, 0, 0)}, "leg_BL_2": {"r": (-30, 0, 0)},
            "leg_BR_1": {"r": (-20, 0, 0)}, "leg_BR_2": {"r": (-20, 0, 0)}}
    sag = merge(stand, fold, {"hips": {"l": (0, 0, -0.25)}, "neck": {"r": (25, 0, 0)},
                              "jaw": {"r": (-15, 0, 0)}})
    dead = merge(stand, fold, {"root": {"r": (0, 82, 0), "l": (0, 0, 0.1)},
                               "hips": {"l": (0, 0, -0.18)},
                               "neck": {"r": (8, 0, -15)}, "head": {"r": (0, 0, -10)},
                               "jaw": {"r": (-22, 0, 0)}, "tail_1": {"r": (-5, 0, 20)}})
    an.keyposes("Die", [(0, stand), (10, sag), (22, dead), (36, dead)], ["smooth", "in", "out"])
    return export_glb("models/monsters/wolf.glb", animations=True)


# ===========================================================================
# humanoid monsters (goblin / golem) on the shared humanoid rig
# ===========================================================================
def scaled_p(p, k, **over):
    q = {}
    for key, v in p.items():
        if isinstance(v, (int, float)) and not isinstance(v, bool):
            q[key] = v * k
        elif isinstance(v, tuple):
            q[key] = tuple(x * k for x in v)
        else:
            q[key] = v
    q.update(over)
    q["cape"] = False
    return q


def walk(ph, stride=30, knee=50, bob=0.03, arm=30, lean=8, elbow=-30, hipsway=6):
    a = 2 * math.pi * ph
    s = math.sin(a)
    thR = -stride * s - 3
    thL = stride * s - 3
    knR = 10 + knee * max(0.0, math.cos(a)) ** 1.3
    knL = 10 + knee * max(0.0, -math.cos(a)) ** 1.3
    return {
        "hips": {"l": (0, 0, bob * math.cos(2 * a) - bob), "r": (0, 0, hipsway * s)},
        "spine": {"r": (lean, 0, -hipsway * 0.6 * s)}, "chest": {"r": (2, 0, -hipsway * 0.8 * s)},
        "head": {"r": (-lean * 0.7, 0, 0)},
        "thigh_R": {"r": (thR, 3, 0)}, "shin_R": {"r": (knR, 0, 0)},
        "foot_R": {"r": (-thR * 0.3 - knR * 0.25, -3, 0)},
        "thigh_L": {"r": (thL, -3, 0)}, "shin_L": {"r": (knL, 0, 0)},
        "foot_L": {"r": (-thL * 0.3 - knL * 0.25, 3, 0)},
        "upper_arm_L": {"r": (-arm * s, -8, 0)}, "forearm_L": {"r": (elbow, 0, 0)},
        "upper_arm_R": {"r": (arm * s, 8, 0)}, "forearm_R": {"r": (elbow, 0, 0)},
    }


GOBLIN_P = scaled_p(HERO_P, 0.6, head=0.92, head_top=1.2, neck=0.86, chest=0.7, spine=0.6,
                    hip=0.54)


def build_goblin():
    reset_scene()
    _mats()
    p = GOBLIN_P
    rig = Rig("GoblinRig", humanoid_bones(p))
    solver = Solver(rig, chains={"R": ("upper_arm_R", "forearm_R", "hand_R")},
                    sockets={"R": V((-p["wrist"][0], p["wrist"][1], p["wrist"][2])).lerp(
                        V((-p["hand_end"][0], p["hand_end"][1], p["hand_end"][2])), 0.55)})
    P = defaultdict(Builder)
    hc = V((0, -0.03, 1.02))
    B = P["head"]
    B.sphere(0.15, loc=hc, scale=(1.05, 0.95, 0.9), m="gob_skin", segs=16, rings=10)
    B.sphere(0.09, loc=hc + V((0, -0.07, -0.08)), scale=(1.2, 1.0, 0.75), m="gob_skin", segs=12,
             rings=8)
    B.cyl(0.035, 0.012, 0.11, loc=hc + V((0, -0.17, -0.01)), rot=(100, 0, 0), m="gob_skin_dark",
          segs=8)
    for s in (-1, 1):
        B.poly([(0, -0.04), (0.2, 0.0), (0.24, 0.05), (0, 0.05)], 0.02,
               matrix=basis(x=(s, 0.25, 0.3), z=(0, 1, -0.1), loc=hc + V((s * 0.12, 0.0, 0.02))),
               m="gob_skin", bevel=0.006)
        B.sphere(0.03, loc=hc + V((s * 0.06, -0.125, 0.03)), scale=(1.2, 0.6, 0.8),
                 m="glow_yellow", segs=8, rings=6)
        B.box((0.06, 0.02, 0.015), loc=hc + V((s * 0.065, -0.13, 0.07)), rot=(0, s * 20, 0),
              m="gob_skin_dark", bevel=0.005)
        B.cyl(0.012, 0.0, 0.035, loc=hc + V((s * 0.04, -0.15, -0.105)), m="tooth", segs=4)
    B.torus(0.05, 0.006, loc=hc + V((0.17, -0.0, -0.01)), rot=(0, 90, 0), m="gold", segs=10,
            rsegs=4)
    P["neck"].cyl(0.04, 0.045, 0.08, loc=(0, 0, 0.88), m="gob_skin", segs=8)
    B = P["chest"]
    B.sphere(0.15, loc=(0, 0.01, 0.78), scale=(1.05, 0.85, 0.85), m="gob_skin", segs=14, rings=8)
    B.lathe([(0.13, 0.68), (0.155, 0.74), (0.16, 0.8), (0.13, 0.86)], m="leather", segs=12,
            scale=(1, 0.8), smooth=False)
    B.box((0.05, 0.3, 0.025), loc=(0.06, -0.0, 0.85), rot=(0, -35, 0), m="leather_dark",
          bevel=0.006)
    B.lathe([(0.0, 0.0), (0.08, 0.0), (0.06, 0.04), (0, 0.05)],
            matrix=xform((-0.13, 0, 0.84), (0, -50, 0)), m="iron", segs=8, smooth=False)
    for k in range(3):
        B.cyl(0.012, 0.0, 0.06, matrix=xform((-0.13, 0, 0.84), (0, -50, 0)) @ xform(
            (0.04 * math.cos(k * 2.1), 0.04 * math.sin(k * 2.1), 0.04)), m="iron", segs=4)
    B = P["spine"]
    B.sphere(0.13, loc=(0, -0.02, 0.62), scale=(1.0, 0.95, 0.8), m="gob_skin", segs=12, rings=8)
    B = P["hips"]
    B.lathe([(0.1, 0.46), (0.13, 0.5), (0.135, 0.56), (0.12, 0.6)], m="leather_dark", segs=12,
            scale=(1, 0.85))
    B.box((0.14, 0.02, 0.18), loc=(0, -0.11, 0.44), rot=(-5, 0, 0), m="leather", bevel=0.006)
    B.box((0.14, 0.02, 0.16), loc=(0, 0.11, 0.45), rot=(5, 0, 0), m="leather", bevel=0.006)
    B.cyl(0.14, 0.14, 0.03, loc=(0, 0, 0.57), m="leather_dark", segs=12, scale=(1, 0.86, 1))
    for side, s in (("R", -1), ("L", 1)):
        sh = V((s * p["sh_x"], 0, p["sh_z"]))
        el = V((s * p["elbow"][0], p["elbow"][1], p["elbow"][2]))
        wr = V((s * p["wrist"][0], p["wrist"][1], p["wrist"][2]))
        P["upper_arm_" + side].seg(sh, el, [(0.04, 0), (0.035, 0.6), (0.03, 1)], m="gob_skin",
                                   segs=8)
        P["forearm_" + side].seg(el, wr, [(0.032, 0), (0.035, 0.4), (0.028, 1)],
                                 m="gob_skin", segs=8)
        P["forearm_" + side].seg(L(el, wr, 0.5), L(el, wr, 0.95), [(0.04, 0), (0.036, 1)],
                                 m="leather", segs=8)
        fist(P["hand_" + side], p, s, glove="gob_skin", plate=None, cuff=None)
        hp = V((s * p["hip_x"], 0, p["hip_z"]))
        kn = V((s * p["knee"][0], p["knee"][1], p["knee"][2]))
        an_ = V((s * p["ankle"][0], p["ankle"][1], p["ankle"][2]))
        P["thigh_" + side].seg(hp, kn, [(0.05, 0), (0.045, 0.5), (0.035, 1)], m="gob_skin",
                               segs=8)
        P["shin_" + side].seg(kn, an_, [(0.04, 0), (0.038, 0.4), (0.03, 1)], m="gob_skin",
                              segs=8)
        P["shin_" + side].seg(L(kn, an_, 0.45), L(kn, an_, 1.0), [(0.042, 0), (0.042, 1)],
                              m="leather_dark", segs=8)
        x = s * p["ankle"][0]
        P["foot_" + side].box((0.07, 0.15, 0.045), loc=(x, -0.035, 0.024), m="gob_skin_dark",
                              bevel=0.015)
    rig.attach_builders(P, "goblin")
    sock = add_socket(rig, p)
    C = Builder()
    C.cyl(0.02, 0.03, 0.42, loc=(0, 0, 0.17), m="wood", segs=8, smooth=False)
    C.sphere(0.08, loc=(0, 0, 0.42), scale=(1, 1, 1.3), m="wood_dark", ico=1, jitter=0.1,
             smooth=False)
    for k in range(5):
        a = k * 1.3
        d = V((math.cos(a), math.sin(a), 0.3 * (k - 2))).normalized()
        C.cyl(0.015, 0.0, 0.07, matrix=basis(z=d, x=(0, 0, 1), loc=V((0, 0, 0.42)) + d * 0.07),
              m="iron", segs=4, smooth=False)
    C.to_object("goblin_club").parent = sock
    an = Animator(rig, solver)
    hunch = merge(legs(18, 7), {"spine": {"r": (18, 0, 0)}, "chest": {"r": (8, 0, 0)},
                                "neck": {"r": (-14, 0, 0)}, "head": {"r": (-12, 0, 0)},
                                "upper_arm_L": {"r": (-10, -15, 0)},
                                "forearm_L": {"r": (-40, 0, 0)},
                                "ikR": {"grip": (-0.2, -0.16, 0.55),
                                        "rot": hand_rot((-0.3, -0.4, 0.86), (0, -1, 0)),
                                        "pole": (-0.6, 0.5, -0.6)}})

    def idle(ph):
        b = math.sin(2 * math.pi * ph)
        s = merge(hunch)
        s["chest"]["r"] = (8 + 3 * b, 0, 0)
        s["head"]["r"] = (-12 - 3 * b, 0, 10 * math.sin(2 * math.pi * ph + 1))
        s["hips"]["l"] = (0, 0, s["hips"]["l"][2] + 0.008 * b)
        g = s["ikR"]["grip"]
        s["ikR"]["grip"] = (g[0], g[1], g[2] + 0.02 * b)
        return s
    an.loop("Idle", 40, idle)

    def move(ph):
        s = walk(ph, stride=38, knee=70, bob=0.025, arm=40, lean=22, elbow=-50)
        s.pop("upper_arm_R")
        s.pop("forearm_R")
        a = 2 * math.pi * ph
        s["ikR"] = {"grip": (-0.24, -0.05 + 0.08 * math.sin(a), 0.6),
                    "rot": hand_rot((-0.3, -0.2, 0.93), (0, -1, 0)), "pole": (-0.6, 0.5, -0.6)}
        return s
    an.loop("Move", 16, move)
    raise_ = merge(legs(10, 8), {"spine": {"r": (-6, 0, 10)}, "chest": {"r": (-6, 0, 10)},
                                 "head": {"r": (-6, 0, 0)},
                                 "upper_arm_L": {"r": (-40, -30, 0)},
                                 "ikR": {"grip": (-0.12, 0.05, 1.22),
                                         "rot": hand_rot((0.1, 0.6, 0.8), (1, 0, 0)),
                                         "pole": (-1, 0.3, 0.3)}})
    smash = merge(legs(30, 8), {"hips": {"l": (0, 0, -0.08)},
                                "spine": {"r": (30, 0, -6)}, "chest": {"r": (12, 0, -6)},
                                "head": {"r": (-20, 0, 0)},
                                "upper_arm_L": {"r": (20, -30, 0)},
                                "ikR": {"grip": (-0.08, -0.42, 0.45),
                                        "rot": hand_rot((0, -0.6, -0.8), (1, 0, 0)),
                                        "pole": (-1, 0.3, -0.2)}})
    an.keyposes("Attack", [(0, hunch), (9, raise_), (13, smash), (17, smash), (24, hunch)],
                ["smooth", "in3", "linear", "smooth"])
    hit = merge(legs(20, 7), {"spine": {"r": (-10, 0, 8)}, "chest": {"r": (-8, 0, 0)},
                              "head": {"r": (-20, 0, 12)}, "upper_arm_L": {"r": (-30, -40, 0)},
                              "ikR": {"grip": (-0.32, -0.05, 0.75),
                                      "rot": hand_rot((-0.5, -0.2, 0.8), (0, -1, 0)),
                                      "pole": (-0.6, 0.5, -0.6)}})
    an.keyposes("Hit", [(0, hunch), (3, hit), (9, hunch)], ["out", "smooth"])
    knees = merge(legs(55, 8), {"hips": {"l": (0, 0, -0.18)}, "spine": {"r": (25, 0, 0)},
                                "head": {"r": (20, 0, 0)}, "upper_arm_L": {"r": (0, -10, 0)},
                                "ikR": {"grip": (-0.22, -0.2, 0.3),
                                        "rot": hand_rot((0, -0.9, -0.3), (1, 0, 0)),
                                        "pole": (-0.6, 0.5, -0.6)}})
    dead = merge(legs(20, 12), {"root": {"r": (88, 0, 0), "l": (0, 0, 0.12)},
                                "hips": {"l": (0, 0, -0.06)},
                                "spine": {"r": (0, 0, 0)}, "head": {"r": (-10, 0, 20)},
                                "upper_arm_L": {"r": (-150, -30, 0)},
                                "ikR": {"grip": (-0.4, -0.3, 0.85),
                                        "rot": hand_rot((-0.6, 0.0, 0.5), (0, -1, 0)),
                                        "pole": (-0.6, 0.5, -0.6)}})
    an.keyposes("Die", [(0, hunch), (9, knees), (22, dead), (36, dead)], ["smooth", "in", "out"])
    return export_glb("models/monsters/goblin.glb", animations=True)


GOLEM_P = scaled_p(HERO_P, 1.45, sh_x=0.43, elbow=(0.52, 0.04, 1.62), wrist=(0.56, -0.02, 1.1),
                   hand_end=(0.58, -0.04, 0.88), hip_x=0.2, knee=(0.22, -0.02, 0.62),
                   ankle=(0.22, 0.03, 0.12), toe=(0.22, -0.22, 0.03), hip=1.25, hip_z=1.2,
                   spine=1.42, chest=1.65, neck=2.12, head=2.2, head_top=2.55, sh_z=2.0)


def build_golem():
    reset_scene()
    _mats()
    p = GOLEM_P
    bones = humanoid_bones(p)
    bones += [("shoulder_rock_R", (-0.62, 0.02, 2.25), (-0.62, 0.02, 2.55), "chest"),
              ("shoulder_rock_L", (0.62, 0.02, 2.25), (0.62, 0.02, 2.55), "chest")]
    rig = Rig("GolemRig", bones)
    P = defaultdict(Builder)
    F = dict(smooth=False)
    st, sd = "golem_stone", "golem_stone_dark"

    def rock(B, size, loc, rot=(0, 0, 0), m=st):
        B.box(size, loc=loc, rot=rot, m=m, bevel=min(size) * 0.18, seg=1, **F)

    B = P["head"]
    rock(B, (0.36, 0.32, 0.3), (0, -0.02, 2.32), (4, 0, 3))
    rock(B, (0.4, 0.2, 0.08), (0, -0.08, 2.47), (-8, 0, 0), sd)
    B.box((0.22, 0.03, 0.04), loc=(0, -0.18, 2.33), m="glow_cyan", smooth=False)
    B = P["chest"]
    rock(B, (0.95, 0.6, 0.55), (0, 0, 1.9), (0, 0, 0))
    rock(B, (0.7, 0.5, 0.25), (0, 0.03, 2.2), (0, 0, 2), sd)
    rock(B, (0.5, 0.4, 0.3), (0.0, 0.12, 2.25), (8, 0, -4))
    B.crystal(0.13, 0.36, loc=(0, -0.3, 1.82), rot=(0, 0, 0), m="crystal_cyan", segs=6)
    B.crystal(0.1, 0.25, loc=(0, -0.3, 1.82), rot=(180, 0, 0), m="crystal_cyan", segs=6)
    for s in (-1, 1):
        B.box((0.03, 0.02, 0.4), loc=(s * 0.3, -0.305, 1.9), rot=(0, s * 15, 0), m="glow_cyan",
              smooth=False)
        B.box((0.2, 0.02, 0.03), loc=(s * 0.25, -0.305, 2.1), m="glow_cyan", smooth=False)
        rock(B, (0.3, 0.35, 0.3), (s * 0.48, 0.0, 2.05), (0, s * 10, 0), sd)
    B = P["spine"]
    rock(B, (0.6, 0.45, 0.3), (0, 0.02, 1.53), (0, 0, 4), sd)
    B = P["hips"]
    rock(B, (0.7, 0.45, 0.3), (0, 0, 1.28))
    for s in (-1, 1):
        rock(B, (0.25, 0.3, 0.3), (s * 0.3, 0, 1.18), (0, s * 12, 0), sd)
    for side, s in (("R", -1), ("L", 1)):
        sh = V((s * p["sh_x"], 0, p["sh_z"]))
        el = V((s * p["elbow"][0], p["elbow"][1], p["elbow"][2]))
        wr = V((s * p["wrist"][0], p["wrist"][1], p["wrist"][2]))
        he = V((s * p["hand_end"][0], p["hand_end"][1], p["hand_end"][2]))
        B = P["upper_arm_" + side]
        rock(B, (0.24, 0.24, 0.32), L(sh, el, 0.55), (0, s * 8, 0), sd)
        B.sphere(0.13, loc=sh, m=sd, ico=1, **F)
        B = P["forearm_" + side]
        rock(B, (0.3, 0.3, 0.45), L(el, wr, 0.5), (0, s * 5, 0))
        B.box((0.02, 0.02, 0.3), loc=L(el, wr, 0.5) + V((s * 0.152, 0, 0)), m="glow_cyan",
              smooth=False)
        B.sphere(0.12, loc=el, m=sd, ico=1, **F)
        B = P["hand_" + side]
        rock(B, (0.34, 0.36, 0.32), L(wr, he, 0.5), (0, 0, 0))
        rock(B, (0.36, 0.12, 0.12), L(wr, he, 0.7) + V((0, -0.15, 0)), (0, 0, 0), sd)
        hp = V((s * p["hip_x"], 0, p["hip_z"]))
        kn = V((s * p["knee"][0], p["knee"][1], p["knee"][2]))
        an_ = V((s * p["ankle"][0], p["ankle"][1], p["ankle"][2]))
        rock(P["thigh_" + side], (0.3, 0.3, 0.48), L(hp, kn, 0.5), (0, 0, s * 4), sd)
        P["shin_" + side].sphere(0.13, loc=kn, m=st, ico=1, **F)
        rock(P["shin_" + side], (0.32, 0.34, 0.45), L(kn, an_, 0.5), (0, 0, 0))
        P["shin_" + side].box((0.02, 0.02, 0.25), loc=L(kn, an_, 0.5) + V((0, -0.172, 0)),
                              m="glow_cyan", smooth=False)
        x = s * p["ankle"][0]
        rock(P["foot_" + side], (0.34, 0.46, 0.18), (x, -0.08, 0.09), (0, 0, 0), sd)
    for side, s in (("R", -1), ("L", 1)):
        B = P["shoulder_rock_" + side]
        B.sphere(0.24, loc=(s * 0.62, 0.02, 2.4), scale=(1.1, 1.0, 0.8), m=st, ico=1,
                 jitter=0.12, seed=3 + s, **F)
        B.crystal(0.06, 0.25, loc=(s * 0.62, 0.02, 2.52), rot=(0, s * 15, 0),
                  m="crystal_cyan", segs=5)
        B.crystal(0.04, 0.16, loc=(s * 0.7, 0.08, 2.5), rot=(20, s * 40, 0), m="crystal_cyan",
                  segs=5)
    rig.attach_builders(P, "golem")
    an = Animator(rig, Solver(rig))

    def rocks(ph, amp=0.05):
        a = 2 * math.pi * ph
        return {"shoulder_rock_R": {"l": (0, 0, amp * math.sin(a)), "r": (0, 0, 10 * math.sin(a))},
                "shoulder_rock_L": {"l": (0, 0, amp * math.sin(a + 2)),
                                    "r": (0, 0, -10 * math.sin(a + 2))}}
    base = merge(legs(10, 6), {"spine": {"r": (8, 0, 0)}, "chest": {"r": (4, 0, 0)},
                               "head": {"r": (-8, 0, 0)},
                               "upper_arm_R": {"r": (-10, 6, 0)}, "forearm_R": {"r": (-20, 0, 0)},
                               "upper_arm_L": {"r": (-10, -6, 0)}, "forearm_L": {"r": (-20, 0, 0)}})

    def idle(ph):
        b = math.sin(2 * math.pi * ph)
        s = merge(base, rocks(ph))
        s["chest"]["r"] = (4 + 2 * b, 0, 0)
        s["hips"]["l"] = (0, 0, s["hips"]["l"][2] + 0.01 * b)
        return s
    an.loop("Idle", 72, idle)

    def move(ph):
        s = walk(ph, stride=24, knee=40, bob=0.04, arm=22, lean=10, elbow=-25, hipsway=8)
        s.update(rocks(ph * 2 % 1.0, 0.08))
        return s
    an.loop("Move", 36, move)
    up = merge(legs(6, 8), rocks(0.25), {
        "spine": {"r": (-12, 0, 0)}, "chest": {"r": (-8, 0, 0)}, "head": {"r": (6, 0, 0)},
        "upper_arm_R": {"r": (-170, 15, 0)}, "forearm_R": {"r": (-20, 0, 0)},
        "upper_arm_L": {"r": (-170, -15, 0)}, "forearm_L": {"r": (-20, 0, 0)}})
    slam = merge(legs(30, 8), rocks(0.75), {
        "hips": {"l": (0, 0, -0.2)}, "spine": {"r": (35, 0, 0)}, "chest": {"r": (15, 0, 0)},
        "head": {"r": (-25, 0, 0)},
        "upper_arm_R": {"r": (-60, 10, -10)}, "forearm_R": {"r": (-10, 0, 0)},
        "upper_arm_L": {"r": (-60, -10, 10)}, "forearm_L": {"r": (-10, 0, 0)}})
    b0 = merge(base, rocks(0))
    an.keyposes("Attack", [(0, b0), (12, up), (17, slam), (23, slam), (33, b0)],
                ["smooth", "in3", "linear", "smooth"])
    hit = merge(base, rocks(0.5, 0.12), {"spine": {"r": (-8, 0, 6)}, "chest": {"r": (-6, 0, 0)},
                                         "head": {"r": (-12, 0, 8)}})
    an.keyposes("Hit", [(0, b0), (4, hit), (12, b0)], ["out", "smooth"])
    kneel = merge(legs(50, 10), {"hips": {"l": (0, 0, -0.5)}, "spine": {"r": (25, 0, 0)},
                                 "head": {"r": (15, 0, 0)},
                                 "upper_arm_R": {"r": (-20, 10, 0)},
                                 "upper_arm_L": {"r": (-20, -10, 0)},
                                 "shoulder_rock_R": {"l": (0, 0, -0.3), "r": (30, 0, 20)},
                                 "shoulder_rock_L": {"l": (0, 0, -0.3), "r": (-20, 0, -30)}})
    dead = merge(legs(60, 12), {"hips": {"l": (0, 0, -0.75)}, "spine": {"r": (55, 0, 5)},
                                "chest": {"r": (25, 0, 0)}, "head": {"r": (20, 0, 10)},
                                "upper_arm_R": {"r": (-60, 30, 0)},
                                "upper_arm_L": {"r": (-50, -35, 0)},
                                "shoulder_rock_R": {"l": (-0.2, -0.3, -1.1), "r": (60, 0, 40)},
                                "shoulder_rock_L": {"l": (0.3, -0.2, -1.1), "r": (-40, 0, -60)}})
    an.keyposes("Die", [(0, b0), (12, kneel), (26, dead), (40, dead)], ["smooth", "in", "out"])
    return export_glb("models/monsters/golem.glb", animations=True)


# ===========================================================================
# DRAGON
# ===========================================================================
def dragon_bones():
    b = [("root", (0, 0, 0), (0, 0, 0.5), None),
         ("hips", (0, 0.9, 1.5), (0, 0.0, 1.62), "root"),
         ("chest", (0, 0.0, 1.62), (0, -0.85, 1.8), "hips"),
         ("neck_1", (0, -0.85, 1.9), (0, -1.2, 2.25), "chest"),
         ("neck_2", (0, -1.2, 2.25), (0, -1.5, 2.6), "neck_1"),
         ("neck_3", (0, -1.5, 2.6), (0, -1.8, 2.82), "neck_2"),
         ("head", (0, -1.8, 2.82), (0, -2.55, 2.68), "neck_3"),
         ("jaw", (0, -1.95, 2.68), (0, -2.6, 2.5), "head"),
         ("tail_1", (0, 1.0, 1.5), (0, 1.6, 1.25), "hips"),
         ("tail_2", (0, 1.6, 1.25), (0, 2.2, 0.92), "tail_1"),
         ("tail_3", (0, 2.2, 0.92), (0, 2.8, 0.62), "tail_2"),
         ("tail_4", (0, 2.8, 0.62), (0, 3.35, 0.42), "tail_3")]
    for side, s in (("L", 1), ("R", -1)):
        b += [("leg_F%s_1" % side, (s * 0.45, -0.6, 1.45), (s * 0.58, -0.52, 0.85), "chest"),
              ("leg_F%s_2" % side, (s * 0.58, -0.52, 0.85), (s * 0.58, -0.66, 0.22),
               "leg_F%s_1" % side),
              ("leg_F%s_3" % side, (s * 0.58, -0.66, 0.22), (s * 0.58, -0.95, 0.05),
               "leg_F%s_2" % side),
              ("leg_B%s_1" % side, (s * 0.5, 0.8, 1.4), (s * 0.62, 0.42, 0.85), "hips"),
              ("leg_B%s_2" % side, (s * 0.62, 0.42, 0.85), (s * 0.62, 0.92, 0.36),
               "leg_B%s_1" % side),
              ("leg_B%s_3" % side, (s * 0.62, 0.92, 0.36), (s * 0.62, 0.62, 0.04),
               "leg_B%s_2" % side),
              ("wing_%s_1" % side, (s * 0.32, -0.45, 2.0), (s * 1.3, -0.25, 2.5), "chest"),
              ("wing_%s_2" % side, (s * 1.3, -0.25, 2.5), (s * 2.4, 0.25, 2.65),
               "wing_%s_1" % side),
              ("wing_%s_3" % side, (s * 2.4, 0.25, 2.65), (s * 3.3, 1.0, 2.25),
               "wing_%s_2" % side)]
    return b


def build_dragon():
    reset_scene()
    _mats()
    rig = Rig("DragonRig", dragon_bones())
    P = defaultdict(Builder)
    sc, dk, gl = "drg_scale", "drg_dark", "drg_glow"

    def spikes(B, pts, h, r, m="drg_horn", lean=(0, 0.6, 1)):
        for i, p in enumerate(pts):
            hh = h[i] if isinstance(h, (list, tuple)) else h
            B.cyl(r * hh / max(h if not isinstance(h, (list, tuple)) else max(h), 1e-3), 0.0, hh,
                  matrix=basis(z=lean, x=(1, 0, 0), loc=V(p) + V(lean).normalized() * hh * 0.4),
                  m=m, segs=4, smooth=False)

    # body
    B = P["chest"]
    B.sphere(0.62, loc=(0, -0.45, 1.68), scale=(0.88, 1.15, 0.85), m=sc, segs=18, rings=12)
    B.sphere(0.5, loc=(0, -0.62, 1.45), scale=(0.75, 0.9, 0.6), m=gl, segs=14, rings=8)
    for k in range(4):
        B.box((0.5 - k * 0.04, 0.2, 0.06), loc=(0, -0.3 - k * 0.18, 1.18 + k * 0.03),
              rot=(-10, 0, 0), m="drg_dark", bevel=0.03, seg=1)
    spikes(B, [(0, -0.1 - 0.25 * i, 2.22 - i * 0.02) for i in range(4)], [0.32, 0.36, 0.3, 0.26],
           0.12)
    B = P["hips"]
    B.sphere(0.55, loc=(0, 0.55, 1.55), scale=(0.9, 1.15, 0.85), m=sc, segs=18, rings=12)
    B.sphere(0.4, loc=(0, 0.45, 1.3), scale=(0.85, 1.0, 0.6), m=dk, segs=12, rings=8)
    spikes(B, [(0, 0.2 + 0.28 * i, 2.03 - i * 0.04) for i in range(4)], [0.3, 0.28, 0.25, 0.2],
           0.11)
    # neck
    for name, p0, p1, r0, r1 in (("neck_1", (0, -0.75, 1.82), (0, -1.25, 2.3), 0.4, 0.3),
                                 ("neck_2", (0, -1.15, 2.2), (0, -1.55, 2.64), 0.3, 0.25),
                                 ("neck_3", (0, -1.45, 2.56), (0, -1.85, 2.85), 0.25, 0.22)):
        B = P[name]
        B.seg(p0, p1, [(r0, 0), (r0 * 1.05, 0.4), (r1, 1.0)], m=sc, segs=12)
        mid = L(p0, p1, 0.5)
        d = (V(p1) - V(p0)).normalized()
        B.seg(L(p0, p1, 0.05) + V((0, -0.06, -r0 * 0.7)), L(p0, p1, 0.95) + V((0, -0.06, -r1 * 0.7)),
              [(r0 * 0.55, 0), (r1 * 0.55, 1)], m=gl, segs=10, scale=(1.0, 0.6))
        spikes(B, [mid + V((0, 0.08, r0 * 0.85))], [0.22], 0.08, lean=(0, 0.7, 0.7))
    # head
    B = P["head"]
    hc = V((0, -2.0, 2.85))
    B.box((0.42, 0.5, 0.36), loc=hc, rot=(-6, 0, 0), m=sc, bevel=0.08, seg=2, taper=(0.9, 1.0))
    B.box((0.3, 0.55, 0.2), loc=hc + V((0, -0.42, -0.06)), rot=(-8, 0, 0), m=sc, bevel=0.06,
          seg=2, taper=(0.85, 0.9))
    B.box((0.34, 0.5, 0.06), loc=hc + V((0, -0.3, 0.13)), rot=(-10, 0, 0), m=dk, bevel=0.025,
          seg=1)
    for s in (-1, 1):
        B.sweep([hc + V((s * 0.15, 0.12, 0.15)), hc + V((s * 0.28, 0.4, 0.28)),
                 hc + V((s * 0.3, 0.72, 0.36)), hc + V((s * 0.24, 0.95, 0.5))],
                [0.09, 0.07, 0.045, 0.0], m="drg_horn", segs=8)
        B.sweep([hc + V((s * 0.2, 0.05, 0.0)), hc + V((s * 0.4, 0.25, -0.02)),
                 hc + V((s * 0.5, 0.42, 0.05))], [0.05, 0.035, 0.0], m="drg_horn", segs=6)
        B.sphere(0.06, loc=hc + V((s * 0.19, -0.18, 0.08)), scale=(0.6, 1.2, 0.6), m="drg_eye",
                 segs=10, rings=6)
        B.box((0.08, 0.2, 0.05), loc=hc + V((s * 0.17, -0.2, 0.15)), rot=(0, s * 20, s * -10),
              m=dk, bevel=0.015, seg=1)
        B.sphere(0.025, loc=hc + V((s * 0.08, -0.69, 0.04)), m="nose", segs=6, rings=4)
        for k in range(4):
            B.cyl(0.022, 0.0, 0.08, loc=hc + V((s * 0.13, -0.6 + k * 0.12, -0.17)),
                  rot=(180, 0, 0), m="drg_claw", segs=4, smooth=False)
    spikes(B, [hc + V((0, 0.1 + 0.15 * i, 0.2 - i * 0.03)) for i in range(3)], [0.16, 0.14, 0.12],
           0.06, lean=(0, 0.8, 0.6))
    for s in (-1, 1):
        for k, (ln, ang) in enumerate(((0.32, 10), (0.26, -12), (0.2, -32))):
            B.poly([(0, -0.04), (ln, 0.0), (0, 0.04)], 0.02,
                   matrix=basis(x=(s * 0.55, 0.8, math.sin(math.radians(ang))), z=(s * 0.8, -0.55, 0),
                                loc=hc + V((s * 0.2, 0.15, -0.05 - k * 0.06))),
                   m=dk, smooth=False)
        B.box((0.1, 0.28, 0.07), loc=hc + V((s * 0.13, -0.12, 0.17)), rot=(8, 0, s * 8), m=dk,
              bevel=0.02, seg=1)
    B = P["jaw"]
    B.box((0.3, 0.6, 0.12), loc=(0, -2.27, 2.6), rot=(-14, 0, 0), m=sc, bevel=0.04, seg=1,
          taper=(0.8, 0.95))
    B.box((0.24, 0.52, 0.05), loc=(0, -2.27, 2.66), rot=(-14, 0, 0), m=gl, bevel=0.015, seg=1)
    for s in (-1, 1):
        for k in range(4):
            B.cyl(0.02, 0.0, 0.07, loc=(s * 0.12, -2.48 + k * 0.12, 2.72 - k * 0.025),
                  rot=(-14, 0, 0), m="drg_claw", segs=4, smooth=False)
    # tail
    tails = (("tail_1", (0, 0.95, 1.52), (0, 1.62, 1.24), 0.36, 0.28),
             ("tail_2", (0, 1.55, 1.27), (0, 2.22, 0.91), 0.28, 0.2),
             ("tail_3", (0, 2.15, 0.95), (0, 2.82, 0.61), 0.2, 0.13),
             ("tail_4", (0, 2.75, 0.64), (0, 3.25, 0.44), 0.13, 0.06))
    for name, p0, p1, r0, r1 in tails:
        B = P[name]
        B.seg(p0, p1, [(r0, 0), (r0 * 1.02, 0.4), (r1, 1.0)], m=sc, segs=12, scale=(1.0, 0.9))
        spikes(B, [L(p0, p1, 0.3) + V((0, 0, r0 * 0.85)), L(p0, p1, 0.75) + V((0, 0, r1 * 0.9))],
               [r0 * 0.8, r1 * 0.9], r0 * 0.3, lean=(0, 0.7, 0.7))
        d_ = (V(p1) - V(p0)).normalized()
        for t in (0.25, 0.7):
            q = L(p0, p1, t)
            B.box((r0 * 1.1, r0 * 1.3, 0.05), matrix=basis(z=d_.cross(V((1, 0, 0))).normalized()
                                                            * -1, x=(1, 0, 0),
                                                            loc=q - V((0, 0, r0 * 0.82))),
                  m="drg_dark", bevel=0.02, seg=1)
    B = P["tail_4"]
    B.poly([(0, 0), (0.25, 0.2), (0.45, 0.0), (0.25, -0.2)], 0.05,
           matrix=basis(x=(0, 1, -0.3), z=(0, 0.3, 1), loc=(0, 3.22, 0.45)), m="drg_horn",
           bevel=0.015, smooth=False)
    # legs
    for side, s in (("L", 1), ("R", -1)):
        for fb, segs_ in (("F", [(0.45, -0.6, 1.45), (0.58, -0.52, 0.85), (0.58, -0.66, 0.22),
                                 (0.58, -0.95, 0.05)]),
                          ("B", [(0.5, 0.8, 1.4), (0.62, 0.42, 0.85), (0.62, 0.92, 0.36),
                                 (0.62, 0.62, 0.04)])):
            pts = [V((s * x, y, z)) for x, y, z in segs_]
            n1, n2, n3 = ["leg_%s%s_%d" % (fb, side, i) for i in (1, 2, 3)]
            thick = 0.34 if fb == "B" else 0.26
            P[n1].seg(pts[0] + (pts[0] - pts[1]).normalized() * 0.1, pts[1],
                      [(thick, 0), (thick * 1.05, 0.4), (thick * 0.62, 1.0)], m=sc, segs=10)
            P[n1].sphere(thick * 0.66, loc=pts[1], m=sc, segs=10, rings=8)
            if fb == "B":
                P[n1].sphere(0.42, loc=pts[0].lerp(pts[1], 0.35) + V((s * 0.05, 0.05, 0)),
                             scale=(0.7, 1.0, 1.15), m=sc, segs=14, rings=10)
            else:
                P[n1].sphere(0.3, loc=pts[0].lerp(pts[1], 0.3), scale=(0.75, 0.9, 1.15), m=sc,
                             segs=12, rings=8)
            P[n2].seg(pts[1], pts[2], [(thick * 0.6, 0), (thick * 0.5, 0.6), (thick * 0.42, 1.0)],
                      m=sc, segs=10)
            P[n2].sphere(thick * 0.42, loc=pts[2], m=dk, segs=8, rings=6)
            ft = V((s * 0.58, -0.86, 0.04)) if fb == "F" else V((s * 0.62, 0.6, 0.04))
            P[n3].box((thick * 1.2, 0.36, 0.14), loc=V((ft.x, ft.y, 0.07)), m=dk, bevel=0.04,
                      seg=1)
            if fb == "F":
                P[n3].seg(pts[2], V((ft.x, ft.y + 0.08, 0.1)), [(thick * 0.42, 0), (thick * 0.4, 1)],
                          m=sc, segs=8)
            if fb == "B":
                P[n3].seg(pts[2], V((s * 0.62, 0.75, 0.08)), [(thick * 0.4, 0), (thick * 0.38, 1)],
                          m=sc, segs=8)
            for k in (-1, 0, 1):
                P[n3].cyl(0.05, 0.0, 0.16, matrix=basis(z=(k * 0.25, -1, -0.35), x=(0, 0, 1),
                                                          loc=V((s * (0.58 if fb == "F" else 0.62)
                                                                 + k * 0.1, ft.y - 0.2, 0.05))),
                          m="drg_claw", segs=5, smooth=False)
    # wings: arm bones + three finger struts with scalloped membranes
    for side, s in (("L", 1), ("R", -1)):
        S_ = V((s * 0.32, -0.45, 2.0))
        E_ = V((s * 1.3, -0.25, 2.5))
        W_ = V((s * 2.4, 0.25, 2.65))
        F1 = V((s * 3.3, 1.0, 2.25))
        F2 = V((s * 3.05, 1.75, 1.85))
        F3 = V((s * 2.35, 2.0, 1.7))
        T1 = V((s * 1.25, 1.55, 1.8))
        T0 = V((s * 0.45, 1.05, 1.75))
        b1, b2, b3 = ("wing_%s_%d" % (side, i) for i in (1, 2, 3))
        P[b1].seg(S_, E_, [(0.14, 0), (0.12, 0.5), (0.09, 1)], m=sc, segs=10)
        P[b1].sphere(0.11, loc=E_, m=dk, segs=10, rings=8)
        P[b2].seg(E_, W_, [(0.09, 0), (0.07, 0.6), (0.065, 1)], m=sc, segs=10)
        P[b2].sphere(0.08, loc=W_, m=dk, segs=10, rings=8)
        P[b2].cyl(0.045, 0.0, 0.24, matrix=basis(z=(s * 0.2, -0.5, 1), x=(1, 0, 0),
                                                  loc=W_ + V((0, -0.06, 0.14))),
                  m="drg_claw", segs=5, smooth=False)
        for tip_, bone, r0 in ((F1, b3, 0.055), (F2, b3, 0.045), (F3, b3, 0.04)):
            P[bone].seg(W_, tip_, [(r0, 0), (r0 * 0.7, 0.6), (0.012, 1.0)], m=dk, segs=6)

        def scallop(a, b, depth=0.22, n=4, toward=W_):
            out = []
            for k in range(1, n):
                t = k / n
                p = a.lerp(b, t)
                p = p.lerp(toward, depth * math.sin(math.pi * t))
                out.append(p)
            return out
        mem = "drg_membrane"
        P[b3].fan([W_, F1] + scallop(F1, F2) + [F2] + scallop(F2, F3) + [F3], m=mem,
                  center=W_.lerp((F1 + F2 + F3) / 3, 0.55))
        P[b2].fan([E_, W_, F3] + scallop(F3, T1, 0.18, toward=E_) + [T1], m=mem,
                  center=(E_ + W_ + F3 + T1) / 4)
        P[b1].fan([S_, E_, T1] + scallop(T1, T0, 0.15, toward=S_) + [T0], m=mem,
                  center=(S_ + E_ + T1 + T0) / 4)
    rig.attach_builders(P, "dragon")
    an = Animator(rig, Solver(rig))

    def wings(fold=0.0, flap=0.0):
        """fold 0 = spread, 1 = folded; flap degrees (+ = up)."""
        out = {}
        for side, s in (("L", 1), ("R", -1)):
            out["wing_%s_1" % side] = {"r": (0, -s * flap, s * 35 * fold)}
            out["wing_%s_2" % side] = {"r": (0, -s * flap * 0.4, -s * 0 + s * 70 * fold * 0.7)}
            out["wing_%s_3" % side] = {"r": (0, -s * flap * 0.3, s * 40 * fold * 0.6)}
        return out

    stand = merge(wings(0.6, -12), {"neck_1": {"r": (0, 0, 0)}, "jaw": {"r": (0, 0, 0)}})

    def idle(ph):
        a = 2 * math.pi * ph
        b = math.sin(a)
        s = merge(wings(0.6 + 0.05 * b, -12 + 5 * b))
        s.update({"chest": {"r": (1.5 * b, 0, 0), "s": (1 + 0.02 * b, 1, 1 + 0.02 * b)},
                  "hips": {"l": (0, 0, 0.01 * b)},
                  "neck_1": {"r": (3 * b, 0, 4 * math.sin(a + 1))},
                  "neck_2": {"r": (2 * b, 0, 4 * math.sin(a + 0.5))},
                  "neck_3": {"r": (-3 * b, 0, 3 * math.sin(a))},
                  "head": {"r": (-2 * b, 0, 3 * math.sin(a - 0.5))},
                  "jaw": {"r": (-3 - 3 * max(0.0, math.sin(2 * a)), 0, 0)},
                  "tail_1": {"r": (0, 0, 6 * math.sin(a))},
                  "tail_2": {"r": (0, 0, 8 * math.sin(a - 0.7))},
                  "tail_3": {"r": (0, 0, 10 * math.sin(a - 1.4))},
                  "tail_4": {"r": (0, 0, 12 * math.sin(a - 2.1))}})
        return s
    an.loop("Idle", 90, idle)

    def move(ph):
        a = 2 * math.pi * ph
        s = trot(ph, amp=24, knee=40, back_sign=-1,
                 phases={"FL": 0.0, "BR": 0.05, "FR": 0.5, "BL": 0.55})
        s.update(wings(0.7, -10 + 4 * math.sin(2 * a)))
        s.update({"hips": {"l": (0, 0, 0.04 * math.cos(2 * a)), "r": (0, 0, 4 * math.sin(a))},
                  "chest": {"r": (0, 0, -5 * math.sin(a))},
                  "neck_1": {"r": (4 * math.sin(2 * a), 0, 4 * math.sin(a))},
                  "neck_3": {"r": (-4 * math.sin(2 * a), 0, -3 * math.sin(a))},
                  "tail_1": {"r": (0, 0, 8 * math.sin(a))},
                  "tail_2": {"r": (0, 0, 10 * math.sin(a - 0.8))},
                  "tail_3": {"r": (0, 0, 12 * math.sin(a - 1.6))},
                  "tail_4": {"r": (0, 0, 14 * math.sin(a - 2.4))}})
        return s
    an.loop("Move", 36, move)
    rear = merge(wings(0.2, 30), {"hips": {"r": (-8, 0, 0), "l": (0, 0, 0.1)},
                                  "chest": {"r": (-10, 0, 0)},
                                  "neck_1": {"r": (-18, 0, 0)}, "neck_2": {"r": (-10, 0, 0)},
                                  "neck_3": {"r": (10, 0, 0)}, "head": {"r": (12, 0, 0)},
                                  "jaw": {"r": (-25, 0, 0)},
                                  "leg_FL_1": {"r": (-30, 0, 0)}, "leg_FL_2": {"r": (40, 0, 0)},
                                  "tail_1": {"r": (-8, 0, 0)}})
    bite = merge(wings(0.3, 20), {"hips": {"r": (6, 0, 0)}, "chest": {"r": (8, 0, 0)},
                                  "neck_1": {"r": (30, 0, 0)}, "neck_2": {"r": (18, 0, 0)},
                                  "neck_3": {"r": (-10, 0, 0)}, "head": {"r": (-12, 0, 0)},
                                  "jaw": {"r": (-35, 0, 0)},
                                  "leg_FL_1": {"r": (-25, 0, 0)}, "leg_FL_2": {"r": (10, 0, 0)},
                                  "tail_1": {"r": (10, 0, 0)}})
    shut = merge(bite, {"jaw": {"r": (0, 0, 0)}, "head": {"r": (-6, 0, 0)}})
    an.keyposes("Attack", [(0, stand), (10, rear), (15, bite), (19, shut), (30, stand)],
                ["smooth", "in", "out", "smooth"])
    inhale = merge(wings(0.1, 25), {"chest": {"r": (-12, 0, 0), "s": (1.06, 1, 1.06)},
                                    "hips": {"l": (0, 0, 0.06)},
                                    "neck_1": {"r": (-25, 0, 0)}, "neck_2": {"r": (-15, 0, 0)},
                                    "neck_3": {"r": (5, 0, 0)}, "head": {"r": (15, 0, 0)},
                                    "jaw": {"r": (-10, 0, 0)}})
    breath = merge(wings(0.15, 15), {"chest": {"r": (6, 0, 0)},
                                     "neck_1": {"r": (24, 0, 0)}, "neck_2": {"r": (8, 0, 0)},
                                     "neck_3": {"r": (-6, 0, 0)}, "head": {"r": (-14, 0, 0)},
                                     "jaw": {"r": (-40, 0, 0)},
                                     "tail_1": {"r": (6, 0, 0)}})
    breath2 = merge(breath, {"neck_1": {"r": (24, 0, 6)}, "head": {"r": (-14, 0, -6)},
                             "jaw": {"r": (-42, 0, 0)}})
    an.keyposes("Attack2", [(0, stand), (12, inhale), (18, breath), (36, breath2), (45, stand)],
                ["smooth", "out", "smooth", "smooth"])
    hit = merge(wings(0.4, 30), {"chest": {"r": (-6, 0, 6)}, "neck_1": {"r": (-15, 0, 12)},
                                 "neck_3": {"r": (-10, 0, 8)}, "head": {"r": (-8, 0, 10)},
                                 "jaw": {"r": (-25, 0, 0)}, "tail_2": {"r": (15, 0, 0)}})
    an.keyposes("Hit", [(0, stand), (4, hit), (12, stand)], ["out", "smooth"])
    fold = {"leg_FL_1": {"r": (-20, 0, 0)}, "leg_FL_2": {"r": (50, 0, 0)},
            "leg_FR_1": {"r": (-20, 0, 0)}, "leg_FR_2": {"r": (50, 0, 0)},
            "leg_BL_1": {"r": (-40, 0, 0)}, "leg_BL_2": {"r": (-20, 0, 0)},
            "leg_BR_1": {"r": (-40, 0, 0)}, "leg_BR_2": {"r": (-20, 0, 0)}}
    sag = merge(wings(0.3, 35), fold, {"hips": {"l": (0, 0, -0.55)},
                                       "neck_1": {"r": (-25, 0, 0)}, "head": {"r": (20, 0, 0)},
                                       "jaw": {"r": (-30, 0, 0)}})
    dead = merge(wings(0.5, -25), fold, {"hips": {"l": (0, 0, -0.75)},
                                         "root": {"r": (0, 12, 0)},
                                         "neck_1": {"r": (30, 0, -20)}, "neck_2": {"r": (20, 0, -15)},
                                         "neck_3": {"r": (5, 0, -10)}, "head": {"r": (10, 0, -10)},
                                         "jaw": {"r": (-18, 0, 0)},
                                         "tail_2": {"r": (0, 0, 15)}, "tail_3": {"r": (0, 0, 20)}})
    an.keyposes("Die", [(0, stand), (14, sag), (30, dead), (48, dead)], ["smooth", "in", "out"])

    def fly(ph):
        a = 2 * math.pi * ph
        f = 40 * math.sin(a)
        s = merge(wings(0.0, f))
        s.update({"hips": {"l": (0, 0, 0.35 - 0.12 * math.sin(a))},
                  "chest": {"r": (-4, 0, 0)},
                  "neck_1": {"r": (-8 + 4 * math.sin(a + 1), 0, 0)},
                  "head": {"r": (8, 0, 0)},
                  "tail_1": {"r": (-8 + 4 * math.sin(a), 0, 0)},
                  "tail_2": {"r": (-6 + 6 * math.sin(a - 1), 0, 0)},
                  "tail_3": {"r": (-4 + 8 * math.sin(a - 2), 0, 0)}})
        for leg in ("FL", "FR"):
            s.update(quad_leg_spec("leg_" + leg, -30, 60, foot=20))
        for leg in ("BL", "BR"):
            s.update(quad_leg_spec("leg_" + leg, 35, -10, foot=20))
        return s
    an.loop("Fly", 30, fly)
    return export_glb("models/monsters/dragon.glb", animations=True)


MONSTERS = {
    "slime": build_slime,
    "wolf": build_wolf,
    "goblin": build_goblin,
    "golem": build_golem,
    "dragon": lambda: __import__("pipeline.dragon", fromlist=["build_dragon"]).build_dragon(),
}


def build(mid):
    return MONSTERS[mid]()
