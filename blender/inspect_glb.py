"""Tiny GLB verifier: parses the JSON + BIN chunks (no bpy needed).

usage: python3 blender/inspect_glb.py [files or dirs ...]   (default: public/assets)
Prints node tree, animation names/durations, triangle count, materials and the rest-pose
bounding box in glTF space (Y up, +Z forward) plus Blender-style height/length.
"""
import json
import math
import os
import struct
import sys

COMP = {5120: ("b", 1), 5121: ("B", 1), 5122: ("h", 2), 5123: ("H", 2), 5125: ("I", 4),
        5126: ("f", 4)}
NCOMP = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}


def load(path):
    d = open(path, "rb").read()
    assert d[:4] == b"glTF", "not a GLB"
    off = 12
    js, binc = None, b""
    while off < len(d):
        ln, typ = struct.unpack("<II", d[off:off + 8])
        chunk = d[off + 8:off + 8 + ln]
        if typ == 0x4E4F534A:
            js = json.loads(chunk)
        elif typ == 0x004E4942:
            binc = chunk
        off += 8 + ln
    return js, binc


def read_acc(js, binc, i):
    a = js["accessors"][i]
    bv = js["bufferViews"][a["bufferView"]]
    fmt, size = COMP[a["componentType"]]
    n = NCOMP[a["type"]]
    stride = bv.get("byteStride", size * n)
    base = bv.get("byteOffset", 0) + a.get("byteOffset", 0)
    out = []
    for k in range(a["count"]):
        o = base + k * stride
        out.append(struct.unpack_from("<" + fmt * n, binc, o))
    return out


def mat_mul(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(4)) for j in range(4)] for i in range(4)]


def trs(n):
    if "matrix" in n:
        m = n["matrix"]
        return [[m[c * 4 + r] for c in range(4)] for r in range(4)]
    tx, ty, tz = n.get("translation", (0, 0, 0))
    x, y, z, w = n.get("rotation", (0, 0, 0, 1))
    sx, sy, sz = n.get("scale", (1, 1, 1))
    R = [[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
         [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
         [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]]
    return [[R[0][0] * sx, R[0][1] * sy, R[0][2] * sz, tx],
            [R[1][0] * sx, R[1][1] * sy, R[1][2] * sz, ty],
            [R[2][0] * sx, R[2][1] * sy, R[2][2] * sz, tz],
            [0, 0, 0, 1]]


def inspect(path, verbose=True):
    js, binc = load(path)
    nodes = js.get("nodes", [])
    parent = {}
    for i, n in enumerate(nodes):
        for c in n.get("children", []):
            parent[c] = i
    world = {}

    def W(i):
        if i in world:
            return world[i]
        m = trs(nodes[i])
        if i in parent:
            m = mat_mul(W(parent[i]), m)
        world[i] = m
        return m

    tris = 0
    lo = [1e9] * 3
    hi = [-1e9] * 3
    mats = set()
    for i, n in enumerate(nodes):
        if "mesh" not in n:
            continue
        m = W(i)
        for p in js["meshes"][n["mesh"]]["primitives"]:
            if "indices" in p:
                tris += js["accessors"][p["indices"]]["count"] // 3
            else:
                tris += js["accessors"][p["attributes"]["POSITION"]]["count"] // 3
            if "material" in p:
                mats.add(js["materials"][p["material"]].get("name"))
            for v in read_acc(js, binc, p["attributes"]["POSITION"]):
                w = [m[r][0] * v[0] + m[r][1] * v[1] + m[r][2] * v[2] + m[r][3] for r in range(3)]
                for a in range(3):
                    lo[a] = min(lo[a], w[a])
                    hi[a] = max(hi[a], w[a])
    size = os.path.getsize(path)
    print("=" * 78)
    print("%s  (%.1f KB)  tris=%d" % (os.path.relpath(path), size / 1024.0, tris))
    if tris:
        print("  bbox glTF min=(%.2f, %.2f, %.2f) max=(%.2f, %.2f, %.2f)" % (*lo, *hi))
        print("  height(Y)=%.2f m  length(Z)=%.2f m  width(X)=%.2f m" % (
            hi[1] - lo[1], hi[2] - lo[2], hi[0] - lo[0]))
    bad = [n.get("name") for n in nodes if "." in (n.get("name") or "")]
    if bad:
        print("  !! node names containing dots:", bad)

    if verbose:
        roots = js["scenes"][js.get("scene", 0)]["nodes"]

        def show(i, depth):
            n = nodes[i]
            kind = "mesh" if "mesh" in n else ("node")
            print("  " + "  " * depth + "- %s [%s]" % (n.get("name"), kind))
            for c in n.get("children", []):
                show(c, depth + 1)

        for r in roots:
            show(r, 0)
    anims = js.get("animations", [])
    if anims:
        out = []
        for a in anims:
            tmax = 0.0
            for s in a["samplers"]:
                acc = js["accessors"][s["input"]]
                tmax = max(tmax, acc.get("max", [0])[0])
            out.append("%s(%.2fs,%dch)" % (a["name"], tmax, len(a["channels"])))
        print("  animations:", ", ".join(out))
    print("  materials:", ", ".join(sorted(m for m in mats if m)))
    return dict(tris=tris, size=size, lo=lo, hi=hi, anims=[a["name"] for a in anims],
                nodes=[n.get("name") for n in nodes])


def main(args):
    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "assets")
    targets = args or [root]
    files = []
    for t in targets:
        if os.path.isdir(t):
            for dp, _, fs in os.walk(t):
                files += [os.path.join(dp, f) for f in sorted(fs) if f.endswith(".glb")]
        else:
            files.append(t)
    verbose = True
    if "--brief" in files:
        files.remove("--brief")
        verbose = False
    total = 0
    for f in sorted(files):
        total += inspect(f, verbose)["size"]
    print("=" * 78)
    print("%d files, total %.2f MB" % (len(files), total / 1048576.0))


if __name__ == "__main__":
    main(sys.argv[1:])
