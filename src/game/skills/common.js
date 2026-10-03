import * as THREE from 'three';
import { assets } from '../../core/assets.js';
import { ghostMaterial, basicAdd } from '../../fx/materials.js';

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const C = (c) => (c instanceof THREE.Color ? c : new THREE.Color(c));

// nearest target (faces it) or a point in front
export function targetPoint(p, maxDist = 14, fwd = 7) {
  const g = p.game;
  const m = p.faceNearest(maxDist);
  p.yaw = p.targetYaw;
  const c = m ? m.position.clone() : p.position.clone().add(p.forward().multiplyScalar(fwd));
  c.y = g.world.heightAt(c.x, c.z);
  return { point: c, target: m };
}

export function hitCircle(p, c, r, mult, opts = {}) {
  const g = p.game;
  return g.combat.inCircle(c, r * (1 + (g.stats.mastery.aoe || 0) / 100), (m) => g.combat.playerHit(m, p.skillMult(mult), { color: p.elColor, from: c, ...opts }));
}

// capsule along dir; hitSet prevents double hits
export function hitLine(p, from, dir, len, width, mult, opts = {}, hitSet = null) {
  const g = p.game;
  let n = 0;
  for (const m of g.combat.monsters) {
    if (m.dead || (hitSet && hitSet.has(m))) continue;
    const dx = m.position.x - from.x, dz = m.position.z - from.z;
    const t = dx * dir.x + dz * dir.z;
    if (t < -m.tpl.radius || t > len + m.tpl.radius) continue;
    const px = dx - dir.x * t, pz = dz - dir.z * t;
    if (Math.hypot(px, pz) > width + m.tpl.radius) continue;
    if (hitSet) hitSet.add(m);
    g.combat.playerHit(m, p.skillMult(mult), { color: p.elColor, from, ...opts });
    n++;
  }
  return n;
}

// ---------- projectiles ----------
let arrowGeo = null;
function arrowObject(color) {
  if (!arrowGeo) {
    const shaft = new THREE.CylinderGeometry(0.025, 0.025, 1.1, 5).rotateX(Math.PI / 2);
    const head = new THREE.ConeGeometry(0.07, 0.22, 6).rotateX(Math.PI / 2).translate(0, 0, 0.66);
    const fl = new THREE.BoxGeometry(0.005, 0.12, 0.22).translate(0, 0, -0.45);
    arrowGeo = { shaft, head, fl };
  }
  const g = new THREE.Group();
  const mShaft = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.6 });
  const mHead = new THREE.MeshStandardMaterial({ color: 0x444444, emissive: color, emissiveIntensity: 2, metalness: 0.8, roughness: 0.3 });
  g.add(new THREE.Mesh(arrowGeo.shaft, mShaft), new THREE.Mesh(arrowGeo.head, mHead));
  const f1 = new THREE.Mesh(arrowGeo.fl, basicAdd(color, 0.9)); const f2 = f1.clone(); f2.rotation.z = Math.PI / 2;
  g.add(f1, f2);
  g.userData.mats = [mShaft, mHead, f1.material];
  return g;
}

// o: {from, dir, speed, range, radius, mult, kind, color, color2, size, pierce, onHit, onEnd, homing, heavy}
export function projectile(p, o) {
  const g = p.game, fx = p.fx;
  const dir = o.dir.clone().normalize();
  const pos = o.from.clone();
  const c1 = C(o.color ?? p.elColor), c2 = C(o.color2 ?? p.elColor2);
  const size = o.size ?? 1;
  let obj;
  if (o.kind === 'arrow') {
    obj = arrowObject(c1);
    obj.scale.setScalar(size);
  } else {
    obj = new THREE.Group();
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.22 * size, 14, 10), basicAdd(0xffffff, 1));
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: fx.glow.mat.uniforms.uTex.value, color: c1, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    halo.scale.setScalar(1.6 * size);
    obj.add(core, halo);
    obj.userData.mats = [core.material, halo.material];
    obj.userData.geo = core.geometry;
  }
  obj.position.copy(pos);
  obj.lookAt(pos.clone().add(dir));
  g.world.scene.add(obj);
  const hitSet = new Set();
  let travelled = 0;
  const speed = o.speed ?? 40, range = o.range ?? 26, radius = o.radius ?? 0.8;
  const end = (at) => { o.onEnd && o.onEnd(at); };
  return fx.add({
    update: (dt) => {
      if (o.homing && !o.homing.dead) {
        const want = o.homing.position.clone(); want.y += o.homing.tpl.height * 0.5;
        dir.lerp(want.sub(pos).normalize(), Math.min(1, dt * 6)).normalize();
        obj.lookAt(pos.clone().add(dir));
      }
      const step = speed * dt;
      pos.addScaledVector(dir, step);
      travelled += step;
      obj.position.copy(pos);
      // trail
      if (o.kind === 'arrow') {
        fx.glow.emit(pos.x, pos.y, pos.z, 0, 0, 0, 0.18, 0.25 * size, c1, { color1: c2, size1: 0 });
      } else {
        for (let i = 0; i < 2; i++) fx.glow.emit(pos.x + (Math.random() - 0.5) * 0.3 * size, pos.y + (Math.random() - 0.5) * 0.3 * size, pos.z + (Math.random() - 0.5) * 0.3 * size, -dir.x * 2, 0.5, -dir.z * 2, 0.35, 0.7 * size, c1, { color1: c2, size1: 0, drag: 1 });
        if (Math.random() < 0.5) fx.sparks.emit(pos.x, pos.y, pos.z, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, 0.25, 0.25, c2, { drag: 2 });
      }
      // hits
      for (const m of g.combat.monsters) {
        if (m.dead || hitSet.has(m)) continue;
        const dx = m.position.x - pos.x, dz = m.position.z - pos.z;
        const dy = (m.position.y + m.tpl.height * 0.5) - pos.y;
        if (Math.hypot(dx, dz) < m.tpl.radius + radius && Math.abs(dy) < m.tpl.height * 0.7 + radius) {
          hitSet.add(m);
          if (o.mult) g.combat.playerHit(m, o.mult, { color: c1, from: p.position, knock: o.knock ?? 0.5, heavy: o.heavy });
          o.onHit && o.onHit(m, pos.clone());
          if (!o.pierce) { end(pos.clone()); return false; }
        }
      }
      if (pos.y < g.world.heightAt(pos.x, pos.z) + 0.05) { end(pos.clone()); return false; }
      return travelled < range;
    },
    dispose: () => {
      g.world.scene.remove(obj);
      (obj.userData.mats || []).forEach((m) => m.dispose());
      if (obj.userData.geo) obj.userData.geo.dispose();
    },
  });
}

// aim direction toward nearest monster in range (slight vertical aim), else forward
export function aimDir(p, from, range = 26) {
  const m = p.game.combat.nearest(p.position, range);
  if (m) {
    p.targetYaw = p.yaw = Math.atan2(m.position.x - p.position.x, m.position.z - p.position.z);
    const t = m.position.clone(); t.y += m.tpl.height * 0.5;
    return { dir: t.sub(from).normalize(), target: m };
  }
  return { dir: p.forward().clone(), target: null };
}

// glowing translucent copy of the equipped weapon
export function spectralWeapon(p, scale, color, color2, { rainbow = false } = {}) {
  const { scene } = assets.clone(p.weaponDef.id);
  const mat = ghostMaterial(color2);
  scene.traverse((o) => { if (o.isMesh) { o.material = mat; o.castShadow = false; } });
  const holder = new THREE.Group();
  holder.add(scene);
  holder.scale.setScalar(scale);
  const shell = p.fx.shell(scene, color, color2, { thickness: 0.02, intensity: 1.3, flame: 1.5, rainbow: rainbow ? 1 : 0 });
  p.game.world.scene.add(holder);
  return {
    holder, inner: scene, mat, shell,
    setOpacity(k) { mat.uniforms.uOpacity.value = k; shell.material.uniforms.uIntensity.value = 1.3 * k; },
    dispose() { p.game.world.scene.remove(holder); shell.dispose(); mat.dispose(); },
  };
}

export function explosion(p, at, { color, color2, radius = 3, mult = 0, big = false, opts = {} } = {}) {
  const g = p.game, fx = p.fx;
  const c1 = C(color ?? p.elColor), c2 = C(color2 ?? p.elColor2);
  const ground = at.clone(); ground.y = g.world.heightAt(at.x, at.z);
  fx.shockwave(ground, { color: c1, radius: radius * 1.2, duration: 0.45 });
  fx.glow.burst(at, big ? 90 : 45, { speed: radius * 3, up: 2, life: 0.55, lifeVar: 0.3, size: big ? 1.1 : 0.8, color: c2, color1: c1, drag: 2.5 });
  fx.sparks.burst(at, big ? 50 : 24, { speed: radius * 4.5, up: 3, life: 0.45, size: 0.5, color: new THREE.Color(1, 1, 1), color1: c1, gravity: 8, drag: 1.5 });
  fx.flare(at, c2, radius * 1.1, 0.2);
  fx.light(at, c1, big ? 50 : 25, 0.35, radius * 4);
  fx.scorch(ground, radius * 0.8, c1, 4);
  if (big) { fx.debris(ground, { count: 18, speed: 9 }); g.engine.ripple(at, 1.0, 1.2, 0.35); g.engine.shake(0.7); g.audio.play('boom'); }
  else { g.engine.shake(0.25); g.audio.play('hit', { pitch: 0.6 }); }
  if (mult) hitCircle(p, ground, radius, mult, { knock: big ? 2 : 1, ...opts });
}
