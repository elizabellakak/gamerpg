"""Weapon-class mastery animations for the hero (Sword&Shield, Greatsword, Spear, Bow, Staff).

Conventions (see anim.py): pose specs use armature axes (X = hero's left, -Y = forward, Z = up),
IK grips are in root space. The right hand always holds the class weapon in `weapon_socket`
(except Bow: the bow sits in `bow_socket` on the left hand and the right hand draws).
Two-handed grips use ikL {'follow': d} = left hand d meters further down the handle
(negative d = further up toward the tip, used for spears / staves).
"""
import math

from .anim import add_r, hand_rot, merge
from .characters import hero_animator, legs

TAU = 2 * math.pi


def run_lower(ph, lean=14.0, stride=38.0):
    a = TAU * ph
    s_ = math.sin(a)
    thR = -stride * s_ - 4
    thL = stride * s_ - 4
    knR = 18 + 75 * max(0.0, math.cos(a)) ** 1.3
    knL = 18 + 75 * max(0.0, -math.cos(a)) ** 1.3
    bob = 0.03 * math.cos(2 * a) - 0.035
    return {
        "hips": {"l": (0, 0, bob), "r": (0, 0, 8 * s_)},
        "spine": {"r": (lean, 0, -5 * s_)}, "chest": {"r": (4, 0, -7 * s_)},
        "neck": {"r": (-6, 0, 3 * s_)}, "head": {"r": (-8, 0, 3 * s_)},
        "thigh_R": {"r": (thR, 3, 0)}, "shin_R": {"r": (knR, 0, 0)},
        "foot_R": {"r": (-thR * 0.3 - knR * 0.25, -3, 0)},
        "thigh_L": {"r": (thL, -3, 0)}, "shin_L": {"r": (knL, 0, 0)},
        "foot_L": {"r": (-thL * 0.3 - knL * 0.25, 3, 0)},
        "cape_1": {"r": (32 + 5 * math.sin(2 * a), 0, 3 * s_)},
        "cape_2": {"r": (22 + 9 * math.sin(2 * a + 1.3), 0, 0)},
    }


def breathe(spec, ph, amp=1.0, grips=("ikR", "ikL")):
    b = math.sin(TAU * ph)
    c = math.sin(TAU * ph + 1.2)
    s = merge(spec)
    add_r(s, "chest", (1.6 * b * amp, 0, 0))
    add_r(s, "spine", (0.8 * b * amp, 0, 0))
    add_r(s, "head", (-1.0 * b * amp, 0, 0.8 * c))
    hl = s.get("hips", {}).get("l", (0, 0, 0))
    s.setdefault("hips", {})["l"] = (hl[0], hl[1], hl[2] + 0.006 * b * amp)
    for k in grips:
        if k in s and "grip" in s[k]:
            g = s[k]["grip"]
            s[k]["grip"] = (g[0], g[1], g[2] + 0.01 * b * amp)
    s["cape_1"] = {"r": (s.get("cape_1", {}).get("r", (4, 0, 0))[0] + 1.5 * c, 0, 1.0 * b)}
    s["cape_2"] = {"r": (s.get("cape_2", {}).get("r", (2, 0, 0))[0] + 2.5 * math.sin(TAU * ph + 2),
                         0, 0)}
    return s


def cape(c1=4, c2=2):
    return {"cape_1": {"r": (c1, 0, 0)}, "cape_2": {"r": (c2, 0, 0)}}


def ik(grip, blade=None, edge=(1, 0, 0), pole=(-0.5, 0.5, -0.7), rot=None):
    d = {"grip": grip, "pole": pole}
    if rot is not None:
        d["rot"] = rot
    elif blade is not None:
        d["rot"] = hand_rot(blade, edge)
    return d


def follow(d, pole=(0.6, 0.3, -0.6)):
    return {"follow": d, "pole": pole}


# ===========================================================================
# Sword & Shield
# ===========================================================================
def sword_shield(an):
    SHP = (0.8, -0.4, -0.5)     # elbow out-forward-down: forearm crosses the chest

    def shield(grip):
        d = ik(grip, pole=SHP)
        d["face"] = (0, -1, 0)   # twist forearm so the shield faces forward, upright
        return d
    guard_L = shield((-0.05, -0.26, 1.26))
    idle = merge(legs(14, 6, back=4), cape(), {
        "spine": {"r": (5, 0, 4)}, "chest": {"r": (2, 0, 6)}, "head": {"r": (-4, 0, -8)},
        "ikR": ik((-0.3, -0.18, 1.05), (0.1, -0.55, 0.83), pole=(-0.5, 0.5, -0.7)),
        "ikL": guard_L})
    an.loop("SS_Idle", 60, lambda ph: breathe(idle, ph))

    def run(ph):
        a = TAU * ph
        s = run_lower(ph, lean=12)
        s["ikL"] = shield((-0.03, -0.24, 1.22 + 0.02 * math.cos(2 * a)))
        s["ikR"] = ik((-0.3, -0.05 + 0.08 * math.sin(a), 1.0 + 0.02 * math.cos(2 * a)),
                      (-0.2, -0.45, 0.87), pole=(-0.6, 0.4, -0.6))
        return s
    an.loop("SS_Run", 21, run)
    wind = merge(idle, {"spine": {"r": (2, 0, 14)}, "chest": {"r": (0, 0, 18)},
                        "ikL": shield((0.02, -0.16, 1.24))})
    bash = merge(legs(24, 7, back=12), cape(-6, -4), {
        "hips": {"l": (0, 0, -0.08)}, "spine": {"r": (16, 0, -10)}, "chest": {"r": (6, 0, -16)},
        "head": {"r": (-14, 0, 14)},
        "ikR": ik((-0.32, 0.02, 1.05), (-0.2, -0.3, 0.93), pole=(-0.5, 0.5, -0.7)),
        "ikL": shield((-0.04, -0.5, 1.28))})
    an.keyposes("SS_Bash", [(0, idle), (5, wind), (8, bash), (10, bash), (15, idle)],
                ["smooth", "in3", "linear", "smooth"])
    brace = merge(legs(32, 8, back=10), cape(-4, -2), {
        "hips": {"l": (0, 0, -0.12)}, "spine": {"r": (18, 0, 2)}, "chest": {"r": (6, 0, 4)},
        "head": {"r": (-6, 0, -4)},
        "ikR": ik((-0.3, 0.06, 1.0), (-0.1, -0.4, 0.9), pole=(-0.5, 0.5, -0.7)),
        "ikL": shield((-0.06, -0.3, 1.34))})
    brace2 = merge(brace, {"hips": {"l": (0, 0, -0.13)}, "spine": {"r": (19, 0, 2)}})
    an.keyposes("SS_Block", [(0, idle), (4, brace), (13, brace2), (18, idle)],
                ["out", "smooth", "smooth"])

    # --- Bicheon (Silkroad) skill moves ---
    def pose(grip, blade, bend=16, back=8, spine=(6, 0, 4), chest=(2, 0, 6), drop=0.0, L=None, cape_=(0, 0)):
        s = merge(legs(bend, 7, back=back), cape(*cape_), {
            "spine": {"r": spine}, "chest": {"r": chest}, "head": {"r": (-4, 0, -spine[2])},
            "ikR": ik(grip, blade, pole=(-0.5, 0.5, -0.7)), "ikL": L or guard_L})
        if drop:
            s["hips"]["l"] = (0, 0, s["hips"]["l"][2] - drop)
        return s
    # overhead chop -> diagonal downward slash
    up = pose((-0.22, 0.0, 1.62), (0.2, 0.5, 0.84), bend=12, spine=(-4, 0, 8))
    down = pose((-0.12, -0.5, 0.95), (0.5, -0.7, -0.5), bend=26, back=12, spine=(18, 0, -10), chest=(6, 0, -12), drop=0.05)
    an.keyposes("SS_Chop", [(0, idle), (5, up), (9, down), (12, down), (18, idle)], ["smooth", "in3", "linear", "smooth"])
    # deep lunge thrust held
    pull = pose((-0.34, 0.2, 1.1), (0.0, -1, 0.05), bend=18, spine=(4, 0, 16), chest=(0, 0, 18))
    lunge = merge(cape(-8, -6), {
        "hips": {"l": (0, 0, -0.24)}, "spine": {"r": (22, 0, 8)}, "chest": {"r": (6, 0, 6)}, "head": {"r": (-20, 0, -10)},
        "thigh_L": {"r": (-60, -6, 0)}, "shin_L": {"r": (70, 0, 0)}, "foot_L": {"r": (-10, 6, 0)},
        "thigh_R": {"r": (36, 8, 0)}, "shin_R": {"r": (30, 0, 0)}, "foot_R": {"r": (-40, -6, 0)},
        "ikR": ik((-0.14, -0.78, 1.0), (0.0, -1, 0.02), pole=(-0.5, 0.5, -0.7)), "ikL": shield((0.06, -0.12, 1.1))})
    an.keyposes("SS_Lunge", [(0, idle), (5, pull), (8, lunge), (16, lunge), (24, idle)], ["smooth", "in3", "linear", "smooth"])
    # crouch -> huge rising uppercut
    low = pose((-0.2, 0.25, 0.62), (-0.2, 0.6, -0.75), bend=40, back=14, spine=(26, 0, 12), drop=0.18)
    rise = pose((-0.16, -0.36, 1.7), (0.0, -0.3, 0.95), bend=8, spine=(-8, 0, -6), chest=(-4, 0, -8))
    an.keyposes("SS_Upper", [(0, idle), (6, low), (10, rise), (14, rise), (22, idle)], ["smooth", "in3", "linear", "smooth"])
    # leap, plunge, sword stabbed into the ground
    tuck = pose((-0.14, -0.05, 1.75), (0.0, 0.3, 0.95), bend=34, spine=(-6, 0, 0))
    tuck["hips"]["l"] = (0, 0, tuck["hips"]["l"][2] + 0.6)
    stab = pose((-0.1, -0.5, 0.75), (0.0, -0.2, -1), bend=44, back=18, spine=(30, 0, 0), chest=(8, 0, 0), drop=0.25)
    an.keyposes("SS_Plunge", [(0, idle), (4, low), (9, tuck), (13, tuck), (16, stab), (26, stab), (34, idle)],
                ["smooth", "out", "linear", "in3", "linear", "smooth"])
    # kneel and gather (sword planted), used by Blade Force
    kneel = merge(cape(4, 2), {
        "hips": {"l": (0, 0, -0.42)}, "spine": {"r": (16, 0, 0)}, "chest": {"r": (4, 0, 0)}, "head": {"r": (-10, 0, 0)},
        "thigh_L": {"r": (-80, 0, 0)}, "shin_L": {"r": (85, 0, 0)}, "foot_L": {"r": (-5, 0, 0)},
        "thigh_R": {"r": (5, 6, 0)}, "shin_R": {"r": (95, 0, 0)}, "foot_R": {"r": (-50, 0, 0)},
        "ikR": ik((-0.22, -0.42, 0.6), (0.0, -0.4, -0.9), pole=(-0.5, 0.5, -0.7)), "ikL": shield((0.0, -0.3, 0.9))})
    an.keyposes("SS_Kneel", [(0, idle), (6, kneel), (24, kneel), (30, idle)], ["smooth", "linear", "smooth"])
    # overhead fling (Sword Dance)
    cock = pose((-0.3, 0.2, 1.55), (0.1, -0.6, 0.8), bend=12, spine=(-6, 0, 20), chest=(-2, 0, 22))
    fling = pose((-0.1, -0.62, 1.32), (0.0, -1, -0.1), bend=24, back=16, spine=(18, 0, -14), chest=(6, 0, -16))
    an.keyposes("SS_Fling", [(0, idle), (6, cock), (9, fling), (14, fling), (24, idle)], ["smooth", "in3", "linear", "smooth"])


# ===========================================================================
# Greatsword (two-handed; left hand 0.12 m down the grip)
# ===========================================================================
def greatsword(an):
    L2 = follow(0.12)
    idle = merge(legs(14, 8, back=6), cape(), {
        "spine": {"r": (4, 0, -6)}, "chest": {"r": (0, 0, -8)}, "head": {"r": (-4, 0, 10)},
        "ikR": ik((-0.14, -0.27, 1.16), (-0.3, 0.8, 0.52), (0.2, 0.5, -0.8),
                  pole=(-0.4, 0.2, -1)),
        "ikL": follow(0.12, pole=(0.5, 0.0, -1))})
    an.loop("GS_Idle", 60, lambda ph: breathe(idle, ph, grips=("ikR",)))

    def run(ph):
        a = TAU * ph
        s = run_lower(ph, lean=16)
        s["ikR"] = ik((-0.14, -0.25, 1.12 + 0.025 * math.cos(2 * a)), (-0.3, 0.8, 0.52),
                      (0.2, 0.5, -0.8), pole=(-0.4, 0.2, -1))
        s["ikL"] = follow(0.12, pole=(0.5, 0.0, -1))
        return s
    an.loop("GS_Run", 21, run)

    def pose(grip, blade, edge, chest_z, spine_x=4, bend=14, drop=0.0, pole=(-0.3, 0.3, -1)):
        s = merge(legs(bend, 9, back=8), cape(), {
            "spine": {"r": (spine_x, 0, chest_z * 0.45)}, "chest": {"r": (2, 0, chest_z * 0.55)},
            "head": {"r": (-4, 0, -chest_z * 0.6)},
            "ikR": ik(grip, blade, edge, pole=pole), "ikL": L2})
        if drop:
            s["hips"]["l"] = (0, 0, s["hips"]["l"][2] - drop)
        return s
    a1 = pose((-0.3, 0.02, 1.62), (-0.4, 0.5, 0.77), (0.6, 0.6, -0.5), -32, -4, 12)
    a2 = pose((-0.06, -0.5, 1.2), (0.45, -0.85, -0.25), (0.6, 0.4, 0.7), 0, 12, 22, 0.04)
    a3 = pose((0.24, -0.34, 0.86), (0.7, -0.15, -0.7), (-0.2, -0.95, 0.1), 32, 22, 28, 0.08,
              pole=(0.2, 0.3, -1))
    an.keyposes("GS_Attack1", [(0, idle), (6, a1), (10, a2), (12, a3), (15, a3), (18, idle)],
                ["smooth", "in3", "linear", "linear", "smooth"])
    b1 = pose((0.28, -0.22, 0.9), (0.7, 0.35, -0.6), (-0.3, -0.9, 0.0), 30, 10, 22, 0.04,
              pole=(0.2, 0.3, -1))
    b2 = pose((-0.06, -0.52, 1.18), (-0.5, -0.85, 0.15), (-0.6, 0.3, 0.7), 0, 10, 20, 0.03)
    b3 = pose((-0.34, -0.24, 1.55), (-0.6, 0.2, 0.75), (0.6, 0.5, 0.5), -34, -2, 16)
    an.keyposes("GS_Attack2", [(0, idle), (6, b1), (10, b2), (12, b3), (15, b3), (18, idle)],
                ["smooth", "in3", "linear", "linear", "smooth"])
    up = merge(legs(8, 8, back=6), cape(6, 4), {
        "spine": {"r": (-10, 0, 4)}, "chest": {"r": (-8, 0, 0)}, "head": {"r": (4, 0, 0)},
        "ikR": ik((-0.05, 0.05, 1.9), (0, 0.6, 0.8), (1, 0, 0), pole=(-1, 0.3, 0.3)),
        "ikL": follow(0.12, pole=(1, 0.3, 0.3))})
    smash = merge(legs(36, 8, back=12), cape(-16, -12), {
        "hips": {"l": (0, 0, -0.2)}, "spine": {"r": (32, 0, 2)}, "chest": {"r": (16, 0, 0)},
        "head": {"r": (-24, 0, 0)},
        "ikR": ik((-0.03, -0.6, 0.72), (0, -0.55, -0.83), (1, 0, 0), pole=(-1, 0.3, -0.2)),
        "ikL": follow(0.12, pole=(1, 0.3, -0.2))})
    smash2 = merge(smash, {"hips": {"l": (0, 0, -0.19)}, "spine": {"r": (30, 0, 2)}})
    an.keyposes("GS_Attack3", [(0, idle), (9, up), (13, smash), (18, smash2), (24, idle)],
                ["smooth", "in3", "out", "smooth"])
    spin = merge(legs(20, 10), cape(26, 16), {
        "spine": {"r": (6, 0, 0)}, "chest": {"r": (0, 0, 4)}, "head": {"r": (-4, 0, -4)},
        "ikR": ik((-0.5, -0.24, 1.14), (-0.95, -0.3, 0.0), (0.3, -0.95, 0.0),
                  pole=(-0.2, 0.3, -1)),
        "ikL": follow(0.12, pole=(0.3, 0.0, -1))})

    def spin_fn(ph):
        s = merge(spin, {"root": {"r": (0, 0, 360 * ph)}})
        s["hips"]["l"] = (0, 0, s["hips"]["l"][2] + 0.02 * math.sin(2 * TAU * ph))
        return s
    an.loop("GS_Spin", 18, spin_fn)
    crouch = merge(legs(42, 8), cape(-4, -2), {
        "hips": {"l": (0, 0, -0.28)}, "spine": {"r": (24, 0, 0)}, "chest": {"r": (6, 0, 0)},
        "head": {"r": (-16, 0, 0)},
        "ikR": ik((-0.2, 0.1, 1.1), (-0.3, 0.7, 0.65), (1, 0, 0), pole=(-0.6, 0.3, -0.6)),
        "ikL": follow(0.12, pole=(0.6, 0.3, -0.6))})
    air = merge(cape(40, 30), {
        "root": {"l": (0, 0, 1.5)}, "hips": {"l": (0, 0, 0.0)},
        "spine": {"r": (-12, 0, 0)}, "chest": {"r": (-8, 0, 0)}, "head": {"r": (6, 0, 0)},
        "thigh_R": {"r": (-60, 4, 0)}, "shin_R": {"r": (95, 0, 0)}, "foot_R": {"r": (-20, 0, 0)},
        "thigh_L": {"r": (-75, -4, 0)}, "shin_L": {"r": (100, 0, 0)}, "foot_L": {"r": (-15, 0, 0)},
        "ikR": ik((-0.05, 0.08, 1.92), (0, 0.65, 0.76), (1, 0, 0), pole=(-1, 0.3, 0.3)),
        "ikL": follow(0.12, pole=(1, 0.3, 0.3))})
    air2 = merge(air, {"root": {"l": (0, 0, 1.3)}, "spine": {"r": (-6, 0, 0)}})
    land = merge(smash, {"root": {"l": (0, 0, 0.0)}, "hips": {"l": (0, 0, -0.26)}})
    an.keyposes("GS_Leap", [(0, idle), (7, crouch), (14, air), (17, air2), (21, land),
                            (25, land), (30, idle)],
                ["smooth", "out", "linear", "in3", "linear", "smooth"])


# ===========================================================================
# Spear (left hand forward on the shaft)
# ===========================================================================
def spear(an):
    def hold(grip, blade, chest_z=0.0, spine_x=6, bend=14, drop=0.0, lf=-0.38, edge=(1, 0, 0),
             poleR=(-0.5, 0.5, -0.7), poleL=(0.6, 0.0, -0.8), back=10):
        s = merge(legs(bend, 7, back=back), cape(), {
            "spine": {"r": (spine_x, 0, chest_z * 0.45)}, "chest": {"r": (2, 0, chest_z * 0.55)},
            "head": {"r": (-4, 0, -chest_z * 0.7)},
            "ikR": ik(grip, blade, edge, pole=poleR), "ikL": follow(lf, pole=poleL)})
        if drop:
            s["hips"]["l"] = (0, 0, s["hips"]["l"][2] - drop)
        return s
    idle = hold((-0.24, 0.02, 1.0), (0.18, -0.8, 0.55), chest_z=-12)
    an.loop("SP_Idle", 60, lambda ph: breathe(idle, ph, grips=("ikR",)))

    def run(ph):
        a = TAU * ph
        s = run_lower(ph, lean=14)
        s["ikR"] = ik((-0.24, 0.04, 0.98 + 0.025 * math.cos(2 * a)), (0.2, -0.85, 0.48),
                      pole=(-0.5, 0.5, -0.7))
        s["ikL"] = follow(-0.38, pole=(0.6, 0.0, -0.8))
        return s
    an.loop("SP_Run", 21, run)
    back = hold((-0.22, 0.18, 1.1), (0.08, -1, 0.1), chest_z=-22, spine_x=2, bend=16)
    thrust = hold((-0.08, -0.58, 1.16), (0.02, -1, 0.03), chest_z=14, spine_x=14, bend=24,
                  drop=0.04, back=18)
    an.keyposes("SP_Attack1", [(0, idle), (4, back), (7, thrust), (9, thrust), (14, idle)],
                ["smooth", "in3", "linear", "smooth"])
    sw0 = hold((-0.34, 0.02, 1.1), (-0.8, -0.6, 0.05), chest_z=-36, edge=(0.6, -0.8, 0),
               lf=-0.3)
    sw1 = hold((-0.05, -0.42, 1.1), (0.2, -1, 0.0), chest_z=0, edge=(1, 0.2, 0), lf=-0.3,
               bend=20)
    sw2 = hold((0.26, -0.16, 1.1), (0.95, -0.3, 0.0), chest_z=36, edge=(0.3, 0.95, 0), lf=-0.3,
               bend=20, poleR=(0.0, 0.4, -1))
    an.keyposes("SP_Attack2", [(0, idle), (4, sw0), (7, sw1), (10, sw2), (15, idle)],
                ["smooth", "in", "out", "smooth"])
    hug = hold((-0.2, 0.05, 1.12), (0.1, -1, 0.1), chest_z=0, bend=18)
    s0 = merge(idle, {"root": {"r": (0, 0, 0)}})
    s1 = merge(hug, {"root": {"r": (0, 0, 200)}})
    s2 = merge(hug, {"root": {"r": (0, 0, 360)}})
    s3 = merge(thrust, {"root": {"r": (0, 0, 360)}})
    s4 = merge(idle, {"root": {"r": (0, 0, 360)}})
    an.keyposes("SP_Attack3", [(0, s0), (6, s1), (10, s2), (13, s3), (16, s3), (21, s4)],
                ["in", "out", "in3", "linear", "smooth"])
    lunge = merge(cape(-8, -6), {
        "hips": {"l": (0, 0, -0.26)}, "spine": {"r": (24, 0, 10)}, "chest": {"r": (6, 0, 8)},
        "head": {"r": (-22, 0, -14)},
        "thigh_L": {"r": (-62, -6, 0)}, "shin_L": {"r": (72, 0, 0)}, "foot_L": {"r": (-10, 6, 0)},
        "thigh_R": {"r": (38, 8, 0)}, "shin_R": {"r": (30, 0, 0)}, "foot_R": {"r": (-40, -6, 0)},
        "ikR": ik((-0.06, -0.78, 0.98), (0.0, -1, 0.04), pole=(-0.5, 0.5, -0.7)),
        "ikL": follow(-0.38, pole=(0.6, 0.0, -0.8))})
    an.keyposes("SP_Lunge", [(0, idle), (4, back), (7, lunge), (11, lunge), (15, idle)],
                ["smooth", "in3", "linear", "smooth"])

    def twirl(ph):
        a = TAU * ph
        s = merge(legs(14, 8), cape(10, 6), {
            "spine": {"r": (4, 0, 0)}, "chest": {"r": (-2, 0, 0)}, "head": {"r": (-6, 0, 0)},
            "ikR": ik((-0.08, -0.42, 1.28), rot=hand_rot((math.cos(a), -0.12, math.sin(a)),
                                                          (0, -1, 0)),
                      pole=(-0.6, 0.2, -0.7)),
            "ikL": ik((0.42, -0.12, 1.15), pole=(0.6, 0.3, -0.6))})
        return s
    an.loop("SP_Twirl", 18, twirl)

    def jab(ph):
        k = 0.5 - 0.5 * math.cos(TAU * ph)
        g = (-0.16 + 0.06 * k, -0.18 - 0.34 * k, 1.12 + 0.02 * k)
        return hold(g, (0.03, -1, 0.04), chest_z=-10 + 18 * k, spine_x=8 + 4 * k, bend=18,
                    back=14)
    an.loop("SP_Jab", 8, jab)

    # --- Heuksal (Silkroad) skill moves ---
    # Ghost Spear: backswing, full 360 flat spin with the spear held out at waist height, overhead twirl, recover
    wind = hold((-0.32, 0.12, 1.08), (-0.85, 0.5, 0.05), chest_z=-40, edge=(0, 1, 0), lf=-0.3, bend=18)
    ext = hold((-0.12, -0.46, 1.05), (-0.25, -1, 0.0), chest_z=4, bend=24, edge=(1, 0, 0), lf=-0.3, drop=0.06)
    over = hold((-0.1, -0.2, 1.62), (0.9, -0.2, 0.25), chest_z=0, spine_x=-4, bend=10, edge=(0, 0, 1), lf=-0.25)
    an.keyposes("SP_Spin", [(0, merge(idle, {"root": {"r": (0, 0, 0)}})),
                            (5, merge(wind, {"root": {"r": (0, 0, 0)}})),
                            (9, merge(ext, {"root": {"r": (0, 0, 170)}})),
                            (13, merge(ext, {"root": {"r": (0, 0, 360)}})),
                            (20, merge(over, {"root": {"r": (0, 0, 360)}})),
                            (28, merge(idle, {"root": {"r": (0, 0, 360)}}))],
                ["smooth", "in", "out", "smooth", "smooth"])
    # Soul Spear: crouch, leap with the spear overhead, slam (spear ends flat on the ground), hold, recover
    crouch = hold((-0.24, 0.16, 0.86), (0.1, -0.9, -0.1), chest_z=-10, spine_x=18, bend=40, drop=0.2, back=16)
    air = hold((-0.12, -0.02, 1.78), (0.0, 0.45, 0.9), chest_z=0, spine_x=-10, bend=30, lf=-0.3)
    air["hips"]["l"] = (0, 0, air["hips"]["l"][2] + 0.55)
    slam = hold((-0.08, -0.62, 0.62), (0.0, -0.9, -0.42), chest_z=8, spine_x=34, bend=44, drop=0.26, back=20,
                lf=-0.32)
    an.keyposes("SP_LeapSlam", [(0, idle), (4, crouch), (9, air), (13, air), (16, slam), (26, slam), (34, idle)],
                ["smooth", "out", "linear", "in3", "linear", "smooth"])
    # Flying Dragon: spear cocked over the shoulder, hurled javelin-style, arm extended, recover
    cock = hold((-0.3, 0.26, 1.55), (0.04, -1, 0.18), chest_z=-30, spine_x=-6, bend=12, lf=-0.2,
                poleR=(-0.8, 0.4, -0.2))
    hurl = hold((-0.1, -0.62, 1.38), (0.0, -1, -0.04), chest_z=20, spine_x=18, bend=24, lf=-0.2, back=18)
    an.keyposes("SP_Throw", [(0, idle), (6, cock), (9, hurl), (16, hurl), (30, idle)],
                ["smooth", "in3", "linear", "smooth"])
    # overhead vertical chop
    raise_ = hold((-0.12, 0.02, 1.7), (0.0, 0.45, 0.9), chest_z=-6, spine_x=-8, bend=12, lf=-0.3)
    chop = hold((-0.08, -0.6, 1.0), (0.0, -0.85, -0.5), chest_z=6, spine_x=26, bend=26, drop=0.05, lf=-0.3)
    an.keyposes("SP_Chop", [(0, idle), (6, raise_), (10, chop), (14, chop), (20, idle)],
                ["smooth", "in3", "linear", "smooth"])


# ===========================================================================
# Bow (bow in bow_socket on the LEFT hand; right hand draws)
# ===========================================================================
BOW_UPRIGHT = hand_rot((0, 0, 1), (1, 0, 0))   # bow_socket == armature axes: bow face forward


def bow(an):
    idle = merge(legs(10, 6), cape(), {
        "spine": {"r": (3, 0, 0)}, "head": {"r": (-3, 0, -4)},
        "ikL": ik((0.27, -0.14, 0.95), rot=hand_rot((0.12, -0.35, 0.93), (1, 0, 0)),
                  pole=(0.5, 0.6, -0.6)),
        "ikR": ik((-0.27, -0.06, 0.94), pole=(-0.5, 0.6, -0.6))})
    an.loop("BW_Idle", 60, lambda ph: breathe(idle, ph))

    def run(ph):
        a = TAU * ph
        s = run_lower(ph, lean=14)
        s["ikL"] = ik((0.28, -0.12 - 0.08 * math.sin(a), 0.98 + 0.03 * math.cos(2 * a)),
                      rot=hand_rot((0.1, -0.45, 0.89), (1, 0, 0)), pole=(0.5, 0.6, -0.6))
        s["upper_arm_R"] = {"r": (40 * math.sin(a), 10, 0)}
        s["forearm_R"] = {"r": (-55 + 15 * math.sin(a), 0, 0)}
        return s
    an.loop("BW_Run", 21, run)

    def aim(draw=1.0, up=0.0, chest_z=-48.0):
        """draw 0..1 (string pulled to the cheek), up = aim elevation in degrees."""
        e = math.radians(up)
        d = (0, -math.cos(e), math.sin(e))                 # aim direction
        limb = (0, math.sin(e), math.cos(e))               # bow limbs perpendicular to aim
        sh = (0.13, -0.15, 1.43)
        grip = (0.06, sh[1] + d[1] * 0.47, sh[2] + d[2] * 0.47 - 0.04)
        cheek = (-0.05, -0.04 + 0.05 * math.sin(e), 1.52 + 0.08 * math.sin(e))
        open_ = (-0.02, grip[1] + 0.2, grip[2] + 0.05)
        rh = tuple(o + (c - o) * draw for o, c in zip(open_, cheek))
        return merge(legs(8, 11), cape(), {
            "spine": {"r": (-up * 0.25, 0, chest_z * 0.35)},
            "chest": {"r": (-up * 0.2, 0, chest_z * 0.65)},
            "neck": {"r": (0, 0, -chest_z * 0.45)}, "head": {"r": (-up * 0.3, 0, -chest_z * 0.5)},
            "ikL": ik(grip, rot=hand_rot(limb, (1, 0, 0)), pole=(0.6, 0.3, -0.6)),
            "ikR": ik(rh, pole=(-0.3, 1.0, 0.25))})
    raised = aim(0.0)
    full = aim(1.0)
    release = merge(aim(1.0), {"ikR": ik((-0.16, 0.14, 1.56), pole=(-0.3, 1.0, 0.3))})
    g = release["ikL"]["grip"]
    release["ikL"]["grip"] = (g[0], g[1] - 0.03, g[2] + 0.015)
    an.keyposes("BW_Shoot", [(0, idle), (5, raised), (9, full), (10, release), (16, idle)],
                ["smooth", "smooth", "out", "smooth"])

    def aim_loop(ph):
        b = math.sin(TAU * ph)
        s = aim(1.0)
        add_r(s, "chest", (0.8 * b, 0, 0.5 * b))
        hl = s["hips"]["l"]
        s["hips"]["l"] = (hl[0], hl[1], hl[2] + 0.004 * b)
        return s
    an.loop("BW_Aim", 30, aim_loop)
    up_r = aim(0.0, 60)
    up_f = aim(1.0, 60)
    up_rel = merge(up_f, {"ikR": ik((-0.16, 0.16, 1.66), pole=(-0.3, 1.0, 0.4))})
    an.keyposes("BW_Up", [(0, idle), (6, up_r), (11, up_f), (13, up_f), (14, up_rel), (21, idle)],
                ["smooth", "smooth", "linear", "out", "smooth"])
    tuck = {"thigh_R": {"r": (-85, 4, 0)}, "shin_R": {"r": (110, 0, 0)},
            "thigh_L": {"r": (-90, -4, 0)}, "shin_L": {"r": (115, 0, 0)},
            "spine": {"r": (20, 0, 0)}, "head": {"r": (10, 0, 0)}}
    crouch = merge(legs(30, 6), {"hips": {"l": (0, 0, -0.18)}, "spine": {"r": (10, 0, 0)}},
                   {k: idle[k] for k in ("ikL", "ikR")})
    f1 = merge(tuck, cape(-20, -10), {"root": {"l": (0, 0, 0.75)}, "hips": {"r": (-150, 0, 0)},
                                      "ikL": idle["ikL"], "ikR": idle["ikR"]})
    f2 = merge(tuck, cape(-20, -10), {"root": {"l": (0, 0, 0.6)}, "hips": {"r": (-300, 0, 0)},
                                      "ikL": idle["ikL"], "ikR": idle["ikR"]})
    land = merge(legs(26, 7), {"hips": {"l": (0, 0, -0.14), "r": (-360, 0, 0)},
                               "ikL": idle["ikL"], "ikR": idle["ikR"]})
    end = merge(idle, {"hips": {"r": (-360, 0, 0), "l": idle["hips"]["l"]}})
    an.keyposes("BW_Backflip", [(0, merge(idle, {"hips": {"r": (0, 0, 0), "l": idle["hips"]["l"]}})),
                                (3, crouch), (7, f1), (10, f2), (12, land), (15, end)],
                ["smooth", "out", "linear", "in", "smooth"])


# ===========================================================================
# Staff (wizard)
# ===========================================================================
def staff(an):
    idle = merge(legs(8, 6), cape(), {
        "spine": {"r": (2, 0, 0)}, "head": {"r": (-3, 0, -4)},
        "ikR": ik((-0.28, -0.14, 1.02), (0.0, -0.08, 1.0), (1, 0, 0), pole=(-0.6, 0.5, -0.6)),
        "ikL": ik((0.26, -0.1, 0.96), pole=(0.5, 0.6, -0.6))})
    an.loop("ST_Idle", 60, lambda ph: breathe(idle, ph))

    def run(ph):
        a = TAU * ph
        s = run_lower(ph, lean=12)
        s["ikR"] = ik((-0.28, -0.1 + 0.05 * math.sin(a), 1.04 + 0.02 * math.cos(2 * a)),
                      (-0.05, -0.35, 0.94), (1, 0, 0), pole=(-0.6, 0.5, -0.6))
        s["upper_arm_L"] = {"r": (40 * math.sin(a), -10, 0)}
        s["forearm_L"] = {"r": (-55 - 15 * math.sin(a), 0, 0)}
        return s
    an.loop("ST_Run", 21, run)

    def cast(grip, blade, chest_z=0, spine_x=4, bend=10, lgrip=(0.26, -0.1, 0.96),
             poleR=(-0.6, 0.4, -0.6), back=6):
        return merge(legs(bend, 7, back=back), cape(), {
            "spine": {"r": (spine_x, 0, chest_z * 0.45)}, "chest": {"r": (2, 0, chest_z * 0.55)},
            "head": {"r": (-4, 0, -chest_z * 0.6)},
            "ikR": ik(grip, blade, (1, 0, 0), pole=poleR),
            "ikL": ik(lgrip, pole=(0.6, 0.4, -0.6))})
    pull = cast((-0.26, 0.05, 1.1), (0, 0.2, 1), chest_z=-14)
    thrust = cast((-0.14, -0.52, 1.22), (0.0, -0.88, 0.47), chest_z=12, spine_x=12, bend=20,
                  lgrip=(0.22, -0.46, 1.28), back=14)
    an.keyposes("ST_Attack1", [(0, idle), (4, pull), (7, thrust), (9, thrust), (14, idle)],
                ["smooth", "in3", "linear", "smooth"])
    sw0 = cast((-0.4, -0.08, 1.2), (-0.7, -0.3, 0.65), chest_z=-26, lgrip=(0.3, -0.1, 1.05))
    sw1 = cast((0.16, -0.44, 1.2), (0.7, -0.5, 0.5), chest_z=26, bend=16,
               lgrip=(0.35, 0.05, 1.05), poleR=(0.0, 0.3, -1))
    an.keyposes("ST_Attack2", [(0, idle), (4, sw0), (8, sw1), (10, sw1), (14, idle)],
                ["smooth", "in", "linear", "smooth"])
    lift = cast((-0.16, -0.26, 1.55), (0, -0.05, 1), chest_z=0, spine_x=-6, bend=6,
                lgrip=(0.28, -0.2, 1.3))
    slam = cast((-0.16, -0.34, 0.66), (0, -0.05, 1), chest_z=0, spine_x=24, bend=30,
                lgrip=(0.3, -0.25, 0.85), back=10)
    slam["hips"]["l"] = (0, 0, slam["hips"]["l"][2] - 0.06)
    an.keyposes("ST_Attack3", [(0, idle), (8, lift), (12, slam), (15, slam), (20, idle)],
                ["smooth", "in3", "linear", "smooth"])

    def channel(ph):
        b = math.sin(TAU * ph)
        s = merge(legs(4, 7), cape(8 + 2 * b, 6 + 3 * b), {
            "hips": {"l": (0, 0, 0.01 * b)},
            "spine": {"r": (-8, 0, 0)}, "chest": {"r": (-8 + 1.5 * b, 0, 0)},
            "neck": {"r": (-6, 0, 0)}, "head": {"r": (-14 - 2 * b, 0, 0)},
            "ikR": ik((-0.14, -0.1, 1.98 + 0.015 * b), (0, -0.05, 1), (1, 0, 0),
                      pole=(-1, 0.2, 0.0)),
            "ikL": ik((0.3, -0.16, 1.92 + 0.02 * b), pole=(1, 0.3, 0.0))})
        return s
    an.loop("ST_Channel", 30, channel)
    point = cast((-0.12, -0.5, 1.32), (0.0, -1, 0.1), chest_z=8, spine_x=8, bend=12,
                 lgrip=(0.3, -0.05, 1.05), back=10)
    an.keyposes("ST_Point", [(0, idle), (5, point), (10, point), (15, idle)],
                ["out", "linear", "smooth"])

    # Silkroad-style casting: staff held out in front while the circle charges,
    # snapped upright on release, then pointed at the target.
    charge = cast((-0.12, -0.44, 1.24), (0.0, -0.82, 0.57), chest_z=6, spine_x=6, bend=12,
                  lgrip=(0.1, -0.4, 1.18), back=8)

    def charge_loop(ph):
        b = math.sin(TAU * ph)
        s = merge(charge, cape(4 + 2 * b, 4 + 2 * b))
        s["ikR"] = ik((-0.12, -0.44, 1.24 + 0.012 * b), (0.0, -0.82, 0.57 + 0.03 * b), (1, 0, 0),
                      pole=(-0.6, 0.4, -0.6))
        return s
    an.loop("ST_Charge", 30, charge_loop)
    upright = cast((-0.1, -0.34, 1.38), (0.0, -0.06, 1), chest_z=2, spine_x=-2, bend=8,
                   lgrip=(0.26, -0.16, 1.12), back=6)
    an.keyposes("ST_Release", [(0, charge), (3, upright), (9, upright), (13, point), (22, point), (30, idle)],
                ["out", "linear", "in", "linear", "smooth"])
    an.keyposes("ST_Raise", [(0, idle), (5, upright), (40, upright), (48, idle)],
                ["out", "linear", "smooth"])


def class_anims(rig, solver):
    an = hero_animator(rig, solver)
    sword_shield(an)
    greatsword(an)
    spear(an)
    bow(an)
    staff(an)
