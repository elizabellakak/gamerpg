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
    guard_L = ik((0.02, -0.34, 1.2), pole=(0.15, 0.1, -1.0))
    idle = merge(legs(14, 6, back=4), cape(), {
        "spine": {"r": (5, 0, 4)}, "chest": {"r": (2, 0, 6)}, "head": {"r": (-4, 0, -8)},
        "ikR": ik((-0.3, -0.18, 1.05), (0.1, -0.55, 0.83), pole=(-0.5, 0.5, -0.7)),
        "ikL": guard_L})
    an.loop("SS_Idle", 60, lambda ph: breathe(idle, ph))

    def run(ph):
        a = TAU * ph
        s = run_lower(ph, lean=12)
        s["ikL"] = ik((0.04, -0.3, 1.18 + 0.02 * math.cos(2 * a)), pole=(0.15, 0.1, -1.0))
        s["ikR"] = ik((-0.3, -0.05 + 0.08 * math.sin(a), 1.0 + 0.02 * math.cos(2 * a)),
                      (-0.2, -0.45, 0.87), pole=(-0.6, 0.4, -0.6))
        return s
    an.loop("SS_Run", 21, run)
    wind = merge(idle, {"spine": {"r": (2, 0, 14)}, "chest": {"r": (0, 0, 18)},
                        "ikL": ik((0.14, -0.14, 1.2), pole=(0.15, 0.1, -1.0))})
    bash = merge(legs(24, 7, back=12), cape(-6, -4), {
        "hips": {"l": (0, 0, -0.08)}, "spine": {"r": (16, 0, -10)}, "chest": {"r": (6, 0, -16)},
        "head": {"r": (-14, 0, 14)},
        "ikR": ik((-0.32, 0.02, 1.05), (-0.2, -0.3, 0.93), pole=(-0.5, 0.5, -0.7)),
        "ikL": ik((-0.02, -0.62, 1.24), pole=(0.15, 0.1, -1.0))})
    an.keyposes("SS_Bash", [(0, idle), (5, wind), (8, bash), (10, bash), (15, idle)],
                ["smooth", "in3", "linear", "smooth"])
    brace = merge(legs(32, 8, back=10), cape(-4, -2), {
        "hips": {"l": (0, 0, -0.12)}, "spine": {"r": (18, 0, 2)}, "chest": {"r": (6, 0, 4)},
        "head": {"r": (-6, 0, -4)},
        "ikR": ik((-0.3, 0.06, 1.0), (-0.1, -0.4, 0.9), pole=(-0.5, 0.5, -0.7)),
        "ikL": ik((0.0, -0.36, 1.3), pole=(0.15, 0.05, -1.0))})
    brace2 = merge(brace, {"hips": {"l": (0, 0, -0.13)}, "spine": {"r": (19, 0, 2)}})
    an.keyposes("SS_Block", [(0, idle), (4, brace), (13, brace2), (18, idle)],
                ["out", "smooth", "smooth"])


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


def class_anims(rig, solver):
    an = hero_animator(rig, solver)
    sword_shield(an)
    greatsword(an)
    spear(an)
    bow(an)
    staff(an)
