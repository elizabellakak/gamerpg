# Procedural 3D art pipeline (Blender 5 / `bpy`)

Every model, icon and the promo image under `public/assets/` is generated from code in this
folder. No hand-made source files. Each asset is built in a fresh empty scene.

## Run

```bash
python3 blender/build_assets.py                  # everything (~5 min, the promo render is most of it)
python3 blender/build_assets.py hero wolf        # only some assets
python3 blender/build_assets.py weapons icons    # groups: characters monsters weapons props icons promo models
python3 blender/build_assets.py --list           # show all ids
python3 blender/inspect_glb.py                   # check every GLB: nodes, animations, tris, bbox
python3 blender/inspect_glb.py public/assets/models/hero.glb
```

Icons are addressed as `icon_<id>` (for example `icon_gem`). A bare item id such as `gem` also
works when no model has that name.

## Layout

| file | contents |
|---|---|
| `build_assets.py` | entry point and asset registry |
| `pipeline/core.py` | scene reset, material palette, `Builder` (bmesh primitives: bevelled box, cylinder, lathe, sweep, torus, extruded outline, blade, sheet, gem, crystal), `Rig`, GLB export |
| `pipeline/anim.py` | pose solver (FK deltas in armature axes + two-bone arm IK with weapon-aligned hands) and the animation sampler |
| `pipeline/characters.py` | hero knight and the two NPCs (shared humanoid rig) |
| `pipeline/monsters.py` | slime, wolf, goblin, golem, dragon |
| `pipeline/weapons.py` | 15 weapons |
| `pipeline/props.py` | environment props |
| `pipeline/icons.py`, `pipeline/render.py` | Cycles icon renders and render helpers |
| `pipeline/promo.py` | title-screen promo render |
| `inspect_glb.py` | standalone GLB verifier (no bpy needed) |

## Asset contract

* Units are meters. glTF is exported with +Y up, so Blender -Y becomes +Z in three.js.
* Characters and monsters stand on Z=0 with the origin at the feet and face Blender -Y
  (three.js +Z). Props have their origin at the base center.
* Names contain only letters, digits and underscores.
* Meshes are rigid parts parented to bones. There are no skin weights: each bone node has a
  child mesh node named `<asset>_<bone>`. A glTF skin is still written, so three.js creates
  `Bone` objects.
* Animations are separate glTF animations (`ACTIONS` mode) at 30 fps. Every bone is keyed in
  every clip. Idle, Run and Move loop seamlessly (the last frame equals the first). Die holds
  its last pose, so use `clampWhenFinished`. Root motion is vertical only, except Skill, which
  rotates `root` 360 degrees about the vertical axis.
* Materials are plain Principled BSDF: base color, metallic, roughness and emission.
  Emissive parts use strength 2 to 8 so the game's bloom picks them up. There are no textures,
  no UVs and no Draco compression.

### Hero (`models/hero.glb`)
Armature `HeroRig`. Bones: `root hips spine chest neck head upper_arm_L forearm_L hand_L
upper_arm_R forearm_R hand_R thigh_L shin_L foot_L thigh_R shin_R foot_R cape_1 cape_2`.
`weapon_socket` is a child node of `hand_R` at the palm. Attach a weapon GLB scene to it with
an identity transform: the weapon's +Y axis in glTF (Blender +Z) points along the blade.
Clips: `Idle Run Attack1 Attack2 Attack3 Skill Cast Dash Hit Die`.

### NPCs
`npc_smith.glb` (armature `SmithRig`, hammer node `smith_hammer`) and `npc_maiden.glb`
(armature `MaidenRig`, staff node `maiden_staff`). Both use the hero's bone names without the
cape bones, include a `weapon_socket`, and have one clip: `Idle`.

### Weapons (`models/weapons/<id>.glb`)
Origin is the grip point and the blade points along Blender +Z (glTF +Y). Each file has a mesh
node `<id>` plus empties `tip` (blade tip or far end) and `base` (start of the blade, just
above the guard), which the game uses for trails.

### Monsters (`models/monsters/<id>.glb`)
Clips: `Idle Move Attack Hit Die`. The dragon also has `Attack2` (fire-breath pose) and `Fly`.
The goblin holds a `goblin_club` on its `weapon_socket`. The golem has extra bones
`shoulder_rock_L` and `shoulder_rock_R` for its floating rocks.

### Props (`models/props/<id>.glb`)
One mesh node named `<id>`. `gacha_shrine` also has a child node `gacha_crystal`, centered on
the floating crystal 3 m up, so the game can spin or bob it.

### Icons and promo
`icons/<id>.png` are 256x256 RGBA with a transparent background (Cycles, 64 samples, OIDN).
`promo.jpg` is 1600x900, with the left third kept calm for the logo.
