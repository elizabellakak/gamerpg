import * as THREE from 'three';
import { ZONES } from '../data/monsters.js';
import { noiseTex } from '../fx/textures.js';
import { globalUniforms } from '../fx/materials.js';

// ---------- seeded noise ----------
let seed = 1337;
export function rng(s) { let x = s; return () => ((x = (x * 16807) % 2147483647) / 2147483647); }
const perm = new Uint8Array(512);
{ const r = rng(seed); const p = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) perm[i] = p[i & 255]; }
function grad(h, x, y) { const g = h & 7; const u = g < 4 ? x : y, v = g < 4 ? y : x; return ((g & 1) ? -u : u) + ((g & 2) ? -2 * v : 2 * v); }
export function noise2(x, y) {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
  x -= Math.floor(x); y -= Math.floor(y);
  const u = x * x * x * (x * (x * 6 - 15) + 10), v = y * y * y * (y * (y * 6 - 15) + 10);
  const a = perm[X] + Y, b = perm[X + 1] + Y;
  const l1 = grad(perm[a], x, y) + u * (grad(perm[b], x - 1, y) - grad(perm[a], x, y));
  const l2 = grad(perm[a + 1], x, y - 1) + u * (grad(perm[b + 1], x - 1, y - 1) - grad(perm[a + 1], x, y - 1));
  return (l1 + v * (l2 - l1)) * 0.25;
}
export function fbm(x, y, oct = 4) { let v = 0, a = 1, f = 1, n = 0; for (let i = 0; i < oct; i++) { v += noise2(x * f, y * f) * a; n += a; a *= 0.5; f *= 2; } return v / n; }

export const WORLD_SIZE = 380;
export const WORLD_HALF = WORLD_SIZE / 2;

const ZC = Object.fromEntries(ZONES.map((z) => [z.id, z]));
const PATHS = ['meadow', 'forest', 'ruins', 'lair'].map((id) => [0, 0, ZC[id].x, ZC[id].z]);
PATHS.push([ZC.forest.x, ZC.forest.z, ZC.ruins.x, ZC.ruins.z]);

function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}
export function pathDist(x, z) {
  let d = 1e9;
  for (const p of PATHS) {
    // wobble the path
    const w = noise2(x * 0.03, z * 0.03) * 6;
    d = Math.min(d, segDist(x + w, z - w, p[0], p[1], p[2], p[3]));
  }
  return d;
}

export const LAKE = { x: 52, z: -48, r: 17 };

export function heightAt(x, z) {
  let h = fbm(x * 0.012, z * 0.012, 4) * 9 + fbm(x * 0.05, z * 0.05, 2) * 1.2;
  // mountains on border
  const r = Math.hypot(x, z);
  const edge = Math.max(0, r - WORLD_HALF * 0.78);
  h += edge * edge * 0.035 + Math.max(0, fbm(x * 0.02 + 5, z * 0.02, 3)) * edge * 0.6;
  // flatten town
  const dt = Math.hypot(x, z);
  const townF = THREE.MathUtils.smoothstep(dt, 30, 46);
  h = h * townF + 0.3 * (1 - townF);
  // flatten zone centers a bit
  for (const zn of ZONES) {
    if (zn.id === 'town') continue;
    const d = Math.hypot(x - zn.x, z - zn.z);
    const f = THREE.MathUtils.smoothstep(d, zn.r * 0.4, zn.r * 1.1);
    const base = zn.id === 'lair' ? -0.5 : 0.8;
    h = h * (0.35 + 0.65 * f) + base * (1 - f) * 0.65;
  }
  // paths smooth
  const pd = pathDist(x, z);
  const pf = THREE.MathUtils.smoothstep(pd, 2, 8);
  h = h * (0.5 + 0.5 * pf) + (h * 0.5) * (1 - pf) * 0.6;
  // lake
  const ld = Math.hypot(x - LAKE.x, z - LAKE.z);
  if (ld < LAKE.r + 8) {
    const k = THREE.MathUtils.smoothstep(ld, LAKE.r - 6, LAKE.r + 8);
    h = h * k + (-2.6) * (1 - k);
  }
  return h;
}

function zoneInfluence(x, z, id) {
  const zn = ZC[id];
  const d = Math.hypot(x - zn.x, z - zn.z);
  return 1 - THREE.MathUtils.smoothstep(d, zn.r * 0.6, zn.r * 1.5);
}

function groundDetailTex() {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#e6e6e6'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 5000; i++) {
    const v = 190 + Math.random() * 65;
    g.fillStyle = `rgb(${v},${v},${v})`;
    const x = Math.random() * S, y = Math.random() * S;
    g.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 3);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.repeat.set(90, 90);
  t.anisotropy = 8;
  return t;
}

export function buildTerrain(quality = 'high') {
  const segs = quality === 'low' ? 150 : 230;
  const geo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, segs, segs);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const cGrass1 = new THREE.Color(0x5e9a3a), cGrass2 = new THREE.Color(0x8cbf4a), cGrass3 = new THREE.Color(0x3f7a33);
  const cDirt = new THREE.Color(0xb89566), cStone = new THREE.Color(0x8a8578), cSand = new THREE.Color(0xd9c48e);
  const cTown = new THREE.Color(0xc9b58f), cForest = new THREE.Color(0x2f5e2c), cRuin = new THREE.Color(0xa59a7a);
  const cLair = new THREE.Color(0x2a1714), cLair2 = new THREE.Color(0x5a2418), cSnow = new THREE.Color(0xe8eef5), cRock = new THREE.Color(0x6d6a66);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = heightAt(x, z);
    pos.setY(i, h);
    const n = fbm(x * 0.08, z * 0.08, 2) * 0.5 + 0.5;
    c.copy(cGrass1).lerp(cGrass2, n);
    c.lerp(cGrass3, Math.max(0, fbm(x * 0.02 + 3, z * 0.02, 2)) * 1.2);
    c.lerp(cForest, zoneInfluence(x, z, 'forest') * 0.7);
    c.lerp(cRuin, zoneInfluence(x, z, 'ruins') * 0.55 * (0.6 + n * 0.6));
    const lair = zoneInfluence(x, z, 'lair');
    if (lair > 0) c.lerp(cLair, lair * 0.95).lerp(cLair2, lair * Math.max(0, fbm(x * 0.1, z * 0.1, 2)) * 1.5);
    const pd = pathDist(x, z);
    c.lerp(cDirt, (1 - THREE.MathUtils.smoothstep(pd, 1.6, 3.6)) * 0.85 * (lair > 0.5 ? 0.3 : 1));
    const dt = Math.hypot(x, z);
    if (dt < 30) c.lerp(cTown, (1 - THREE.MathUtils.smoothstep(dt, 22, 30)) * 0.85);
    const ld = Math.hypot(x - LAKE.x, z - LAKE.z);
    if (ld < LAKE.r + 5) c.lerp(cSand, 1 - THREE.MathUtils.smoothstep(ld, LAKE.r - 2, LAKE.r + 5));
    if (h > 14) c.lerp(cRock, THREE.MathUtils.smoothstep(h, 14, 22));
    if (h > 30) c.lerp(cSnow, THREE.MathUtils.smoothstep(h, 30, 40));
    if (Math.hypot(x, z) < 15) c.lerp(cStone, 0.55 * (1 - THREE.MathUtils.smoothstep(Math.hypot(x, z), 12, 15)));
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, map: groundDetailTex() });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.name = 'terrain';
  return mesh;
}

// Instanced wind-blown grass
export function buildGrass(count, isGrassAt) {
  const blade = new THREE.BufferGeometry();
  const w = 0.09, h = 0.7;
  blade.setAttribute('position', new THREE.Float32BufferAttribute([-w, 0, 0, w, 0, 0, -w * 0.6, h * 0.5, 0, w * 0.6, h * 0.5, 0, 0, h, 0], 3));
  blade.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 0.5, 1, 0.5, 0.5, 1], 2));
  blade.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]);
  blade.computeVertexNormals();
  const mat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uPlayer: { value: new THREE.Vector3() } }]),
    vertexShader: `
      #include <common>
      #include <fog_pars_vertex>
      uniform float uTime; uniform vec3 uPlayer;
      attribute vec3 aColor; varying vec3 vColor; varying float vH;
      void main(){
        vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
        float h = uv.y;
        float wind = sin(uTime * 1.8 + wp.x * 0.35 + wp.z * 0.2) * 0.25 + sin(uTime * 3.1 + wp.x * 1.1) * 0.08;
        wp.x += wind * h * h;
        wp.z += wind * 0.5 * h * h;
        vec2 away = wp.xz - uPlayer.xz; float d = length(away);
        if (d < 1.4) { wp.xz += normalize(away + 0.001) * (1.4 - d) * h * 0.8; wp.y -= (1.4 - d) * h * 0.25; }
        vColor = aColor; vH = h;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      #include <common>
      #include <fog_pars_fragment>
      varying vec3 vColor; varying float vH;
      void main(){
        vec3 c = vColor * (0.45 + vH * 0.75);
        c += vec3(0.08, 0.1, 0.02) * pow(vH, 3.0);
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  const im = new THREE.InstancedMesh(blade, mat, count);
  const colors = new Float32Array(count * 3);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const e = new THREE.Euler();
  const base = new THREE.Color(0x6fae3f), alt = new THREE.Color(0x9ccc52), dark = new THREE.Color(0x4c8a33);
  const cc = new THREE.Color();
  let n = 0, tries = 0;
  const r = rng(99);
  while (n < count && tries < count * 6) {
    tries++;
    const x = (r() - 0.5) * WORLD_SIZE * 0.82, z = (r() - 0.5) * WORLD_SIZE * 0.82;
    const info = isGrassAt(x, z);
    if (!info) continue;
    p.set(x, heightAt(x, z), z);
    e.set((r() - 0.5) * 0.3, r() * Math.PI, (r() - 0.5) * 0.3);
    q.setFromEuler(e);
    const sc = 0.7 + r() * 0.9;
    s.set(sc, sc * (0.8 + r() * 0.6), sc);
    m.compose(p, q, s);
    im.setMatrixAt(n, m);
    cc.copy(base).lerp(alt, r()).lerp(dark, r() * 0.5);
    if (info === 'forest') cc.multiplyScalar(0.7);
    if (r() < 0.02) cc.set(r() < 0.5 ? 0xffd2e6 : 0xfff3a0); // flowers
    colors[n * 3] = cc.r; colors[n * 3 + 1] = cc.g; colors[n * 3 + 2] = cc.b;
    n++;
  }
  im.count = n;
  blade.setAttribute('aColor', new THREE.InstancedBufferAttribute(colors, 3));
  im.frustumCulled = false;
  im.userData.update = (dt, playerPos) => { mat.uniforms.uTime.value += dt; if (playerPos) mat.uniforms.uPlayer.value.copy(playerPos); };
  return im;
}

export function buildWater() {
  const geo = new THREE.CircleGeometry(LAKE.r + 6, 64).rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    transparent: true, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: globalUniforms.uTime, uNoise: { value: noiseTex() } }]),
    vertexShader: `
      #include <common>
      #include <fog_pars_vertex>
      varying vec3 vW; varying vec3 vV;
      void main(){ vec4 wp = modelMatrix * vec4(position,1.0); vW = wp.xyz; vec4 mvPosition = viewMatrix * wp; vV = normalize(cameraPosition - wp.xyz); gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: `
      #include <common>
      #include <fog_pars_fragment>
      uniform float uTime; uniform sampler2D uNoise; varying vec3 vW; varying vec3 vV;
      void main(){
        vec2 uv = vW.xz * 0.05;
        float n1 = texture2D(uNoise, uv + vec2(uTime * 0.02, uTime * 0.013)).r;
        float n2 = texture2D(uNoise, uv * 1.7 - vec2(uTime * 0.017, -uTime * 0.021)).r;
        vec3 nrm = normalize(vec3((n1 - 0.5) * 0.6, 1.0, (n2 - 0.5) * 0.6));
        float fr = pow(1.0 - max(0.0, dot(nrm, normalize(vV))), 3.0);
        vec3 deep = vec3(0.02, 0.18, 0.28), shallow = vec3(0.1, 0.5, 0.55), sky = vec3(0.65, 0.8, 0.95);
        vec3 c = mix(deep, shallow, n1 * 0.6) ;
        c = mix(c, sky, fr * 0.8);
        float spec = pow(max(0.0, dot(reflect(-normalize(vec3(-0.4, 0.6, -0.5)), nrm), normalize(vV))), 80.0);
        c += vec3(1.0, 0.95, 0.8) * spec * 2.0;
        float sparkle = smoothstep(0.78, 0.8, n1 * n2 * 2.0) * 1.5;
        c += sparkle;
        gl_FragColor = vec4(c, 0.88);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  const m = new THREE.Mesh(geo, mat);
  m.position.set(LAKE.x, -0.9, LAKE.z);
  return m;
}

export function buildSky() {
  const geo = new THREE.SphereGeometry(900, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      uTop: { value: new THREE.Color(0x2a63c9) }, uHorizon: { value: new THREE.Color(0xf6c9a0) }, uBottom: { value: new THREE.Color(0x9fb3c8) },
      uSunDir: { value: new THREE.Vector3(-0.45, 0.35, -0.6).normalize() }, uTime: globalUniforms.uTime, uNoise: { value: noiseTex() },
      uTint: { value: new THREE.Color(1, 1, 1) }, uTintAmt: { value: 0 },
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
    fragmentShader: `
      uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uBottom; uniform vec3 uSunDir; uniform float uTime; uniform sampler2D uNoise; uniform vec3 uTint; uniform float uTintAmt;
      varying vec3 vDir;
      void main(){
        float y = vDir.y;
        vec3 c = y > 0.0 ? mix(uHorizon, uTop, pow(y, 0.55)) : mix(uHorizon, uBottom, pow(-y, 0.4));
        float sd = max(0.0, dot(vDir, uSunDir));
        c += vec3(1.0, 0.85, 0.6) * pow(sd, 8.0) * 0.5 + vec3(1.0, 0.95, 0.85) * pow(sd, 400.0) * 6.0;
        // clouds
        if (y > 0.02) {
          vec2 uv = vDir.xz / (y + 0.15) * 0.35 + vec2(uTime * 0.004, 0.0);
          float n = texture2D(uNoise, uv).r * 0.6 + texture2D(uNoise, uv * 2.3).r * 0.4;
          float cl = smoothstep(0.5, 0.75, n) * smoothstep(0.02, 0.25, y);
          vec3 cc = mix(vec3(1.0, 0.92, 0.85), vec3(1.0), y) * (0.85 + pow(sd, 4.0) * 0.4);
          c = mix(c, cc, cl * 0.75);
        }
        c = mix(c, uTint, uTintAmt);
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const sky = new THREE.Mesh(geo, mat);
  sky.frustumCulled = false;
  sky.renderOrder = -10;
  return sky;
}

export function buildLava(x, z, r) {
  const geo = new THREE.CircleGeometry(r, 40).rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: globalUniforms.uTime, uNoise: { value: noiseTex() } },
    vertexShader: `varying vec3 vW; void main(){ vec4 wp = modelMatrix * vec4(position,1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: `uniform float uTime; uniform sampler2D uNoise; varying vec3 vW;
      void main(){
        float n = texture2D(uNoise, vW.xz * 0.08 + vec2(uTime * 0.02, uTime * 0.01)).r;
        float n2 = texture2D(uNoise, vW.xz * 0.15 - vec2(uTime * 0.03, 0.0)).r;
        float v = n * n2 * 2.2;
        vec3 c = mix(vec3(0.6, 0.05, 0.0), vec3(1.0, 0.55, 0.05), smoothstep(0.3, 0.8, v));
        c += vec3(1.0, 0.9, 0.4) * smoothstep(0.75, 0.95, v) * 2.0;
        c *= 1.0 - smoothstep(0.35, 0.2, v) * 0.85;
        gl_FragColor = vec4(c * 2.2, 1.0);
      }`,
  });
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, heightAt(x, z) + 0.08, z);
  return m;
}
