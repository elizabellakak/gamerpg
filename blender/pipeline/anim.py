"""Pose solver + animation sampler.

A *pose spec* is a dict:
    bone_name -> {'r': (rx, ry, rz) degrees, 'l': (x, y, z) meters, 's': scale}
        rotations/locations are deltas expressed in ARMATURE axes (X = character's left,
        -Y = forward, Z = up), applied about the bone head and inherited by children.
    'ikR' / 'ikL' -> {'grip': (x,y,z), 'rot': Quaternion, 'pole': (x,y,z)}
        two-bone IK for an arm chain, targets in ROOT space (they follow the root bone).
        'rot' orients the hand so the weapon socket frame is rotated by it (see hand_rot()).
        ikL may instead be {'follow': offset} = hold the same handle as the right hand,
        `offset` meters further down the handle.

Animations are sampled every frame from interpolated specs (so IK targets travel along
straight lines / arcs instead of joint-angle interpolation) and written as full-pose keys.
"""
import math

from mathutils import Matrix, Quaternion, Vector

from .core import basis

SOCKET_REST = basis(x=(0, 0, 1), z=(0, -1, 0)).to_3x3()   # weapon socket rest orientation


def hand_rot(blade, edge):
    """Quaternion rotating the socket rest frame so the blade (+Z of socket) points along
    `blade` and the blade's width axis (+X of socket) along `edge` (orthogonalized)."""
    b = Vector(blade).normalized()
    e = Vector(edge)
    e = (e - b * e.dot(b))
    if e.length < 1e-4:
        e = Vector((0, 0, 1)) if abs(b.z) < 0.9 else Vector((0, 1, 0))
        e = e - b * e.dot(b)
    e.normalize()
    F = basis(x=e, z=b).to_3x3()
    return (F @ SOCKET_REST.transposed()).to_quaternion()


def _frame(a, b):
    a = Vector(a).normalized()
    b = Vector(b)
    b = (b - a * b.dot(a))
    if b.length < 1e-6:
        b = Vector((0, 0, 1)) if abs(a.z) < 0.9 else Vector((0, 1, 0))
        b = b - a * b.dot(a)
    b.normalize()
    c = a.cross(b)
    return Matrix((a, b, c)).transposed()


def frame_map(a1, b1, a2, b2):
    return _frame(a2, b2) @ _frame(a1, b1).transposed()


def _euler_m(r):
    from mathutils import Euler
    return Euler([math.radians(x) for x in r], "XYZ").to_matrix()


class Solver:
    def __init__(self, rig, chains=None, sockets=None):
        """chains: {'R': (upper, fore, hand), 'L': (...)}; sockets: {'R': Vector grip rest pos}"""
        self.rig = rig
        arm = rig.arm
        self.order = list(rig.names)
        self.parent = {}
        self.head = {}
        self.tail = {}
        for b in arm.data.bones:
            self.parent[b.name] = b.parent.name if b.parent else None
            self.head[b.name] = b.head_local.copy()
            self.tail[b.name] = b.tail_local.copy()
        self.rest = rig.rest
        self.chains = chains or {}
        self.sockets = sockets or {}
        self.upper_of = {v[0]: k for k, v in self.chains.items()}

    def _ik(self, side, ik, W, H, absolute, spec):
        upper, fore, hand = self.chains[side]
        Wr = W.get("root", Matrix.Identity(3))
        Hr = H.get("root", Vector())
        if "follow" in ik:
            ikR = spec["ikR"]
            q = ikR["rot"]
            blade = q.to_matrix() @ (SOCKET_REST @ Vector((0, 0, 1)))
            grip = Vector(ikR["grip"]) - blade * ik["follow"]
            rot = q
            pole = Vector(ik.get("pole", (0.6, 0.3, -0.6)))
        else:
            grip = Vector(ik["grip"])
            rot = ik.get("rot")
            pole = Vector(ik.get("pole", (0, 0.5, -0.5)))
        grip_w = Hr + Wr @ grip
        sock = self.sockets.get(side)
        if rot is not None:
            Rh = Wr @ rot.to_matrix()
            wrist = grip_w - Rh @ (sock - self.head[hand])
        else:
            Rh = None
            wrist = grip_w
        S = H[upper]
        a = (self.tail[upper] - self.head[upper]).length
        b = (self.tail[fore] - self.head[fore]).length
        d_vec = wrist - S
        d = max(abs(a - b) + 1e-3, min(a + b - 1e-3, d_vec.length))
        u = d_vec.normalized()
        v = Wr @ pole   # pole = elbow direction (root space)
        v = v - u * v.dot(u)
        if v.length < 1e-6:
            v = Vector((0, 1, 0)) - u * u.y
        v.normalize()
        cos_a = (a * a + d * d - b * b) / (2 * a * d)
        sin_a = math.sqrt(max(0.0, 1 - cos_a * cos_a))
        E = S + u * (cos_a * a) + v * (sin_a * a)
        T = S + u * d
        rest_pole = Vector((0, 1, 0))
        absolute[upper] = frame_map(self.tail[upper] - self.head[upper], rest_pole, E - S, v)
        absolute[fore] = frame_map(self.tail[fore] - self.head[fore], rest_pole, T - E, v)
        if Rh is not None:
            absolute[hand] = Rh
        else:
            absolute[hand] = absolute[fore] @ Matrix.Identity(3)

    def solve(self, spec):
        W, H, out, absolute = {}, {}, {}, {}
        for bn in self.order:
            p = self.parent[bn]
            sb = spec.get(bn, {})
            l = Vector(sb.get("l", (0, 0, 0)))
            if p is None:
                Wp = Matrix.Identity(3)
                H[bn] = self.head[bn] + l
            else:
                Wp = W[p]
                H[bn] = H[p] + Wp @ (self.head[bn] - self.head[p]) + Wp @ l
            if bn in self.upper_of:
                side = self.upper_of[bn]
                ik = spec.get("ik" + side)
                if ik:
                    self._ik(side, ik, W, H, absolute, spec)
            if bn in absolute:
                D = Wp.inverted() @ absolute[bn]
            else:
                D = _euler_m(sb.get("r", (0, 0, 0)))
            W[bn] = Wp @ D
            B = self.rest[bn]
            q = (B.inverted() @ D @ B).to_quaternion()
            s = sb.get("s", (1, 1, 1))
            if isinstance(s, (int, float)):
                s = (s, s, s)
            out[bn] = (q, B.inverted() @ l, Vector(s))
        return out


# ---------------------------------------------------------------------------
# spec interpolation
# ---------------------------------------------------------------------------

def _lerp(a, b, t):
    return tuple(x + (y - x) * t for x, y in zip(a, b))


def lerp_spec(A, B, t):
    out = {}
    for k in set(A) | set(B):
        a = A.get(k)
        b = B.get(k)
        if k.startswith("ik"):
            if a is None or b is None:
                out[k] = a or b
                continue
            if "follow" in a or "follow" in b:
                out[k] = a if t < 0.5 else b
                if "follow" in a and "follow" in b:
                    out[k] = {"follow": a["follow"] + (b["follow"] - a["follow"]) * t}
                continue
            o = {"grip": _lerp(a["grip"], b["grip"], t),
                 "pole": _lerp(a.get("pole", (0, 0.5, -0.5)), b.get("pole", (0, 0.5, -0.5)), t)}
            ra, rb = a.get("rot"), b.get("rot")
            if ra is not None and rb is not None:
                o["rot"] = ra.slerp(rb, t)
            else:
                o["rot"] = ra or rb
            out[k] = o
            continue
        a = a or {}
        b = b or {}
        o = {}
        for key, dflt in (("r", (0, 0, 0)), ("l", (0, 0, 0)), ("s", (1, 1, 1))):
            if key in a or key in b:
                va = a.get(key, dflt)
                vb = b.get(key, dflt)
                if isinstance(va, (int, float)):
                    va = (va, va, va)
                if isinstance(vb, (int, float)):
                    vb = (vb, vb, vb)
                o[key] = _lerp(va, vb, t)
        out[k] = o
    return out


def ease(kind, t):
    t = max(0.0, min(1.0, t))
    if kind == "linear":
        return t
    if kind == "in":
        return t * t
    if kind == "out":
        return 1 - (1 - t) * (1 - t)
    if kind == "in3":
        return t * t * t
    if kind == "out3":
        return 1 - (1 - t) ** 3
    return t * t * (3 - 2 * t)


def merge(*specs):
    """Overlay specs (later wins per bone/key)."""
    out = {}
    for s in specs:
        for k, v in s.items():
            if k.startswith("ik"):
                out[k] = dict(v)
            else:
                d = dict(out.get(k, {}))
                d.update(v)
                out[k] = d
    return out


def add_r(spec, bone, r):
    """Add a rotation delta (component-wise) to a spec in place."""
    d = spec.setdefault(bone, {})
    cur = d.get("r", (0, 0, 0))
    d["r"] = tuple(a + b for a, b in zip(cur, r))
    return spec


class Animator:
    def __init__(self, rig, solver, loc_bones=None, scale_bones=None):
        """loc_bones / scale_bones: optional sets restricting which bones get location / scale
        keys (None = all). Rotation is always keyed for every bone."""
        self.rig = rig
        self.solver = solver
        self.loc_bones = loc_bones
        self.scale_bones = scale_bones

    def _key(self, f, solved, prevq):
        for pb in self.rig.arm.pose.bones:
            q, l, s = solved[pb.name]
            q = q.copy()
            pq = prevq.get(pb.name)
            if pq is not None and q.dot(pq) < 0:
                q.negate()
            prevq[pb.name] = q
            pb.rotation_quaternion = q
            pb.location = l
            pb.scale = s
            pb.keyframe_insert("rotation_quaternion", frame=f, group=pb.name)
            if self.loc_bones is None or pb.name in self.loc_bones:
                pb.keyframe_insert("location", frame=f, group=pb.name)
            if self.scale_bones is None or pb.name in self.scale_bones:
                pb.keyframe_insert("scale", frame=f, group=pb.name)

    def sampled(self, name, frames, fn):
        """fn(frame_index, t01) -> spec. Keys every frame 0..frames inclusive."""
        act = self.rig._begin(name)
        prevq = {}
        for f in range(frames + 1):
            spec = fn(f, f / float(frames))
            self._key(f, self.solver.solve(spec), prevq)
        self.rig._end(act, name, 0, frames)
        for fc in _fcurves(act):
            for kp in fc.keyframe_points:
                kp.interpolation = "LINEAR"
        return act

    def keyposes(self, name, keys, eases=None, frames=None):
        """keys: [(frame, spec)], eases: list of ease kinds per segment (default smooth)."""
        frames = frames if frames is not None else keys[-1][0]
        eases = eases or ["smooth"] * (len(keys) - 1)

        def fn(f, _t):
            if f <= keys[0][0]:
                return keys[0][1]
            for i in range(len(keys) - 1):
                f0, s0 = keys[i]
                f1, s1 = keys[i + 1]
                if f0 <= f <= f1:
                    t = (f - f0) / float(max(1, f1 - f0))
                    return lerp_spec(s0, s1, ease(eases[i], t))
            return keys[-1][1]
        return self.sampled(name, frames, fn)

    def loop(self, name, frames, fn):
        """fn(phase in [0,1)) -> spec; phase 1 == phase 0 so loops are seamless."""
        return self.sampled(name, frames, lambda f, t: fn(t % 1.0 if f < frames else 0.0))


def _fcurves(act):
    try:
        return list(act.fcurves)
    except Exception:
        pass
    out = []
    try:
        for layer in act.layers:
            for strip in layer.strips:
                for cb in strip.channelbags:
                    out.extend(cb.fcurves)
    except Exception:
        pass
    return out
