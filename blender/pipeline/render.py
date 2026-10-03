"""Cycles render helpers (icons, previews, promo)."""
import math

import bpy
from mathutils import Matrix, Vector

from .core import link, srgb


def setup_cycles(w, h, samples=64, transparent=True, denoise=True):
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = samples
    sc.cycles.use_adaptive_sampling = True
    sc.cycles.max_bounces = 6
    sc.cycles.glossy_bounces = 3
    sc.cycles.transmission_bounces = 4
    sc.cycles.diffuse_bounces = 2
    sc.cycles.sample_clamp_indirect = 8.0
    sc.render.resolution_x = w
    sc.render.resolution_y = h
    sc.render.resolution_percentage = 100
    sc.render.film_transparent = transparent
    try:
        sc.cycles.use_denoising = denoise
        if denoise:
            sc.cycles.denoiser = "OPENIMAGEDENOISE"
    except Exception:
        sc.cycles.use_denoising = False
        sc.cycles.samples = samples * 2
    sc.view_settings.view_transform = "AgX"
    try:
        sc.view_settings.look = "AgX - Punchy"
    except Exception:
        pass
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA" if transparent else "RGB"
    return sc


def studio_world(top="#9fb4d8", horizon="#3a4152", bottom="#0d0f14", strength=1.0):
    sc = bpy.context.scene
    w = bpy.data.worlds.new("World")
    sc.world = w
    if w.node_tree is None:
        w.use_nodes = True
    nt = w.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputWorld")
    bg = nt.nodes.new("ShaderNodeBackground")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    mr = nt.nodes.new("ShaderNodeMapRange")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    nt.links.new(tc.outputs["Generated"], sep.inputs[0])
    nt.links.new(sep.outputs["Z"], mr.inputs["Value"])
    mr.inputs["From Min"].default_value = -1.0
    mr.inputs["From Max"].default_value = 1.0
    nt.links.new(mr.outputs["Result"], ramp.inputs["Fac"])
    cr = ramp.color_ramp
    cr.elements[0].position = 0.35
    cr.elements[0].color = (*srgb(bottom), 1)
    cr.elements[1].position = 0.85
    cr.elements[1].color = (*srgb(top), 1)
    e = cr.elements.new(0.52)
    e.color = (*srgb(horizon), 1)
    nt.links.new(ramp.outputs["Color"], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = strength
    nt.links.new(bg.outputs[0], out.inputs[0])
    return w


def area_light(name, loc, target, power, color="#ffffff", size=1.0):
    ld = bpy.data.lights.new(name, "AREA")
    ld.energy = power
    ld.color = srgb(color)
    ld.size = size
    ob = bpy.data.objects.new(name, ld)
    link(ob)
    ob.location = loc
    look_at(ob, target)
    return ob


def look_at(ob, target):
    d = Vector(target) - Vector(ob.location)
    ob.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()


def three_point(center, dist=3.0, power=1.0, key="#fff1dc", fill="#a8c4ff", rim="#ffffff"):
    c = Vector(center)
    area_light("Key", c + Vector((-1.2, -1.6, 1.4)) * dist / 2.4, c, 260 * power * dist ** 2 / 9,
               key, size=dist * 0.5)
    area_light("Fill", c + Vector((1.6, -1.2, 0.2)) * dist / 2.4, c, 90 * power * dist ** 2 / 9,
               fill, size=dist * 0.6)
    area_light("Rim", c + Vector((0.6, 1.8, 1.2)) * dist / 2.4, c, 380 * power * dist ** 2 / 9,
               rim, size=dist * 0.3)


def camera(loc, target, lens=50, ortho=None, name="Camera"):
    cd = bpy.data.cameras.new(name)
    if ortho:
        cd.type = "ORTHO"
        cd.ortho_scale = ortho
    else:
        cd.lens = lens
    cd.clip_end = 500
    ob = bpy.data.objects.new(name, cd)
    link(ob)
    ob.location = loc
    look_at(ob, target)
    bpy.context.scene.camera = ob
    return ob


def mesh_points(objs):
    dg = bpy.context.evaluated_depsgraph_get()
    pts = []
    for ob in objs:
        if ob.type != "MESH":
            continue
        ev = ob.evaluated_get(dg)
        mw = ev.matrix_world
        for v in ev.data.vertices:
            pts.append(mw @ v.co)
    return pts


def frame_ortho(cam, objs, margin=1.12):
    """Center + scale an orthographic camera on the objects (keeps its rotation)."""
    bpy.context.view_layer.update()
    pts = mesh_points(objs)
    inv = cam.matrix_world.inverted()
    cp = [inv @ p for p in pts]
    xs = [p.x for p in cp]
    ys = [p.y for p in cp]
    cx = (min(xs) + max(xs)) / 2
    cy = (min(ys) + max(ys)) / 2
    sc = bpy.context.scene
    aspect = sc.render.resolution_x / sc.render.resolution_y
    ext = max(max(xs) - min(xs), (max(ys) - min(ys)) * aspect)
    cam.data.ortho_scale = ext * margin
    cam.location = cam.matrix_world @ Vector((cx, cy, 0))


def render(path):
    sc = bpy.context.scene
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    return path
