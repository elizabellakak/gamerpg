// Pacheon (Silkroad Online, bow) - skills from the reference clip's skill window. Each line has one visual
// template that grows per tier: Anti Devil Bow = long blue light charge + white arrow with a light-blue beam;
// Arrow Combo = pink-red streaks / arrow stream; Hawk = summoned hawk hovering above the head;
// Autumn Wind = flaming arrow head with a white-cyan vortex trail; blasting-powder arrows explode;
// Strong Bow = radial white-gold ray burst then a jagged white bolt; Mind Bow = pink lasers chaining targets.
import * as THREE from 'three';
import { V } from './common.js';
import { skill, starburst, later, ground, chest, aim, CH } from './heuksal.js';
import { createHawk } from '../../fx/hawk.js';
import { basicAdd } from '../../fx/materials.js';

// straight light ribbon between two points that fades out (ADB beam trail, arrow stream)
let beamGeo = null;
function beamLine(p, from, to, { thick = 0.15, color = 0x8ad8ff, dur = 0.35, grow = 0.08 } = {}) {
  if (!beamGeo) beamGeo = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true).rotateX(Math.PI / 2).translate(0, 0, 0.5);
  const scene = p.game.world.scene;
  const outer = new THREE.Mesh(beamGeo, basicAdd(color, 0.55)), core = new THREE.Mesh(beamGeo, basicAdd(0xffffff, 0.8));
  const len = from.distanceTo(to);
  for (const m of [outer, core]) { m.position.copy(from); m.lookAt(to); m.renderOrder = 6; scene.add(m); }
  p.fx.timed(dur + grow, (k, dt, t) => {
    const g = Math.min(1, t / grow), f = t < grow ? 1 : 1 - (t - grow) / dur;
    outer.scale.set(thick * f, thick * f, len * g); core.scale.set(thick * 0.3 * f, thick * 0.3 * f, len * g);
    outer.material.opacity = 0.55 * f; core.material.opacity = 0.8 * f;
  }, () => { scene.remove(outer, core); outer.material.dispose(); core.material.dispose(); });
}

const TAU = Math.PI * 2;
const W = new THREE.Color(1, 1, 1);
const col = (c) => (c instanceof THREE.Color ? c.clone() : new THREE.Color(c));
const rnd = (a = 1) => (Math.random() - 0.5) * 2 * a;
const PINK = 0xff4a90;

function bowPos(p) { return p.position.clone().setY(p.position.y + 1.35).addScaledVector(p.forward(), 0.45); }

// arrow travelling to the target (homing), with a custom trail; pierce = extra enemies along the line
function arrowTo(p, d, { speed = 45, trail, onHit, pierce = 0, from = null }) {
  const fx = p.fx, g = p.game;
  const pos = (from || bowPos(p)).clone();
  const tg = d.target && !d.target.dead ? d.target : null;
  const fixed = aim(p, d);
  const dir = new THREE.Vector3();
  const hit = new Set();
  return fx.add({ update: (dt) => {
    const dest = tg && !tg.dead ? chest(tg) : fixed;
    dir.subVectors(dest, pos);
    const dist = dir.length();
    dir.multiplyScalar(1 / (dist || 1));
    const step = Math.min(dist, speed * dt);
    pos.addScaledVector(dir, step);
    trail && trail(pos, dir, dt);
    if (pierce) for (const m of g.combat.monsters) {
      if (m.dead || hit.has(m) || m === tg || hit.size >= pierce) continue;
      if (Math.hypot(m.position.x - pos.x, m.position.z - pos.z) < m.tpl.radius + 0.6) { hit.add(m); onHit && onHit(chest(m), m, true); }
    }
    if (dist <= speed * dt + 0.01) { onHit && onHit(dest.clone(), tg && !tg.dead ? tg : null, false); return false; }
    return true;
  } });
}
const hitM = (p, s, m, mult = 1, opts = {}) => p.game.combat.playerHit(m, p.skillMult(s.mult * mult), { color: 0xffffff, from: p.position, noFx: true, knock: 0.4, ...opts });

// ---------------------------------------------------------------- Anti Devil Bow
// blue/violet light fan streaming back from the bow arm while drawing
function adbCharge(p, dur, size) {
  const fx = p.fx, c1 = col(0x9ad0ff), c2 = col(0x6a50ff);
  fx.timed(dur, (k, dt) => {
    const b = bowPos(p), f = p.forward(), side = V(f.z, 0, -f.x);
    for (let i = 0; i < Math.round(3 * size); i++) {
      const spread = rnd(0.8) * size;
      const v = f.clone().multiplyScalar(-(5 + Math.random() * 4) * size).addScaledVector(side, spread * 5).add(V(0, rnd(1.5) * size + 0.8, 0));
      fx.tongue.emit(b.x, b.y, b.z, { vx: v.x, vy: v.y, vz: v.z, life: 0.32, size: 0.3 * size, size1: 0.55 * size, color: i % 2 ? W : c1, color1: c2, alpha: 0.8, alpha1: 0, drag: 2 });
      if (i === 0) fx.cloud.emit(b.x - f.x * 0.6, b.y, b.z - f.z * 0.6, { vx: -f.x * 2, vy: 0.3, vz: -f.z * 2, life: 0.4, size: 0.6 * size, size1: 1.2 * size, color: c1, color1: c2, alpha: 0.35, alpha1: 0, drag: 2 });
    }
    if (Math.random() < 0.5) fx.glow.emit(b.x, b.y, b.z, 0, 0, 0, 0.12, 0.5 * size, c1, { size1: 0.2 });
  });
}
function adbShot(p, s, d, { thick = 0.15, mult = 1 } = {}) {
  const fx = p.fx, c = col(0x8ad8ff);
  beamLine(p, bowPos(p), aim(p, d), { thick: thick * CH * 0.5, color: 0x7ac8ff, dur: 0.35, grow: 0.1 });
  arrowTo(p, d, { speed: 70, trail: (q, dir) => {
    // the beam: a long lingering light-blue ribbon left along the path
    for (let i = 0; i < 3; i++) fx.glow.emit(q.x - dir.x * i * 0.3, q.y - dir.y * i * 0.3, q.z - dir.z * i * 0.3, 0, 0, 0, 0.45, thick * CH * 2.4, c, { color1: col(0x4a6aff), size1: thick * CH });
    fx.tongue.emit(q.x, q.y, q.z, { vx: dir.x * 4, vy: dir.y * 4, vz: dir.z * 4, life: 0.12, size: 0.12, size1: 0.05, color: W, color1: c, alpha: 1, alpha1: 0 });
  }, onHit: (at, m) => { fx.spikeBurst(at, col(0xc8eaff), 1.6 + thick * 4, 0.2); fx.streaks(at, 10, { speed: 7, color: W, color1: c, life: 0.3, size: 0.1, gravity: 2 }); if (m) hitM(p, s, m, mult); p.game.audio.play('hit', { pitch: 1.2 }); } });
  p.game.audio.play('slashWave', { pitch: 1.6 });
}
function demolitionPillar(p) { p.fx.pillar(ground(p, p.position), { color: 0x6ab0ff, color2: 0xe0f4ff, radius: 0.35 * CH, height: 3 * CH, duration: 1.2, speed: 4 }); }
function moonAurora(p) {
  const fx = p.fx;
  fx.pillar(ground(p, p.position), { color: 0x5aa0ff, color2: 0xffffff, radius: 0.3 * CH, height: 2 * CH, duration: 1.0, speed: 3 });
  later(p, 0.2, () => fx.timed(0.6, () => { const pp = p.position, f = p.forward(); for (let i = 0; i < 3; i++) { const u = Math.random(); fx.tongue.emit(pp.x - f.x * u * 2, pp.y + u * 3 * CH, pp.z - f.z * u * 2, { vx: -f.x * 2, vy: 4, vz: -f.z * 2, life: 0.5, size: 0.5, size1: 0.2, color: col(0xc8f0ff), color1: col(0x4a8cff), alpha: 0.6, alpha1: 0 }); } }));
}
const adb = (charge, size, extra) => skill({ dur: charge + 0.8, range: 22, shape: { type: 'single' }, steps: [
  [0, 'anim', 'BW_Aim', charge], [0, 'fn', (p) => p.fx.flare(bowPos(p), col(0xffb0e0), 0.8, 0.2)], [0.3, 'fn', (p) => adbCharge(p, charge - 0.3, size)],
  ...(extra || []), [charge, 'anim', 'BW_Shoot', 0.5], [charge, 'fn', (p, s, d) => adbShot(p, s, d, { thick: 0.1 + size * 0.08 })]] });

// ---------------------------------------------------------------- Arrow Combo
function pinkStreak(p, s, d, mult, knock = 0.3) {
  const fx = p.fx, c = col(PINK);
  arrowTo(p, d, { speed: 90, trail: (q, dir) => fx.tongue.emit(q.x, q.y, q.z, { vx: dir.x * 3, vy: dir.y * 3, vz: dir.z * 3, life: 0.16, size: 0.16, size1: 0.06, color: W, color1: c, alpha: 1, alpha1: 0 }),
    onHit: (at, m) => { fx.flare(at, W, 0.9, 0.12); fx.streaks(at, 5, { speed: 5, color: W, color1: c, life: 0.2, size: 0.08 }); if (m) hitM(p, s, m, mult, { knock }); } });
  p.game.audio.play('swing', { pitch: 1.8 });
}
function arrowStream(p, s, d, dur, shots) {
  const fx = p.fx, c = col(PINK);
  fx.decal(p.position, { follow: p, tex: 'rings2', color: c, radius: 0.5 * CH, duration: 0.6, spin: 4, opacity: 0.7, fadeOut: 0.3 });
  let acc = 0, n = 0;
  const every = dur / shots;
  fx.timed(dur, (k, dt) => {
    const from = bowPos(p), to = aim(p, d);
    if (Math.random() < 0.6) beamLine(p, from, to, { thick: 0.15, color: PINK, dur: 0.14, grow: 0.03 });
    // continuous beam of arrows
    for (let i = 0; i < 3; i++) { const u = Math.random(); const q = from.clone().lerp(to, u); fx.tongue.emit(q.x + rnd(0.05), q.y + rnd(0.05), q.z + rnd(0.05), { vx: (to.x - from.x) * 2, vy: 0, vz: (to.z - from.z) * 2, life: 0.1, size: 0.22, size1: 0.1, color: W, color1: c, alpha: 0.9, alpha1: 0 }); }
    if (Math.random() < 0.5) fx.sparks.emit(to.x, to.y, to.z, rnd(3), rnd(3), rnd(3), 0.3, 0.2, W, { drag: 2 });
    acc += dt;
    while (acc >= every && n < shots) { acc -= every; n++; if (d.target && !d.target.dead) hitM(p, s, d.target, 1, { knock: n === shots ? 3 : 0.4 }); }
  });
  p.game.audio.play('slashWave', { pitch: 1.8 });
}
const combo = (n, stream) => skill({ dur: stream ? 3.0 : 0.6 + n * 0.32, range: 22, shape: { type: 'single' }, steps: stream
  ? [[0, 'anim', 'BW_Aim', 0.8], [0, 'fn', (p) => p.fx.flare(bowPos(p), col(PINK), 1.2, 0.3)], [0.8, 'anim', 'BW_Shoot', 0.4], [0.8, 'fn', (p, s, d) => arrowStream(p, s, d, n >= 7 ? 1.4 : 1.8, n)]]
  : Array.from({ length: n }, (_, i) => [[0.5 + i * (n === 2 ? 1.0 : 0.3), 'anim', 'BW_Shoot', 0.25], [0.6 + i * (n === 2 ? 1.0 : 0.3), 'fn', (p, s, d) => pinkStreak(p, s, d, 1)]]).flat() });

// ---------------------------------------------------------------- Hawk summons
const HAWKS = {
  white: { color: 0xf0f4ff, color2: 0xc8d8ff, attack: false, mods: { crit: 3 } },
  black: { color: 0x6a5a50, color2: 0xa89888, attack: true, dark: true },
  blue: { color: 0x5aa0ff, color2: 0xa8d8ff, attack: true },
  lightning: { color: 0x3a4aa0, color2: 0x9a7aff, attack: true, sparks: true, dark: true },
  ice: { color: 0xa8f0ff, color2: 0xe0ffff, attack: true, slow: true },
  fire: { color: 0xff7a20, color2: 0xffc060, attack: true, fire: true, mods: { crit: 5 } },
};
function summonHawk(p, s, kind) {
  const def = HAWKS[kind], g = p.game, fx = p.fx, scene = g.world.scene;
  const hk = createHawk(def.color, def.color2, { dark: def.dark });
  scene.add(hk.group);
  const state = { alive: true, mode: 'hover', t: 0, cd: 1.5, target: null, from: new THREE.Vector3(), a: Math.random() * TAU };
  const home = () => p.position.clone().add(V(Math.cos(state.a) * 0.55, 2.55 + Math.sin(state.t * 2) * 0.1, Math.sin(state.a) * 0.55));
  hk.group.position.copy(home());
  fx.add({ update: (dt) => {
    if (!state.alive) { scene.remove(hk.group); hk.dispose(); return false; }
    state.t += dt; state.cd -= dt;
    if (state.mode === 'hover') {
      state.a += dt * 0.9;
      const h = home();
      hk.group.position.lerp(h, Math.min(1, dt * 6));
      hk.group.lookAt(h.clone().add(V(-Math.sin(state.a), 0, Math.cos(state.a))));
      hk.flap(dt, 1);
      const fighting = g.time - (p.lastAttackT || -99) < 3;
      if (def.attack && state.cd <= 0 && fighting) {
        const m = g.combat.nearest(p.position, 16);
        if (m) { state.mode = 'dive'; state.target = m; state.t = 0; state.from.copy(hk.group.position); }
        state.cd = 2.2;
      }
    } else if (state.mode === 'dive') {
      const m = state.target, k = Math.min(1, state.t / 0.3);
      const dest = m && !m.dead ? chest(m) : state.from;
      hk.group.position.lerpVectors(state.from, dest, k * k);
      hk.group.lookAt(dest);
      hk.flap(dt, 2);
      if (def.fire) fx.fire.emit(hk.group.position.x, hk.group.position.y, hk.group.position.z, { vx: 0, vy: 0.5, vz: 0, life: 0.3, size: 0.35, size1: 0.1, color: col(0xffc060), color1: col(0xff3010), alpha: 1, alpha1: 0 });
      else fx.glow.emit(hk.group.position.x, hk.group.position.y, hk.group.position.z, 0, 0, 0, 0.3, 0.25, W, { size1: 0 });
      if (k >= 1) {
        if (m && !m.dead) {
          hitM(p, s, m, 1, def.slow ? { slow: 2 } : {});
          fx.flare(dest, col(def.color2), 1.2, 0.15);
          if (def.sparks) fx.lightning(dest.clone().add(V(0, 0.6, 0)), dest, { color: 0x9a7aff, core: 0xffffff, width: 0.04, duration: 0.15, segments: 6, jitter: 0.3, branches: 1 });
          if (def.fire) fx.fireBurst(dest, { count: 6, size: 0.5, size1: 1.1, life: 0.35, color: 0xff6010 });
        }
        state.mode = 'back'; state.t = 0; state.from.copy(hk.group.position);
      }
    } else {
      const k = Math.min(1, state.t / 0.4), h = home();
      hk.group.position.lerpVectors(state.from, h, k);
      hk.group.lookAt(h);
      hk.flap(dt, 1.4);
      if (k >= 1) state.mode = 'hover';
    }
    if (def.sparks && Math.random() < dt * 5) { const q = hk.group.position; fx.sparks.emit(q.x, q.y, q.z, rnd(2), rnd(2), rnd(2), 0.25, 0.18, col(0xb090ff), { drag: 2 }); }
    if (def.fire && Math.random() < dt * 14) { const q = hk.group.position; fx.fire.emit(q.x + rnd(0.15), q.y, q.z + rnd(0.15), { vx: 0, vy: 0.8, vz: 0, life: 0.3, size: 0.25, size1: 0.08, color: col(0xffb040), color1: col(0xff3010), alpha: 0.9, alpha1: 0 }); }
    return true;
  } });
  if (def.fire) fx.fireBurst(p.position.clone().setY(p.position.y + 2.4), { count: 5, size: 0.4, size1: 0.8, life: 0.3, color: 0xff8020, speed: 1, up: 1 });
  p.addBuff('hawk', { id: s.id, name: s.name, dur: 1800, mods: def.mods || {}, color: '#' + col(def.color).getHexString(), fx: { end: () => { state.alive = false; } } });
  g.audio.play('summon', { pitch: 1.4 });
}
const hawk = (kind) => skill({ dur: 0.5, shape: { type: 'single' }, buffGroup: 'hawk', steps: [[0, 'anim', 'BW_Up', 0.5], [0.2, 'fn', (p, s) => summonHawk(p, s, kind)]] });

// ---------------------------------------------------------------- Autumn Wind (pierce 3)
function windArrow(p, s, d, tier) {
  const fx = p.fx, big = tier >= 4, thick = tier >= 6 ? 0.4 : tier >= 5 ? 0.33 : 0.28;
  let ph = 0;
  arrowTo(p, d, { speed: big ? 40 : 60, pierce: 2, trail: (q, dir, dt) => {
    if (!big) { fx.tongue.emit(q.x, q.y, q.z, { vx: dir.x * 2, vy: 0, vz: dir.z * 2, life: 0.12, size: 0.1, size1: 0.04, color: W, color1: col(0xffb0c0), alpha: 1, alpha1: 0 }); return; }
    ph += dt * 30;
    const side = V(dir.z, 0, -dir.x);
    for (let i = 0; i < 2; i++) {
      const a = ph + i * Math.PI, r = thick * CH * 0.5;
      const o = side.clone().multiplyScalar(Math.cos(a) * r).add(V(0, Math.sin(a) * r, 0));
      fx.glow.emit(q.x + o.x, q.y + o.y, q.z + o.z, 0, 0, 0, 0.45, 0.28 + thick * 0.4, i ? W : col(0xb8f4ff), { color1: col(0x80d8ff), size1: 0.05 });
    }
    fx.fire.emit(q.x, q.y, q.z, { vx: -dir.x, vy: 0.2, vz: -dir.z, life: 0.18, size: 0.45, size1: 0.15, color: col(0xfff0a0), color1: col(0xff8020), alpha: 1, alpha1: 0 });
  }, onHit: (at, m, side) => {
    if (m) hitM(p, s, m, side ? 0.65 : 1);
    fx.flare(at, big ? col(0xfff0c0) : col(0xffc0c0), big ? 1.4 : 0.8, 0.15);
    if (tier >= 6 && !side) later(p, 0.15, () => fx.cloudBurst(at, { color: 0xc8e8ff, color2: 0xffffff, radius: 0.8, count: 6, life: 0.5, rise: 0.2 }));
  } });
  p.game.audio.play('slashWave', { pitch: 1.4 });
}
const autumn = (tier) => skill({ dur: 2.5, range: 22, shape: { type: 'single' }, steps: [[0, 'anim', 'BW_Aim', 2.0], [0.1, 'fn', (p) => p.fx.flare(bowPos(p), col(0xffa0d0), 0.7, 0.2)], [2.0, 'anim', 'BW_Shoot', 0.5], [2.05, 'fn', (p, s, d) => windArrow(p, s, d, tier)]] });

// ---------------------------------------------------------------- Soul Arrow (range buffs, one at a time)
function soulArrow(p, s, range, kind) {
  const fx = p.fx, b = bowPos(p);
  if (kind === 'demon') fx.flare(b, col(0x8a60ff), 0.9, 0.5);
  else if (kind === 'ice') {
    fx.spikeBurst(b, W, 1.0, 0.25);
    later(p, 0.3, () => fx.decal(p.position, { follow: p, tex: 'disc', color: 0xa8e0ff, radius: 0.6 * CH, duration: 0.5, spin: 0, opacity: 0.5, fadeOut: 0.3 }));
    later(p, 0.8, () => fx.rise(p.position.clone().setY(p.position.y + 1.5), { color: 0xa0b0ff, count: 16, radius: 0.5, speed: 2.5, life: 0.6, size: 0.2 }));
  } else { fx.spikeBurst(b, W, kind === 'dragon' ? 1.0 : 0.6, 0.25); fx.glow.burst(b, 8, { speed: 2, life: 0.3, size: 0.18, color: col(kind === 'phoenix' ? 0x9af0ff : 0xd0ffa0), drag: 2 }); }
  p.addBuff('soularrow', { id: s.id, name: s.name, dur: 471 + s.lv * 40, mods: { range, skillPct: 2 + s.lv }, color: '#7a60c0' });
  p.game.audio.play('levelup', { pitch: 1.6 });
}
const soul = (range, kind) => skill({ dur: 0.5, shape: { type: 'single' }, buffGroup: 'soularrow', steps: [[0, 'anim', 'BW_Up', 0.5], [0.15, 'fn', (p, s) => soulArrow(p, s, range, kind)]] });

// ---------------------------------------------------------------- blasting-powder arrows (front AoE, 4 targets)
function blast(p, s, d, kind, r) {
  const fx = p.fx, g = p.game;
  const trails = {
    berserker: (q, dir) => fx.fire.emit(q.x, q.y, q.z, { vx: -dir.x, vy: 0.3, vz: -dir.z, life: 0.25, size: 0.4, size1: 0.15, color: col(0xffd060), color1: col(0xff5010), alpha: 1, alpha1: 0 }),
    demon: (q, dir) => { for (let i = 0; i < 2; i++) fx.tongue.emit(q.x - dir.x * i * 0.4, q.y, q.z - dir.z * i * 0.4, { vx: dir.x * 2, vy: 0, vz: dir.z * 2, life: 0.18, size: 0.2, size1: 0.1, color: col(0xff3020), color1: col(0xff8030), alpha: 1, alpha1: 0 }); },
    devil: (q, dir) => { fx.fire.emit(q.x, q.y, q.z, { vx: -dir.x, vy: 0.3, vz: -dir.z, life: 0.25, size: 0.5, size1: 0.2, color: col(0xffe080), color1: col(0xff6010), alpha: 1, alpha1: 0 }); if (Math.random() < 0.6) fx.smoke.emit(q.x, q.y, q.z, { vx: 0, vy: 0.4, vz: 0, life: 0.6, size: 0.3, size1: 0.7, color: col(0xf0f0f0), color1: col(0xc0c0c0), alpha: 0.5, alpha1: 0 }); },
    celestial: (q, dir) => { fx.fire.emit(q.x, q.y, q.z, { vx: -dir.x, vy: 0.3, vz: -dir.z, life: 0.3, size: 0.55, size1: 0.2, color: col(0xfff0b0), color1: col(0xffa020), alpha: 1, alpha1: 0 }); fx.glow.emit(q.x, q.y, q.z, 0, 0, 0, 0.3, 0.6, col(0xffe080), { size1: 0.1 }); },
    pitch: (q, dir) => fx.tongue.emit(q.x, q.y, q.z, { vx: dir.x * 2, vy: 0, vz: dir.z * 2, life: 0.14, size: 0.14, size1: 0.05, color: W, color1: col(0xc080ff), alpha: 1, alpha1: 0 }),
  };
  arrowTo(p, d, { speed: kind === 'devil' ? 36 : 55, trail: trails[kind], onHit: (at) => {
    const gp = ground(p, at);
    const boom = () => {
      g.combat.monsters.filter((m) => !m.dead && m.position.distanceTo(gp) < r + m.tpl.radius).sort((a, b) => a.position.distanceTo(gp) - b.position.distanceTo(gp)).slice(0, 4).forEach((m) => { hitM(p, s, m, 1, { knock: 1.2 }); starburst(p, chest(m), 0.7); });
      g.engine.shake(0.3); g.audio.play('boom', { pitch: 1.2 });
    };
    if (kind === 'berserker') { fx.decal(gp, { tex: 'nova', color: 0xffa020, radius: 0.9 * CH, duration: 0.6, grow: 0.25, spin: 0, opacity: 0.9, fadeIn: 0.02, fadeOut: 0.35 }); fx.shockwave(gp, { color: 0xffb040, radius: 1.2 * CH, duration: 0.5, width: 0.2 }); fx.fireBurst(at, { count: 8, size: 0.6, size1: 1.3, life: 0.4, color: 0xff7020, speed: 2.5, up: 1 }); boom(); }
    else if (kind === 'demon') { fx.explode(at, { color: 0xff6010, color2: 0xffd060, radius: 1.3, power: 0.6 }); boom(); }
    else if (kind === 'devil') { fx.explode(at, { color: 0xff8030, color2: 0xffffff, radius: 1.5, power: 0.7 }); for (let i = 0; i < 16; i++) { const a = (Math.random() - 0.5) * 1.2 + Math.atan2(p.forward().x, p.forward().z) + Math.PI / 2 * (i % 2 ? 1 : -1); fx.streak.emit(at.x, at.y, at.z, { vx: Math.sin(a) * 10, vy: rnd(1), vz: Math.cos(a) * 10, life: 0.3, size: 0.12, color: W, color1: col(0xffc080), alpha: 1, alpha1: 0, drag: 2 }); } boom(); }
    else if (kind === 'celestial') { fx.explode(at, { color: 0xffa020, color2: 0xfff0c0, radius: 1.8, power: 0.8 }); fx.pillar(gp, { color: 0xffd060, color2: 0xffffff, radius: 0.5 * CH, height: 2 * CH, duration: 0.6, speed: 3 }); boom(); }
    else {
      // Pitch Black: purple ground disc grows, starburst, orange fireball, purple smoke column
      fx.decal(gp, { tex: 'disc', color: 0x5020a0, radius: 2.0 * CH, duration: 1.6, grow: 0.25, spin: 0, opacity: 0.85, additive: false, fadeIn: 0.05, fadeOut: 0.5 });
      fx.decal(gp, { tex: 'rings1', color: 0xff4060, radius: 2.0 * CH, duration: 1.4, grow: 0.25, spin: 0.5, opacity: 0.7, fadeIn: 0.05, fadeOut: 0.5 });
      later(p, 0.2, () => fx.spikeBurst(at, col(0xfff0b0), 3, 0.25));
      later(p, 0.4, () => { fx.explode(gp.clone().setY(gp.y + 0.8), { color: 0xff6010, color2: 0xffd060, radius: 2.2, power: 0.9 }); boom(); });
      later(p, 0.7, () => { fx.cloudBurst(gp.clone().setY(gp.y + 1.2), { color: 0xa040c0, color2: 0xff80d0, radius: 1.8, count: 12, life: 1.0, rise: 2.5 }); fx.streaks(gp.clone().setY(gp.y + 0.6), 20, { speed: 10, color: col(0xffc060), color1: col(0xff5010), life: 0.5, size: 0.12, gravity: 6, up: 2 }); });
    }
  } });
}
const blasting = (kind, r, charge) => skill({ dur: charge + 1.2, range: 22, shape: { type: 'single' }, steps: [[0, 'anim', 'BW_Up', charge], [0.3, 'fn', (p) => p.fx.flare(bowPos(p), col(kind === 'demon' ? 0xff80c0 : 0xffffff), 1.0, Math.max(0.3, charge - 0.5))], [charge, 'anim', 'BW_Shoot', 0.5], [charge, 'fn', (p, s, d) => blast(p, s, d, kind, r)]] });

// ---------------------------------------------------------------- Strong Bow (one cooldown for the row)
function strongCharge(p, dur, crescents, tornado) {
  const fx = p.fx;
  const sh = fx.shell(p.obj, 0xfff0b0, 0xffffff, { thickness: 0.015, intensity: 0.7 });
  let acc = 0;
  fx.timed(dur, (k, dt) => {
    acc += dt;
    if (acc > 0.12) { acc = 0; fx.spikeBurst(p.position.clone().setY(p.position.y + 1.1), new THREE.Color(1, 0.88, 0.5), 1.25 * CH * (0.85 + Math.random() * 0.3), 0.14); }
    if (crescents && Math.random() < dt * 6) fx.slash(p.position, Math.random() * TAU, { color: 0xfff6c8, color2: 0xffe080, radius: (tornado ? 1.5 : 1.3) * CH, width: 0.3, angle: Math.PI * 0.8, y: 0.3 + Math.random() * 1.6, tilt: rnd(0.3), duration: 0.25, sparks: false, gain: 0.5 });
  }, () => sh.dispose());
}
function strongShot(p, s, d, big) {
  const fx = p.fx, from = bowPos(p), to = aim(p, d);
  fx.lightning(from, to, { color: 0xfff6d0, core: 0xffffff, width: big ? 0.09 : 0.06, duration: 0.3, segments: 14, jitter: 0.35, branches: 2 });
  if (big) fx.energyWave(from, to, { color: 0xffe080, color2: 0xffffff, duration: 0.2, width: 0.6 * CH });
  later(p, 0.1, () => { fx.spikeBurst(to, col(0xfff0b0), big ? 3.5 : 2.2, 0.25); if (d.target && !d.target.dead) hitM(p, s, d.target, 1, big ? { stun: 2, knock: 2 } : {}); });
  p.game.audio.play('thunder', { pitch: 1.6 });
}
const strong = (charge, crescents, big) => skill({ dur: charge + 0.8, range: 24, shape: { type: 'single' }, steps: [[0, 'anim', 'BW_Aim', charge], [0.2, 'fn', (p) => p.fx.starFlash(bowPos(p), W, 0.8, 0.15)], [0.35, 'fn', (p) => strongCharge(p, charge - 0.35, crescents, big)], [charge, 'anim', 'BW_Shoot', 0.5], [charge, 'fn', (p, s, d) => strongShot(p, s, d, big)], ...(crescents ? [[charge + 0.4, 'fn', (p) => p.fx.rise(p.position.clone().setY(p.position.y + 1.8), { color: 0xc8e0ff, count: 14, radius: 0.6, speed: 2, life: 0.6, size: 0.2 })]] : [])] });

// ---------------------------------------------------------------- Mind Bow (chain)
function mindChain(p, s, d, targets) {
  const fx = p.fx, g = p.game, from = bowPos(p);
  const first = d.target && !d.target.dead ? d.target : g.combat.nearest(p.position, 22);
  const line = (a, b) => fx.lightning(a, b, { color: PINK, core: 0xffffff, width: 0.035, duration: 0.45, segments: 3, jitter: 0.04, branches: 0 });
  if (!first) { line(from, aim(p, d)); return; }
  line(from, chest(first));
  hitM(p, s, first);
  fx.flare(chest(first), W, 1.0, 0.15);
  const others = g.combat.monsters.filter((m) => !m.dead && m !== first && m.position.distanceTo(first.position) < 12).sort((a, b) => a.position.distanceTo(first.position) - b.position.distanceTo(first.position)).slice(0, targets - 1);
  others.forEach((m, i) => later(p, 0.15 + i * 0.08, () => { if (m.dead) return; line(chest(first), chest(m)); hitM(p, s, m, 0.85); fx.flare(chest(m), W, 0.8, 0.12); }));
  g.audio.play('slashWave', { pitch: 2 });
}
const mind = (n, charge) => skill({ dur: charge + 0.8, range: 24, shape: { type: 'single' }, steps: [[0, 'anim', 'BW_Aim', charge], [charge, 'anim', 'BW_Shoot', 0.5], [charge, 'fn', (p, s, d) => mindChain(p, s, d, n)]] });

export const PACHEON = {
  pc_adb_missile: adb(1.5, 1.0),
  pc_adb_wave: adb(2.0, 1.25, [[0.4, 'fn', (p) => { const b = bowPos(p), f = p.forward(); for (let i = 0; i < 10; i++) { const a = rnd(0.4); p.fx.tongue.emit(b.x, b.y, b.z, { vx: (f.x * Math.cos(a) - f.z * Math.sin(a)) * 12, vy: rnd(1), vz: (f.z * Math.cos(a) + f.x * Math.sin(a)) * 12, life: 0.2, size: 0.15, size1: 0.05, color: W, color1: col(0x7ae0ff), alpha: 1, alpha1: 0 }); } }]]),
  pc_adb_steel: adb(2.0, 1.6, [[0.6, 'fn', (p) => p.fx.spikeBurst(bowPos(p), W, 1.4, 0.2)]]),
  pc_adb_strike: adb(2.1, 1.7, [[0.6, 'fn', (p) => p.fx.spikeBurst(bowPos(p), col(0xd0e8ff), 1.6, 0.25)]]),
  pc_adb_annihilate: adb(1.8, 1.8, [[0.4, 'fn', (p) => p.fx.flare(bowPos(p), col(0xff4060), 0.9, 0.2)]]),
  pc_adb_demolition: adb(2.2, 2.0, [[0.2, 'fn', (p) => demolitionPillar(p)], [1.0, 'fn', (p, s, d) => p.fx.energyWave(bowPos(p), bowPos(p).addScaledVector(p.forward(), 4 * CH), { color: 0x6ab0ff, color2: 0xffffff, duration: 1.0, width: 0.5 })]]),
  pc_adb_moonlight: adb(2.2, 2.6, [[0.2, 'fn', (p) => moonAurora(p)], [2.8, 'fn', (p) => p.fx.rise(p.position.clone().setY(p.position.y + 2), { color: 0xc8f0ff, count: 18, radius: 0.6, speed: 1.6, life: 0.7, size: 0.2 })]]),
  pc_combo2: combo(2), pc_combo3: combo(3), pc_combo4: combo(4), pc_combo5: combo(5, true), pc_combo6: combo(6, true), pc_combo7: combo(7, true),
  pc_hawk_white: hawk('white'), pc_hawk_black: hawk('black'), pc_hawk_blue: hawk('blue'), pc_hawk_lightning: hawk('lightning'), pc_hawk_ice: hawk('ice'), pc_hawk_fire: hawk('fire'),
  pc_aw_flame: autumn(1), pc_aw_snake: autumn(2), pc_aw_blood: autumn(3), pc_aw_red: autumn(4), pc_aw_devil: autumn(5), pc_aw_dragon: autumn(6),
  pc_soul_demon: soul(2.8, 'demon'), pc_soul_bloody: soul(3.8, 'bloody'), pc_soul_dragon: soul(4.8, 'dragon'), pc_soul_phoenix: soul(5.9, 'phoenix'), pc_soul_icehawk: soul(7.0, 'ice'),
  pc_berserker_arrow: blasting('berserker', 4, 2.0), pc_demon_arrow: blasting('demon', 4, 2.7), pc_devil_arrow: blasting('devil', 4, 2.5), pc_celestial_arrow: blasting('celestial', 5, 2.5), pc_pitch_black_arrow: blasting('pitch', 6, 2.5),
  pc_sb_spirit: strong(2.0, false, false), pc_sb_vision: strong(1.8, false, false), pc_sb_will: strong(1.8, true, false), pc_sb_destruction: strong(2.2, true, true), pc_bow_storm: strong(2.4, true, true),
  pc_mb_flower: mind(2, 1.8), pc_mb_butterfly: mind(3, 1.8), pc_mb_swift: mind(4, 1.4), pc_mb_lighting: mind(5, 1.2),
};
for (const k of ['pc_soul_demon', 'pc_soul_bloody', 'pc_soul_dragon', 'pc_soul_phoenix', 'pc_soul_icehawk']) PACHEON[k].buffGroup = 'soularrow';

export default PACHEON;
