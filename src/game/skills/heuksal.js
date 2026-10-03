// Heuksal (Silkroad Online, spear/glaive) - every skill shown in the reference clip.
// Each skill is a timeline of body moves (anim), white translucent crescents, hits and the line's signature
// effect (thrust flame beam, Ghost Spear ground ring, javelin throw...). Times follow the clip notes (seconds).
import * as THREE from 'three';
import { V, targetPoint } from './common.js';
import { assets } from '../../core/assets.js';
import { ringMaterial, basicAdd } from '../../fx/materials.js';

export const CH = 1.85;
const TAU = Math.PI * 2;
const W = new THREE.Color(1, 1, 1);
const col = (c) => (c instanceof THREE.Color ? c.clone() : new THREE.Color(c));
const rnd = (a = 1) => (Math.random() - 0.5) * 2 * a;
const PINK = 0xff6ad0, GOLD = 0xffc040, CREAM = 0xfff0c0;

export function chest(m) { const q = m.position.clone(); q.y += m.tpl ? m.tpl.height * 0.55 : 1.1; return q; }
export function ground(p, v) { const q = v.clone(); q.y = p.game.world.heightAt(q.x, q.z); return q; }
export function aim(p, d) { return d.target && !d.target.dead ? chest(d.target) : p.position.clone().add(p.forward().multiplyScalar(2.2 * CH)).setY(p.position.y + 1.1); }
export function later(p, sec, fn) { let t = 0; p.fx.add({ update: (dt) => { t += dt; if (t >= sec) { fn(); return false; } return true; } }); }

// ---------------------------------------------------------------- hit shapes
export function hitTargets(p, s, d, shape, mult, opts = {}) {
  const g = p.game, f = p.forward(), pp = p.position;
  let list = [];
  if (shape.type === 'single') {
    const m = shape.fallen ? g.combat.nearest(pp, 6, (o) => o.down > 0) : d.target && !d.target.dead ? d.target : g.combat.nearest(pp, 3.2);
    if (m && m.position.distanceTo(pp) < 6) list = [m];
  } else if (shape.type === 'pierce') {
    const len = shape.len ?? 9;
    list = g.combat.monsters.filter((m) => {
      if (m.dead) return false;
      const dx = m.position.x - pp.x, dz = m.position.z - pp.z, t = dx * f.x + dz * f.z;
      return t > -0.5 && t < len + m.tpl.radius && Math.hypot(dx - f.x * t, dz - f.z * t) < 1.0 + m.tpl.radius;
    }).sort((a, b) => a.position.distanceTo(pp) - b.position.distanceTo(pp)).slice(0, shape.n ?? 2);
  } else if (shape.type === 'front') {
    g.combat.inArc(pp, p.yaw, shape.r, Math.PI * 0.75, (m) => list.push(m));
    list = list.sort((a, b) => a.position.distanceTo(pp) - b.position.distanceTo(pp)).slice(0, shape.n ?? 3);
  } else if (shape.type === 'around') {
    g.combat.inCircle(pp, shape.r, (m) => list.push(m));
    list = list.sort((a, b) => a.position.distanceTo(pp) - b.position.distanceTo(pp)).slice(0, shape.n ?? 5);
  }
  list.forEach((m, i) => {
    let k = mult;
    if (shape.type === 'pierce' && i > 0) k *= 1 - (shape.reduce ?? 0.35);
    const o = { color: 0xffffff, from: pp, noFx: true, knock: 0.6, ...opts };
    if (opts.kb && Math.random() < opts.kb) { o.knock = 5; o.heavy = true; }
    if (opts.stunP && Math.random() < opts.stunP) o.stun = opts.stunT ?? 2;
    if (opts.kd) o.knock = 0;
    if (opts.dullP && Math.random() < opts.dullP) o.slow = 3;
    if (opts.downP && Math.random() < opts.downP) o.down = opts.downT ?? 3.5;
    if (opts.fallen && m.down > 0) k *= 1.5;
    g.combat.playerHit(m, p.skillMult(s.mult * k), o);
    if (opts.bleedP && Math.random() < opts.bleedP) bleed(p, s, m);
    if (opts.taunt) { m.aggro = true; if (m.state !== 'attack') m.state = 'chase'; }
    starburst(p, chest(m), opts.burst || 1);
  });
  return list.length;
}

// bleeding: yellow damage ticks every second for 5 s (Double Twist / Sudden Twist)
function bleed(p, s, m) {
  if (m.bleed > 0) { m.bleed = 5; return; }
  m.bleed = 5;
  let acc = 0;
  p.fx.add({ update: (dt) => {
    if (m.dead || !(m.bleed > 0)) return false;
    m.bleed -= dt; acc += dt;
    if (Math.random() < dt * 5) p.fx.glow.emit(m.position.x + rnd(0.3), m.position.y + m.tpl.height * 0.6, m.position.z + rnd(0.3), 0, -1, 0, 0.4, 0.2, new THREE.Color(0.8, 0.05, 0.05), { size1: 0 });
    if (acc >= 1) { acc -= 1; const st = p.game.stats; const dmg = Math.max(1, Math.round(st.atk * 0.25)); m.takeDamage(dmg, { knock: 0 }); p.game.dmgText.spawn(chest(m).setY(m.position.y + m.tpl.height + 0.2), dmg.toLocaleString(), 'block'); }
    return true;
  } });
}

// ---------------------------------------------------------------- visuals
// white ray starburst with an orange core and pink glints (shared hit flash)
export function starburst(p, at, scale = 1) {
  const fx = p.fx;
  fx.spikeBurst(at, new THREE.Color(1, 0.98, 0.92), 2.6 * scale, 0.22);
  fx.flare(at, new THREE.Color(1, 0.55, 0.15), 0.9 * scale, 0.14);
  fx.streaks(at, Math.round(10 * scale), { speed: 9 * scale, color: W, color1: new THREE.Color(1, 0.85, 0.5), life: 0.25, size: 0.1, gravity: 6 });
  for (let i = 0; i < 4; i++) fx.glow.emit(at.x + rnd(0.3), at.y + rnd(0.3), at.z + rnd(0.3), rnd(2), rnd(2), rnd(2), 0.3, 0.3, new THREE.Color(PINK), { size1: 0 });
}

// white translucent crescents (the clip's slash language)
export function crescent(p, kind, o = {}) {
  const fx = p.fx, pp = p.position, y = p.yaw;
  const c = o.color ?? 0xffffff, c2 = o.color2 ?? 0xcfe8ff;
  const big = o.scale ?? 1;
  const gain = o.gain ?? (0.62 / Math.max(1, big * 0.9));
  switch (kind) {
    case 'flat': fx.slash(pp, y, { color: c, color2: c2, radius: 1.45 * CH * big, width: 1.0 * big, angle: Math.PI * 1.15, y: 1.0, duration: 0.18, flip: !!o.flip, gain }); break;
    case 'low': fx.slash(pp, y, { color: c, color2: c2, radius: 1.3 * CH * big, width: 0.8 * big, angle: Math.PI, y: 0.45, tilt: -0.25, duration: 0.18, flip: !!o.flip, gain }); break;
    case 'high': fx.slash(pp, y + 0.5, { color: c, color2: c2, radius: 1.15 * CH * big, width: 0.8 * big, angle: Math.PI * 0.9, y: 1.5, tilt: 0.85, duration: 0.18, flip: !!o.flip, gain }); break;
    case 'ellipse': fx.slash(pp, y, { color: c, color2: c2, radius: 1.5 * CH * big, width: 0.75 * big, angle: TAU * 0.98, y: 0.85, tilt: 0.06, duration: 0.24, flip: !!o.flip, gain }); break;
    case 'vertical': fx.slash(pp, y, { color: c, color2: c2, radius: 1.25 * CH * big, width: 0.9 * big, angle: Math.PI * 0.95, y: 0.9, tilt: Math.PI / 2, duration: 0.2, flip: !!o.flip, gain }); break;
    case 'dome': {
      // giant arch from behind the player over to the target
      const mid = pp.clone().add(p.forward().multiplyScalar(0.9 * CH));
      fx.slash(mid, y, { color: c, color2: c2, radius: 1.35 * CH * big, width: 0.7 * big, angle: Math.PI * 1.02, y: 0.05, tilt: Math.PI / 2, duration: 0.26, gain });
      break;
    }
    default: break;
  }
  if (o.sound !== false) p.game.audio.play('swing', { pitch: 0.9 + Math.random() * 0.3 });
}

// thin white streak along the thrust
let jabGeo = null;
export function jabStreak(p, len = 2.2 * CH, color = 0xffffff) {
  if (!jabGeo) jabGeo = new THREE.ConeGeometry(0.07, 1, 6, 1, true).rotateX(Math.PI / 2).translate(0, 0, 0.5);
  const mat = basicAdd(color, 1);
  const m = new THREE.Mesh(jabGeo, mat);
  const from = p.position.clone().setY(p.position.y + 1.1);
  m.position.copy(from); m.lookAt(from.clone().add(p.forward()));
  m.renderOrder = 6;
  p.game.world.scene.add(m);
  p.fx.timed(0.18, (k) => { m.scale.set(1 - k * 0.6, 1 - k * 0.6, len * Math.min(1, k * 5)); mat.opacity = 1 - k; }, () => { p.game.world.scene.remove(m); mat.dispose(); });
}

// horizontal flame beam from behind the player through the target (Spear Thrust line)
export function thrustBeam(p, d, { past = 1, thick = 0.35, dur = 0.4, core = 0xfff2a0, edge = 0xff7a10, tip = true, from: back = 0.6 } = {}) {
  const fx = p.fx, f = p.forward();
  const origin = p.position.clone().setY(p.position.y + 1.05).addScaledVector(f, -back * CH);
  const tgt = aim(p, d);
  const dist = Math.max(1.6 * CH, Math.hypot(tgt.x - p.position.x, tgt.z - p.position.z));
  const len = dist + back * CH + past * CH;
  const c1 = col(core), c2 = col(edge), th = thick * CH;
  fx.drill(origin, f, { length: len, radius: th * 0.85, color: edge, color2: core, duration: dur });
  fx.timed(dur, (k) => {
    const w = Math.sin(Math.min(1, k * 1.4) * Math.PI) * 0.8 + 0.2;
    for (let i = 0; i < 9; i++) {
      const u = Math.random();
      const q = origin.clone().addScaledVector(f, u * len);
      q.x += rnd(th * 0.5) * w; q.y += rnd(th * 0.4) * w; q.z += rnd(th * 0.5) * w;
      const sp = 26 + Math.random() * 18;
      fx.tongue.emit(q.x, q.y, q.z, { vx: f.x * sp, vy: 0, vz: f.z * sp, life: 0.12 + Math.random() * 0.08, size: th * (0.35 + Math.random() * 0.4) * w, size1: th * 0.1, color: u > 0.5 ? c1 : W, color1: c2, alpha: 0.9, alpha1: 0 });
    }
    if (Math.random() < 0.5) {
      const q = origin.clone().addScaledVector(f, Math.random() * len * 0.6);
      fx.fire.emit(q.x, q.y, q.z, { vx: f.x * 6, vy: 0.5, vz: f.z * 6, life: 0.3, size: th * 1.4 * w, size1: th * 0.5, color: c2, color1: c2, alpha: 0.7, alpha1: 0, drag: 2 });
    }
  });
  if (tip) {
    const tp = origin.clone().addScaledVector(f, len);
    later(p, dur * 0.4, () => { fx.spikeBurst(tp, col(GOLD), 1.6, 0.2); fx.tongue.emit(tp.x, tp.y, tp.z, { vx: f.x * 4, vy: 0, vz: f.z * 4, life: 0.2, size: th * 1.2, size1: 0.05, color: W, color1: col(GOLD), alpha: 1, alpha1: 0 }); });
  }
  p.game.audio.play('slashWave', { pitch: 1.1 });
}

// violet lightning phase of Asura Spear
function violetBeam(p, d, dur = 0.3) {
  const fx = p.fx, f = p.forward();
  const from = p.position.clone().setY(p.position.y + 1.05).addScaledVector(f, -0.5 * CH);
  const to = aim(p, d).addScaledVector(f, 2.5 * CH);
  fx.drill(from, f, { length: from.distanceTo(to), radius: 0.22 * CH, color: 0x8a20ff, color2: 0xd080ff, duration: dur });
  for (let i = 0; i < 3; i++) later(p, i * 0.08, () => fx.lightning(from, to, { color: 0xa040ff, core: 0xf0d0ff, width: 0.035, duration: 0.15, segments: 14, jitter: 0.5, branches: 1 }));
  p.game.audio.play('thunder', { pitch: 1.5 });
}

// golden light streak sliding along the ground to the target
export function groundStreak(p, d, color = GOLD) {
  const fx = p.fx, f = p.forward();
  const from = ground(p, p.position.clone().addScaledVector(f, 0.6));
  const to = ground(p, aim(p, d));
  const c = col(color);
  fx.timed(0.22, (k) => {
    const q = new THREE.Vector3().lerpVectors(from, to, k);
    for (let i = 0; i < 3; i++) fx.streak.emit(q.x + rnd(0.2), q.y + 0.15, q.z + rnd(0.2), { vx: f.x * 14, vy: 0.2, vz: f.z * 14, life: 0.25, size: 0.18, color: W, color1: c, alpha: 1, alpha1: 0, drag: 3 });
    fx.glow.emit(q.x, q.y + 0.2, q.z, 0, 0, 0, 0.3, 0.6, c, { size1: 0 });
  });
}

// cream-gold crescent "sword wave" flying along the ground to the target
export function crescentWave(p, d, color = CREAM, color2 = GOLD) {
  const fx = p.fx, f = p.forward(), yaw = p.yaw;
  const from = ground(p, p.position.clone().addScaledVector(f, 0.8));
  const to = ground(p, aim(p, d));
  for (let i = 0; i <= 4; i++) {
    later(p, i * 0.04, () => {
      const q = new THREE.Vector3().lerpVectors(from, to, i / 4);
      fx.slash(q, yaw, { color, color2, radius: 0.85 * CH, width: 0.5, angle: Math.PI * 0.75, y: 0.3, duration: 0.09, sparks: false });
    });
  }
}

// ground rings of the Ghost Spear tiers
function ghostRing(p, tier) {
  const fx = p.fx, at = ground(p, p.position), g = p.game;
  if (tier === 1) { // orange glowing ring
    const mat = ringMaterial(0xff9a30, { width: 0.3 }), m = fx.mesh(fx.planeGeo, mat);
    m.position.set(at.x, at.y + 0.1, at.z);
    fx.timed(0.5, (k) => { const s = (0.8 + 0.7 * k) * CH * 2; m.scale.set(s, 1, s); mat.uniforms.uOpacity.value = (1 - k) * 1.3; }, () => { fx.scene.remove(m); mat.dispose(); });
    fx.decal(at, { tex: 'disc', color: 0xff8a20, radius: 1.0 * CH, duration: 0.35, spin: 0, opacity: 0.35, fadeIn: 0.03, fadeOut: 0.25 });
  } else if (tier === 2) { // cyan disc + thin white ellipse + blue-violet ring
    fx.decal(at, { tex: 'disc', color: 0x60e8ff, radius: 0.6 * CH, duration: 0.4, spin: 0, opacity: 0.8, fadeIn: 0.02, fadeOut: 0.3 });
    fx.shockwave(at, { color: 0xffffff, radius: 1.5 * CH, duration: 0.3, width: 0.08 });
    later(p, 0.15, () => { fx.shockwave(at, { color: 0x8a7aff, radius: 1.7 * CH, duration: 0.45, width: 0.18 }); fx.groundSwirl(at, { color: 0x6ab8ff, color2: 0x9a80ff, radius: 1.6 * CH, duration: 0.5 }); });
  } else if (tier === 3) { // golden disc -> thick red-orange fiery ring
    fx.decal(at, { tex: 'disc', color: 0xffb040, radius: 0.8 * CH, duration: 0.4, grow: 0.15, spin: 0, opacity: 0.7, fadeIn: 0.02, fadeOut: 0.25 });
    later(p, 0.2, () => {
      const mat = ringMaterial(0xff4a10, { width: 0.32 }), m = fx.mesh(fx.planeGeo, mat);
      m.position.set(at.x, at.y + 0.12, at.z);
      fx.timed(0.6, (k) => { const s = (1.45 + 0.25 * k) * CH * 2; m.scale.set(s, 1, s); mat.uniforms.uOpacity.value = (k < 0.7 ? 1.5 : 1.5 * (1 - (k - 0.7) / 0.3)); }, () => { fx.scene.remove(m); mat.dispose(); });
      fx.timed(0.5, () => { for (let i = 0; i < 6; i++) { const a = Math.random() * TAU, r = 1.55 * CH; fx.fire.emit(at.x + Math.cos(a) * r, at.y + 0.1, at.z + Math.sin(a) * r, { vx: 0, vy: 1.6, vz: 0, life: 0.4, size: 0.6, size1: 0.2, color: new THREE.Color(1, 0.6, 0.2), color1: new THREE.Color(0.9, 0.1, 0.02), alpha: 1, alpha1: 0 }); } });
    });
  } else if (tier === 4) { // blue-white vortex of spiral rings
    later(p, 0.1, () => {
      fx.decal(at, { tex: 'rings3', color: 0xe0f4ff, radius: 1.0 * CH, duration: 0.4, grow: 0.2, spin: 4, opacity: 0.9, fadeIn: 0.02, fadeOut: 0.3 });
      fx.groundSwirl(at, { color: 0x5aa8ff, color2: 0xffffff, radius: 2.2 * CH, duration: 0.7, spin: 7 });
      later(p, 0.25, () => fx.groundSwirl(at, { color: 0x7a60ff, color2: 0x9ac8ff, radius: 2.3 * CH, duration: 0.6, spin: 5 }));
    });
  } else if (tier === 5) { // massive golden-orange fire explosion disc, screen tinted orange
    fx.decal(at, { tex: 'rings3', color: 0xffe080, radius: 1.2 * CH, duration: 0.3, spin: 3, opacity: 0.9, fadeIn: 0.02, fadeOut: 0.2 });
    later(p, 0.15, () => {
      fx.groundNova(at, { color: 0xffa020, radius: 3.4 * CH, duration: 0.8, opacity: 0.7 });
      fx.groundSwirl(at, { color: 0xff9a20, color2: 0xffe070, radius: 3.2 * CH, duration: 0.8, spin: 4 });
      fx.decal(at, { tex: 'rings3', color: 0xffc040, radius: 3.0 * CH, duration: 0.7, grow: 0.25, spin: 1.5, opacity: 0.8, fadeIn: 0.03, fadeOut: 0.4 });
      fx.timed(0.4, () => { for (let i = 0; i < 6; i++) { const a = Math.random() * TAU, r = Math.random() * 3 * CH; fx.fire.emit(at.x + Math.cos(a) * r, at.y + 0.1, at.z + Math.sin(a) * r, { vx: 0, vy: 2, vz: 0, life: 0.45, size: 1.2, size1: 0.4, color: new THREE.Color(1, 0.8, 0.3), color1: new THREE.Color(1, 0.35, 0.05), alpha: 0.9, alpha1: 0 }); } });
      g.engine.doFlash(0.25, 0xffa040); g.engine.shake(0.5);
      later(p, 0.45, () => fx.rise(at, { color: 0x6ab8ff, count: 18, radius: 0.6, speed: 2.5, life: 0.6, size: 0.25 }));
    });
  } else if (tier === 6) { // huge white-blue water vortex, screen washed blue
    fx.decal(at, { tex: 'disc', color: 0xe0faff, radius: 1.3 * CH, duration: 0.3, spin: 0, opacity: 0.9, fadeIn: 0.02, fadeOut: 0.2 });
    later(p, 0.1, () => {
      fx.groundSwirl(at, { color: 0x9adcff, color2: 0xffffff, radius: 3.4 * CH, duration: 0.8, spin: 6 });
      fx.groundSwirl(at, { color: 0x4a8cff, color2: 0xc8f0ff, radius: 2.6 * CH, duration: 0.7, spin: -5 });
      fx.decal(at, { tex: 'rings3', color: 0xc8f0ff, radius: 3.1 * CH, duration: 0.6, grow: 0.2, spin: 3, opacity: 0.8, fadeIn: 0.03, fadeOut: 0.35 });
      fx.cloudBurst(at.clone().setY(at.y + 0.4), { color: 0x9adcff, color2: 0xffffff, radius: 2.4, count: 14, life: 0.7, rise: 0.2 });
      g.engine.doFlash(0.22, 0x9ad8ff); g.engine.shake(0.4);
    });
  } else { // Heuksal storm (Lv125): crimson storm vortex with lightning and gold fire
    later(p, 0.1, () => {
      fx.groundNova(at, { color: 0xff3050, radius: 3.6 * CH, duration: 0.9, opacity: 0.6 });
      fx.groundSwirl(at, { color: 0xff3a60, color2: 0xffd060, radius: 3.6 * CH, duration: 0.9, spin: 8 });
      fx.decal(at, { tex: 'rings3', color: 0xffa0b0, radius: 3.2 * CH, duration: 0.8, grow: 0.25, spin: -2, opacity: 0.85, fadeIn: 0.03, fadeOut: 0.4 });
      for (let i = 0; i < 6; i++) later(p, i * 0.06, () => { const a = Math.random() * TAU, r = Math.random() * 3 * CH; const q = V(at.x + Math.cos(a) * r, at.y, at.z + Math.sin(a) * r); fx.lightning(q.clone().setY(q.y + 6), q, { color: 0xff4080, core: 0xffffff, width: 0.07, duration: 0.25, segments: 12, jitter: 0.8, branches: 2 }); });
      g.engine.doFlash(0.3, 0xff5070); g.engine.shake(0.7); g.audio.play('thunder');
    });
  }
  g.audio.play('whirl', { pitch: 1 + tier * 0.03 });
}

// flying spear (javelin) to the target and back to the hand
function javelin(p, d, s, mult, style) {
  const fx = p.fx, g = p.game, scene = g.world.scene;
  const { scene: spear } = assets.clone(p.weaponDef.id);
  const holder = new THREE.Group(); holder.add(spear);
  spear.rotation.x = Math.PI / 2; // weapon +Y (blade) -> +Z (flight direction)
  scene.add(holder);
  if (p.weapon) p.weapon.visible = false;
  const from = p.position.clone().setY(p.position.y + 1.4).addScaledVector(p.forward(), 0.4);
  const to = aim(p, d);
  const dir = to.clone().sub(from).normalize();
  const end = to.clone().addScaledVector(dir, 1.5 * CH);
  const total = from.distanceTo(end);
  const blue = style >= 3;
  const trailA = col(blue ? 0x60c8ff : GOLD), trailB = col(blue ? 0x9a60ff : 0xff7a90);
  // rings at the hand (Fly: golden ring around the player; Flash/Sky: vertical white rings)
  if (style === 2) fx.shockwave(ground(p, p.position), { color: GOLD, radius: 1.1 * CH, duration: 0.35, width: 0.08 });
  if (style >= 4) { const r = fx.shockwave(from, { color: 0xffffff, radius: 0.55 * CH, duration: 0.35, width: 0.12, vertical: true, y: 0 }); }
  if (style === 5) later(p, 0.08, () => { const mid = from.clone().lerp(to, 0.5); fx.shockwave(mid, { color: 0xffffff, radius: 0.6 * CH, duration: 0.35, width: 0.12, vertical: true, y: 0 }); fx.flare(mid, W, 2.5, 0.2); });
  if (style === 3) fx.slash(p.position, p.yaw, { color: 0xffffff, color2: 0xa8e0ff, radius: 1.1 * CH, width: 0.6, angle: Math.PI * 0.8, y: 1.0, tilt: Math.PI / 2, duration: 0.15, sparks: false });
  let t = 0, hit = false;
  const hitSet = new Set();
  fx.add({
    update: (dt) => {
      t += dt;
      const outT = 0.2, backT = 0.32;
      let q;
      if (t < outT) q = from.clone().addScaledVector(dir, total * (t / outT));
      else { const k = Math.min(1, (t - outT) / backT); q = end.clone().lerp(p.position.clone().setY(p.position.y + 1.3), k * k); }
      holder.position.copy(q);
      holder.lookAt(t < outT ? q.clone().add(dir) : q.clone().sub(dir));
      if (t < outT) {
        // trail: golden / blue lance with salmon-pink or violet plume
        for (let i = 0; i < 4; i++) fx.tongue.emit(q.x + rnd(0.1), q.y + rnd(0.1), q.z + rnd(0.1), { vx: -dir.x * 3, vy: 0, vz: -dir.z * 3, life: 0.28, size: 0.3 * CH * (blue ? 1.2 : 0.9), size1: 0.05, color: i % 2 ? W : trailA, color1: trailB, alpha: 0.9, alpha1: 0 });
        fx.fire.emit(q.x, q.y, q.z, { vx: 0, vy: 0.3, vz: 0, life: 0.45, size: 0.5 * CH * 0.6, size1: 0.9, color: trailB, color1: trailB, alpha: 0.55, alpha1: 0, drag: 1 });
        // pierce up to 3
        for (const m of g.combat.monsters) {
          if (m.dead || hitSet.has(m) || hitSet.size >= 3) continue;
          if (m.position.distanceTo(q.clone().setY(m.position.y)) < m.tpl.radius + 0.9) {
            const k = hitSet.size === 0 ? 1 : 0.65;
            hitSet.add(m);
            g.combat.playerHit(m, p.skillMult(s.mult * mult * k), { color: 0xffffff, from: p.position, noFx: true, knock: 1 });
            const c = chest(m);
            if (!hit) { hit = true; impact(c); }
            else starburst(p, c, 0.8);
          }
        }
      } else if (!hit) { hit = true; impact(to); }
      if (t >= outT + backT) { scene.remove(holder); if (p.weapon) p.weapon.visible = true; return false; }
      return true;
    },
  });
  function impact(at) {
    starburst(p, at, 1.1);
    if (!blue) {
      fx.shockwave(at.clone().setY(at.y - 0.6), { color: style === 2 ? 0xffe060 : GOLD, radius: 1.3 * CH, duration: 0.35, width: 0.2 });
      fx.cloudBurst(at, { color: 0xff7a90, color2: 0xffc0a0, radius: 1.0, count: 6, life: 0.5, rise: 0.3 });
    } else {
      fx.shockSphere(at, style === 5 ? 0xffffff : 0xa8e0ff, (style === 5 ? 1.0 : 0.7) * CH, 0.35);
      fx.shockwave(at.clone().setY(at.y - 0.6), { color: 0x9ac8ff, radius: 1.0 * CH, duration: 0.4, width: 0.2 });
      fx.groundSwirl(ground(p, at), { color: 0x8a6aff, color2: 0x6ab8ff, radius: 1.0 * CH, duration: 0.5 });
      if (style === 5) { fx.flare(at, W, 4, 0.25); later(p, 0.15, () => fx.shockwave(ground(p, at), { color: 0xffffff, radius: 1.6 * CH, duration: 0.4, width: 0.12 })); }
    }
    g.audio.play('hit', { pitch: 0.8 });
  }
  g.audio.play('slashWave', { pitch: 1.3 });
}

// blue energy ribbons / sparks spiralling up the body
function blueSpiral(p, dur = 0.5) {
  const fx = p.fx, c = col(0x6ab8ff);
  fx.timed(dur, (k, dt, t) => {
    const pp = p.position;
    for (let i = 0; i < 2; i++) { const a = t * 10 + i * Math.PI; fx.glow.emit(pp.x + Math.cos(a) * 0.6, pp.y + 0.2 + k * 1.6, pp.z + Math.sin(a) * 0.6, 0, 0.5, 0, 0.35, 0.28, c, { size1: 0 }); }
  });
}

// ---------------------------------------------------------------- timeline skills
// def: { dur, range, approach, steps: [[t, kind, arg]] }
// kinds: anim(name, dur) | cres(kind, opts) | hit(mult) | jab | beam(opts) | violet | streak | wave | ring(tier) | spiral | throw(mult) | buff
export function skill(def) {
  return {
    buffGroup: def.buffGroup || null,
    canCast: def.canCast || null,
    start(p, s, d) {
      const t = targetPoint(p, def.range ?? 9, 3);
      d.target = t.target; d.i = 0;
      if (def.fallen) { const f = p.game.combat.nearest(p.position, 8, (o) => o.down > 0); if (f) { d.target = f; p.targetYaw = p.yaw = Math.atan2(f.position.x - p.position.x, f.position.z - p.position.z); } }
      p.skillLock = true;
      if (def.hpCost) p.hp = Math.max(1, p.hp - p.hp * def.hpCost);
      d.steps = def.steps.slice().sort((a, b) => a[0] - b[0]);
      // walk up to melee range (Silkroad moves you to the target before the skill)
      d.approach = 0;
      if (d.target && def.reach) {
        const dist = Math.hypot(d.target.position.x - p.position.x, d.target.position.z - p.position.z) - d.target.tpl.radius;
        if (dist > def.reach) { d.approach = Math.min(0.25, (dist - def.reach) / 30); p.vel.copy(p.forward()).multiplyScalar((dist - def.reach) / Math.max(0.05, d.approach)); }
      }
      d.t0 = d.approach;
    },
    update(p, dt, s, d) {
      if (d.target && !d.target.dead) p.targetYaw = Math.atan2(d.target.position.x - p.position.x, d.target.position.z - p.position.z);
      if (p.stateT < d.approach) { p.fx.afterimage(p.obj, 0xff9ae0, 0.2); return; }
      if (d.approach >= 0) { p.vel.set(0, 0, 0); d.approach = -1; }
      const t = p.stateT - d.t0;
      while (d.i < d.steps.length && t >= d.steps[d.i][0]) { run(p, s, d, d.steps[d.i]); d.i++; }
      if (t > (def.free ?? def.dur - 0.25)) p.skillLock = false;
      if (t >= def.dur) p.toMove();
    },
  };
  function run(p, s, d, [, kind, a, b]) {
    const fx = p.fx;
    switch (kind) {
      case 'anim': p.anim([a, 'SP_Attack2', 'Attack2'], { once: true, dur: b ?? 0.5, fade: 0.06 }); break;
      case 'cres': crescent(p, a, { ...(def.cres || {}), ...(b || {}) }); break;
      case 'fn': a(p, s, d); break;
      case 'hit': hitTargets(p, s, d, def.shape, a ?? 1, { ...(def.status || {}), ...(b || {}) }); break;
      case 'jab': jabStreak(p, a ? a * CH : undefined); break;
      case 'beam': thrustBeam(p, d, a || {}); break;
      case 'violet': violetBeam(p, d, a); break;
      case 'streak': groundStreak(p, d, a); break;
      case 'wave': crescentWave(p, d); break;
      case 'ring': ghostRing(p, a); break;
      case 'spiral': blueSpiral(p, a); break;
      case 'throw': javelin(p, d, s, a ?? 1, def.style); break;
      case 'flash': p.game.engine.doFlash(a ?? 0.25, b ?? 0xffe0a0); break;
      case 'buff': {
        const at = ground(p, p.position);
        fx.decal(at, { tex: 'disc', color: 0x9af0ff, radius: 1.0 * CH, duration: 0.6, spin: 0, opacity: 0.6, fadeIn: 0.03, fadeOut: 0.35 });
        fx.decal(at, { tex: 'rings2', color: 0xe8ffff, radius: 1.0 * CH, duration: 0.6, grow: 0.2, spin: 0.5, opacity: 0.9, fadeIn: 0.03, fadeOut: 0.35 });
        for (let i = 0; i < 8; i++) { const ang = (i / 8) * TAU; fx.streak.emit(at.x + Math.cos(ang) * 0.6, at.y + 0.1, at.z + Math.sin(ang) * 0.6, { vx: 0, vy: 6, vz: 0, life: 0.3, size: 0.1, color: W, color1: col(0x9af0ff), alpha: 1, alpha1: 0, drag: 2 }); }
        later(p, 0.3, () => fx.shockwave(at, { color: 0x7ae0e0, radius: 1.2 * CH, duration: 0.3, width: 0.1 }));
        p.addBuff('heuksal_storm', { id: s.id, name: s.name, dur: a.dur, mods: { defPct: a.def + s.lv * 2 }, color: '#c03030' });
        p.game.audio.play('levelup', { pitch: 1.5 });
        break;
      }
      default: break;
    }
  }
}

// ----- builders per skill line
const THRUST = { type: 'pierce', len: 3 * CH, n: 2 };
function thrust(steps, dur, reduce = 0.35) { return skill({ dur, reach: 1.6 * CH, shape: { ...THRUST, reduce }, steps }); }
function sweep(steps, dur, r, n, status) { return skill({ dur, reach: 1.4 * CH, shape: { type: 'front', r, n }, steps, status }); }
function soul(steps, dur, stunP) { return skill({ dur, reach: 1.1 * CH, shape: { type: 'single' }, steps, status: { stunP, stunT: 2.5 } }); }
function ghost(tier, r, kb, hitT = 0.45) {
  return skill({ dur: 1.9, reach: 0, shape: { type: 'around', r, n: tier >= 7 ? 8 : 5 }, status: { kb, ...(tier >= 7 ? { stunP: 0.5, stunT: 3 } : {}) }, steps: [
    [0, 'anim', 'SP_Spin', 1.5], [0.15, 'cres', 'high'], [hitT - 0.05, 'cres', 'ellipse', { scale: 1.05 }], [hitT, 'hit', 1, { burst: 1.1 }], [hitT, 'ring', tier], [1.0, 'cres', 'vertical', { scale: 0.8, sound: false }],
  ] });
}
// chain combos: list of [time, move]; moves: thrust, flat, high, vertical, ellipse, low, dome, sweep2
function chain(hits, dur, shape = { type: 'single' }) {
  const steps = [];
  for (const [t, mv, streak] of hits) {
    const lead = 0.18;
    const animFor = { thrust: ['SP_Lunge', 0.45], flat: ['SP_Attack2', 0.45], high: ['SP_Attack2', 0.45], vertical: ['SP_Chop', 0.5], ellipse: ['SP_Attack3', 0.6], low: ['SP_Attack1', 0.45], dome: ['SP_LeapSlam', 1.0], sweep2: ['SP_Attack2', 0.45] }[mv];
    steps.push([Math.max(0, t - lead - (mv === 'dome' ? 0.45 : 0)), 'anim', animFor[0], animFor[1]]);
    if (mv === 'thrust') steps.push([t - 0.05, 'jab']);
    else if (mv === 'sweep2') { steps.push([t - 0.25, 'cres', 'high']); steps.push([t - 0.04, 'cres', 'flat', { scale: 1.1 }]); }
    else steps.push([t - 0.06, 'cres', mv, { flip: steps.length % 4 === 0 }]);
    steps.push([t, 'hit', 1]);
    if (streak) steps.push([t, 'streak']);
  }
  return skill({ dur, reach: 1.2 * CH, shape, steps });
}

export const HEUKSAL = {
  // ---- Row 1: Spear Thrust (pierce 2)
  hk_wolf_bite: thrust([[0, 'anim', 'SP_Attack2', 0.6], [0.4, 'cres', 'high', { color2: 0xffb0e0 }], [1.0, 'anim', 'SP_Lunge', 0.5], [1.2, 'jab'], [1.3, 'hit', 1], [1.4, 'beam', { past: 1, thick: 0.28, dur: 0.35 }]], 1.9),
  hk_waning_moon: thrust([[0.2, 'anim', 'SP_Lunge', 0.55], [0.5, 'jab'], [0.8, 'cres', 'low', { scale: 0.5 }], [0.9, 'hit', 1], [1.1, 'beam', { past: 1.5, thick: 0.3, dur: 0.4 }]], 1.9),
  hk_yuhon: thrust([[0.15, 'anim', 'SP_Attack3', 0.75], [0.25, 'cres', 'low', { scale: 0.6 }], [0.7, 'cres', 'low'], [0.9, 'jab'], [1.0, 'hit', 1], [1.0, 'beam', { past: 2.5, thick: 0.4, dur: 0.5, from: 1.8 }]], 1.6),
  hk_lightning_bird: thrust([[0, 'anim', 'SP_Attack1', 0.5], [0.45, 'anim', 'SP_Lunge', 0.4], [0.5, 'jab'], [0.6, 'hit', 1], [0.72, 'jab'], [0.8, 'hit', 1, { burst: 1.2 }], [0.9, 'beam', { past: 3, thick: 0.6, dur: 0.55, from: 1.2 }], [1.7, 'anim', 'SP_Chop', 0.6]], 2.3, 0.25),
  hk_celestial_cloud: thrust([[0.1, 'anim', 'SP_Attack1', 0.5], [0.45, 'anim', 'SP_Lunge', 0.6], [0.5, 'jab'], [0.6, 'hit', 1], [0.75, 'jab'], [0.8, 'hit', 1], [0.95, 'jab'], [1.0, 'hit', 1, { burst: 1.3 }], [1.1, 'beam', { past: 3, thick: 0.7, dur: 0.6, from: 1.4 }], [1.5, 'flash', 0.2]], 2.2, 0.2),
  hk_asura: thrust([[0, 'anim', 'SP_Twirl', 0.4], [0.05, 'cres', 'high'], [0.2, 'cres', 'low', { flip: true }], [0.35, 'anim', 'SP_Attack3', 0.6], [0.5, 'cres', 'ellipse', { scale: 0.55 }], [0.65, 'jab'], [0.7, 'hit', 1], [0.8, 'violet', 0.35], [1.1, 'hit', 1, { burst: 1.3 }], [1.25, 'beam', { past: 3.5, thick: 0.6, dur: 0.5, from: 1.4, core: 0xfff8d0, edge: 0xffa020 }], [1.4, 'hit', 1, { burst: 1.4 }], [1.8, 'anim', 'SP_Twirl', 0.3]], 2.1, 0.15),

  // ---- Row 2: Storm buffs
  hk_storm1: skill({ dur: 0.6, shape: { type: 'single' }, steps: [[0.1, 'buff', { dur: 15, def: 8 }]] }),
  hk_storm2: skill({ dur: 0.6, shape: { type: 'single' }, steps: [[0.1, 'buff', { dur: 20, def: 12 }]] }),
  hk_storm3: skill({ dur: 0.6, shape: { type: 'single' }, steps: [[0.1, 'buff', { dur: 25, def: 16 }]] }),
  hk_storm4: skill({ dur: 0.6, shape: { type: 'single' }, steps: [[0.1, 'buff', { dur: 30, def: 20 }]] }),
  hk_storm5: skill({ dur: 0.6, shape: { type: 'single' }, steps: [[0.1, 'buff', { dur: 35, def: 24 }]] }),
  hk_storm6: skill({ dur: 0.6, shape: { type: 'single' }, steps: [[0.1, 'buff', { dur: 40, def: 30 }]] }),

  // ---- Row 3: Sweep (front cleave)
  hk_dancing_demon: sweep([[0, 'anim', 'SP_Attack2', 0.5], [0.05, 'cres', 'high'], [0.25, 'cres', 'low', { scale: 0.7 }], [0.45, 'anim', 'SP_Attack2', 0.45], [0.5, 'cres', 'flat'], [0.75, 'wave'], [0.9, 'hit', 1]], 1.4, 3.2, 3),
  hk_jade_breaking: sweep([[0.05, 'anim', 'SP_Attack2', 0.5], [0.35, 'cres', 'high'], [0.4, 'hit', 1], [0.95, 'anim', 'SP_Attack2', 0.5], [1.2, 'cres', 'high', { flip: true }], [1.3, 'cres', 'flat', { scale: 1.15 }], [1.4, 'streak'], [1.45, 'hit', 1]], 1.6, 3.2, 3),
  hk_spirit_crash: sweep([[0, 'anim', 'SP_Spin', 1.2], [0.15, 'cres', 'ellipse', { scale: 1.0 }], [0.25, 'hit', 1], [0.3, 'streak'], [0.6, 'cres', 'vertical', { color2: 0xffe0a0 }], [0.9, 'spiral', 0.4], [1.15, 'cres', 'vertical', { flip: true, sound: false }], [1.35, 'cres', 'low', { sound: false }]], 1.5, 3.4, 3),
  hk_windless: sweep([[0, 'anim', 'SP_Twirl', 0.5], [0.1, 'cres', 'high'], [0.35, 'cres', 'high', { flip: true }], [0.65, 'anim', 'SP_Spin', 0.9], [1.15, 'cres', 'high'], [1.35, 'cres', 'flat', { scale: 1.3 }], [1.4, 'hit', 1], [1.5, 'wave'], [1.85, 'anim', 'SP_Chop', 0.6], [1.9, 'cres', 'high', { flip: true }], [2.2, 'cres', 'low', { sound: false }], [2.35, 'cres', 'vertical', { scale: 1.2 }], [2.4, 'hit', 1]], 2.9, 3.8, 3, { dullP: 0.1 }),
  hk_death_bringer: sweep([[0, 'anim', 'SP_Attack2', 0.5], [0.05, 'cres', 'high'], [0.55, 'anim', 'SP_Spin', 0.9], [0.75, 'cres', 'ellipse'], [0.8, 'hit', 1], [0.85, 'streak'], [1.05, 'cres', 'flat', { sound: false }], [1.3, 'anim', 'SP_Chop', 0.6], [1.7, 'cres', 'vertical', { scale: 1.2 }], [1.8, 'hit', 1], [2.1, 'cres', 'low', { sound: false }]], 2.2, 3.8, 3, { dullP: 0.12 }),
  hk_pitch_black: sweep([[0.05, 'anim', 'SP_Attack2', 0.6], [0.1, 'cres', 'high'], [0.6, 'cres', 'flat', { scale: 1.25 }], [0.65, 'hit', 1], [0.8, 'streak'], [0.9, 'anim', 'SP_Spin', 0.8], [1.1, 'cres', 'ellipse'], [1.15, 'hit', 1], [1.55, 'cres', 'high', { scale: 1.2 }], [1.65, 'cres', 'ellipse', { scale: 1.1, sound: false }], [1.9, 'anim', 'SP_Chop', 0.5], [2.15, 'cres', 'vertical', { scale: 1.2 }], [2.2, 'hit', 1, { burst: 1.3 }]], 2.3, 4.4, 4),

  // ---- Row 4: Soul Spear (single target, stun)
  hk_soul_move: soul([[0, 'anim', 'SP_Attack1', 0.9], [0.68, 'cres', 'flat'], [0.8, 'jab'], [0.9, 'hit', 1, { burst: 1.4 }]], 1.6, 0.2),
  hk_soul_truth: soul([[0, 'anim', 'SP_LeapSlam', 1.13], [0.15, 'cres', 'vertical', { scale: 0.9, sound: false }], [0.5, 'cres', 'vertical', { scale: 1.05 }], [0.6, 'cres', 'dome'], [0.7, 'hit', 1, { burst: 1.4 }]], 1.5, 0.25),
  hk_soul_soul: soul([[0, 'anim', 'SP_Attack1', 0.8], [0.6, 'cres', 'flat', { scale: 1.1 }], [0.7, 'hit', 1], [1.05, 'anim', 'SP_LeapSlam', 1.1], [1.6, 'cres', 'high', { sound: false }], [1.7, 'cres', 'dome', { scale: 1.05 }], [1.8, 'hit', 1, { burst: 1.4 }]], 2.3, 0.3),
  hk_soul_emperor: soul([[0, 'anim', 'SP_Chop', 0.5], [0.45, 'cres', 'vertical', { scale: 0.7, sound: false }], [0.45, 'anim', 'SP_LeapSlam', 1.0], [0.75, 'cres', 'vertical', { scale: 1.05 }], [1.0, 'cres', 'dome'], [1.05, 'hit', 1, { burst: 1.3 }], [1.35, 'cres', 'low'], [1.45, 'hit', 1]], 1.6, 0.15),
  hk_soul_destruction: soul([[0, 'anim', 'SP_Attack2', 0.5], [0.2, 'cres', 'high'], [0.5, 'cres', 'low'], [0.6, 'hit', 1], [0.65, 'anim', 'SP_Spin', 0.9], [0.75, 'spiral', 0.35], [0.95, 'cres', 'ellipse'], [1.0, 'hit', 1], [1.1, 'spiral', 0.45], [1.6, 'cres', 'low', { sound: false }], [1.65, 'anim', 'SP_LeapSlam', 1.13], [2.0, 'cres', 'vertical', { scale: 1.1 }], [2.35, 'cres', 'dome', { scale: 1.1 }], [2.5, 'hit', 1, { burst: 1.5 }]], 2.9, 0.1),
  hk_soul_emptiness: soul([[0, 'anim', 'SP_Attack2', 0.5], [0.2, 'cres', 'high'], [0.5, 'cres', 'low'], [0.6, 'hit', 1], [0.65, 'anim', 'SP_Spin', 0.9], [0.95, 'cres', 'ellipse', { scale: 1.2 }], [1.0, 'hit', 1, { burst: 1.5 }], [1.3, 'anim', 'SP_Twirl', 0.35], [1.65, 'anim', 'SP_LeapSlam', 1.13], [2.0, 'cres', 'vertical', { scale: 1.25 }], [2.35, 'cres', 'dome', { scale: 1.2 }], [2.5, 'hit', 1, { burst: 1.7 }]], 2.9, 0.1),

  // ---- Row 5: Ghost Spear (around the player, knock-back)
  hk_ghost_petal: ghost(1, 2.8, 0),
  hk_ghost_prince: ghost(2, 3.0, 0.35),
  hk_ghost_mars: ghost(3, 4.0, 0.35),
  hk_ghost_storm_cloud: ghost(4, 4.5, 0.35, 0.5),
  hk_ghost_emperor: ghost(5, 4.5, 0.4, 0.7),
  hk_ghost_sea_god: ghost(6, 4.5, 0.4, 0.5),
  hk_heuksal_storm: ghost(7, 5.5, 0.5, 0.55),

  // ---- Row 6: Chain Spear (combos)
  hk_chain_tiger: chain([[0.6, 'high'], [1.1, 'thrust'], [1.85, 'flat']], 2.3),
  hk_chain_nachal: chain([[0.5, 'ellipse'], [1.2, 'high'], [1.9, 'vertical'], [2.6, 'thrust', true]], 3.0),
  hk_chain_shura: chain([[0.5, 'high'], [1.15, 'thrust'], [1.8, 'vertical'], [2.45, 'low'], [3.1, 'sweep2', true]], 3.5, { type: 'front', r: 4.0, n: 3 }),
  hk_chain_pluto: chain([[0.5, 'vertical'], [1.2, 'ellipse', true], [1.9, 'high'], [2.6, 'dome']], 3.0),
  hk_chain_dragon: chain([[0.2, 'thrust'], [0.8, 'ellipse'], [1.7, 'ellipse', true], [2.6, 'ellipse'], [3.4, 'vertical'], [4.2, 'ellipse', true]], 4.6, { type: 'around', r: 3.4, n: 5 }),
  hk_chain_phoenix: chain([[0.1, 'thrust'], [0.7, 'ellipse'], [1.4, 'ellipse', true], [2.0, 'dome'], [2.6, 'ellipse'], [3.3, 'ellipse', true]], 3.6, { type: 'around', r: 3.4, n: 5 }),
  hk_chain_heaven: chain([[0.05, 'thrust'], [0.6, 'ellipse'], [1.6, 'ellipse', true], [2.3, 'ellipse'], [3.1, 'ellipse', true], [3.8, 'vertical'], [4.7, 'ellipse', true]], 4.9, { type: 'around', r: 3.4, n: 5 }),

  // ---- Row 7: Flying Dragon (javelin throw, pierce 3)
  hk_fd_flow: skill({ dur: 1.0, range: 14, style: 1, shape: { type: 'single' }, steps: [[0, 'anim', 'SP_Throw', 0.9], [0.22, 'throw', 1]] }),
  hk_fd_fly: skill({ dur: 1.0, range: 14, style: 2, shape: { type: 'single' }, steps: [[0, 'anim', 'SP_Throw', 1.0], [0.3, 'throw', 1]] }),
  hk_fd_bless: skill({ dur: 1.1, range: 14, style: 3, shape: { type: 'single' }, steps: [[0.05, 'anim', 'SP_Throw', 1.1], [0.4, 'throw', 1]] }),
  hk_fd_flash: skill({ dur: 2.6, range: 14, style: 4, shape: { type: 'single' }, steps: [[0.05, 'anim', 'SP_Throw', 1.0], [0.4, 'throw', 1], [1.0, 'spiral', 0.8], [1.45, 'anim', 'SP_Throw', 1.0], [1.8, 'throw', 1]] }),
  hk_fd_sky: skill({ dur: 2.5, range: 14, style: 5, shape: { type: 'single' }, steps: [[0.05, 'anim', 'SP_Throw', 1.0], [0.4, 'throw', 1], [1.2, 'spiral', 0.5], [1.35, 'anim', 'SP_Throw', 1.0], [1.7, 'throw', 1]] }),
};

export default HEUKSAL;

for (const k of ['hk_storm1', 'hk_storm2', 'hk_storm3', 'hk_storm4', 'hk_storm5', 'hk_storm6']) HEUKSAL[k].buffGroup = 'heuksal_storm';
