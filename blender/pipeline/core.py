"""Core helpers for the procedural asset pipeline.

Everything here works in a fresh, empty Blender scene (bpy as a Python module).
Conventions: meters, Z up, characters face -Y (=> +Z in three.js after glTF export).
"""
import math
import os

import bmesh
import bpy
from mathutils import Euler, Matrix, Quaternion, Vector

FPS = 30
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "public", "assets")


# ---------------------------------------------------------------------------
# scene
# ---------------------------------------------------------------------------
def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.fps = FPS
    sc.frame_start = 0
    sc.frame_end = 60
    _MAT_CACHE.clear()
    return sc


def link(obj):
    bpy.context.scene.collection.objects.link(obj)
    return obj


def empty(name, loc=(0, 0, 0), rot=(0, 0, 0), size=0.1, parent=None):
    e = bpy.data.objects.new(name, None)
    e.empty_display_size = size
    e.empty_display_type = "ARROWS"
    link(e)
    e.matrix_world = xform(loc, rot)
    if parent is not None:
        mw = e.matrix_world.copy()
        e.parent = parent
        e.matrix_world = mw
    return e


def xform(loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1)):
    """Matrix from location, XYZ euler in DEGREES, scale."""
    if isinstance(scale, (int, float)):
        scale = (scale, scale, scale)
    R = Euler([math.radians(a) for a in rot], "XYZ").to_matrix().to_4x4()
    S = Matrix.Diagonal((scale[0], scale[1], scale[2], 1.0))
    return Matrix.Translation(Vector(loc)) @ R @ S


def basis(x=None, y=None, z=None, loc=(0, 0, 0)):
    """Rotation matrix from two given axis vectors (the third is derived)."""
    if z is not None and x is not None:
        z = Vector(z).normalized()
        y = z.cross(Vector(x)).normalized()
        x = y.cross(z)
    elif z is not None and y is not None:
        z = Vector(z).normalized()
        x = Vector(y).cross(z).normalized()
        y = z.cross(x)
    elif x is not None and y is not None:
        x = Vector(x).normalized()
        z = x.cross(Vector(y)).normalized()
        y = z.cross(x)
    else:
        raise ValueError("need two axes")
    M = Matrix((x, y, z)).transposed().to_4x4()
    M.translation = Vector(loc)
    return M


# ---------------------------------------------------------------------------
# materials
# ---------------------------------------------------------------------------
_MAT_CACHE = {}


def srgb(c):
    """hex string or sRGB tuple -> linear RGB tuple"""
    if isinstance(c, str):
        c = c.lstrip("#")
        c = tuple(int(c[i:i + 2], 16) / 255.0 for i in (0, 2, 4))

    def f(x):
        return x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4

    return tuple(f(x) for x in c[:3])


def material(name, color="#cccccc", metal=0.0, rough=0.5, emit=None, strength=0.0, alpha=1.0):
    m = bpy.data.materials.get(name)
    if m is not None:
        return m
    m = bpy.data.materials.new(name)
    if m.node_tree is None:
        m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    col = srgb(color)
    b.inputs["Base Color"].default_value = (*col, 1.0)
    b.inputs["Metallic"].default_value = metal
    b.inputs["Roughness"].default_value = rough
    if emit is not None and strength > 0:
        b.inputs["Emission Color"].default_value = (*srgb(emit), 1.0)
        b.inputs["Emission Strength"].default_value = strength
    if alpha < 1.0:
        b.inputs["Alpha"].default_value = alpha
        for attr, val in (("surface_render_method", "BLENDED"), ("blend_method", "BLEND")):
            try:
                setattr(m, attr, val)
            except Exception:
                pass
    m.diffuse_color = (*col, alpha)
    m.metallic = metal
    m.roughness = rough
    return m


# Shared palette. Keys are material names (exported as-is to glTF).
PALETTE = {
    # metals
    "steel": dict(color="#b9c2cc", metal=1.0, rough=0.3),
    "steel_dark": dict(color="#6c7682", metal=1.0, rough=0.35),
    "iron": dict(color="#8a8f96", metal=1.0, rough=0.42),
    "blue_steel": dict(color="#8fa9d6", metal=1.0, rough=0.28),
    "gold": dict(color="#e8b04a", metal=1.0, rough=0.28),
    "gold_pale": dict(color="#f3dca0", metal=1.0, rough=0.25),
    "bronze": dict(color="#b8763a", metal=1.0, rough=0.36),
    "silver": dict(color="#e4e8ee", metal=1.0, rough=0.22),
    "black_metal": dict(color="#2a2a30", metal=1.0, rough=0.38),
    "obsidian": dict(color="#141218", metal=0.6, rough=0.18),
    # cloth / organic
    "navy": dict(color="#1d2a4f", rough=0.8),
    "navy_dark": dict(color="#121a33", rough=0.85),
    "crimson_cloth": dict(color="#8a1626", rough=0.8),
    "white_cloth": dict(color="#f1efe9", rough=0.8),
    "red_cloth": dict(color="#c8202c", rough=0.75),
    "leather": dict(color="#5a3a22", rough=0.7),
    "leather_dark": dict(color="#3a2617", rough=0.75),
    "wood": dict(color="#7a4f2c", rough=0.75),
    "wood_dark": dict(color="#4a2e18", rough=0.8),
    "wood_red": dict(color="#b3261e", rough=0.55),
    "skin": dict(color="#e7b48f", rough=0.6),
    "skin_dark": dict(color="#b47a55", rough=0.6),
    "hair_black": dict(color="#1a1414", rough=0.5),
    "hair_grey": dict(color="#7e7a76", rough=0.7),
    "eye_black": dict(color="#120c0c", rough=0.2),
    "eye_white": dict(color="#f4f4f4", rough=0.3),
    # stone / nature
    "stone": dict(color="#8d8f93", rough=0.85),
    "stone_dark": dict(color="#5e6168", rough=0.9),
    "stone_warm": dict(color="#a89c8a", rough=0.88),
    "moss": dict(color="#4f7a34", rough=0.9),
    "bark": dict(color="#5b3b24", rough=0.9),
    "leaf": dict(color="#4d8a2e", rough=0.8),
    "leaf_dark": dict(color="#2f6626", rough=0.8),
    "pine": dict(color="#2a5a3a", rough=0.85),
    "sakura": dict(color="#f5a9c4", rough=0.7),
    "sakura_light": dict(color="#ffd1e0", rough=0.7),
    "roof_tile": dict(color="#2d3a4f", rough=0.55),
    "plaster": dict(color="#efe6d3", rough=0.85),
    "paper": dict(color="#f6eccc", rough=0.9, emit="#ffcf80", strength=0.6),
    # glows
    "glow_cyan": dict(color="#7ff6ff", emit="#45e8ff", strength=5.0, rough=0.2),
    "glow_warm": dict(color="#ffd080", emit="#ffae42", strength=5.0, rough=0.4),
    "glow_coal": dict(color="#ff6a1a", emit="#ff4a10", strength=6.0, rough=0.6),
    "glow_red": dict(color="#ff3030", emit="#ff1a1a", strength=6.0, rough=0.3),
    "glow_yellow": dict(color="#fff070", emit="#ffd21a", strength=5.0, rough=0.3),
    "glow_visor": dict(color="#9ff8ff", emit="#45e8ff", strength=4.0, rough=0.3),
    "crystal_cyan": dict(color="#6fe7ff", metal=0.0, rough=0.08, emit="#2fd6ff", strength=3.5),
}


def M(name):
    """Get (or create) a palette material."""
    if name in _MAT_CACHE:
        return _MAT_CACHE[name]
    if name in PALETTE:
        m = material(name, **PALETTE[name])
    else:
        m = bpy.data.materials.get(name)
        if m is None:
            raise KeyError("unknown material %s" % name)
    _MAT_CACHE[name] = m
    return m


def glow(name, emit, strength=4.0, color=None, rough=0.3, metal=0.0):
    """Register an emissive material."""
    PALETTE[name] = dict(color=color or emit, emit=emit, strength=strength, rough=rough,
                         metal=metal)
    return name


def define(name, **kw):
    """Register a custom material (e.g. element colored glows) and return its name."""
    PALETTE[name] = kw
    return name


# ---------------------------------------------------------------------------
# mesh builder
# ---------------------------------------------------------------------------
def _bevel(tb, width, seg=2, min_angle=25.0, profile=0.5):
    if width <= 0:
        return
    tb.normal_update()
    th = math.radians(min_angle)
    edges = [e for e in tb.edges if len(e.link_faces) == 2 and e.calc_face_angle(0) > th]
    if not edges:
        return
    bmesh.ops.bevel(tb, geom=edges, offset=width, offset_type="OFFSET", segments=seg,
                    profile=profile, affect="EDGES", clamp_overlap=True)


class Builder:
    """Accumulates many primitive islands into one bmesh with per-face materials."""

    def __init__(self):
        self.bm = bmesh.new()
        self.mats = []

    # -- internals --------------------------------------------------------
    def _mi(self, m):
        if isinstance(m, str):
            m = M(m)
        if m not in self.mats:
            self.mats.append(m)
        return self.mats.index(m)

    def add_bmesh(self, tb, m="steel", matrix=None, smooth=True, angle=40.0, mirror=False,
                  keep_mats=False, flip=False, mats=None):
        """Merge temporary bmesh `tb` into the builder (transformed by matrix).
        mats: optional list mapping tb-local material indices to materials."""
        if mats is not None:
            idxs = [self._mi(mm) for mm in mats]
            for f in tb.faces:
                f.material_index = idxs[min(f.material_index, len(idxs) - 1)]
            keep_mats = True
        if matrix is not None:
            bmesh.ops.transform(tb, matrix=matrix, verts=tb.verts)
        if flip:
            bmesh.ops.reverse_faces(tb, faces=tb.faces)
        tb.normal_update()
        th = math.radians(angle)
        idx = self._mi(m) if not keep_mats else None
        passes = [False, True] if mirror else [False]
        for mir in passes:
            vmap = {}
            for v in tb.verts:
                co = v.co.copy()
                if mir:
                    co.x = -co.x
                vmap[v] = self.bm.verts.new(co)
            for f in tb.faces:
                vs = [vmap[v] for v in f.verts]
                if mir:
                    vs.reverse()
                try:
                    nf = self.bm.faces.new(vs)
                except ValueError:
                    continue
                nf.material_index = idx if idx is not None else f.material_index
                nf.smooth = smooth
            if smooth:
                for e in tb.edges:
                    a, b = vmap[e.verts[0]], vmap[e.verts[1]]
                    ne = self.bm.edges.get((a, b))
                    if ne is None:
                        continue
                    if len(e.link_faces) == 2:
                        ne.smooth = e.calc_face_angle(0) <= th
        tb.free()

    # -- primitives ---------------------------------------------------------
    def box(self, size, loc=(0, 0, 0), rot=(0, 0, 0), m="steel", bevel=0.0, seg=2, taper=None,
            smooth=True, angle=40.0, mirror=False, matrix=None, shift=None):
        """Box of `size` centered at loc. taper=(sx,sy) scales the +Z face.
        shift=(dx,dy) offsets the +Z face (shear)."""
        tb = bmesh.new()
        bmesh.ops.create_cube(tb, size=1.0)
        sx, sy, sz = size
        for v in tb.verts:
            top = v.co.z > 0
            v.co.x *= sx
            v.co.y *= sy
            v.co.z *= sz
            if top and taper:
                v.co.x *= taper[0]
                v.co.y *= taper[1]
            if top and shift:
                v.co.x += shift[0]
                v.co.y += shift[1]
        _bevel(tb, bevel, seg)
        mat = matrix if matrix is not None else xform(loc, rot)
        self.add_bmesh(tb, m, mat, smooth, angle, mirror)

    def cyl(self, r1, r2, depth, loc=(0, 0, 0), rot=(0, 0, 0), m="steel", segs=16, bevel=0.0,
            seg=2, caps=True, smooth=True, angle=40.0, mirror=False, matrix=None, scale=(1, 1, 1)):
        """Cylinder / cone along local Z centered at loc (r1 bottom, r2 top)."""
        tb = bmesh.new()
        bmesh.ops.create_cone(tb, cap_ends=caps, cap_tris=False, segments=segs,
                              radius1=r1, radius2=r2, depth=depth)
        for v in tb.verts:
            v.co.x *= scale[0]
            v.co.y *= scale[1]
            v.co.z *= scale[2]
        _bevel(tb, bevel, seg)
        mat = matrix if matrix is not None else xform(loc, rot)
        self.add_bmesh(tb, m, mat, smooth, angle, mirror)

    def sphere(self, r, loc=(0, 0, 0), rot=(0, 0, 0), m="steel", scale=(1, 1, 1), segs=16,
               rings=10, smooth=True, angle=60.0, mirror=False, matrix=None, ico=0, jitter=0.0,
               seed=0):
        tb = bmesh.new()
        if ico:
            bmesh.ops.create_icosphere(tb, subdivisions=ico, radius=r)
        else:
            bmesh.ops.create_uvsphere(tb, u_segments=segs, v_segments=rings, radius=r)
        if jitter:
            import random
            rnd = random.Random(seed)
            for v in tb.verts:
                v.co *= 1.0 + rnd.uniform(-jitter, jitter)
        for v in tb.verts:
            v.co.x *= scale[0]
            v.co.y *= scale[1]
            v.co.z *= scale[2]
        mat = matrix if matrix is not None else xform(loc, rot)
        self.add_bmesh(tb, m, mat, smooth, angle, mirror)

    def lathe(self, profile, loc=(0, 0, 0), rot=(0, 0, 0), m="steel", segs=16, scale=(1, 1),
              caps=True, smooth=True, angle=40.0, mirror=False, matrix=None, arc=None,
              y_offsets=None):
        """Revolve a profile [(r, z), ...] (bottom->top) around local Z.
        scale=(sx, sy) makes it elliptical. arc=(a0, a1) degrees for a partial revolve
        (open seam, no caps). y_offsets: optional per-profile-point y shift."""
        tb = bmesh.new()
        rings = []
        full = arc is None
        n = segs
        for i, (r, z) in enumerate(profile):
            yo = y_offsets[i] if y_offsets else 0.0
            if r <= 1e-6:
                rings.append([tb.verts.new((0, yo, z))])
                continue
            ring = []
            cnt = n if full else n + 1
            for k in range(cnt):
                if full:
                    a = 2 * math.pi * k / n
                else:
                    a = math.radians(arc[0] + (arc[1] - arc[0]) * k / n)
                ring.append(tb.verts.new((math.cos(a) * r * scale[0],
                                          math.sin(a) * r * scale[1] + yo, z)))
            rings.append(ring)
        for i in range(len(rings) - 1):
            A, B = rings[i], rings[i + 1]
            if len(A) == 1 and len(B) == 1:
                continue
            cnt = n if full else n
            for k in range(cnt):
                k2 = (k + 1) % len(A) if full else k + 1
                if len(A) == 1:
                    vs = [A[0], B[k], B[(k + 1) % len(B) if full else k + 1]]
                elif len(B) == 1:
                    vs = [A[k], A[k2], B[0]]
                else:
                    vs = [A[k], A[k2], B[k2 if full else k + 1], B[k]]
                try:
                    tb.faces.new(vs)
                except ValueError:
                    pass
        if caps and full:
            if len(rings[0]) > 1:
                tb.faces.new(list(reversed(rings[0])))
            if len(rings[-1]) > 1:
                tb.faces.new(rings[-1])
        bmesh.ops.recalc_face_normals(tb, faces=tb.faces) if full else None
        mat = matrix if matrix is not None else xform(loc, rot)
        self.add_bmesh(tb, m, mat, smooth, angle, mirror)

    def sweep(self, pts, radii, m="steel", segs=10, closed=False, caps=True, smooth=True,
              angle=50.0, mirror=False, matrix=None, scale=(1, 1), up=None, twist=0.0):
        """Sweep a circle along a polyline. radii: float or per-point list.
        scale=(sx,sy) flattens the cross-section (sx along the frame normal)."""
        pts = [Vector(p) for p in pts]
        npt = len(pts)
        if isinstance(radii, (int, float)):
            radii = [radii] * npt
        tb = bmesh.new()
        tangents = []
        for i in range(npt):
            if closed:
                t = pts[(i + 1) % npt] - pts[i - 1]
            elif i == 0:
                t = pts[1] - pts[0]
            elif i == npt - 1:
                t = pts[-1] - pts[-2]
            else:
                t = (pts[i + 1] - pts[i]).normalized() + (pts[i] - pts[i - 1]).normalized()
            tangents.append(t.normalized())
        ref = Vector(up) if up is not None else Vector((0, 0, 1))
        if abs(ref.dot(tangents[0])) > 0.95:
            ref = Vector((1, 0, 0)) if abs(tangents[0].x) < 0.9 else Vector((0, 1, 0))
        nrm = tangents[0].cross(ref).cross(tangents[0]).normalized()
        rings = []
        for i in range(npt):
            if i > 0:
                q = tangents[i - 1].rotation_difference(tangents[i])
                nrm = (q @ nrm)
                nrm = (nrm - tangents[i] * nrm.dot(tangents[i])).normalized()
            t = tangents[i]
            n_i = nrm
            if twist:
                n_i = Quaternion(t, math.radians(twist) * i / max(1, npt - 1)) @ nrm
            bn = t.cross(n_i)
            r = radii[i]
            if r <= 1e-6 and not closed:
                rings.append([tb.verts.new(pts[i])])
                continue
            ring = []
            for k in range(segs):
                a = 2 * math.pi * k / segs
                off = n_i * (math.cos(a) * r * scale[0]) + bn * (math.sin(a) * r * scale[1])
                ring.append(tb.verts.new(pts[i] + off))
            rings.append(ring)
        pairs = list(range(npt - 1)) + ([npt - 1] if closed else [])
        for i in pairs:
            A, B = rings[i], rings[(i + 1) % npt]
            for k in range(segs):
                k2 = (k + 1) % segs
                if len(A) == 1:
                    vs = [A[0], B[k], B[k2]]
                elif len(B) == 1:
                    vs = [A[k], A[k2], B[0]]
                else:
                    vs = [A[k], A[k2], B[k2], B[k]]
                try:
                    tb.faces.new(vs)
                except ValueError:
                    pass
        if caps and not closed:
            if len(rings[0]) > 1:
                tb.faces.new(list(reversed(rings[0])))
            if len(rings[-1]) > 1:
                tb.faces.new(rings[-1])
        bmesh.ops.recalc_face_normals(tb, faces=tb.faces)
        self.add_bmesh(tb, m, matrix, smooth, angle, mirror)

    def torus(self, R, r, loc=(0, 0, 0), rot=(0, 0, 0), m="gold", segs=32, rsegs=8, scale=(1, 1),
              smooth=True, mirror=False, matrix=None):
        pts = [(math.cos(2 * math.pi * k / segs) * R, math.sin(2 * math.pi * k / segs) * R, 0)
               for k in range(segs)]
        tb_mat = matrix if matrix is not None else xform(loc, rot)
        pts = [tb_mat @ Vector(p) for p in pts]
        self.sweep(pts, r, m=m, segs=rsegs, closed=True, smooth=smooth, mirror=mirror,
                   scale=scale, up=(tb_mat.to_3x3() @ Vector((0, 0, 1))))

    def poly(self, pts2d, depth, loc=(0, 0, 0), rot=(0, 0, 0), m="steel", bevel=0.0, seg=1,
             smooth=True, angle=35.0, mirror=False, matrix=None, taper=1.0, thick_fn=None):
        """Extrude a 2D outline (XY plane, CCW) by depth along Z (centered).
        taper scales the top cap (for wedge-y shapes). thick_fn(x, y) -> local depth
        (makes wedges: thin cutting edges, thick backs)."""
        tb = bmesh.new()
        h = depth / 2.0
        hs = [(thick_fn(x, y) / 2.0 if thick_fn else h) for x, y in pts2d]
        bot = [tb.verts.new((x, y, -hh)) for (x, y), hh in zip(pts2d, hs)]
        cx = sum(p[0] for p in pts2d) / len(pts2d)
        cy = sum(p[1] for p in pts2d) / len(pts2d)
        top = [tb.verts.new((cx + (x - cx) * taper, cy + (y - cy) * taper, hh))
               for (x, y), hh in zip(pts2d, hs)]
        tb.faces.new(list(reversed(bot)))
        tb.faces.new(top)
        n = len(pts2d)
        for i in range(n):
            j = (i + 1) % n
            tb.faces.new([bot[i], bot[j], top[j], top[i]])
        bmesh.ops.recalc_face_normals(tb, faces=tb.faces)
        if bevel > 0:
            _bevel(tb, bevel, seg, min_angle=30)
        mat = matrix if matrix is not None else xform(loc, rot)
        self.add_bmesh(tb, m, mat, smooth, angle, mirror)

    def blade(self, stations, m="steel", edge_m=None, matrix=None, mirror=False, smooth=True,
              angle=30.0, edge_frac=0.78, spine_frac=0.0):
        """Blade along +Z. stations: list of (z, half_width, half_thickness, x_offset[, x_center]).
        Cross section: hexagonal lens. Faces between the edge and edge_frac*width use edge_m.
        x_offset shifts the station along X (curved blades). The last station may have
        half_width=0 to form the tip. spine_frac>0 makes a single-edged blade where the -X side
        is a flat thick spine (no edge material)."""
        tb = bmesh.new()
        rings = []
        for st in stations:
            z, w, t, xo = st[:4]
            if w <= 1e-5:
                rings.append([tb.verts.new((xo, 0, z))])
                continue
            e = edge_frac
            if spine_frac > 0:
                ws = w * spine_frac
                ring = [
                    (xo + w, 0), (xo + w * e, t * 0.55), (xo, t), (xo - ws, t * 0.9),
                    (xo - ws - t * 0.25, 0), (xo - ws, -t * 0.9), (xo, -t), (xo + w * e, -t * 0.55)]
            else:
                ring = [
                    (xo + w, 0), (xo + w * e, t * 0.45), (xo, t), (xo - w * e, t * 0.45),
                    (xo - w, 0), (xo - w * e, -t * 0.45), (xo, -t), (xo + w * e, -t * 0.45)]
            rings.append([tb.verts.new((x, y, z)) for x, y in ring])
        mats = [M(m) if isinstance(m, str) else m]
        if edge_m:
            mats.append(M(edge_m) if isinstance(edge_m, str) else edge_m)
        # material indices inside tb: 0=core, 1=edge (remapped after merge)
        if spine_frac > 0:
            edge_faces = {7, 0}
        else:
            edge_faces = {0, 3, 4, 7}
        for i in range(len(rings) - 1):
            A, B = rings[i], rings[i + 1]
            for k in range(8):
                k2 = (k + 1) % 8
                if len(B) == 1:
                    vs = [A[k], A[k2], B[0]]
                elif len(A) == 1:
                    vs = [A[0], B[k2], B[k]]
                else:
                    vs = [A[k], A[k2], B[k2], B[k]]
                try:
                    f = tb.faces.new(vs)
                except ValueError:
                    continue
                f.material_index = 1 if (edge_m and k in edge_faces) else 0
        if len(rings[0]) > 1:
            tb.faces.new(list(reversed(rings[0])))
        if len(rings[-1]) > 1:
            tb.faces.new(rings[-1])
        bmesh.ops.recalc_face_normals(tb, faces=tb.faces)
        self.add_bmesh(tb, None, matrix, smooth, angle, mirror, mats=mats)

    def seg(self, p0, p1, profile, m="steel", segs=12, scale=(1, 1), xref=(1, 0, 0), smooth=True,
            angle=40.0, mirror=False, caps=True, arc=None):
        """Lathe along the segment p0->p1. profile: [(r, t)] with t in [0,1] along the segment
        (t may go slightly outside). scale=(sx, sy): ellipse, sx along xref."""
        p0 = Vector(p0)
        p1 = Vector(p1)
        d = p1 - p0
        L = d.length
        xr = Vector(xref)
        if abs(xr.normalized().dot(d.normalized())) > 0.95:
            xr = Vector((0, 1, 0)) if abs(d.normalized().y) < 0.9 else Vector((0, 0, 1))
        M = basis(z=d, x=xr, loc=p0)
        prof = [(r, t * L) for r, t in profile]
        self.lathe(prof, m=m, segs=segs, scale=scale, matrix=M, smooth=smooth, angle=angle,
                   mirror=mirror, caps=caps, arc=arc)

    def sheet(self, fn, nu, nv, thick, m_out, m_in, m_edge=None, smooth=True, angle=60.0,
              mirror=False):
        """Thick sheet. fn(u in [-1,1], v in [0,1]) -> (point, outward_normal)."""
        tb = bmesh.new()
        O = []
        I = []
        for j in range(nv + 1):
            ro, ri = [], []
            for i in range(nu + 1):
                u = -1 + 2.0 * i / nu
                v = j / float(nv)
                p, n = fn(u, v)
                p = Vector(p)
                n = Vector(n).normalized()
                ro.append(tb.verts.new(p + n * thick / 2))
                ri.append(tb.verts.new(p - n * thick / 2))
            O.append(ro)
            I.append(ri)
        for j in range(nv):
            for i in range(nu):
                f = tb.faces.new([O[j][i], O[j + 1][i], O[j + 1][i + 1], O[j][i + 1]])
                f.material_index = 0
                f = tb.faces.new([I[j][i], I[j][i + 1], I[j + 1][i + 1], I[j + 1][i]])
                f.material_index = 1
        border = []
        for i in range(nu):
            border.append((O[0][i + 1], O[0][i], I[0][i], I[0][i + 1]))
            border.append((O[nv][i], O[nv][i + 1], I[nv][i + 1], I[nv][i]))
        for j in range(nv):
            border.append((O[j][0], O[j + 1][0], I[j + 1][0], I[j][0])[::-1])
            border.append((O[j + 1][nu], O[j][nu], I[j][nu], I[j + 1][nu])[::-1])
        for q in border:
            try:
                f = tb.faces.new(q)
                f.material_index = 2
            except ValueError:
                pass
        bmesh.ops.recalc_face_normals(tb, faces=tb.faces)
        self.add_bmesh(tb, None, None, smooth, angle, mirror,
                       mats=[m_out, m_in, m_edge or m_out])

    def gem(self, r, loc=(0, 0, 0), rot=(0, 0, 0), m="glow_cyan", h_top=None, h_bot=None,
            segs=8, mirror=False, matrix=None, table=0.55):
        """Brilliant-cut style gem along Z: crown (with table) + pavilion point."""
        h_top = r * 0.6 if h_top is None else h_top
        h_bot = r * 1.1 if h_bot is None else h_bot
        prof = [(0, -h_bot), (r, 0), (r * table, h_top), (0, h_top)]
        self.lathe(prof, loc, rot, m, segs=segs, smooth=False, mirror=mirror, matrix=matrix)

    def crystal(self, r, h, loc=(0, 0, 0), rot=(0, 0, 0), m="crystal_cyan", segs=6, tip=0.35,
                mirror=False, matrix=None, base_r=None):
        """Hexagonal crystal prism with pointed tip along +Z (base at loc)."""
        br = r * 0.85 if base_r is None else base_r
        prof = [(0, 0), (br, 0), (r, h * (1 - tip)), (0, h)]
        self.lathe(prof, loc, rot, m, segs=segs, smooth=False, mirror=mirror, matrix=matrix)

    def merge(self, other, matrix=None):
        """Merge another Builder in (keeps materials)."""
        tb = other.bm.copy()
        idxs = [self._mi(mm) for mm in other.mats]
        for f in tb.faces:
            f.material_index = idxs[f.material_index] if other.mats else 0
        # preserve smooth flags; edges via angle 180 => keep from source
        if matrix is not None:
            bmesh.ops.transform(tb, matrix=matrix, verts=tb.verts)
        vmap = {}
        for v in tb.verts:
            vmap[v] = self.bm.verts.new(v.co)
        for f in tb.faces:
            try:
                nf = self.bm.faces.new([vmap[v] for v in f.verts])
            except ValueError:
                continue
            nf.material_index = f.material_index
            nf.smooth = f.smooth
        for e in tb.edges:
            ne = self.bm.edges.get((vmap[e.verts[0]], vmap[e.verts[1]]))
            if ne is not None:
                ne.smooth = e.smooth
        tb.free()

    def tri_count(self):
        return sum(len(f.verts) - 2 for f in self.bm.faces)

    def empty_(self):
        return len(self.bm.faces) == 0

    def to_object(self, name, parent=None):
        me = bpy.data.meshes.new(name)
        self.bm.normal_update()
        self.bm.to_mesh(me)
        self.bm.free()
        for m in self.mats:
            me.materials.append(m)
        ob = bpy.data.objects.new(name, me)
        link(ob)
        if parent is not None:
            ob.parent = parent
        return ob


# ---------------------------------------------------------------------------
# armature + animation
# ---------------------------------------------------------------------------
class Rig:
    def __init__(self, name, bones):
        """bones: list of (name, head, tail, parent_name_or_None[, roll_deg])"""
        ad = bpy.data.armatures.new(name + "_data")
        arm = bpy.data.objects.new(name, ad)
        link(arm)
        bpy.context.view_layer.objects.active = arm
        bpy.ops.object.mode_set(mode="EDIT")
        for b in bones:
            nm, h, t, par = b[:4]
            eb = ad.edit_bones.new(nm)
            eb.head = h
            eb.tail = t
            if len(b) > 4:
                eb.roll = math.radians(b[4])
            if par:
                eb.parent = ad.edit_bones[par]
            eb.use_connect = False
        bpy.ops.object.mode_set(mode="OBJECT")
        ad.display_type = "STICK"
        self.arm = arm
        self.names = [b[0] for b in bones]
        self.rest = {}
        for pb in arm.pose.bones:
            pb.rotation_mode = "QUATERNION"
            self.rest[pb.name] = arm.data.bones[pb.name].matrix_local.to_3x3()
        arm.animation_data_create()
        self.actions = []

    def head(self, bone):
        return self.arm.data.bones[bone].head_local.copy()

    def tail(self, bone):
        return self.arm.data.bones[bone].tail_local.copy()

    def attach(self, obj, bone):
        mw = obj.matrix_world.copy()
        obj.parent = self.arm
        obj.parent_type = "BONE"
        obj.parent_bone = bone
        obj.matrix_world = mw
        return obj

    def attach_builders(self, parts, prefix):
        """parts: dict bone -> Builder (geometry in rest world space)"""
        objs = []
        for bone, b in parts.items():
            if b.empty_():
                continue
            ob = b.to_object("%s_%s" % (prefix, bone))
            self.attach(ob, bone)
            objs.append(ob)
        return objs

    # pose spec -> local transforms
    def _q(self, bone, r):
        B = self.rest[bone]
        R = Euler([math.radians(a) for a in r], "XYZ").to_matrix()
        return (B.inverted() @ R @ B).to_quaternion()

    def _l(self, bone, l):
        return self.rest[bone].inverted() @ Vector(l)

    def apply_pose(self, pose):
        for pb in self.arm.pose.bones:
            spec = pose.get(pb.name, {})
            r = spec.get("r", (0, 0, 0))
            q = self._q(pb.name, r)
            pb.rotation_quaternion = q
            pb.location = self._l(pb.name, spec.get("l", (0, 0, 0)))
            s = spec.get("s", (1, 1, 1))
            if isinstance(s, (int, float)):
                s = (s, s, s)
            pb.scale = s

    def _key_all(self, f, prevq):
        for pb in self.arm.pose.bones:
            q = pb.rotation_quaternion.copy()
            pq = prevq.get(pb.name)
            if pq is not None and q.dot(pq) < 0:
                q.negate()
                pb.rotation_quaternion = q
            prevq[pb.name] = q
            pb.keyframe_insert("rotation_quaternion", frame=f, group=pb.name)
            pb.keyframe_insert("location", frame=f, group=pb.name)
            pb.keyframe_insert("scale", frame=f, group=pb.name)

    def _begin(self, name):
        act = bpy.data.actions.new(name)
        self.arm.animation_data.action = act
        return act

    def _end(self, act, name, f0, f1):
        act.use_frame_range = True
        act.frame_start = f0
        act.frame_end = f1
        tr = self.arm.animation_data.nla_tracks.new()
        tr.name = name
        st = tr.strips.new(name, int(f0), act)
        st.name = name
        tr.mute = False
        self.arm.animation_data.action = None
        self.actions.append(name)
        return act

    def keyed(self, name, keys, loop_end=None):
        """keys: [(frame, pose_dict)]; if loop_end, adds keys[0] at that frame."""
        act = self._begin(name)
        if loop_end is not None:
            keys = list(keys) + [(loop_end, keys[0][1])]
        prevq = {}
        for f, pose in keys:
            self.apply_pose(pose)
            self._key_all(f, prevq)
        self._end(act, name, keys[0][0], keys[-1][0])
        return act

    def procedural(self, name, frames, fn, step=1):
        """fn(t in [0,1]) -> pose. Keys every `step` frames; first==last for loops when
        fn is periodic."""
        act = self._begin(name)
        prevq = {}
        f = 0
        while True:
            t = f / float(frames)
            self.apply_pose(fn(min(t, 1.0)))
            self._key_all(f, prevq)
            if f >= frames:
                break
            f = min(frames, f + step)
        self._end(act, name, 0, frames)
        return act


def smooth01(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def lerp(a, b, t):
    if isinstance(a, (tuple, list)):
        return tuple(x + (y - x) * t for x, y in zip(a, b))
    return a + (b - a) * t


# ---------------------------------------------------------------------------
# export
# ---------------------------------------------------------------------------
def export_glb(relpath, animations=False):
    path = os.path.join(OUT, relpath)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.context.scene.frame_set(0)
    kw = dict(
        filepath=path,
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_texcoords=False,
        export_normals=True,
        export_tangents=False,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
        export_extras=False,
        export_animations=animations,
        use_selection=False,
    )
    if animations:
        kw.update(
            export_animation_mode="ACTIONS",
            export_force_sampling=True,
            export_frame_step=1,
            export_anim_slide_to_zero=True,
            export_optimize_animation_size=True,
            export_skins=True,
            export_rest_position_armature=True,
        )
    try:
        bpy.ops.export_scene.gltf(**kw)
    except TypeError:
        for k in ("export_anim_slide_to_zero", "export_rest_position_armature",
                  "export_optimize_animation_size"):
            kw.pop(k, None)
        bpy.ops.export_scene.gltf(**kw)
    return path


def scene_tris():
    n = 0
    for ob in bpy.context.scene.objects:
        if ob.type == "MESH":
            n += sum(len(p.vertices) - 2 for p in ob.data.polygons)
    return n
