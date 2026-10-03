import * as THREE from 'three';
import { assets, instanceProp } from '../core/assets.js';
import { ZONES } from '../data/monsters.js';
import { buildTerrain, buildGrass, buildWater, buildSky, buildLava, heightAt, pathDist, rng, LAKE, WORLD_HALF, SUN_DIR } from './terrain.js';
import { portalMaterial } from '../fx/materials.js';

const ZC = Object.fromEntries(ZONES.map((z) => [z.id, z]));

// Spatial hash of circular colliders
class Colliders {
  constructor(cell = 8) { this.cell = cell; this.map = new Map(); this.list = []; }
  key(ix, iz) { return ix * 73856093 ^ iz * 19349663; }
  add(x, z, r) {
    const c = { x, z, r };
    this.list.push(c);
    const ix0 = Math.floor((x - r) / this.cell), ix1 = Math.floor((x + r) / this.cell);
    const iz0 = Math.floor((z - r) / this.cell), iz1 = Math.floor((z + r) / this.cell);
    for (let ix = ix0; ix <= ix1; ix++) for (let iz = iz0; iz <= iz1; iz++) {
      const k = this.key(ix, iz);
      if (!this.map.has(k)) this.map.set(k, []);
      this.map.get(k).push(c);
    }
  }
  // push position out of colliders (mutates p)
  resolve(p, radius) {
    const k = this.key(Math.floor(p.x / this.cell), Math.floor(p.z / this.cell));
    const arr = this.map.get(k);
    if (arr) for (const c of arr) {
      const dx = p.x - c.x, dz = p.z - c.z;
      const d = Math.hypot(dx, dz), min = c.r + radius;
      if (d < min && d > 1e-4) { p.x = c.x + (dx / d) * min; p.z = c.z + (dz / d) * min; }
    }
    // world bounds
    const r = Math.hypot(p.x, p.z), lim = WORLD_HALF * 0.8;
    if (r > lim) { p.x *= lim / r; p.z *= lim / r; }
    // lake
    const ld = Math.hypot(p.x - LAKE.x, p.z - LAKE.z);
    if (ld < LAKE.r - 2) { p.x = LAKE.x + (p.x - LAKE.x) / ld * (LAKE.r - 2); p.z = LAKE.z + (p.z - LAKE.z) / ld * (LAKE.r - 2); }
  }
  free(x, z, r) {
    for (const c of this.list) if (Math.hypot(x - c.x, z - c.z) < c.r + r) return false;
    return true;
  }
}

export class World {
  constructor(engine) {
    this.engine = engine;
    this.scene = new THREE.Scene();
    this.colliders = new Colliders();
    this.heightAt = heightAt;
    this.updaters = [];
    this.npcs = [];
    this.interactables = [];
  }

  build() {
    const scene = this.scene;
    const q = this.engine.quality;
    this.fogColor = new THREE.Color(0xcfb6a2);
    scene.fog = new THREE.Fog(this.fogColor.clone(), 45, 280);
    this.sky = buildSky();
    scene.add(this.sky);
    // image based lighting from the sky -> shiny metals, coloured ambient
    {
      const pm = new THREE.PMREMGenerator(this.engine.renderer);
      const envScene = new THREE.Scene();
      const skyCopy = new THREE.Mesh(this.sky.geometry, this.sky.material);
      skyCopy.scale.setScalar(0.08);
      envScene.add(skyCopy);
      const groundDisc = new THREE.Mesh(new THREE.CircleGeometry(60, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x3a4628 }));
      groundDisc.position.y = -4;
      envScene.add(groundDisc);
      this.envRT = pm.fromScene(envScene, 0.02);
      scene.environment = this.envRT.texture;
      scene.environmentIntensity = 0.75;
      pm.dispose();
    }

    this.hemi = new THREE.HemisphereLight(0xbcd2ff, 0x6a5232, 0.55);
    scene.add(this.hemi);
    const sun = new THREE.DirectionalLight(0xffd2a0, 3.4);
    sun.castShadow = true;
    const sm = q === 'low' ? 1024 : 4096;
    sun.shadow.mapSize.set(sm, sm);
    const sc = sun.shadow.camera;
    sc.left = -38; sc.right = 38; sc.top = 38; sc.bottom = -38; sc.near = 1; sc.far = 260;
    sun.shadow.bias = -0.0003;
    sun.shadow.normalBias = 0.03;
    sun.shadow.radius = 2.5;
    scene.add(sun, sun.target);
    this.sun = sun;
    this.sunOffset = SUN_DIR.clone().multiplyScalar(120);
    sun.position.copy(this.sunOffset);

    this.terrain = buildTerrain(q);
    scene.add(this.terrain);
    scene.add(buildWater());

    this.placeTown();
    this.placeNature();
    this.placeZones();

    const isGrass = (x, z) => {
      if (Math.hypot(x, z) < 30) return null;
      if (pathDist(x, z) < 3) return null;
      if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 3) return null;
      if (Math.hypot(x - ZC.lair.x, z - ZC.lair.z) < ZC.lair.r * 1.4) return null;
      const h = heightAt(x, z);
      if (h > 13) return null;
      if (Math.hypot(x - ZC.ruins.x, z - ZC.ruins.z) < 30 && Math.random() < 0.6) return null;
      return Math.hypot(x - ZC.forest.x, z - ZC.forest.z) < 50 ? 'forest' : 'grass';
    };
    this.grass = buildGrass(q === 'low' ? 14000 : 42000, isGrass);
    scene.add(this.grass);

    this.buildAmbient();
  }

  inst(key, list, opts) {
    if (!list.length) return;
    const mats = list.map(([x, z, rot = 0, s = 1, y = null]) => {
      const m = new THREE.Matrix4();
      m.compose(new THREE.Vector3(x, y ?? heightAt(x, z) - 0.05, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rot, 0)), new THREE.Vector3(s, s, s));
      return m;
    });
    this.scene.add(instanceProp(key, mats, opts));
  }

  addModel(key, x, z, rot = 0, s = 1, y = null) {
    const { scene } = assets.clone(key);
    scene.position.set(x, y ?? heightAt(x, z), z);
    scene.rotation.y = rot;
    scene.scale.setScalar(s);
    this.scene.add(scene);
    return scene;
  }

  placeTown() {
    const C = this.colliders;
    // plaza ring of lanterns
    const lanterns = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.31;
      lanterns.push([Math.cos(a) * 13, Math.sin(a) * 13, -a + Math.PI / 2]);
      C.add(Math.cos(a) * 13, Math.sin(a) * 13, 0.5);
    }
    // path lanterns to each torii
    for (const [dx, dz] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      for (const d of [18, 26]) {
        for (const side of [-1, 1]) {
          const x = dx * d + dz * side * 3.6, z = dz * d - dx * side * 3.6;
          lanterns.push([x, z, Math.atan2(dx, dz)]); C.add(x, z, 0.5);
        }
      }
    }
    this.inst('lantern', lanterns);
    this.lanternSpots = lanterns;
    // torii gates at town exits facing outwards
    const torii = [];
    for (const [dx, dz] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const x = dx * 33, z = dz * 33;
      const rot = Math.atan2(dx, dz);
      torii.push([x, z, rot]);
      // pillars colliders
      const px = Math.cos(rot) * 2.6, pz = -Math.sin(rot) * 2.6;
      C.add(x + px, z + pz, 0.5); C.add(x - px, z - pz, 0.5);
    }
    this.inst('torii', torii);
    // houses
    const houses = [];
    const housePos = [[-24, -16], [24, -16], [-26, 10], [26, 12], [-14, 24], [14, 25], [-30, -2], [30, -2]];
    for (const [x, z] of housePos) {
      const rot = Math.atan2(-x, -z);
      houses.push([x, z, rot, 0.9]); C.add(x, z, 3.6);
    }
    this.inst('house', houses);
    // pagoda landmark
    this.addModel('pagoda', 0, -22, 0, 1); C.add(0, -22, 5);
    // forge (enhance) & gacha shrine
    this.forge = this.addModel('forge', 15, -6, -Math.PI / 2 + 0.4); C.add(15, -6, 2.2);
    this.shrine = this.addModel('gacha_shrine', -15, -6, Math.PI / 2 - 0.4); C.add(-15, -6, 2.4);
    // warp portal
    this.portal = this.addModel('portal', 0, 16, Math.PI); C.add(-2.3, 16, 0.6); C.add(2.3, 16, 0.6);
    const pm = new THREE.Mesh(new THREE.CircleGeometry(1.9, 48), portalMaterial());
    pm.position.set(0, heightAt(0, 16) + 2.4, 16);
    this.scene.add(pm);
    this.portalCenter = new THREE.Vector3(0, 0, 16);
    // sakura trees around town
    const sak = [];
    const r = rng(42);
    for (let i = 0; i < 22; i++) {
      const a = r() * Math.PI * 2, d = 19 + r() * 12;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (pathDist(x, z) < 4.5 || !C.free(x, z, 3)) continue;
      sak.push([x, z, r() * 6, 0.8 + r() * 0.4]); C.add(x, z, 0.7);
    }
    sak.push([-7, -27, 0, 1.1], [7, -27, 1, 1.1]); C.add(-7, -27, 0.7); C.add(7, -27, 0.7);
    this.inst('tree_sakura', sak);
    this.sakura = sak;
    // NPCs
    this.addNpc('npc_smith', 12.2, -3.6, 'enhance', 'ช่างตีเหล็ก บรอนโด', '⚒️ ตีบวกอาวุธ');
    this.addNpc('npc_maiden', -12.2, -3.6, 'gacha', 'มิโกะ ซากุระ', '✨ อัญเชิญกาชา');
    this.interactables.push({ kind: 'warp', pos: this.portalCenter, label: '🌀 ประตูวาร์ป', radius: 4 });
    // town fences
    const fences = [];
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const x = Math.cos(a) * 36, z = Math.sin(a) * 36;
      if (pathDist(x, z) < 6) continue;
      fences.push([x, z, -a]);
    }
    this.inst('fence', fences);
  }

  addNpc(key, x, z, kind, name, label) {
    const { scene, animations } = assets.clone(key);
    scene.position.set(x, heightAt(x, z), z);
    scene.lookAt(0, scene.position.y, 4);
    this.scene.add(scene);
    let mixer = null;
    if (animations.length) {
      mixer = new THREE.AnimationMixer(scene);
      const clip = animations.find((a) => a.name === 'Idle') || animations[0];
      mixer.clipAction(clip).play();
      this.updaters.push((dt) => mixer.update(dt));
    }
    this.colliders.add(x, z, 0.6);
    const npc = { kind, name, label, pos: scene.position, obj: scene, radius: 4 };
    this.npcs.push(npc);
    this.interactables.push(npc);
  }

  placeNature() {
    const C = this.colliders;
    const r = rng(7);
    const oaks = [], pines = [], rocks = { rock_a: [], rock_b: [], rock_c: [] };
    const tryPlace = (x, z, rad) => {
      if (Math.hypot(x, z) < 40) return false;
      if (pathDist(x, z) < 5) return false;
      if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 4) return false;
      if (Math.hypot(x, z) > WORLD_HALF * 0.86) return false;
      if (!C.free(x, z, rad)) return false;
      return true;
    };
    for (let i = 0; i < 2600 && (oaks.length + pines.length) < 520; i++) {
      const x = (r() - 0.5) * WORLD_HALF * 1.8, z = (r() - 0.5) * WORLD_HALF * 1.8;
      const nearForest = Math.hypot(x - ZC.forest.x, z - ZC.forest.z) < 55;
      const nearLair = Math.hypot(x - ZC.lair.x, z - ZC.lair.z) < 55;
      const nearMeadow = Math.hypot(x - ZC.meadow.x, z - ZC.meadow.z) < ZC.meadow.r * 0.8;
      const nearRuins = Math.hypot(x - ZC.ruins.x, z - ZC.ruins.z) < 40;
      if (nearLair) continue;
      // keep zone fighting areas open-ish
      const inCore = ZONES.some((zn) => zn.id !== 'town' && Math.hypot(x - zn.x, z - zn.z) < zn.r * 0.45);
      if (inCore && r() < 0.85) continue;
      const density = nearForest ? 1 : nearMeadow ? 0.15 : nearRuins ? 0.25 : 0.4;
      if (r() > density) continue;
      if (!tryPlace(x, z, 2.2)) continue;
      const s = 0.8 + r() * 0.6;
      if (nearForest || (heightAt(x, z) > 6 && r() < 0.7)) pines.push([x, z, r() * 6, s]);
      else oaks.push([x, z, r() * 6, s]);
      C.add(x, z, 0.8 * s);
    }
    for (let i = 0; i < 260; i++) {
      const x = (r() - 0.5) * WORLD_HALF * 1.7, z = (r() - 0.5) * WORLD_HALF * 1.7;
      if (!tryPlace(x, z, 2)) continue;
      const k = ['rock_a', 'rock_b', 'rock_c'][Math.floor(r() * 3)];
      const s = 0.6 + r() * 0.9;
      rocks[k].push([x, z, r() * 6, s, heightAt(x, z) - 0.2]);
      C.add(x, z, 0.9 * s);
    }
    this.inst('tree_oak', oaks);
    this.inst('tree_pine', pines);
    for (const k in rocks) this.inst(k, rocks[k]);
    // bridge over lake edge
    this.addModel('bridge', LAKE.x - LAKE.r + 2, LAKE.z + 4, 0.6, 1);
  }

  placeZones() {
    const C = this.colliders;
    const r = rng(1234);
    // ruins
    const zr = ZC.ruins;
    const pillars = [], arches = [], crystals = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2, d = zr.r * (0.55 + r() * 0.35);
      const x = zr.x + Math.cos(a) * d, z = zr.z + Math.sin(a) * d;
      if (!C.free(x, z, 1.5)) continue;
      pillars.push([x, z, r() * 6, 0.9 + r() * 0.4]); C.add(x, z, 0.9);
    }
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4, d = zr.r * 0.78;
      const x = zr.x + Math.cos(a) * d, z = zr.z + Math.sin(a) * d;
      arches.push([x, z, -a + Math.PI / 2, 1.1]);
      const ox = Math.cos(-a + Math.PI / 2) * 2.2, oz = -Math.sin(-a + Math.PI / 2) * 2.2;
      C.add(x + ox, z + oz, 0.8); C.add(x - ox, z - oz, 0.8);
    }
    for (let i = 0; i < 12; i++) {
      const a = r() * Math.PI * 2, d = zr.r * (0.3 + r() * 0.7);
      const x = zr.x + Math.cos(a) * d, z = zr.z + Math.sin(a) * d;
      if (!C.free(x, z, 1.2)) continue;
      crystals.push([x, z, r() * 6, 0.7 + r() * 0.8]); C.add(x, z, 0.6);
    }
    // forest crystals
    const zf = ZC.forest;
    for (let i = 0; i < 6; i++) {
      const a = r() * Math.PI * 2, d = zf.r * (0.3 + r() * 0.6);
      const x = zf.x + Math.cos(a) * d, z = zf.z + Math.sin(a) * d;
      if (!C.free(x, z, 1.2)) continue;
      crystals.push([x, z, r() * 6, 0.6 + r() * 0.5]); C.add(x, z, 0.5);
    }
    this.inst('pillar_ruin', pillars);
    this.inst('arch_ruin', arches);
    this.inst('crystal', crystals);
    // lair: dark rocks, lava pools, red crystals
    const zl = ZC.lair;
    const lrocks = [];
    for (let i = 0; i < 26; i++) {
      const a = r() * Math.PI * 2, d = zl.r * (0.85 + r() * 0.6);
      const x = zl.x + Math.cos(a) * d, z = zl.z + Math.sin(a) * d;
      if (pathDist(x, z) < 5) continue;
      const s = 1.2 + r() * 1.8;
      lrocks.push([x, z, r() * 6, s, heightAt(x, z) - 0.3]); C.add(x, z, 1.0 * s);
    }
    this.inst('rock_b', lrocks);
    for (let i = 0; i < 7; i++) {
      const a = r() * Math.PI * 2, d = zl.r * (0.55 + r() * 0.4);
      const x = zl.x + Math.cos(a) * d, z = zl.z + Math.sin(a) * d;
      if (pathDist(x, z) < 6) continue;
      const rr = 2.5 + r() * 3.5;
      this.scene.add(buildLava(x, z, rr));
    }
    const redCr = [];
    for (let i = 0; i < 10; i++) {
      const a = r() * Math.PI * 2, d = zl.r * (0.7 + r() * 0.5);
      const x = zl.x + Math.cos(a) * d, z = zl.z + Math.sin(a) * d;
      redCr.push([x, z, r() * 6, 1 + r()]);
    }
    const crGroup = instanceProp('crystal', redCr.map(([x, z, rot, s]) => new THREE.Matrix4().compose(new THREE.Vector3(x, heightAt(x, z), z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rot, 0)), new THREE.Vector3(s, s, s))));
    crGroup.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); if (o.material.emissive) o.material.emissive.set(0xff3a10); o.material.color.set(0x802010); } });
    this.scene.add(crGroup);
    // a lair entrance portal ring
    this.addModel('portal', zl.x + zl.r * 0.95, zl.z, Math.PI / 2, 1.2);
    // pillars around lair
    const lp = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const x = zl.x + Math.cos(a) * zl.r * 0.75, z = zl.z + Math.sin(a) * zl.r * 0.75;
      lp.push([x, z, a, 1.3]); C.add(x, z, 1.1);
    }
    this.inst('pillar_ruin', lp);
  }

  buildAmbient() {
    // falling sakura petals around town + fireflies elsewhere (simple points)
    const N = 700;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3), seeds = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 70; pos[i * 3 + 1] = Math.random() * 14; pos[i * 3 + 2] = (Math.random() - 0.5) * 70;
      seeds[i] = Math.random() * 100;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('seed', new THREE.BufferAttribute(seeds, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uTime: { value: 0 }, uScale: { value: window.innerHeight * 0.5 } },
      vertexShader: `attribute float seed; uniform float uTime; uniform float uScale; varying float vS;
        void main(){
          vec3 p = position;
          float t = uTime * 0.6 + seed;
          p.y = mod(p.y - uTime * 0.9 - seed, 14.0);
          p.x += sin(t * 1.3) * 1.5 + uTime * 0.4; p.z += cos(t * 0.9) * 1.2;
          p.x = mod(p.x + 35.0, 70.0) - 35.0;
          vS = seed;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = 0.16 * uScale / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `varying float vS;
        void main(){ vec2 c = gl_PointCoord - 0.5; c.x *= 1.8 + sin(vS)*0.6; float d = length(c); if (d > 0.5) discard;
          gl_FragColor = vec4(mix(vec3(1.0,0.72,0.82), vec3(1.0,0.88,0.93), fract(vS)), 0.9); }`,
    });
    const petals = new THREE.Points(geo, mat);
    petals.frustumCulled = false;
    this.scene.add(petals);
    this.updaters.push((dt) => { mat.uniforms.uTime.value += dt; });
    this.petals = petals;
  }

  zoneAt(x, z) {
    let best = null, bd = 1e9;
    for (const zn of ZONES) {
      const d = Math.hypot(x - zn.x, z - zn.z);
      if (d < zn.r * 1.25 && d < bd) { best = zn; bd = d; }
    }
    return best;
  }

  update(dt, playerPos) {
    for (const u of this.updaters) u(dt);
    if (this.grass) this.grass.userData.update(dt, playerPos);
    if (playerPos) {
      this.sun.position.copy(playerPos).add(this.sunOffset);
      this.sun.target.position.copy(playerPos);
      // atmosphere blend near lair
      const zl = ZC.lair;
      const d = Math.hypot(playerPos.x - zl.x, playerPos.z - zl.z);
      const k = 1 - THREE.MathUtils.smoothstep(d, zl.r * 0.8, zl.r * 1.8);
      this.scene.fog.color.copy(this.fogColor).lerp(new THREE.Color(0x3a1510), k);
      this.scene.fog.far = 280 - k * 150;
      this.scene.fog.near = 45 - k * 25;
      this.sky.material.uniforms.uTint.value.set(0x4a140c);
      this.sky.material.uniforms.uTintAmt.value = k * 0.85;
      this.hemi.intensity = 0.55 - k * 0.2;
      this.scene.environmentIntensity = 0.75 - k * 0.35;
      this.sun.color.set(0xffd2a0).lerp(new THREE.Color(0xff6a3a), k);
    }
  }
}
