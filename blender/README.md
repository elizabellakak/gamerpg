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
* Meshes are rigid parts parented to bones: each bone node has a child mesh node named
  `<asset>_<bone>`. The one exception is the dragon's wing membranes (see below). A glTF skin
  is always written, so three.js creates `Bone` objects.
* Animations are separate glTF animations (`ACTIONS` mode) at 30 fps. Every bone is keyed in
  every clip. Idle, Run and Move loop seamlessly (the last frame equals the first). Die holds
  its last pose, so use `clampWhenFinished`. Root motion is vertical only, except Skill, which
  rotates `root` 360 degrees about the vertical axis.
* Materials are plain Principled BSDF: base color, metallic, roughness and emission.
  Emission strength is capped at 2.5 (`EMISSION_CAP` in `core.py`) so bloom keeps glows
  colored instead of blowing them out to white. Glow materials use a darkened copy of their
  emission color as base color, which keeps them saturated. There are no textures,
  no UVs and no Draco compression.

### Hero (`models/hero.glb`)
Armature `HeroRig`. Bones: `root hips spine chest neck head upper_arm_L forearm_L hand_L
upper_arm_R forearm_R hand_R thigh_L shin_L foot_L thigh_R shin_R foot_R cape_1 cape_2`.
`weapon_socket` is a child node of `hand_R` at the palm. Attach a weapon GLB scene to it with
an identity transform: the weapon's +Y axis in glTF (Blender +Z) points along the blade.
Clips: `Idle Run Attack1 Attack2 Attack3 Skill Cast Dash Hit Die`.

Weapon-class sockets and clips (`pipeline/class_anims.py`):
* `bow_socket` is a child of `hand_L` (left palm). A bow GLB attached with an identity
  transform stands upright, with its face (glTF +Z) forward and the string toward the chest,
  in the aiming poses.
* `shield_socket` is a child of `forearm_L` (outer forearm). A shield attached with an
  identity transform faces forward and stands upright in the guard poses.
* Both use the same rest orientation as `weapon_socket` (local glTF +Y forward from the fist,
  local +X up).
* In two-handed clips the left hand holds the haft of the weapon in `weapon_socket`.

| class | clips |
|---|---|
| Sword&Shield | `SS_Idle SS_Run SS_Bash SS_Block` (the sword combo stays Attack1-3) |
| Greatsword | `GS_Idle GS_Run GS_Attack1 GS_Attack2 GS_Attack3 GS_Spin GS_Leap` |
| Spear | `SP_Idle SP_Run SP_Attack1 SP_Attack2 SP_Attack3 SP_Lunge SP_Twirl SP_Jab` |
| Bow | `BW_Idle BW_Run BW_Shoot BW_Aim BW_Up BW_Backflip` |
| Staff | `ST_Idle ST_Run ST_Attack1 ST_Attack2 ST_Attack3 ST_Channel ST_Point` |

The bowstring is static geometry. To show it pulled during a draw, the game can draw a line
from `tip` to the right hand to `base`.

### NPCs
`npc_smith.glb` (armature `SmithRig`, hammer node `smith_hammer`) and `npc_maiden.glb`
(armature `MaidenRig`, staff node `maiden_staff`). Both use the hero's bone names without the
cape bones, include a `weapon_socket`, and have one clip: `Idle`.

### Weapons (`models/weapons/<id>.glb`)
Origin is the grip point and the blade points along Blender +Z (glTF +Y). Each file has a mesh
node `<id>` plus empties `tip` (blade tip or far end) and `base` (start of the blade, just
above the guard), which the game uses for trails.

* **Bows** (`hunter_bow elven_longbow gale_bow starfall_bow seraph_bow`): limbs run along glTF
  +-Y, the face points glTF +Z and the string sits on the -Z side. `tip` is the upper limb tip,
  `base` the lower limb tip, and there is an extra `string_mid` empty.
* **Shields** (`shield_iron shield_knight shield_aegis`): origin at the forearm or handle, face
  toward glTF +Z, height along +Y. They also have `tip` (top) and `base` (bottom) empties.
  Shields have no icons.
* The other new weapons (`ember_staff astral_scepter void_staff iron_spear dragon_lance
  steel_claymore`) follow the standard contract. They are defined in `pipeline/weapons2.py`.

### Monsters (`models/monsters/<id>.glb`)
Clips: `Idle Move Attack Hit Die`. The dragon also has `Attack2` (rear up, then fire-breath
pose with the jaw open) and `Fly`.
The goblin holds a `goblin_club` on its `weapon_socket`. The golem has extra bones
`shoulder_rock_L` and `shoulder_rock_R` for its floating rocks.

The dragon (`pipeline/dragon.py`, armature `DragonRig`) has these bones:
* body: `root hips chest`
* neck and head: `neck_1`..`neck_4 head jaw`
* tail: `tail_1`..`tail_5`
* legs: `leg_{FL,FR,BL,BR}_{1..4}` (digitigrade; `_4` is the foot and toes)
* wings: `wing_{L,R}_1` (upper arm), `_2` (forearm), and fingers `_3`, `_4`, `_5`

Its wing membranes are two skinned meshes, `dragon_wing_L` and `dragon_wing_R`, weighted
between consecutive finger and arm bones and the body, so they stay connected while flapping.
They load as `SkinnedMesh` in three.js. All other dragon parts are rigid.

### Props (`models/props/<id>.glb`)
One mesh node named `<id>`. `gacha_shrine` also has a child node `gacha_crystal`, centered on
the floating crystal 3 m up, so the game can spin or bob it.

### Icons and promo
`icons/<id>.png` are 256x256 RGBA with a transparent background (Cycles, 64 samples, OIDN).
`promo.jpg` is 1600x900, with the left third kept calm for the logo.
