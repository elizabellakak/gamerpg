"""Title-screen promo render: hero raising celestial_excalibur at dusk (1600x900 JPG)."""
import math
import os
import random

import bpy
from mathutils import Vector

from . import characters as C
from . import props as P
from . import render as R
from .core import OUT, Builder, define, glow, srgb
from .weapons import weapon_object


def dusk_world():
    return R.studio_world(top="#1b1840", horizon="#ff9a5c", bottom="#2a1a2c", strength=1.0)


def _world_gradient():
    """Dusk sky: deep indigo zenith -> magenta -> warm orange horizon."""
    sc = bpy.context.scene
    w = bpy.data.worlds.new("Dusk")
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
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    nt.links.new(tc.outputs["Generated"], sep.inputs[0])
    mr = nt.nodes.new("ShaderNodeMapRange")
    nt.links.new(sep.outputs["Z"], mr.inputs["Value"])
    mr.inputs["From Min"].default_value = -0.2
    mr.inputs["From Max"].default_value = 0.8
    nt.links.new(mr.outputs["Result"], ramp.inputs["Fac"])
    cr = ramp.color_ramp
    stops = [(0.0, "#1a1022"), (0.2, "#ff8a4a"), (0.3, "#e0587a"), (0.5, "#5a3a8a"),
             (0.75, "#1c1d4a"), (1.0, "#0b0c22")]
    cr.elements[0].position = stops[0][0]
    cr.elements[0].color = (*srgb(stops[0][1]), 1)
    cr.elements[1].position = stops[-1][0]
    cr.elements[1].color = (*srgb(stops[-1][1]), 1)
    for pos, col in stops[1:-1]:
        e = cr.elements.new(pos)
        e.color = (*srgb(col), 1)
    nt.links.new(ramp.outputs["Color"], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = 1.0
    nt.links.new(bg.outputs[0], out.inputs[0])


def beam_material():
    m = bpy.data.materials.new("beam")
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (*srgb("#ffd88a"), 1)
    em.inputs["Strength"].default_value = 3.0
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    add = nt.nodes.new("ShaderNodeAddShader")
    lw = nt.nodes.new("ShaderNodeLayerWeight")
    lw.inputs["Blend"].default_value = 0.35
    mul = nt.nodes.new("ShaderNodeMath")
    mul.operation = "POWER"
    mul.inputs[1].default_value = 2.0
    inv = nt.nodes.new("ShaderNodeMath")
    inv.operation = "SUBTRACT"
    inv.inputs[0].default_value = 1.0
    nt.links.new(lw.outputs["Facing"], inv.inputs[1])
    nt.links.new(inv.outputs[0], mul.inputs[0])
    em2 = nt.nodes.new("ShaderNodeMath")
    em2.operation = "MULTIPLY"
    em2.inputs[1].default_value = 2.5
    nt.links.new(mul.outputs[0], em2.inputs[0])
    nt.links.new(em2.outputs[0], em.inputs["Strength"])
    nt.links.new(em.outputs[0], add.inputs[0])
    nt.links.new(tr.outputs[0], add.inputs[1])
    nt.links.new(add.outputs[0], out.inputs["Surface"])
    return m


def add_bloom():
    sc = bpy.context.scene
    try:
        tree = bpy.data.node_groups.new("Comp", "CompositorNodeTree")
        tree.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
        rl = tree.nodes.new("CompositorNodeRLayers")
        gl = tree.nodes.new("CompositorNodeGlare")
        gl.inputs["Type"].default_value = "Bloom"
        gl.inputs["Threshold"].default_value = 1.0
        gl.inputs["Strength"].default_value = 0.6
        gl.inputs["Size"].default_value = 0.6
        out = tree.nodes.new("NodeGroupOutput")
        tree.links.new(rl.outputs["Image"], gl.inputs["Image"])
        tree.links.new(gl.outputs["Image"], out.inputs[0])
        sc.compositing_node_group = tree
        return True
    except Exception as e:  # pragma: no cover
        print("bloom unavailable:", e)
        return False


def darken_logo_area(src, dst):
    """Darken the lower-left / left third (behind the title logo) with a soft gradient."""
    import numpy as np
    img = bpy.data.images.load(src)
    w, h = img.size
    px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)
    u = np.linspace(0.0, 1.0, w)[None, :]
    v = np.linspace(0.0, 1.0, h)[:, None]          # 0 = bottom row
    left = np.clip((0.5 - u) / 0.5, 0, 1) ** 1.4
    low = np.clip((0.75 - v) / 0.75, 0, 1) ** 1.2
    f = 1.0 - (0.38 * left * (0.35 + 0.65 * low) + 0.18 * low * np.clip(1.0 - u, 0, 1) ** 2)
    px[:, :, :3] *= f[:, :, None]
    img.pixels[:] = px.ravel()
    img.filepath_raw = dst
    img.file_format = "JPEG"
    bpy.context.scene.render.image_settings.quality = 90
    img.save()
    bpy.data.images.remove(img)


def build(path=None, samples=96, w=1600, h=900):
    rig, solver, sock = C.build_hero(export=False)
    weapon_object("celestial_excalibur", parent=sock)
    arm = rig.arm
    for tr in arm.animation_data.nla_tracks:
        tr.mute = True
    act = bpy.data.actions["Cast"]
    arm.animation_data.action = act
    try:
        arm.animation_data.action_slot = act.slots[0]
    except Exception:
        pass
    bpy.context.scene.frame_set(20)
    arm.rotation_euler = (0, 0, math.radians(-18))

    define("ground_grass", color="#1c2a26", rough=0.9)
    define("path_stone", color="#7a7066", rough=0.85)
    define("mountain", color="#3a2a52", rough=1.0)
    G = Builder()
    G.box((120, 120, 0.2), loc=(0, 20, -0.1), m="ground_grass")
    rnd = random.Random(3)
    for i in range(14):
        x = rnd.uniform(-1.2, 1.2)
        y = -1.5 + i * 1.1
        G.box((rnd.uniform(0.7, 1.1), rnd.uniform(0.6, 0.9), 0.08), loc=(x * 0.3, y, 0.01),
              rot=(0, 0, rnd.uniform(-20, 20)), m="path_stone", bevel=0.03, seg=1, smooth=False)
    for i in range(16):
        x = -90 + i * 12 + rnd.uniform(-4, 4)
        hgt = rnd.uniform(5, 11)
        G.sphere(1.0, loc=(x, 95 + rnd.uniform(0, 15), 0), scale=(rnd.uniform(9, 14), 6, hgt),
                 m="mountain", ico=1, jitter=0.25, seed=i, smooth=False)
    G.to_object("ground")

    placements = [("pagoda", (9.0, 17, 0), 15, 1.0), ("tree_sakura", (3.2, 0.6, 0), 0, 1.05),
                  ("tree_sakura", (6.5, 8.5, 0), 60, 1.2), ("tree_sakura", (3.0, 12, 0), 30, 0.9),
                  ("crystal", (1.3, -0.9, 0), 30, 0.7), ("crystal", (-0.9, 1.0, 0), 80, 0.85),
                  ("crystal", (2.4, 2.2, 0), 10, 1.1),
                  ("lantern", (-1.1, 0.7, 0), 0, 1.0), ("lantern", (0.9, 4.5, 0), 20, 1.0),
                  ("rock_a", (2.6, -0.4, 0), 40, 0.6), ("tree_pine", (-12, 22, 0), 0, 1.4),
                  ("tree_pine", (-7, 26, 0), 0, 1.2), ("tree_pine", (12, 20, 0), 0, 1.5)]
    for pid, loc, rz, s in placements:
        P.prop_objects(pid, loc, rz, s)
    # light beam + sparkles from the raised sword
    bpy.context.view_layer.update()
    tip = bpy.data.objects["tip"].matrix_world.translation
    beamB = Builder()
    beamB.cyl(0.05, 0.45, 14.0, loc=tip + Vector((0, 0, 7.0)), segs=24, caps=False, m="steel")
    beam = beamB.to_object("beam")
    beam.data.materials.clear()
    beam.data.materials.append(beam_material())
    glow("spark", "#ffc850", 12.0)
    S = Builder()
    for i in range(45):
        a = rnd.uniform(0, math.pi * 2)
        r = rnd.uniform(0.3, 1.6)
        z = rnd.uniform(0.2, 3.5)
        S.sphere(rnd.uniform(0.012, 0.03), loc=(math.cos(a) * r, math.sin(a) * r - 0.2, z),
                 m="spark", segs=6, rings=4)
    for i in range(40):
        a = rnd.uniform(0, math.pi * 2)
        r = rnd.uniform(1.0, 5.0)
        S.poly([(0, 0), (0.05, 0.025), (0.09, 0), (0.05, -0.025)], 0.004,
               loc=(math.cos(a) * r + 3, math.sin(a) * r + 1, rnd.uniform(0.5, 4.0)),
               rot=(rnd.uniform(0, 360), rnd.uniform(0, 360), 0), m="sakura_light", smooth=False)
    S.to_object("sparks")

    R.setup_cycles(w, h, samples=samples, transparent=False)
    sc = bpy.context.scene
    sc.view_settings.view_transform = "AgX"
    try:
        sc.view_settings.look = "AgX - Punchy"
    except Exception:
        pass
    _world_gradient()
    # lighting: warm low sun from behind-right (rim), cool key from front-right, fill
    sun = bpy.data.lights.new("Sun", "SUN")
    sun.energy = 4.0
    sun.color = srgb("#ffb070")
    sun.angle = math.radians(3)
    so = bpy.data.objects.new("Sun", sun)
    sc.collection.objects.link(so)
    so.rotation_euler = (math.radians(78), 0, math.radians(150))
    R.area_light("Key", (-1.5, -4.5, 3.2), (0, 0, 1.4), 1300, "#c8d4ff", size=2.5)
    R.area_light("Rim", (-2.5, 3.0, 3.0), (0, 0, 1.4), 1500, "#ff9ad0", size=1.5)
    R.area_light("Rim2", (3.0, 2.5, 2.0), (0, 0, 1.2), 1200, "#ffc080", size=1.5)
    R.area_light("Glow", tip + Vector((0, -0.3, -0.2)), (0, 0, 1.4), 120, "#ffd890", size=0.3)
    cam = R.camera((-3.6, -5.0, 0.7), (-1.05, 0.75, 1.75), lens=32)
    cam.data.dof.use_dof = False
    add_bloom()
    path = path or os.path.join(OUT, "promo.jpg")
    tmp = os.path.join(os.path.dirname(path), "_promo_tmp.png")
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGB"
    R.render(tmp)
    darken_logo_area(tmp, path)
    os.remove(tmp)
    return path
