// Wizard (Silkroad Online EU) - all 44 spells shown in the reference clip.
// Every spell shares one flow: element cast circle under the caster while the staff is held out (charge),
// staff snapped upright on release, then the spell's own effect. Timings / sizes follow the frame-by-frame
// notes of the clip (1 ch = one character height).
import * as THREE from 'three';
import { V, targetPoint, hitCircle } from './common.js';
import { basicAdd, ringMaterial } from '../../fx/materials.js';

const CH = 1.85;
const TAU = Math.PI * 2;
const W = new THREE.Color(1, 1, 1);
const col = (c) => (c instanceof THREE.Color ? c.clone() : new THREE.Color(c));
const rnd = (a = 1) => (Math.random() - 0.5) * 2 * a;

// cast circle palettes per element (Lv80 lines turn pink/magenta as in the clip)
const EL = {
  earth: { ring: 0xffc848, ring2: 0xfff0a8, tip: 0xfff2c0, pebbles: true },
  earthW: { ring: 0xfff4d8, ring2: 0xffffff, tip: 0xffffff, tex: 'disc', fill: 0.35 },
  cold: { ring: 0xa8e8ff, ring2: 0xe8fbff, tip: 0xd8f4ff, flare: 0x2f6cff, flare2: 0xa8dcff },
  cold80: { ring: 0xfff0ff, ring2: 0xffffff, tip: 0xffe8ff, flare: 0xff3ac8, flare2: 0xffb0f0, tex: 'disc', fill: 0.3 },
  coldV: { ring: 0x9a8cff, ring2: 0xd8d0ff, tip: 0xd8d0ff, flare: 0x3a5cff, flare2: 0xa0b8ff },
  fire: { ring: 0xffa424, ring2: 0xffe08a, tip: 0xffd060 },
  fireR: { ring: 0xff5a24, ring2: 0xffb080, tip: 0xff9060 },
  fireDisc: { ring: 0xffa424, ring2: 0xffe08a, tip: 0xffd060, tex: 'disc', fill: 0.4 },
  light: { ring: 0xd0dcff, ring2: 0xffffff, tip: 0xe0e8ff, pillar: 0xa070ff, orb: 0xb48cff },
  light80: { ring: 0xffe0f4, ring2: 0xffffff, tip: 0xffe0ff, pillar: 0xff58d8, orb: 0xff7ae4, pillarH: 1.5 },
  lightV: { ring: 0x9a8cff, ring2: 0xd8d0ff, tip: 0xd8d0ff, pillar: 0x9a5cff, orb: 0xa070ff, pillarH: 1.5 },
  life: { ring: 0xff2a2a, ring2: 0xff8080, tip: 0x9dffb0, tex: 'rune3' },
  lifeO: { ring: 0xff5a20, ring2: 0xffa070, tip: 0x9dffb0, tex: 'rune3' },
};

// ---------------------------------------------------------------- helpers
function tip(p) { return p.tipNode ? p.tipNode.getWorldPosition(new THREE.Vector3()) : p.position.clone().add(V(0, 1.8, 0)); }
function chest(m) { const q = m.position.clone(); q.y += m.tpl ? m.tpl.height * 0.55 : 1.1; return q; }
function ground(p, v) { const q = v.clone(); q.y = p.game.world.heightAt(q.x, q.z); return q; }
function later(p, sec, fn) { let t = 0; p.fx.add({ update: (dt) => { t += dt; if (t >= sec) { fn(); return false; } return true; } }); }
function aimAt(d) { return d.target && !d.target.dead ? chest(d.target) : d.point.clone().setY(d.point.y + 1); }

// long-lived effect with a fade-out handle: update(dt, t, k) where k is the fade factor
function persist(fx, update, dispose, fade = 0.3) {
  let t = 0, end = Infinity;
  const h = fx.add({
    update: (dt) => {
      t += dt;
      const k = Math.min(1, t / 0.2) * (end === Infinity ? 1 : Math.max(0, 1 - (t - end) / fade));
      update(dt, t, k);
      return t < end + fade;
    },
    dispose,
  });
  h.end = (after = 0) => { end = Math.min(end, t + after); };
  return h;
}

function dmg(p, s, m, mult = 1, opts = {}) { return p.game.combat.playerHit(m, p.skillMult(s.mult * mult), { from: p.position, ...opts }); }
function area(p, s, c, r, mult = 1, opts = {}) { return hitCircle(p, c, r, s.mult * mult, opts); }
function enemiesIn(p, c, r) { return p.game.combat.monsters.filter((m) => !m.dead && Math.hypot(m.position.x - c.x, m.position.z - c.z) - m.tpl.radius <= r); }

// homing travel from a point to the target (or the fixed point); step(pos, dir, dt), arrive(pos)
function travel(p, from, d, speed, step, arrive) {
  const pos = from.clone(), dest = new THREE.Vector3(), dir = new THREE.Vector3();
  const target = d.target, fixed = aimAt(d);
  return p.fx.add({
    update: (dt) => {
      dest.copy(target && !target.dead ? chest(target) : fixed);
      dir.subVectors(dest, pos);
      const dist = dir.length();
      dir.multiplyScalar(1 / (dist || 1));
      if (dist <= speed * dt) { pos.copy(dest); step(pos, dir, dt); arrive(pos.clone(), target && !target.dead ? target : null); return false; }
      pos.addScaledVector(dir, speed * dt);
      step(pos, dir, dt);
      return true;
    },
  });
}

// ---------------------------------------------------------------- cast circle
function castCircle(p, d, key, o = {}) {
  const fx = p.fx, e = EL[key], scene = p.game.world.scene;
  const r = (o.radius ?? 0.62) * CH;
  const parts = [];
  if (!o.noSwirl) fx.groundSwirl(p.position, { color: e.ring, color2: e.ring2, radius: r * 1.35, duration: 0.45, spin: 7 });
  const isDisc = (o.tex || e.tex) === 'disc';
  parts.push(fx.decal(p.position, { follow: p, tex: o.tex || e.tex || 'rune2', color: e.ring, radius: r, spin: o.spin ?? 0.5, fadeIn: 0.22, fadeOut: 0.35, opacity: isDisc ? 0.45 : 0.95 }));
  parts.push(fx.decal(p.position, { follow: p, tex: 'disc', color: e.ring, radius: r * 0.96, spin: 0, opacity: (o.fill ?? e.fill ?? 0.1) * (isDisc ? 0.4 : 1), fadeIn: 0.3, fadeOut: 0.35 }));
  if (isDisc) parts.push(fx.decal(p.position, { follow: p, tex: 'rune2', color: e.ring2, radius: r * 1.02, spin: 0.4, opacity: 0.7, fadeIn: 0.3 }));

  if (e.pebbles || o.pebbles) {
    const geo = new THREE.IcosahedronGeometry(1, 0);
    const mat = new THREE.MeshStandardMaterial({ color: 0x8c8274, roughness: 0.95, flatShading: true });
    const peb = [];
    const n = o.pebbleCount ?? 4;
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(geo, mat); m.castShadow = true; scene.add(m);
      peb.push({ m, a: (i / n) * TAU + Math.random(), r: CH * (o.pebbleR ?? 0.55) * (0.85 + Math.random() * 0.3), h: 0.55 + Math.random() * 0.8, sp: 1.8 + Math.random(), s: 0.07 + Math.random() * 0.05 });
    }
    parts.push(persist(fx, (dt, t, k) => {
      const pp = p.position;
      for (const b of peb) {
        b.a += dt * b.sp;
        b.m.position.set(pp.x + Math.cos(b.a) * b.r, pp.y + b.h * Math.min(1, t / 0.4) + Math.sin(t * 3 + b.a) * 0.08, pp.z + Math.sin(b.a) * b.r);
        b.m.rotation.x += dt * 3; b.m.rotation.y += dt * 2;
        b.m.scale.setScalar(b.s * k);
        if (Math.random() < dt * 5) fx.dust.emit(b.m.position.x, b.m.position.y, b.m.position.z, 0, -0.2, 0, 0.5, 0.25, new THREE.Color(0.8, 0.74, 0.6), { size1: 0.5 });
      }
    }, () => { for (const b of peb) scene.remove(b.m); geo.dispose(); mat.dispose(); }));
  }

  if (e.flare) {
    const fc = col(e.flare), fc2 = col(e.flare2);
    const a0 = p.yaw;
    parts.push(persist(fx, (dt, t, k) => {
      const pp = p.position;
      for (let i = 0; i < 4; i++) {
        const a = a0 + (i * Math.PI) / 2;
        const x = pp.x + Math.sin(a) * r * 1.2, z = pp.z + Math.cos(a) * r * 1.2;
        // blue flame flares at the 4 cardinal points (flipbook fire tinted, plus a thin licking tongue)
        if (Math.random() < k * 0.85) fx.fire.emit(x + rnd(0.05), pp.y + 0.05, z + rnd(0.05), { vx: 0, vy: 1.7, vz: 0, life: 0.42, size: 0.55, size1: 0.14, rotV: rnd(1), color: fc2, color1: fc, alpha: 0.95, alpha1: 0, drag: 1.2 });
        if (Math.random() < k * 0.4) fx.tongue.emit(x + rnd(0.06), pp.y + 0.1, z + rnd(0.06), { vx: rnd(0.2), vy: 3.6, vz: rnd(0.2), life: 0.22, size: 0.22, size1: 0.05, color: fc2, color1: fc, alpha: 0.8, alpha1: 0, drag: 2 });
      }
    }));
  }

  if (e.pillar) {
    const h = (o.pillarH ?? e.pillarH ?? 2.2) * CH;
    const n = o.pillars ?? 4;
    const geo = new THREE.CylinderGeometry(0.035, 0.035, 1, 6, 1, true).translate(0, 0.5, 0);
    const mat = basicAdd(e.pillar, 0.4), core = basicAdd(0xffffff, 0.3);
    const orbMat = new THREE.SpriteMaterial({ map: fx.glow.mat.uniforms.uTex.value, color: e.orb, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, transparent: true });
    const items = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + Math.PI / 4;
      const m = new THREE.Mesh(geo, mat), c = new THREE.Mesh(geo, core), orb = new THREE.Sprite(orbMat);
      m.renderOrder = c.renderOrder = orb.renderOrder = 6;
      scene.add(m, c, orb);
      items.push({ m, c, orb, a });
    }
    const oc = col(e.orb);
    parts.push(persist(fx, (dt, t, k) => {
      const pp = p.position, grow = Math.min(1, t / 0.35);
      mat.opacity = 0.3 * k * (0.6 + Math.random() * 0.4);
      core.opacity = 0.12 * k * (0.5 + Math.random() * 0.5);
      for (const it of items) {
        const x = pp.x + Math.sin(it.a) * r * 1.3, z = pp.z + Math.cos(it.a) * r * 1.3;
        it.m.position.set(x, pp.y, z); it.c.position.set(x, pp.y, z);
        it.m.scale.set(0.9, h * grow, 0.9); it.c.scale.set(0.35, h * grow, 0.35);
        it.orb.position.set(x, pp.y + h * grow, z);
        it.orb.scale.setScalar((0.32 + Math.random() * 0.16) * k);
        if (Math.random() < dt * 6 * k) fx.sparks.emit(x, pp.y + h * grow, z, rnd(1.5), rnd(1.5), rnd(1.5), 0.25, 0.2, oc, { drag: 2 });
      }
    }, () => { for (const it of items) scene.remove(it.m, it.c, it.orb); geo.dispose(); mat.dispose(); core.dispose(); orbMat.dispose(); }));
  }

  let ended = false;
  const api = { end(after = 0) { if (ended) return; ended = true; for (const h of parts) h.end(after); } };
  // cancelled cast (hit, death, dash): drop the circle
  fx.add({ update: () => { if (ended) return false; if (p.skillData !== d || p.state !== 'skill' || p.dead) { api.end(0); return false; } return true; } });
  return api;
}

// ---------------------------------------------------------------- spell factory
// def: { el, charge, release(p,s,d), charging(p,dt,s,d,k), tick(p,dt,s,d,rt), after, lock, linger, self, range,
//        anim: 'charge' | 'raise' | 'channel' | 'none', releaseAnim, circle: {...}, noCircle, kind }
function spell(def) {
  return {
    noFace: !!def.noFace,
    buffGroup: def.buffGroup || null,
    start(p, s, d) {
      const g = p.game;
      if (def.self) { d.target = null; d.point = ground(p, p.position); }
      else {
        const t = targetPoint(p, def.range ?? 18, def.fwd ?? 7);
        d.target = t.target; d.point = t.point;
      }
      d.charge = def.charge ?? 1.4;
      p.skillLock = true;
      d.circle = def.noCircle ? null : castCircle(p, d, def.el, def.circle || {});
      const a = def.anim || 'charge';
      if (a === 'charge') p.anim(['ST_Charge', 'ST_Point'], { fade: 0.15 });
      else if (a === 'raise') p.anim(['ST_Raise', 'ST_Channel'], { once: true, fade: 0.12 });
      else if (a === 'channel') p.anim(['ST_Channel', 'Cast'], { fade: 0.15 });
      if (d.charge >= 0.8) g.audio.play('charge', { pitch: 1.2 });
      def.start && def.start(p, s, d);
    },
    update(p, dt, s, d) {
      const fx = p.fx;
      if (d.target && !d.target.dead) {
        d.point.copy(d.target.position);
        if (!def.self) p.targetYaw = Math.atan2(d.target.position.x - p.position.x, d.target.position.z - p.position.z);
      }
      if (!d.released) {
        if (p.stateT < d.charge) {
          if (def.anim !== 'none') { const q = tip(p); fx.glow.emit(q.x, q.y, q.z, 0, 0, 0, 0.12, 0.55, col(EL[def.el].tip), { size1: 0.1 }); }
          def.charging && def.charging(p, dt, s, d, p.stateT / d.charge);
          return;
        }
        d.released = true; d.rt = 0;
        if (def.releaseAnim !== false) p.anim(def.releaseAnim || ['ST_Release', 'Cast'], { once: true, dur: def.releaseDur ?? 1.0, fade: 0.06 });
        if (d.circle) d.circle.end(def.linger ?? 0.8);
        def.release(p, s, d);
        if (def.sound) p.game.audio.play(def.sound);
      }
      d.rt += dt;
      def.tick && def.tick(p, dt, s, d, d.rt);
      if (d.rt > (def.lock ?? 0.3)) p.skillLock = false;
      if (d.rt > (def.after ?? 0.55)) p.toMove();
    },
  };
}

// ---------------------------------------------------------------- shared visuals
// cream dust torus (Ground Charge / Earth Shock / Ground Rave)
function dustBlast(p, at, { r = 2.5 * CH, color = 0xefe4c8, dur = 0.7, ripples = 0, rocks = 6 } = {}) {
  const fx = p.fx, c = col(color);
  fx.dustTorus(at, { r0: 0.35 * CH, r1: r, color: c, duration: dur, count: 56, size: 1.4, alpha: 1, height: 0.35 });
  fx.dustTorus(at, { r0: 0.2 * CH, r1: r * 0.7, color: c.clone().multiplyScalar(0.92), duration: dur * 1.25, count: 24, size: 0.85, alpha: 0.75, height: 0.65 });
  fx.decal(at, { tex: 'nova', color: c.clone().multiplyScalar(0.55), radius: r * 0.85, duration: dur * 1.3, grow: dur * 0.35, spin: 0, opacity: 0.45, fadeIn: 0.05, fadeOut: dur * 0.7 });
  for (let i = 0; i < 18; i++) {
    const a = Math.random() * TAU, sp = r * 2.6 * (0.6 + Math.random() * 0.6);
    fx.streak.emit(at.x, at.y + 0.2, at.z, { vx: Math.cos(a) * sp, vy: 0.5, vz: Math.sin(a) * sp, life: 0.32, size: 0.13, color: W, color1: c, alpha: 0.8, alpha1: 0, drag: 3.2 });
  }
  for (let i = 0; i < ripples; i++) later(p, 0.12 + i * 0.14, () => fx.shockwave(at, { color: c, radius: r * (0.45 + i * 0.22), duration: 0.65, width: 0.1, y: 0.1 }));
  if (rocks) fx.rockBurst(at, { count: rocks, speed: 5, size: 0.14, color: 0x9a8c78 });
  p.game.audio.play('boom', { pitch: 1.4 });
}

// thin electric ring wave on the ground with crackles
function elecWave(p, at, { r = 3 * CH, color = 0x5ff0e8, color2 = 0xffffff, dur = 0.45, arcs = 4 } = {}) {
  const fx = p.fx;
  fx.shockwave(at, { color, radius: r, duration: dur, width: 0.16, y: 0.12, start: 0.15 });
  fx.groundNova(at, { color, radius: r * 0.8, duration: dur * 1.1, opacity: 0.45 });
  for (let i = 0; i < arcs; i++) {
    later(p, (i / arcs) * dur * 0.8, () => {
      const rr = r * (0.3 + (i / arcs) * 0.7), a = Math.random() * TAU;
      const q1 = V(at.x + Math.cos(a) * rr, at.y + 0.2, at.z + Math.sin(a) * rr);
      const q2 = V(at.x + Math.cos(a + 0.7) * rr, at.y + 0.2, at.z + Math.sin(a + 0.7) * rr);
      fx.lightning(q1, q2, { color, core: color2, width: 0.05, duration: 0.18, segments: 7, jitter: 0.35, branches: 0 });
    });
  }
  fx.streaks(at.clone().setY(at.y + 0.3), 16, { speed: r * 3, color: W, color1: col(color), life: 0.35, size: 0.12, gravity: 4 });
}

// low frost / mana mist over the ground
function mist(p, at, { r = 2.5 * CH, color = 0x8a90ff, color2 = 0xd0d8ff, dur = 0.9, count = 26, height = 0.4, sparkle = 30 } = {}) {
  const fx = p.fx, c1 = col(color), c2 = col(color2);
  for (let i = 0; i < count; i++) {
    const a = Math.random() * TAU, rr = Math.sqrt(Math.random()) * r * 0.8;
    fx.cloud.emit(at.x + Math.cos(a) * rr, at.y + height * Math.random(), at.z + Math.sin(a) * rr, {
      vx: Math.cos(a) * r * 0.25, vy: 0.15, vz: Math.sin(a) * r * 0.25, life: dur * (0.7 + Math.random() * 0.5),
      size: r * 0.45, size1: r * 0.85, rotV: rnd(0.6), color: i % 3 ? c1 : c2, color1: c1, alpha: 0.7, alpha1: 0, drag: 1.5, frame0: Math.random() * 3,
    });
  }
  for (let i = 0; i < sparkle; i++) {
    const a = Math.random() * TAU, rr = Math.sqrt(Math.random()) * r;
    fx.glow.emit(at.x + Math.cos(a) * rr, at.y + Math.random() * height * 2, at.z + Math.sin(a) * rr, 0, 0.4, 0, dur * (0.4 + Math.random() * 0.6), 0.22 + Math.random() * 0.2, W, { color1: c1, size1: 0 });
  }
}

// root effect on one monster: orange spiral, orange patch under the feet while rooted
function rootMonster(p, m, dur) {
  const fx = p.fx, g = p.game;
  if (Math.random() < 0.15 || m.tpl.boss) { g.dmgText.spawn(chest(m).setY(m.position.y + m.tpl.height + 0.3), 'Resist', 'block'); return false; }
  m.root = Math.max(m.root || 0, dur);
  fx.groundSwirl(m.position, { color: 0xff9a30, color2: 0xffc060, radius: 1.5 * CH * 0.6, duration: 0.8, spin: 6 });
  fx.dustTorus(m.position, { r0: 0.2 * CH, r1: 1.5 * CH * 0.7, color: 0xf0a860, duration: 0.7, count: 20, size: 0.7, alpha: 0.8, height: 0.25 });
  const patch = fx.decal(m.position, { follow: m, tex: 'disc', color: 0xff8a20, radius: Math.max(0.6, m.tpl.radius * 1.1), spin: 0, opacity: 0.55, fadeIn: 0.2, fadeOut: 0.4 });
  persist(fx, () => { if (m.dead || !(m.root > 0)) { patch.end(0); } }, null).end(dur + 0.1);
  return true;
}

// Combustion (mana burn) shown on monsters as a burning-mind DoT with the debuff label
function combust(p, s, m, mult, dur = 10) {
  const fx = p.fx, g = p.game;
  if (m.combust > 0) { m.combust = dur; return; }
  m.combust = dur;
  g.dmgText.spawn(chest(m).setY(m.position.y + m.tpl.height + 0.5), 'Combustion', 'block');
  let acc = 0;
  fx.add({
    update: (dt) => {
      if (m.dead || !(m.combust > 0)) return false;
      m.combust -= dt; acc += dt;
      if (Math.random() < dt * 6) fx.glow.emit(m.position.x + rnd(0.4), m.position.y + m.tpl.height * (0.7 + Math.random() * 0.4), m.position.z + rnd(0.4), 0, 0.6, 0, 0.6, 0.3, new THREE.Color(0x60c8ff), { size1: 0 });
      if (acc >= 1) { acc -= 1; dmg(p, s, m, mult, { noFx: true, color: 0x60c8ff }); }
      return true;
    },
  });
}

// expose (Detect / Sprawl Detect): enemies take more damage and are revealed
function expose(p, center, r, dur) {
  const fx = p.fx;
  for (const m of enemiesIn(p, center, r)) {
    const fresh = !(m.exposed > 0);
    m.exposed = dur;
    if (fresh) {
      const ring = fx.decal(m.position, { follow: m, tex: 'rings1', color: 0xff5040, radius: Math.max(0.7, m.tpl.radius * 1.3), spin: 1, opacity: 0.8 });
      fx.add({ update: (dt) => { m.exposed -= dt; if (m.dead || m.exposed <= 0) { ring.end(0); return false; } return true; } });
    }
  }
}

// ice shard / spear meshes
let shardGeo = null;
function shardMesh(len, color) {
  if (!shardGeo) shardGeo = new THREE.OctahedronGeometry(1, 0).scale(0.22, 0.22, 1);
  const m = new THREE.Mesh(shardGeo, new THREE.MeshStandardMaterial({ color: col(color).multiplyScalar(0.4), emissive: color, emissiveIntensity: 1.8, roughness: 0.1, metalness: 0.2, flatShading: true, transparent: true, opacity: 0.95 }));
  m.scale.set(len * 0.5, len * 0.5, len * 0.5);
  return m;
}
function flyMesh(p, mesh, d, from, speed, trail, arrive) {
  const scene = p.game.world.scene;
  scene.add(mesh); mesh.position.copy(from);
  return travel(p, from, d, speed, (pos, dir, dt) => { mesh.position.copy(pos); mesh.lookAt(pos.clone().add(dir)); trail(pos, dir, dt); }, (pos, m) => {
    scene.remove(mesh); mesh.material.dispose(); arrive(pos, m);
  });
}

// fire stream (flamethrower): emits fire sprites from `from` along dir for len metres
function flameStream(p, from, dir, { len = 3 * CH, width = 1 * CH, core = 0xfff0a0, edge = 0xff3a10, rate = 5, size = 1 } = {}) {
  const fx = p.fx, c1 = col(core), c2 = col(edge);
  for (let i = 0; i < Math.round(rate * 0.6); i++) {
    const sp = len / 0.42 * (0.85 + Math.random() * 0.3);
    const sx = rnd(0.12) * width, sy = rnd(0.08) * width;
    fx.fire.emit(from.x, from.y, from.z, {
      vx: dir.x * sp + sx * 4, vy: dir.y * sp + sy * 4 + 0.6, vz: dir.z * sp + rnd(0.12) * width * 4,
      life: 0.42 + Math.random() * 0.12, size: 0.25 * size, size1: width * 0.75 * size, rotV: rnd(2), color: c1, color1: c2, alpha: 0.6, alpha1: 0.05, drag: 0.6,
    });
  }
  if (Math.random() < 0.6) fx.sparks.emit(from.x, from.y, from.z, dir.x * len * 2 + rnd(2), dir.y * len * 2 + 1, dir.z * len * 2 + rnd(2), 0.4, 0.25, c1, { drag: 1.2 });
  if (Math.random() < 0.3) fx.glow.emit(from.x, from.y, from.z, 0, 0, 0, 0.08, 0.5 * size, c2, { size1: 0.2 });
}

function inCone(p, origin, dir, len, halfW, cb) {
  let n = 0;
  for (const m of p.game.combat.monsters) {
    if (m.dead) continue;
    const dx = m.position.x - origin.x, dz = m.position.z - origin.z;
    const t = dx * dir.x + dz * dir.z;
    if (t < -m.tpl.radius || t > len + m.tpl.radius) continue;
    const w = halfW * (0.35 + 0.65 * Math.max(0, t) / len);
    if (Math.hypot(dx - dir.x * t, dz - dir.z * t) > w + m.tpl.radius) continue;
    cb(m); n++;
  }
  return n;
}

function flatDir(a, b) { const v = V(b.x - a.x, 0, b.z - a.z); const l = v.length(); return l > 1e-4 ? v.multiplyScalar(1 / l) : V(0, 0, 1); }

// meteor dropping vertically onto a point
function dropMeteor(p, at, { height = 3 * CH, fall = 0.35, size = 1, onHit, white = false } = {}) {
  const fx = p.fx, g = p.game;
  const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32 * size, 1), new THREE.MeshStandardMaterial({ color: 0x2a140c, emissive: white ? 0xffd8a0 : 0xff6a10, emissiveIntensity: 2.4, flatShading: true }));
  const start = at.clone().setY(at.y + height);
  ball.position.copy(start); g.world.scene.add(ball);
  fx.flare(start, new THREE.Color(0xffa040), 2.4 * size, 0.25);
  g.audio.play('meteor');
  fx.timed(fall + 0.15, (k, dt, t) => {
    const f = Math.max(0, (t - 0.15) / fall);
    ball.position.lerpVectors(start, at, f * f);
    ball.rotation.x += dt * 6;
    const q = ball.position;
    for (let i = 0; i < 4; i++) fx.fire.emit(q.x + rnd(0.15) * size, q.y + Math.random() * 0.6 * size, q.z + rnd(0.15) * size, { vx: 0, vy: 2.5, vz: 0, life: 0.35, size: 0.55 * size, size1: 0.9 * size, color: white ? new THREE.Color(1, 0.95, 0.8) : new THREE.Color(1, 0.75, 0.3), color1: new THREE.Color(0.9, 0.15, 0.05), alpha: 1, alpha1: 0, drag: 1 });
    fx.tongue.emit(q.x, q.y + 0.9 * size, q.z, { vx: 0, vy: 0.1, vz: 0, life: 0.12, size: 0.4 * size, size1: 0.6 * size, color: new THREE.Color(1, 0.9, 0.6), color1: new THREE.Color(1, 0.3, 0.1), alpha: 0.8, alpha1: 0 });
    fx.glow.emit(q.x, q.y, q.z, 0, 0, 0, 0.1, 1.4 * size, new THREE.Color(1, 0.8, 0.4), { size1: 0.5 });
  }, () => {
    g.world.scene.remove(ball); ball.geometry.dispose(); ball.material.dispose();
    const gp = ground(p, at);
    fx.fireBurst(gp.clone().setY(gp.y + 0.4), { count: 10, size: 0.9 * size, size1: 2 * size, life: 0.55, color: 0xff6a18, speed: 3 * size, up: 2 });
    fx.spikeBurst(gp.clone().setY(gp.y + 0.6), new THREE.Color(0xffb060), 3 * size, 0.25);
    fx.scorch(gp, 1.4 * size, 0xff5a10, 3.5);
    fx.decal(gp, { tex: 'disc', color: 0xff3a10, radius: 1.1 * size, duration: 1.2, spin: 0, opacity: 0.55, fadeOut: 0.6 });
    fx.light(gp.clone().setY(gp.y + 1), 0xff7a30, 40, 0.35, 10);
    g.engine.shake(0.35 * size);
    g.audio.play('boom');
    onHit && onHit(gp);
  });
}

// red ribbons + orbs spiralling around the body (Life Control / Life Turnover)
function ribbons(p, dur, color = 0xff2a2a) {
  const fx = p.fx, c = col(color), c2 = col(0xff9090);
  return fx.timed(dur, (k, dt, t) => {
    const pp = p.position;
    for (let i = 0; i < 3; i++) {
      const a = t * 5.5 + (i * TAU) / 3, h = 0.25 + ((Math.sin(t * 2.2 + i * 2) + 1) / 2) * 1.6;
      const r = 0.55 + Math.sin(t * 3 + i) * 0.15;
      fx.glow.emit(pp.x + Math.cos(a) * r, pp.y + h, pp.z + Math.sin(a) * r, 0, 0, 0, 0.35, 0.32, c, { color1: c2, size1: 0.05 });
    }
    if (Math.random() < dt * 8) { const a = Math.random() * TAU; fx.glow.emit(pp.x + Math.cos(a) * 0.7, pp.y + Math.random() * 1.8, pp.z + Math.sin(a) * 0.7, 0, 0.6, 0, 0.6, 0.5, c, { size1: 0 }); }
  });
}

// cold/ice glow and shards climbing the body (Invisible)
function iceClimb(p, dt, k, color = 0x9fe0ff) {
  const fx = p.fx, pp = p.position, c = col(color);
  for (let i = 0; i < 2; i++) {
    const a = Math.random() * TAU, r = 0.35 + Math.random() * 0.35;
    fx.glow.emit(pp.x + Math.cos(a) * r, pp.y + Math.random() * 0.4, pp.z + Math.sin(a) * r, 0, 1.4 + Math.random(), 0, 0.9, 0.22 + Math.random() * 0.2, W, { color1: c, size1: 0 });
  }
  if (Math.random() < dt * 12) fx.streak.emit(pp.x + rnd(0.4), pp.y + Math.random() * 0.6, pp.z + rnd(0.4), { vx: 0, vy: 2.2, vz: 0, life: 0.6, size: 0.12, color: W, color1: c, alpha: 1, alpha1: 0, drag: 0.5 });
  if (Math.random() < dt * 4 * k) fx.cloud.emit(pp.x, pp.y + 0.3, pp.z, { vx: 0, vy: 0.9, vz: 0, life: 0.9, size: 1.2, size1: 1.9, color: c, color1: c, alpha: 0.35, alpha1: 0, drag: 1 });
}

// ---------------------------------------------------------------- traps
function placeTrap(p, s, d, { color = 0xffa020, ring = null, mult = 1, radius = 1.1 * CH, life = 60 } = {}) {
  const fx = p.fx, g = p.game;
  const pos = ground(p, p.position.clone().add(p.forward().multiplyScalar(CH)));
  const key = 'trap_' + s.id;
  if (g[key]) g[key].dead = true;
  const trap = { dead: false };
  g[key] = trap;
  fx.decal(pos, { tex: 'rings1', color: 0xffffff, radius: 0.4 * CH, duration: 0.5, spin: 0, opacity: 0.9, fadeOut: 0.4 });
  const ringH = ring ? fx.decal(pos, { tex: 'rings1', color: ring, radius: 1 * CH * 0.6, spin: 0.3, opacity: 0.45 }) : null;
  const c1 = new THREE.Color(1, 0.92, 0.4), c2 = col(color);
  let t = 0;
  fx.add({
    update: (dt) => {
      t += dt;
      if (trap.dead || t > life) { ringH && ringH.end(0); return false; }
      if (Math.random() < 0.7) fx.fire.emit(pos.x + rnd(0.06), pos.y + 0.05, pos.z + rnd(0.06), { vx: 0, vy: 1.1, vz: 0, life: 0.38, size: 0.34, size1: 0.12, color: c1, color1: c2, alpha: 1, alpha1: 0, drag: 1 });
      if (Math.random() < 0.3) fx.glow.emit(pos.x, pos.y + 0.15, pos.z, 0, 0.3, 0, 0.2, 0.5, c2, { size1: 0.2 });
      const trig = g.combat.monsters.find((m) => !m.dead && Math.hypot(m.position.x - pos.x, m.position.z - pos.z) - m.tpl.radius < 0.9 * CH);
      if (trig) {
        trap.dead = true; ringH && ringH.end(0);
        const at = chest(trig);
        fx.fireBurst(at, { count: 12, size: 0.9, size1: 1.9, life: 0.6, color: 0xff6a10, speed: 3, up: 1.5 });
        fx.spikeBurst(at, c2, 2.6, 0.25);
        fx.streaks(at, 26, { speed: 9, color: new THREE.Color(0xf0ff80), color1: new THREE.Color(0x90ff40), life: 1.0, size: 0.13, gravity: 3, up: 2 });
        fx.light(at, 0xff8030, 40, 0.35, 10);
        g.audio.play('boom', { pitch: 1.2 });
        g.engine.shake(0.3);
        area(p, s, pos, radius, mult, { color: 0xff6a10, knock: 1 });
        return false;
      }
      return true;
    },
  });
}

// ---------------------------------------------------------------- buffs / stealth
function buff(p, s, group, { dur, mods = {}, color, name, fxLoop = null }) {
  p.addBuff(group, { id: s.id, name: name || s.name, dur, mods, color, fx: fxLoop });
}

function dustAura(p, color = 0xa88a64) {
  const fx = p.fx, c = col(color);
  return persist(fx, (dt, t, k) => {
    if (Math.random() < dt * 10 * k) {
      const a = Math.random() * TAU, r = 0.45 + Math.random() * 0.3;
      fx.smoke.emit(p.position.x + Math.cos(a) * r, p.position.y + 0.2 + Math.random() * 1.2, p.position.z + Math.sin(a) * r, {
        vx: -Math.sin(a) * 1.2, vy: 0.3, vz: Math.cos(a) * 1.2, life: 0.8, size: 0.35, size1: 0.8, rotV: rnd(1), color: c, color1: c, alpha: 0.45, alpha1: 0, drag: 1,
      });
    }
  }, null, 0.5);
}

function rockOrbit(p, n = 4) {
  const fx = p.fx, scene = p.game.world.scene;
  const geo = new THREE.IcosahedronGeometry(1, 0);
  const mat = new THREE.MeshStandardMaterial({ color: 0x8c8274, roughness: 0.95, flatShading: true });
  const rs = [];
  for (let i = 0; i < n; i++) { const m = new THREE.Mesh(geo, mat); m.castShadow = true; scene.add(m); rs.push({ m, a: (i / n) * TAU, h: 0.4 + (i % 2) * 0.7, s: 0.11 + Math.random() * 0.05 }); }
  return persist(fx, (dt, t, k) => {
    for (const r of rs) {
      r.a += dt * 1.6;
      r.m.position.set(p.position.x + Math.cos(r.a) * CH * 0.55, p.position.y + r.h + Math.sin(t * 2 + r.a) * 0.1, p.position.z + Math.sin(r.a) * CH * 0.55);
      r.m.rotation.x += dt * 2; r.m.scale.setScalar(r.s * k);
    }
  }, () => { for (const r of rs) scene.remove(r.m); geo.dispose(); mat.dispose(); }, 0.4);
}

function teleportFx(p, from, to, { color = 0xd8f0ff, wisp = 0x7dffb0, ringCol = 0xcfe8ff } = {}) {
  const fx = p.fx;
  fx.afterimage(p.obj, color, 0.25);
  fx.glow.burst(from.clone().setY(from.y + 1), 14, { speed: 3, life: 0.3, size: 0.3, color: col(color), drag: 3 });
  p.position.copy(to);
  p.game.world.colliders.resolve(p.position, p.radius);
  p.position.y = p.game.world.heightAt(p.position.x, p.position.z);
  const at = p.position.clone();
  fx.groundSwirl(at, { color: ringCol, color2: wisp, radius: 0.7 * CH, duration: 0.45, spin: 12 });
  fx.shockwave(at, { color: ringCol, radius: 0.8 * CH, duration: 0.35, width: 0.12 });
  for (let i = 0; i < 12; i++) {
    const a = Math.random() * TAU;
    fx.streak.emit(at.x + Math.cos(a) * 0.6, at.y + 0.2 + Math.random() * 0.6, at.z + Math.sin(a) * 0.6, { vx: -Math.sin(a) * 4, vy: 0.8, vz: Math.cos(a) * 4, life: 0.35, size: 0.1, color: col(wisp), color1: col(ringCol), alpha: 1, alpha1: 0, drag: 2 });
  }
  later(p, 0.4, () => fx.rise(at, { color: wisp, count: 10, radius: 0.5, speed: 0.6, life: 0.4, size: 0.25 }));
  p.game.audio.play('dash', { pitch: 1.4 });
}

function stealthCast(level) {
  return (p, s, d) => {
    p.setInvisible(level === 2 ? 60 : 40, level);
    p.game.ui.toast(level === 2 ? 'Crystal Invisible: ศัตรูมองไม่เห็นคุณ' : 'Invisible: ศัตรูมองไม่เห็นคุณ (โจมตี/ใช้สกิลแล้วจะปรากฏตัว)', 'good');
  };
}

// ================================================================ SPELLS
const SPELLS = {
  // ------------------------------------------------ EARTH
  wz_ground_charge: { el: 'earth', charge: 1.6, self: true, after: 0.6, kind: 'aoe_self',
    release(p, s, d) {
      area(p, s, d.point, 1.6 * CH, 1, { color: 0xf0e0b0, knock: 1.2 });
      later(p, 0.08, () => dustBlast(p, ground(p, p.position), { r: 2.8 * CH, dur: 0.65 }));
    } },
  wz_ground_rave: { el: 'earth', charge: 1.2, self: true, after: 0.7, kind: 'aoe_self',
    release(p, s, d) {
      const at = ground(p, p.position), fx = p.fx;
      area(p, s, at, 2.2 * CH, 1, { color: 0xf0e0b0, knock: 1.6 });
      fx.decal(at, { tex: 'disc', color: 0xffd060, radius: 2.5 * CH, duration: 0.9, spin: 0, opacity: 0.32, fadeIn: 0.05, fadeOut: 0.5 });
      later(p, 0.1, () => dustBlast(p, at, { r: 3.1 * CH, dur: 0.6, rocks: 10 }));
      later(p, 0.25, () => fx.decal(at, { tex: 'nova', color: 0x8a6a40, radius: 2.6 * CH, duration: 0.9, spin: 0, opacity: 0.6, additive: false, fadeOut: 0.5 }));
      later(p, 0.6, () => {
        for (let i = 0; i < 40; i++) {
          const a = Math.random() * TAU, r = Math.random() * 1.5 * CH;
          fx.streak.emit(at.x + Math.cos(a) * r, at.y + 0.2, at.z + Math.sin(a) * r, { vx: Math.cos(a) * 2, vy: 6 + Math.random() * 5, vz: Math.sin(a) * 2, life: 0.8, size: 0.14, color: new THREE.Color(1, 0.95, 0.6), color1: new THREE.Color(1, 0.7, 0.1), alpha: 1, alpha1: 0, gravity: 12, drag: 0.5 });
        }
      });
    } },
  wz_land_contract: { el: 'earth', charge: 1.2, after: 0.6, range: 20,
    release(p, s, d) {
      const at = ground(p, d.point), fx = p.fx;
      fx.starFlash(at.clone().setY(at.y + 1), new THREE.Color(0xffe8a0), 4, 0.2);
      area(p, s, at, 2.6 * CH, 1, { color: 0xe8c890, knock: 2, heavy: true });
      later(p, 0.1, () => {
        fx.darkDisk(at, { color: 0x24160c, radius: 1.6 * CH, duration: 1.0 });
        fx.decal(at, { tex: 'nova', color: 0xe8d0a0, radius: 4 * CH, duration: 0.8, grow: 0.25, spin: 0, opacity: 0.7, fadeOut: 0.4 });
        fx.dustTorus(at, { r0: 0.5 * CH, r1: 4 * CH, color: 0xe8d8b4, duration: 0.6, count: 46, size: 1.3, alpha: 0.9, height: 0.3 });
        fx.scorch(at, 1.6 * CH, 0xd09050, 3);
        fx.rockBurst(at, { count: 16, speed: 7, size: 0.18 });
        p.game.engine.shake(0.6);
        p.game.audio.play('boom');
      });
      later(p, 0.55, () => fx.decal(at, { tex: 'nova', color: 0xa0482c, radius: 3.6 * CH, duration: 0.5, spin: 0, opacity: 0.55, fadeOut: 0.3 }));
    } },
  wz_earth_shock: { el: 'earth', charge: 1.4, after: 0.6,
    release(p, s, d) {
      const at = ground(p, d.point);
      area(p, s, at, 1.4 * CH, 1, { color: 0xf0e0b0, knock: 1 });
      later(p, 0.1, () => dustBlast(p, at, { r: 2.5 * CH, dur: 0.7, ripples: 3 }));
    } },
  wz_earth_quake: { el: 'earth', charge: 0.6, after: 0.5,
    release(p, s, d) {
      const at = ground(p, d.point), fx = p.fx;
      fx.smokePuff(at, { count: 5, size: 0.8, size1: 1.8, life: 0.6, color: new THREE.Color(1, 0.96, 0.8), alpha: 0.8, rise: 1 });
      later(p, 0.15, () => fx.dustTorus(at, { r0: 0.3 * CH, r1: 1.6 * CH, color: 0xf4dc90, duration: 0.5, count: 30, size: 0.9, alpha: 0.85, height: 0.25 }));
      later(p, 0.35, () => {
        area(p, s, at, 1.7 * CH, 1, { color: 0xf0e0b0, knock: 1.5, heavy: true });
        fx.spikes(at, { color: 0x5a4a30, count: 10, radius: 1.6 * CH, height: 1.3 * CH, duration: 0.65, ice: false, rock: 0x8a847a });
        fx.spikeBurst(at.clone().setY(at.y + 0.8), new THREE.Color(0xfff0b0), 3.4, 0.22);
        fx.light(at.clone().setY(at.y + 1.5), 0xffe0a0, 30, 0.3, 12);
        fx.debris(at, { count: 22, speed: 8 });
        p.game.engine.shake(0.6); p.game.engine.ripple(at.clone().setY(at.y + 0.5), 0.6, 1.4, 0.3);
        p.game.audio.play('boom');
      });
    } },
  wz_earth_earthquake: { el: 'earthW', charge: 2.0, after: 0.6, circle: { radius: 0.7 },
    release(p, s, d) {
      const at = ground(p, d.point), fx = p.fx;
      fx.starFlash(at.clone().setY(at.y + 1), new THREE.Color(0xffd0e8), 3.5, 0.2);
      later(p, 0.25, () => {
        area(p, s, at, 2.3 * CH, 1, { color: 0xfff0c0, knock: 2, heavy: true });
        fx.cloudBurst(at.clone().setY(at.y + 0.8), { color: 0xf0d890, color2: 0xfff8e0, radius: 2.0, count: 9, life: 0.5, rise: 0.6 });
        fx.spikes(at, { color: 0x6a5a40, count: 15, radius: 2 * CH, height: 1.5 * CH, duration: 0.8, ice: false, rock: 0x8a847a });
        fx.spikeBurst(at.clone().setY(at.y + 1), new THREE.Color(0xfff0b0), 4.2, 0.25);
        fx.light(at.clone().setY(at.y + 2), 0xffe8b0, 35, 0.4, 14);
        fx.debris(at, { count: 30, speed: 10 });
        p.game.engine.shake(0.9); p.game.engine.ripple(at.clone().setY(at.y + 0.5), 0.9, 1.3, 0.4);
        p.game.audio.play('boom');
      });
      later(p, 0.55, () => fx.smokePuff(at, { count: 12, size: 1.6, size1: 3.6, life: 1.4, color: new THREE.Color(0.85, 0.78, 0.62), alpha: 0.55, rise: 0.5, spread: 2.5, speed: 1.2 }));
    } },
  wz_root: { el: 'earth', charge: 1.2, after: 0.5, kind: 'debuff',
    release(p, s, d) {
      later(p, 0.2, () => {
        if (d.target && !d.target.dead) rootMonster(p, d.target, 4 + s.lv * 0.3);
        else p.fx.groundSwirl(d.point, { color: 0xff9a30, color2: 0xffc060, radius: 1.5, duration: 0.7 });
      });
    } },
  wz_mesh_root: { el: 'earth', charge: 1.8, self: true, after: 0.5, linger: 1.6, kind: 'debuff',
    release(p, s, d) {
      const at = ground(p, p.position), fx = p.fx;
      fx.dustTorus(at, { r0: 0.4 * CH, r1: 2.4 * CH, color: 0xf0a888, duration: 0.7, count: 36, size: 0.9, alpha: 0.85, height: 0.3 });
      fx.shockwave(at, { color: 0xff9a70, radius: 2.3 * CH, duration: 0.7, width: 0.14 });
      later(p, 0.15, () => fx.shockwave(at, { color: 0xffc090, radius: 1.8 * CH, duration: 0.6, width: 0.1 }));
      for (const m of enemiesIn(p, at, 2.4 * CH)) rootMonster(p, m, 5 + s.lv * 0.3);
    } },
  wz_earth_barrier: { el: 'earth', charge: 0.6, self: true, anim: 'raise', releaseAnim: false, after: 0.3, linger: 0.1, kind: 'buff', buffGroup: 'earthshield', circle: { radius: 1.0, pebbleCount: 4 },
    release(p, s, d) {
      p.fx.smokePuff(p.position, { count: 8, size: 0.8, size1: 1.8, life: 0.9, color: new THREE.Color(0.6, 0.48, 0.34), alpha: 0.6, rise: 0.8, spread: 0.6, speed: 1.2 });
      buff(p, s, 'earthshield', { dur: 25, mods: { absorb: 24 + 2 * s.lv }, color: '#c08a40', name: 'Earth Barrier', fxLoop: dustAura(p) });
    } },
  wz_earth_fence: { el: 'earth', charge: 0.8, self: true, anim: 'raise', releaseAnim: false, after: 0.3, linger: 0.9, kind: 'buff', buffGroup: 'earthshield', circle: { radius: 1.0, pebbleCount: 4 },
    release(p, s, d) {
      const fx = p.fx;
      fx.flare(p.position.clone().setY(p.position.y + 1.2), new THREE.Color(1, 1, 1), 4, 0.2);
      fx.smokePuff(p.position, { count: 10, size: 0.9, size1: 2, life: 1, color: new THREE.Color(0.62, 0.5, 0.36), alpha: 0.6, rise: 0.8, spread: 0.6, speed: 1.2 });
      const a = dustAura(p, 0x9a7a54), r = rockOrbit(p, 4);
      buff(p, s, 'earthshield', { dur: 30, mods: { absorb: 30 + 2 * s.lv }, color: '#a0703a', name: 'Earth Fence', fxLoop: { end: (x) => { a.end(x); r.end(x); } } });
    } },

  // ------------------------------------------------ COLD
  wz_ice_bolt: { el: 'cold', charge: 0.8, after: 0.45, linger: 1.8,
    release(p, s, d) {
      later(p, 0.2, () => {
        const from = tip(p), fx = p.fx;
        flyMesh(p, shardMesh(0.9, 0xe8fbff), d, from, 34, (pos) => {
          fx.glow.emit(pos.x, pos.y, pos.z, 0, 0, 0, 0.22, 0.45, new THREE.Color(0xd8ffe8), { size1: 0 });
        }, (pos, m) => {
          fx.starFlash(pos, new THREE.Color(0xa8e0ff), 1.6, 0.18);
          fx.glow.burst(pos, 10, { speed: 3, life: 0.35, size: 0.25, color: new THREE.Color(0xdff6ff), drag: 3 });
          if (m) dmg(p, s, m, 1, { color: 0x9fdcff, slow: 2 });
          p.game.audio.play('crit', { pitch: 1.6 });
        });
      });
    } },
  wz_frozen_spear: { el: 'cold', charge: 1.2, after: 0.9, linger: 1.4,
    release(p, s, d) {
      const fx = p.fx;
      later(p, 0.3, () => {
        const from = tip(p);
        fx.starFlash(from, new THREE.Color(0xc8f4ff), 1.8, 0.25);
        later(p, 0.2, () => {
          flyMesh(p, shardMesh(1.5, 0xffffff), d, tip(p), 14, (pos) => {
            for (let i = 0; i < 3; i++) fx.glow.emit(pos.x + rnd(0.08), pos.y + rnd(0.08), pos.z + rnd(0.08), 0, 0, 0, 0.8, 0.6, new THREE.Color(0x40e0e0), { color1: new THREE.Color(0x1060a0), size1: 0.15 });
            fx.glow.emit(pos.x, pos.y, pos.z, 0, 0, 0, 0.1, 1.0, W, { size1: 0.4 });
          }, (pos, m) => {
            fx.starFlash(pos, new THREE.Color(0x60f0ff), 2.6, 0.25);
            fx.cloudBurst(pos, { color: 0x60e8ff, color2: 0xffffff, radius: 1.2, count: 6, life: 0.5, rise: 0.2 });
            if (m) dmg(p, s, m, 1, { color: 0x60e8ff, slow: 3, knock: 1 });
            p.game.audio.play('crit', { pitch: 1.3 });
          });
        });
      });
    } },
  wz_cryophorus: { el: 'coldV', charge: 0.25, after: 2.5, lock: 2.4, linger: 2.3, releaseAnim: ['ST_Charge'], releaseDur: 1,
    release(p, s, d) { d.shots = 0; d.acc = 0.1; },
    tick(p, dt, s, d, rt) {
      const fx = p.fx;
      d.acc += dt;
      while (d.shots < 7 && d.acc >= 0.32) {
        d.acc -= 0.32; d.shots++;
        const last = d.shots === 7;
        const from = tip(p), side = (d.shots % 2 ? 1 : -1) * (0.6 + Math.random() * 0.5);
        let k = 0;
        const right = flatDir(p.position, d.point); right.set(right.z, 0, -right.x);
        travel(p, from, d, 18, (pos, dir, dtt) => {
          k += dtt * 4;
          const off = right.clone().multiplyScalar(Math.sin(Math.min(1, k) * Math.PI) * side * 0.15);
          const q = pos.clone().add(off);
          fx.glow.emit(q.x, q.y, q.z, 0, 0, 0, 0.35, 0.6, new THREE.Color(0xe8e0ff), { color1: new THREE.Color(0x6a50ff), size1: 0 });
          fx.streak.emit(q.x, q.y, q.z, { vx: -dir.x * 6, vy: -dir.y * 6, vz: -dir.z * 6, life: 0.18, size: 0.2, color: W, color1: new THREE.Color(0x9a80ff), alpha: 1, alpha1: 0, drag: 2 });
        }, (pos, m) => {
          fx.starFlash(pos, new THREE.Color(0x7aa8ff), 1.4, 0.15);
          fx.glow.burst(pos, 8, { speed: 2.5, life: 0.3, size: 0.25, color: new THREE.Color(0x9ac0ff), drag: 3 });
          if (m) dmg(p, s, m, 1 / 7 * 1.6, { color: 0x7aa8ff, noFx: true });
          if (last) fx.timed(1.0, (kk) => { fx.glow.emit(pos.x, pos.y, pos.z, 0, 0, 0, 0.1, 1.2 * (1 - kk), new THREE.Color(0x5a80ff), { size1: 0.4 }); });
          p.game.audio.play('hit', { pitch: 1.5 });
        });
      }
    } },
  wz_snow_wind: { el: 'cold', charge: 1.6, after: 0.55, linger: 1.0,
    release(p, s, d) {
      const at = ground(p, d.point);
      area(p, s, at, 1.5 * CH, 1, { color: 0xa0b8ff, slow: 3 });
      p.fx.starFlash(at.clone().setY(at.y + 1), new THREE.Color(0x80e8ff), 1.6, 0.15);
      later(p, 0.2, () => mist(p, at, { r: 2.5 * CH, color: 0x7a78ff, color2: 0xc8d8ff, dur: 0.9, height: 0.35 }));
    } },
  wz_blizzard: { el: 'cold80', charge: 1.2, after: 0.55, linger: 0.8,
    release(p, s, d) {
      const at = ground(p, d.point), fx = p.fx;
      later(p, 0.2, () => {
        area(p, s, at, 1.8 * CH, 1, { color: 0xffd0f0, slow: 4 });
        fx.cloudBurst(at.clone().setY(at.y + 1), { color: 0xffc8f0, color2: 0xffffff, radius: 1.8, count: 10, life: 0.5, rise: 0.4 });
      });
      later(p, 0.3, () => {
        fx.pillar(at, { color: 0xffffff, color2: 0xffd8f8, radius: 0.75 * CH, height: 2.8 * CH, duration: 0.85, speed: 2 });
        mist(p, at, { r: 2.5 * CH, color: 0xd070ff, color2: 0xffd0f0, dur: 1.0, height: 0.4 });
        fx.rise(at, { color: 0xffffff, color1: 0xff9ae0, count: 30, radius: 1.2, speed: 4, life: 0.8, size: 0.3 });
        p.game.audio.play('crit', { pitch: 0.8 });
      });
    } },
  wz_ice_roar: { el: 'cold', charge: 2.2, after: 0.6,
    release(p, s, d) {
      const at = ground(p, d.point), fx = p.fx;
      later(p, 0.1, () => {
        area(p, s, at, 2 * CH, 1, { color: 0xa0d8ff, slow: 4, knock: 1.5, heavy: true });
        fx.spikeBurst(at.clone().setY(at.y + 1), new THREE.Color(0xa8e0ff), 3.6, 0.25);
        fx.cloudBurst(at.clone().setY(at.y + 0.8), { color: 0x5aa0ff, color2: 0xd8f0ff, radius: 2.0, count: 9, life: 0.6, rise: 0.6 });
        fx.light(at.clone().setY(at.y + 2), 0xa0d8ff, 30, 0.4, 14);
        p.game.engine.shake(0.6);
        p.game.audio.play('boom', { pitch: 1.3 });
      });
      later(p, 0.2, () => {
        fx.pillar(at, { color: 0xffffff, color2: 0xa8e8ff, radius: 0.5 * CH, height: 2.1 * CH, duration: 0.9, speed: 3 });
        fx.spikes(at, { color: 0x7fd8ff, count: 9, radius: 1.5 * CH, height: 1.1 * CH, duration: 0.95, ice: true });
        fx.timed(0.8, () => {
          for (let i = 0; i < 4; i++) {
            const a = Math.random() * TAU, r = Math.random() * 1.4 * CH;
            fx.fire.emit(at.x + Math.cos(a) * r, at.y + 0.1, at.z + Math.sin(a) * r, { vx: 0, vy: 3 + Math.random() * 2, vz: 0, life: 0.5, size: 0.7, size1: 0.2, color: new THREE.Color(0.85, 0.95, 1), color1: new THREE.Color(0.15, 0.4, 1), alpha: 1, alpha1: 0, drag: 1 });
          }
        });
      });
    } },
  wz_mana_drain: { el: 'cold', charge: 0.3, after: 0.45, noCircle: true, kind: 'debuff',
    start(p, s, d) { if (d.target) p.fx.starFlash(chest(d.target), new THREE.Color(0x9a7aff), 1.4, 0.2); p.fx.groundSwirl(p.position, { color: 0x80e0ff, color2: 0xffffff, radius: 1.1, duration: 0.35 }); },
    release(p, s, d) {
      castCircle(p, d, 'cold', { noSwirl: true }).end(1.9);
      if (d.target && !d.target.dead) {
        const m = d.target;
        p.fx.glow.burst(chest(m), 16, { speed: 2, life: 0.6, size: 0.3, color: new THREE.Color(0x8a6aff), drag: 2 });
        dmg(p, s, m, 0.4, { color: 0x8a9aff, noFx: true });
        combust(p, s, m, 0.12, 10);
      }
    } },
  wz_mana_drought: { el: 'cold', charge: 0.25, after: 0.5, noCircle: true, kind: 'debuff', range: 20,
    start(p, s, d) { p.fx.groundSwirl(p.position, { color: 0xffe8a0, color2: 0xffffff, radius: 1.2, duration: 0.35 }); if (d.target) p.fx.starFlash(chest(d.target).setY(d.target.position.y + d.target.tpl.height + 0.3), new THREE.Color(0x9a7aff), 1.4, 0.2); },
    release(p, s, d) {
      const at = ground(p, d.point), fx = p.fx;
      later(p, 0.3, () => {
        fx.shockwave(at, { color: 0x40e8b0, radius: 1 * CH, duration: 0.25, width: 0.15 });
        fx.groundSwirl(at, { color: 0x30e0a0, color2: 0x80ffe0, radius: 3 * CH, duration: 1.0, spin: 4 });
        for (const m of enemiesIn(p, at, 3 * CH)) { dmg(p, s, m, 0.3, { color: 0x60ffd0, noFx: true }); combust(p, s, m, 0.12, 10); }
      });
      later(p, 0.55, () => castCircle(p, d, 'cold', { noSwirl: true }).end(0.9));
    } },
  wz_invisible: { el: 'cold', charge: 2.5, self: true, after: 0.2, linger: 0.05, anim: 'none', releaseAnim: false, kind: 'util', circle: { radius: 0.8 },
    charging(p, dt, s, d, k) { if (k > 0.24) iceClimb(p, dt, k); if (k > 0.64) p.setGhostAlpha(1 - (k - 0.64) / 0.36 * 0.7); },
    release: stealthCast(1) },
  wz_crystal_invisible: { el: 'cold', charge: 2.0, self: true, after: 0.2, linger: 0.05, anim: 'none', releaseAnim: false, kind: 'util', circle: { radius: 0.8, tex: 'rings1' },
    charging(p, dt, s, d, k) {
      iceClimb(p, dt, k, 0xe0f4ff);
      if (Math.random() < dt * 10) p.fx.starFlash(p.position.clone().add(V(rnd(0.5), 0.3 + Math.random() * 1.5, rnd(0.5))), new THREE.Color(0xc8e8ff), 0.6, 0.2);
      if (k > 0.8) p.setGhostAlpha(1 - (k - 0.8) / 0.2 * 0.7);
    },
    release: stealthCast(2) },

  // ------------------------------------------------ FIRE
  wz_fire_bolt: { el: 'fire', charge: 1.3, after: 0.6, linger: 0.7,
    release(p, s, d) {
      const fx = p.fx;
      later(p, 0.2, () => fx.starFlash(tip(p), new THREE.Color(0xffe060), 1.2, 0.15));
      later(p, 0.3, () => {
        fx.slash(p.position, p.yaw, { color: 0xffc040, color2: 0xfff0a0, radius: 1.3, width: 0.5, angle: Math.PI * 1.3, duration: 0.25, y: 1.2, sparks: false });
        const from = tip(p);
        travel(p, from, d, 30, (pos, dir) => {
          for (let i = 0; i < 3; i++) fx.tongue.emit(pos.x - dir.x * i * 0.3, pos.y - dir.y * i * 0.3, pos.z - dir.z * i * 0.3, { vx: -dir.x * 2, vy: -dir.y * 2, vz: -dir.z * 2, life: 0.16, size: 0.35, size1: 0.12, color: new THREE.Color(1, 0.95, 0.6), color1: new THREE.Color(1, 0.6, 0.1), alpha: 0.9, alpha1: 0 });
          fx.glow.emit(pos.x, pos.y, pos.z, 0, 0, 0, 0.08, 0.9, new THREE.Color(1, 1, 0.85), { size1: 0.3 });
        }, (pos, m) => {
          fx.fireBurst(pos, { count: 6, size: 0.6, size1: 1.3, life: 0.4, color: 0xff8a20, speed: 2, up: 1 });
          if (m) dmg(p, s, m, 1, { color: 0xffa040 });
        });
        p.game.audio.play('fire');
      });
    } },
  wz_strengthen_rocket: { el: 'fire', charge: 2.1, after: 0.7, linger: 0.6,
    charging(p, dt, s, d, k) {
      const fx = p.fx, t = p.stateT;
      if (t > 0.2 && t < 1.0) { const q = tip(p).add(V(0, 0.35, 0)); fx.glow.emit(q.x, q.y, q.z, 0, 0, 0, 0.1, 0.6 + (t - 0.2) * 1.4, new THREE.Color(1, 0.75, 0.3), { size1: 0.3 }); fx.fire.emit(q.x + rnd(0.1), q.y, q.z + rnd(0.1), { vx: 0, vy: 0.8, vz: 0, life: 0.3, size: 0.5, size1: 0.2, color: new THREE.Color(1, 0.9, 0.5), color1: new THREE.Color(1, 0.3, 0.1), alpha: 1, alpha1: 0 }); }
      if (t > 1.0 && t < 1.9) {
        const pp = p.position;
        for (let i = 0; i < 2; i++) { const a = t * 9 + i * Math.PI; fx.fire.emit(pp.x + Math.cos(a) * 0.55, pp.y + 0.9 + Math.sin(t * 4 + i) * 0.4, pp.z + Math.sin(a) * 0.55, { vx: 0, vy: 1, vz: 0, life: 0.35, size: 0.55, size1: 0.2, color: new THREE.Color(1, 0.5, 0.7), color1: new THREE.Color(0.9, 0.1, 0.2), alpha: 1, alpha1: 0 }); }
      }
    },
    release(p, s, d) {
      const fx = p.fx, from = tip(p);
      const geo = new THREE.CylinderGeometry(0.05, 0.12, 1.2, 8).rotateX(Math.PI / 2);
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x401008, emissive: 0xff5020, emissiveIntensity: 2.4 }));
      flyMesh(p, mesh, d, from, 13, (pos, dir) => {
        for (let i = 0; i < 4; i++) fx.fire.emit(pos.x - dir.x * 0.7 + rnd(0.08), pos.y - dir.y * 0.7 + rnd(0.08), pos.z - dir.z * 0.7 + rnd(0.08), { vx: -dir.x * 4, vy: -dir.y * 4 + 0.4, vz: -dir.z * 4, life: 0.4, size: 0.4, size1: 0.9, color: new THREE.Color(1, 0.8, 0.4), color1: new THREE.Color(0.9, 0.15, 0.05), alpha: 1, alpha1: 0, drag: 1 });
        fx.glow.emit(pos.x, pos.y, pos.z, 0, 0, 0, 0.1, 1.1, new THREE.Color(1, 0.6, 0.3), { size1: 0.3 });
      }, (pos, m) => {
        geo.dispose();
        p.fx.explode(pos, { color: 0xff5020, color2: 0xffc060, radius: 1.8, power: 0.8 });
        p.fx.light(pos, 0xff6020, 50, 0.4, 14);
        p.game.engine.shake(0.6); p.game.audio.play('boom');
        if (m) dmg(p, s, m, 1, { color: 0xff6020, knock: 2.5, heavy: true });
        area(p, s, ground(p, pos), 1 * CH, 0.35, { color: 0xff6020, noFx: true });
      });
      p.game.audio.play('fire', { pitch: 0.7 });
    } },
  wz_meteor: { el: 'fire', charge: 1.5, after: 0.6, linger: 1.6,
    release(p, s, d) {
      later(p, 0.2, () => {
        const at = ground(p, d.point), tg = d.target;
        dropMeteor(p, tg && !tg.dead ? ground(p, tg.position) : at, { height: 3 * CH, fall: 0.35, size: 0.9, onHit: (gp) => {
          if (tg && !tg.dead) { dmg(p, s, tg, 1, { color: 0xff5a10, knock: 1 }); p.fx.burning(tg, { color: 0xff4a10, duration: 1.2, height: tg.tpl.height }); }
          else area(p, s, gp, 0.8 * CH, 1, { color: 0xff5a10 });
        } });
      });
    } },
  wz_meteor_shower: { el: 'fireR', charge: 1.4, after: 0.6, linger: 0.8,
    charging(p, dt, s, d, k) { if (k > 0.7) { const q = tip(p); p.fx.glow.emit(q.x, q.y, q.z, rnd(0.5), rnd(0.5), rnd(0.5), 0.3, 0.4, new THREE.Color(0xb050ff), { size1: 0 }); } },
    release(p, s, d) {
      const at = ground(p, d.point);
      dropMeteor(p, at, { height: 6 * CH, fall: 0.22, size: 1.4, white: true, onHit: (gp) => {
        area(p, s, gp, 1.6 * CH, 1, { color: 0xff3a10, knock: 2, heavy: true });
        p.fx.explode(gp.clone().setY(gp.y + 0.4), { color: 0xff3010, color2: 0xffc060, radius: 2.2, power: 0.8 });
      } });
    } },
  wz_fire_blow: { el: 'fireR', charge: 0.2, after: 2.2, lock: 2.1, linger: 2.0, releaseAnim: ['ST_Charge'],
    release(p, s, d) {
      if (d.target && !d.target.dead) {
        dmg(p, s, d.target, 1, { color: 0xff5a10 });
        later(p, 0.1, () => d.target && p.fx.fireBurst(chest(d.target), { count: 8, size: 0.7, size1: 1.5, life: 0.45, color: 0xff6a10, speed: 2, up: 1 }));
        p.fx.burning(d.target, { color: 0xff4a10, duration: 2.2, height: d.target.tpl.height });
      }
      p.game.audio.play('fire');
    },
    tick(p, dt, s, d, rt) {
      if (rt < 0.2 || rt > 2.1) return;
      const from = tip(p), to = aimAt(d);
      const dir = to.clone().sub(from); const len = Math.min(dir.length(), 3.5 * CH); dir.normalize();
      flameStream(p, from, dir, { len, width: 0.8 * CH, core: 0xffb040, edge: 0xff2a08, rate: 4 });
    } },
  wz_salamander_blow: { el: 'fire', charge: 0.4, after: 1.4, lock: 1.3, linger: 1.2, releaseAnim: ['ST_Charge'],
    release(p, s, d) {
      const fx = p.fx, from = tip(p), dir = flatDir(p.position, d.point);
      const origin = from.clone(), len = 5 * CH;
      if (d.target && !d.target.dead) dmg(p, s, d.target, 0.7, { color: 0xff7a20 });
      let t = 0, acc = 0;
      fx.add({
        update: (dt) => {
          t += dt; acc += dt;
          const reach = Math.min(1, t / 0.6);
          if (t < 4.3) {
            flameStream(p, origin, dir.clone().setY(-0.08).normalize(), { len: len * reach, width: 1.25 * CH, core: 0xffc050, edge: 0xff4a10, rate: 7, size: 1.3 });
            if (Math.random() < 0.3) fx.smoke.emit(origin.x + dir.x * len * 0.8, origin.y + 0.8, origin.z + dir.z * len * 0.8, { vx: 0, vy: 1.4, vz: 0, life: 1.4, size: 1.2, size1: 3, color: new THREE.Color(0.25, 0.2, 0.18), color1: new THREE.Color(0.15, 0.13, 0.12), alpha: 0.4, alpha1: 0, drag: 0.6 });
          }
          if (acc >= 0.5 && t > 0.6 && t < 4.3) { acc -= 0.5; inCone(p, origin, dir, len, 1.25 * CH, (m) => dmg(p, s, m, 0.12, { color: 0xff7a20, noFx: true })); }
          return t < 4.6;
        },
      });
      fx.light(origin, 0xff8030, 18, 4, 12);
      p.game.audio.play('fire', { pitch: 0.8 });
    } },
  wz_hellforge: { el: 'fireR', charge: 0.6, after: 3.4, lock: 3.3, linger: 3.2, releaseAnim: ['ST_Charge'],
    release(p, s, d) {
      const fx = p.fx;
      for (let i = 0; i < 3; i++) later(p, 0.15 + i * 0.1, () => {
        travel(p, tip(p), d, 26, (pos) => { fx.fire.emit(pos.x, pos.y, pos.z, { vx: 0, vy: 0.5, vz: 0, life: 0.25, size: 0.6, size1: 0.2, color: new THREE.Color(1, 0.9, 0.6), color1: new THREE.Color(1, 0.3, 0.6), alpha: 1, alpha1: 0 }); }, (pos, m) => { fx.fireBurst(pos, { count: 4, size: 0.6, size1: 1.2, life: 0.3, color: 0xff4a40 }); if (m) dmg(p, s, m, 0.2, { color: 0xff50a0, noFx: true }); });
      });
      d.acc = 0;
      p.game.audio.play('fire', { pitch: 0.6 });
    },
    tick(p, dt, s, d, rt) {
      if (rt < 0.6 || rt > 3.3) return;
      const from = tip(p), dir = aimAt(d).sub(from).normalize();
      const len = 4.6 * CH;
      flameStream(p, from, dir, { len, width: 1.4 * CH, core: 0xffd080, edge: 0xff30a0, rate: 6, size: 1.35 });
      flameStream(p, from, dir, { len: len * 0.9, width: 0.6 * CH, core: 0xfff0c0, edge: 0xffa040, rate: 2, size: 0.8 });
      d.acc += dt;
      if (d.acc >= 0.4) { d.acc -= 0.4; inCone(p, from, flatDir(V(), dir), len, 1.4 * CH, (m) => dmg(p, s, m, 0.16, { color: 0xff50a0, noFx: true })); }
    } },
  wz_fire_trap: { el: 'fireDisc', charge: 3.3, self: true, anim: 'channel', after: 0.4, linger: 0.2, kind: 'trap', circle: { radius: 0.5, noSwirl: false },
    release(p, s, d) { placeTrap(p, s, d, { color: 0xff8a20, mult: 1 }); } },
  wz_lava_trap: { el: 'fireDisc', charge: 3.6, self: true, anim: 'channel', after: 0.4, linger: 0.2, kind: 'trap', circle: { radius: 0.55 },
    release(p, s, d) { placeTrap(p, s, d, { color: 0xffa020, ring: 0xffffff, mult: 1, radius: 1.3 * CH }); } },
  wz_baoyan: { el: 'fireR', charge: 3.7, self: true, anim: 'channel', after: 0.4, linger: 0.3, kind: 'trap', circle: { radius: 0.6, tex: 'disc', fill: 0.35 },
    charging(p, dt, s, d, k) { const q = p.position.clone().setY(p.position.y + 1); p.fx.glow.emit(q.x, q.y, q.z, 0, 0, 0, 0.12, 1.4, new THREE.Color(1, 0.75, 0.85), { size1: 0.6 }); },
    release(p, s, d) { placeTrap(p, s, d, { color: 0xff5a20, ring: 0xff3020, mult: 1, radius: 1.5 * CH }); } },
  wz_detect: { el: 'fireR', charge: 0.3, self: true, anim: 'raise', releaseAnim: false, after: 0.6, linger: 1.0, kind: 'util', circle: { radius: 0.8 },
    release(p, s, d) {
      const fx = p.fx, mat = ringMaterial(0xff4020, { width: 0.18 });
      const m = fx.mesh(fx.planeGeo, mat);
      fx.timed(0.5, (k) => { m.position.set(p.position.x, p.position.y + 0.1 + k * 1.3, p.position.z); m.scale.set(1.4, 1, 1.4); mat.uniforms.uOpacity.value = 1 - k * 0.6; }, () => { fx.scene.remove(m); mat.dispose(); });
      expose(p, p.position, 10, 15);
    } },
  wz_sprawl_detect: { el: 'fireR', charge: 0.3, self: true, anim: 'raise', releaseAnim: false, after: 0.6, linger: 0.8, kind: 'util',
    release(p, s, d) {
      const at = ground(p, p.position);
      p.fx.groundNova(at, { color: 0xff5a80, radius: 5.5 * CH, duration: 1.3, opacity: 0.45 });
      p.fx.shockwave(at, { color: 0xff7090, radius: 5.5 * CH, duration: 1.1, width: 0.1 });
      expose(p, at, 20, 20);
    } },

  // ------------------------------------------------ LIGHTNING
  wz_lightning_bolt: { el: 'light', charge: 1.3, after: 0.6, linger: 1.3,
    release(p, s, d) {
      later(p, 0.2, () => {
        const from = tip(p), to = aimAt(d), fx = p.fx;
        fx.lightning(from, to, { color: 0xc8ff40, core: 0xffffff, width: 0.06, duration: 0.4, segments: 14, jitter: 0.5, branches: 1 });
        fx.lightning(from, to.clone().add(V(0.15, 0.1, 0)), { color: 0xe8ff80, core: 0xffffff, width: 0.035, duration: 0.35, segments: 12, jitter: 0.6, branches: 0 });
        fx.starFlash(from, new THREE.Color(0xffffff), 1.2, 0.12);
        fx.flare(from, new THREE.Color(0xffa040), 0.8, 0.15);
        fx.light(to, 0xd0ff60, 30, 0.25, 10);
        if (d.target && !d.target.dead) dmg(p, s, d.target, 1, { color: 0xd8ff60 });
        p.game.audio.play('thunder', { pitch: 1.5 });
      });
    } },
  wz_chain_lightning: { el: 'light', charge: 1.3, after: 0.7, linger: 1.3,
    release(p, s, d) { chain(p, s, d, { jumps: 1, color: 0x9ad8ff, core: 0xffffff }); } },
  wz_chain_lightning2: { el: 'lightV', charge: 2.1, after: 0.8, linger: 0.8,
    release(p, s, d) { chain(p, s, d, { jumps: 3, color: 0xa070ff, core: 0xf0e8ff }); } },
  wz_lightning_shock: { el: 'light', charge: 1.6, after: 0.55, linger: 1.0, range: 8,
    release(p, s, d) {
      const fx = p.fx;
      later(p, 0.1, () => {
        fx.slash(p.position, p.yaw, { color: 0xc8ff40, color2: 0xf8ffc0, radius: 1.5 * CH * 0.6, width: 0.9, angle: Math.PI * 0.9, duration: 0.3, y: 1.0, tilt: 0 });
        fx.flare(tip(p), new THREE.Color(0xff6030), 0.9, 0.15);
        p.game.combat.inArc(p.position, p.yaw, 1.4 * CH, Math.PI * 0.9, (m) => dmg(p, s, m, 1, { color: 0xd8ff60, stun: 0.6 }));
        p.game.audio.play('thunder', { pitch: 1.8 });
      });
    } },
  wz_lightning_impact: { el: 'light', charge: 1.8, self: true, after: 0.6, linger: 0.6, kind: 'aoe_self',
    release(p, s, d) {
      const at = ground(p, p.position), fx = p.fx;
      fx.decal(at, { tex: 'disc', color: 0x9aff40, radius: 1 * CH, duration: 0.3, spin: 0, opacity: 0.8, fadeIn: 0.02, fadeOut: 0.2 });
      later(p, 0.1, () => {
        fx.groundNova(at, { color: 0x8aff30, radius: 3.5 * CH, duration: 0.6, opacity: 0.5 });
        for (let i = 0; i < 10; i++) later(p, i * 0.04, () => {
          const a = Math.random() * TAU, r1 = Math.random() * 3 * CH, r2 = r1 + 0.8 + Math.random();
          fx.lightning(V(at.x + Math.cos(a) * r1, at.y + 0.15, at.z + Math.sin(a) * r1), V(at.x + Math.cos(a + 0.3) * r2, at.y + 0.15, at.z + Math.sin(a + 0.3) * r2), { color: 0x9aff40, core: 0xf0ffd0, width: 0.05, duration: 0.18, segments: 6, jitter: 0.4, branches: 0 });
        });
        for (const m of enemiesIn(p, at, 3 * CH)) {
          fx.decal(m.position, { tex: 'disc', color: 0xa0ff50, radius: Math.max(0.8, m.tpl.radius * 1.3), duration: 0.35, spin: 0, opacity: 0.9, fadeIn: 0.02, fadeOut: 0.25 });
          dmg(p, s, m, 1, { color: 0xa0ff50, stun: 0.5 });
        }
        p.game.engine.shake(0.4); p.game.audio.play('thunder');
      });
    } },
  wz_charged_wind: { el: 'light', charge: 1.3, after: 0.6, linger: 1.3,
    release(p, s, d) {
      const at = ground(p, d.point), fx = p.fx;
      area(p, s, at, 1.7 * CH, 1, { color: 0x60f0e0 });
      fx.shockwave(at, { color: 0x60f0e0, radius: 0.7 * CH, duration: 0.2, width: 0.2 });
      later(p, 0.1, () => { elecWave(p, at, { r: 3 * CH, color: 0x40e0e0 }); fx.spikeBurst(at.clone().setY(at.y + 1), new THREE.Color(1, 1, 1), 3, 0.2); p.game.audio.play('thunder', { pitch: 1.3 }); });
      later(p, 0.6, () => elecWave(p, at, { r: 3 * CH, color: 0x40e0e0, arcs: 3 }));
    } },
  wz_charged_squall: { el: 'light80', charge: 1.4, after: 0.6, linger: 1.3,
    release(p, s, d) {
      const at = ground(p, d.point), fx = p.fx;
      fx.shockwave(at, { color: 0xffd0a0, radius: 0.8 * CH, duration: 0.2, width: 0.2 });
      later(p, 0.1, () => {
        area(p, s, at, 2.2 * CH, 1, { color: 0xffa0e0, knock: 1.5 });
        elecWave(p, at, { r: 4 * CH, color: 0xff90e0, color2: 0xffffff, dur: 0.8, arcs: 6 });
        fx.spikeBurst(at.clone().setY(at.y + 1), new THREE.Color(1, 1, 1), 5, 0.3);
        p.game.engine.shake(0.4); p.game.audio.play('thunder');
      });
    } },
  wz_thunder: { el: 'light', charge: 1.7, after: 0.6, linger: 0.8,
    release(p, s, d) {
      const at = ground(p, d.point), fx = p.fx, c = at.clone().setY(at.y + 1.2);
      fx.spikeBurst(c, new THREE.Color(0xd0e8ff), 4, 0.25);
      area(p, s, at, 2.4 * CH, 1, { color: 0x9ac8ff, knock: 1.5, stun: 0.8 });
      later(p, 0.1, () => {
        fx.cloudBurst(c, { color: 0x6aa0ff, color2: 0xffffff, radius: 2.4 * CH * 0.5, count: 26, life: 1.1, rise: 0.3, speed: 0.6 });
        fx.light(c, 0xa0c8ff, 70, 0.6, 18);
        p.game.engine.shake(0.5); p.game.audio.play('thunder');
      });
      fx.timed(1.3, (k, dt) => {
        if (Math.random() < dt * 14) {
          const a = Math.random() * TAU, r = Math.random() * 2 * CH;
          const q1 = V(at.x + Math.cos(a) * r, at.y + 0.5 + Math.random() * 2, at.z + Math.sin(a) * r);
          const q2 = q1.clone().add(V(rnd(1.4), rnd(1), rnd(1.4)));
          fx.lightning(q1, q2, { color: 0x8ab8ff, core: 0xffffff, width: 0.05, duration: 0.15, segments: 6, jitter: 0.4, branches: 0 });
        }
        fx.glow.emit(c.x, c.y, c.z, 0, 0, 0, 0.12, 2.6 * (1 - k), new THREE.Color(0.85, 0.92, 1), { size1: 1 });
      });
    } },
  wz_teleport: { el: 'light', noCircle: true, charge: 0, self: true, anim: 'none', releaseAnim: false, after: 0.15, lock: 0.1, noFace: true, kind: 'util', sound: null,
    release(p, s, d) { const dir = p.forward(); teleportFx(p, p.position.clone(), p.position.clone().addScaledVector(dir, 4 * CH)); } },
  wz_aerial_teleport: { el: 'light', noCircle: true, charge: 0.1, self: true, anim: 'none', releaseAnim: false, after: 0.15, lock: 0.1, noFace: true, kind: 'util',
    start(p) { p.fx.flare(tip(p), new THREE.Color(0x80b0ff), 1, 0.15); },
    release(p, s, d) { const dir = p.forward(); teleportFx(p, p.position.clone(), p.position.clone().addScaledVector(dir, 6 * CH), { color: 0xfff0c0, wisp: 0xffe080, ringCol: 0xfff4d0 }); } },

  // ------------------------------------------------ LIFE
  wz_life_control: { el: 'life', charge: 2.8, self: true, anim: 'raise', releaseAnim: ['ST_Channel'], after: 1.6, lock: 1.5, linger: 1.3, kind: 'buff', buffGroup: 'life', circle: { radius: 1.0, tex: 'rune3', noSwirl: true },
    start(p) { ribbons(p, 2.0); },
    charging(p, dt, s, d, k) { if (k > 0.3 && !d.rib) { d.rib = true; } },
    release(p, s, d) {
      const at = ground(p, p.position), fx = p.fx;
      fx.groundNova(at, { color: 0x9ac8ff, radius: 2.4 * CH, duration: 0.8, opacity: 0.5 });
      mist(p, at, { r: 2 * CH, color: 0x6a9aff, color2: 0xe0f0ff, dur: 0.8, count: 14, height: 0.3, sparkle: 20 });
      fx.flameRays(at.clone().setY(at.y + 0.3), { color: 0x80b0ff, color2: 0xffffff, count: 12, height: 3, life: 0.5 });
      later(p, 1.2, () => mist(p, at, { r: 1 * CH, color: 0xff80a0, color2: 0xffc0d0, dur: 0.8, count: 8, height: 0.2, sparkle: 0 }));
      buff(p, s, 'life', { dur: 900, mods: { skillPct: 9 + 2 * s.lv, atkPct: Math.round(s.lv * 0.4), hpPct: -50 }, color: '#c02020', name: 'Life Control' });
      p.game.audio.play('choir');
    } },
  wz_life_turnover: { el: 'lifeO', charge: 2.3, self: true, anim: 'raise', releaseAnim: ['ST_Channel'], after: 1.4, lock: 1.3, linger: 1.0, kind: 'buff', buffGroup: 'life', circle: { radius: 1.0, tex: 'rune3', noSwirl: true },
    start(p) {
      later(p, 0.7, () => {
        ribbons(p, 1.5, 0xff3020);
        const sh = p.fx.shell(p.obj, 0xff2a10, 0xff8060, { thickness: 0.015, intensity: 0.9 });
        later(p, 1.6, () => sh.dispose());
      });
    },
    release(p, s, d) {
      const at = ground(p, p.position), fx = p.fx;
      fx.spikeBurst(p.position.clone().setY(p.position.y + 1.1), new THREE.Color(1, 1, 1), 3.5, 0.3);
      fx.shockwave(at, { color: 0xc8e0ff, radius: 2 * CH, duration: 0.6, width: 0.2 });
      mist(p, at, { r: 1.8 * CH, color: 0x7aa8ff, color2: 0xffffff, dur: 0.8, count: 14, height: 0.3, sparkle: 20 });
      later(p, 1.2, () => fx.flare(p.position.clone().setY(p.position.y + 1), new THREE.Color(1, 0.2, 0.15), 3, 0.4));
      buff(p, s, 'life', { dur: 900, mods: { skillPct: 20 + 2 * s.lv, atkPct: 2 * s.lv, hpPct: -50 }, color: '#e04010', name: 'Life Turnover' });
      p.game.audio.play('choir');
    } },
};

// chain lightning: bolt to the target, then jumps to the nearest other enemies
function chain(p, s, d, { jumps = 1, color, core }) {
  const fx = p.fx, g = p.game;
  later(p, 0.1, () => {
    let from = tip(p);
    const hit = new Set();
    let cur = d.target && !d.target.dead ? d.target : null;
    if (!cur) { fx.lightning(from, aimAt(d), { color, core, width: 0.06, duration: 0.3, segments: 12, jitter: 0.5, branches: 1 }); return; }
    const step = (i, m, src) => {
      hit.add(m);
      const to = chest(m);
      fx.lightning(src, to, { color, core, width: 0.065, duration: 0.32, segments: 14, jitter: 0.55, branches: 2 });
      fx.starFlash(to, col(color), 1.6, 0.15);
      fx.streaks(to, 10, { speed: 6, color: W, color1: col(color), life: 0.25, size: 0.1, gravity: 4 });
      dmg(p, s, m, i === 0 ? 1 : 0.7, { color, noFx: true });
      g.audio.play('thunder', { pitch: 1.4 + i * 0.1 });
      if (i >= jumps) return;
      const next = g.combat.nearest(m.position, 3.5 * CH, (o) => !hit.has(o));
      if (next) later(p, 0.2, () => { if (!next.dead) step(i + 1, next, to); });
    };
    step(0, cur, from);
  });
}

const HANDLERS = {};
for (const [id, def] of Object.entries(SPELLS)) HANDLERS[id] = spell(def);
export const WIZARD_KINDS = Object.fromEntries(Object.entries(SPELLS).map(([id, d]) => [id, d.kind || 'attack']));
export default HANDLERS;
