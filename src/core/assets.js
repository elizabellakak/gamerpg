import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { WEAPONS } from '../data/weapons.js';

const BASE = import.meta.env.BASE_URL + 'assets/';
// hosted build can ship models as embedded glTF JSON (VITE_MODEL_EXT=.gltf.json)
const MODEL_EXT = import.meta.env.VITE_MODEL_EXT || '.glb';

export const MODEL_LIST = [
  'models/hero', 'models/npc_smith', 'models/npc_maiden',
  ...['slime', 'wolf', 'goblin', 'golem', 'dragon'].map((m) => 'models/monsters/' + m),
  ...WEAPONS.map((w) => 'models/weapons/' + w.id),
  ...['shield_iron', 'shield_knight', 'shield_aegis'].map((s) => 'models/weapons/' + s),
  ...['tree_oak', 'tree_pine', 'tree_sakura', 'rock_a', 'rock_b', 'rock_c', 'crystal', 'pillar_ruin', 'arch_ruin',
    'lantern', 'house', 'pagoda', 'forge', 'gacha_shrine', 'portal', 'fence', 'torii', 'bridge'].map((p) => 'models/props/' + p),
];

export const ICON_LIST = [
  ...WEAPONS.map((w) => w.id),
  'stone', 'stone_blessed', 'scroll_protect', 'gem', 'gold', 'potion_hp', 'potion_mp', 'ticket',
];

export function iconUrl(id) { return BASE + 'icons/' + id + '.png'; }
export const PROMO_URL = BASE + 'promo.jpg';

class Assets {
  constructor() {
    this.models = {};
    this.missing = new Set();
  }

  async loadAll(onProgress) {
    const loader = new GLTFLoader();
    let done = 0;
    const total = MODEL_LIST.length + ICON_LIST.length;
    const tick = () => { done++; onProgress && onProgress(done / total); };
    const modelJobs = MODEL_LIST.map((path) => new Promise((resolve) => {
      loader.load(BASE + path + MODEL_EXT, (gltf) => {
        const key = path.split('/').pop();
        gltf.scene.traverse((o) => {
          if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
            const mats = Array.isArray(o.material) ? o.material : [o.material];
            for (const m of mats) {
              if (m.emissive && (m.emissive.r + m.emissive.g + m.emissive.b) > 0.01) {
                m.userData.glow = true;
                // keep glow colourful instead of blowing out to white under bloom
                m.emissiveIntensity = Math.min(m.emissiveIntensity, 2.6);
                m.toneMapped = true;
              }
              if (m.transparent) o.castShadow = false;
            }
          }
        });
        this.models[key] = gltf;
        tick(); resolve();
      }, undefined, () => { this.missing.add(path); tick(); resolve(); });
    }));
    const iconJobs = ICON_LIST.map((id) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { tick(); resolve(); };
      img.onerror = () => { this.missing.add('icon:' + id); tick(); resolve(); };
      img.src = iconUrl(id);
    }));
    await Promise.all([...modelJobs, ...iconJobs]);
    if (this.missing.size) console.warn('Missing assets:', [...this.missing]);
  }

  has(key) { return !!this.models[key]; }

  // Returns {scene, animations}. Uses SkeletonUtils to properly clone rigs.
  clone(key) {
    const g = this.models[key];
    if (!g) return { scene: placeholder(key), animations: [] };
    return { scene: SkeletonUtils.clone(g.scene), animations: g.animations };
  }

  // Returns array of {geometry, material, matrix} for static instancing
  flatten(key) {
    const g = this.models[key];
    const out = [];
    const root = g ? g.scene : placeholder(key);
    root.updateMatrixWorld(true);
    root.traverse((o) => {
      if (o.isMesh) out.push({ geometry: o.geometry, material: o.material, matrix: o.matrixWorld.clone(), castShadow: o.castShadow });
    });
    return out;
  }
}

function placeholder(key) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xff00ff }));
  m.position.y = 0.5;
  g.add(m);
  g.name = key + '_placeholder';
  return g;
}

export const assets = new Assets();

// Build InstancedMeshes for a prop placed many times. transforms: array of Matrix4
export function instanceProp(key, transforms, { shadows = true } = {}) {
  const group = new THREE.Group();
  if (!transforms.length) return group;
  const parts = assets.flatten(key);
  const tmp = new THREE.Matrix4();
  for (const p of parts) {
    const im = new THREE.InstancedMesh(p.geometry, p.material, transforms.length);
    transforms.forEach((t, i) => { tmp.multiplyMatrices(t, p.matrix); im.setMatrixAt(i, tmp); });
    im.castShadow = shadows && p.castShadow;
    im.receiveShadow = true;
    im.computeBoundingSphere();
    group.add(im);
  }
  return group;
}
