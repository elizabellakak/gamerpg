// Bicheon (Silkroad Online, sword/blade + shield) - skills from the reference clip's skill window.
// Pink-red blade trails and white needle starbursts; Chain hits flash gold sunburst discs; Cut Blade throws
// crescent waves (orange -> lime -> ice-cyan by tier); Blade Force knocks down, the fallen row finishes off.
import * as THREE from 'three';
import { V } from './common.js';
import { assets } from '../../core/assets.js';
import { skill, starburst, jabStreak, groundStreak, thrustBeam, later, ground, chest, aim, CH } from './heuksal.js';

const TAU = Math.PI * 2;
const W = new THREE.Color(1, 1, 1);
const col = (c) => (c instanceof THREE.Color ? c.clone() : new THREE.Color(c));
const rnd = (a = 1) => (Math.random() - 0.5) * 2 * a;
const PINKW = { color: 0xffffff, color2: 0xff6aa0 };
const ORANGE = { color: 0xffe0a0, color2: 0xff5a10 };
const PGREEN = { color: 0xf0fff0, color2: 0x9af0a0 };
const CYAN = { color: 0xf0ffff, color2: 0x60e0ff };

// ---------------------------------------------------------------- visuals
function sunburst(p, at, size = 1.3) {
  const fx = p.fx;
  fx.spikeBurst(at, new THREE.Color(1, 0.72, 0.2), size * CH, 0.3);
  fx.spikeBurst(at, W, size * CH * 0.45, 0.18);
  fx.flare(at, new THREE.Color(1, 0.9, 0.3), 0.6, 0.25);
  fx.shockwave(at, { color: 0xffe060, radius: 0.18 * CH, duration: 0.3, width: 0.3, vertical: true, y: 0, start: 0.6 });
}
function slashAt(p, kind, o = {}) {
  const fx = p.fx, pp = p.position, y = p.yaw, sc = o.scale ?? 1;
  const c = { color: o.color ?? 0xffffff, color2: o.color2 ?? 0xff6aa0, gain: o.gain ?? 0.6 / Math.max(1, sc * 0.9) };
  if (kind === 'down') fx.slash(pp, y, { ...c, radius: 1.2 * CH * sc, width: 0.7 * sc, angle: Math.PI * 0.9, y: 1.1, tilt: 1.1, duration: 0.16, flip: !!o.flip });
  else if (kind === 'flat') fx.slash(pp, y, { ...c, radius: 1.3 * CH * sc, width: 0.7 * sc, angle: Math.PI, y: 1.0, duration: 0.16, flip: !!o.flip });
  else if (kind === 'low') fx.slash(pp, y, { ...c, radius: 1.3 * CH * sc, width: 0.8 * sc, angle: Math.PI, y: 0.35, tilt: -0.15, duration: 0.18 });
  else if (kind === 'up') fx.slash(pp, y, { ...c, radius: 1.4 * CH * sc, width: 0.9 * sc, angle: Math.PI * 0.9, y: 0.6, tilt: Math.PI / 2, duration: 0.2, flip: true });
  else if (kind === 'ring') fx.slash(pp, y, { ...c, radius: 0.7 * CH * sc, width: 0.35 * sc, angle: TAU * 0.97, y: 1.0, tilt: Math.PI / 2, duration: 0.2 });
  else if (kind === 'dome') { const mid = pp.clone().add(p.forward().multiplyScalar(0.8 * CH)); fx.slash(mid, y, { ...c, radius: 1.0 * CH * sc, width: 0.5 * sc, angle: Math.PI, y: 0.05, tilt: Math.PI / 2, duration: 0.24 }); }
  p.game.audio.play('swing', { pitch: 1 + Math.random() * 0.3 });
}
function gpulse(p, at, color = 0xffe070, r = 0.6 * CH) { p.fx.shockwave(ground(p, at), { color, radius: r, duration: 0.4, width: 0.25 }); p.fx.decal(ground(p, at), { tex: 'disc', color, radius: r * 0.7, duration: 0.4, spin: 0, opacity: 0.4, fadeIn: 0.02, fadeOut: 0.3 }); }
function flamePillar(p, at, h = 0.8 * CH, color = 0xffc040) { p.fx.pillar(ground(p, at), { color, color2: 0xffffff, radius: 0.16 * CH, height: h, duration: 0.6, speed: 3 }); }
function flameSpike(p) {
  const q = ground(p, p.position.clone().addScaledVector(p.forward(), 0.9));
  p.fx.timed(0.3, () => p.fx.fire.emit(q.x + rnd(0.05), q.y + 0.1, q.z + rnd(0.05), { vx: 0, vy: 5, vz: 0, life: 0.25, size: 0.35, size1: 0.1, color: new THREE.Color(1, 0.4, 0.2), color1: new THREE.Color(0.9, 0.1, 0.05), alpha: 1, alpha1: 0 }));
}
function blueSwirl(p, dur = 0.5) {
  const fx = p.fx;
  fx.slash(p.position, p.yaw, { color: 0xd0f0ff, color2: 0x3a7cff, radius: 0.8 * CH, width: 0.3, angle: TAU * 0.97, y: 1.0, tilt: 0.1, duration: 0.25, sparks: false });
  for (let i = 0; i < 3; i++) later(p, i * 0.08, () => { const a = Math.random() * TAU, r = 0.7; const q = p.position.clone().add(V(Math.cos(a) * r, 1 + rnd(0.3), Math.sin(a) * r)); fx.lightning(q, q.clone().add(V(rnd(0.6), rnd(0.4), rnd(0.6))), { color: 0x6ab8ff, core: 0xffffff, width: 0.04, duration: 0.15, segments: 6, jitter: 0.3, branches: 0 }); });
}
function sparkChain(p) { const q = p.position.clone().setY(p.position.y + 2.2); p.fx.lightning(q, q.clone().add(V(rnd(0.4), 1.2, rnd(0.4))), { color: 0x6ab8ff, core: 0xffffff, width: 0.05, duration: 0.25, segments: 8, jitter: 0.4, branches: 1 }); }
// impact burst sphere (Cut Blade / Sword Dance)
function burstSphere(p, at, color, size = 1.5, ring = null) {
  const fx = p.fx;
  fx.shockSphere(at, color, size * 0.45 * CH, 0.3);
  fx.spikeBurst(at, col(color), size * CH * 0.9, 0.28);
  fx.streaks(at, 16, { speed: 9, color: W, color1: col(color), life: 0.35, size: 0.12, gravity: 4 });
  if (ring) fx.shockwave(at, { color: ring, radius: size * 0.55 * CH, duration: 0.4, width: 0.22, vertical: true, y: 0 });
}
// crescent-moon wave flying to the target at chest height
function crescentShot(p, d, { color, color2, size = 1, speed = 18, onHit, edge = false }) {
  const fx = p.fx, from = p.position.clone().setY(p.position.y + 1.1).addScaledVector(p.forward(), 0.6);
  const tg = d.target && !d.target.dead ? d.target : null;
  const to = aim(p, d);
  const dist = from.distanceTo(to), dur = dist / speed;
  let t = 0, acc = 0, done = false;
  const yaw = p.yaw;
  fx.add({ update: (dt) => {
    t += dt; acc += dt;
    const dest = tg && !tg.dead ? chest(tg) : to;
    const q = new THREE.Vector3().lerpVectors(from, dest, Math.min(1, t / dur));
    while (acc > 0.025) { acc -= 0.025; fx.slash(q.clone().setY(q.y - 1.0), yaw, { color, color2, radius: 0.45 * CH * size, width: (edge ? 0.12 : 0.22) * size, angle: Math.PI * 0.8, y: 1.0, tilt: edge ? 0 : Math.PI / 2, duration: 0.06, sparks: false }); }
    fx.glow.emit(q.x, q.y, q.z, 0, 0, 0, 0.15, 0.5 * size, col(color2), { size1: 0 });
    if (!done && t >= dur) { done = true; onHit && onHit(dest.clone(), tg && !tg.dead ? tg : null); return false; }
    return true;
  } });
}
// thrown flaming sword (Sword Dance): straight bolt or shallow arc, returns to the hand
function swordThrow(p, d, { arc = false, haze = false, ice = false, onHit }) {
  const fx = p.fx, g = p.game, scene = g.world.scene;
  const { scene: sw } = assets.clone(p.weaponDef.id);
  const holder = new THREE.Group(); holder.add(sw); sw.rotation.x = Math.PI / 2;
  scene.add(holder);
  if (p.weapon) p.weapon.visible = false;
  const from = p.position.clone().setY(p.position.y + 1.5);
  const tg = d.target && !d.target.dead ? d.target : null;
  const to = aim(p, d);
  const out = 0.22, back = 0.28;
  let t = 0, hit = false;
  fx.add({ update: (dt) => {
    t += dt;
    const dest = tg && !tg.dead ? chest(tg) : to;
    let q;
    if (t < out) { const k = t / out; q = new THREE.Vector3().lerpVectors(from, dest, k); if (arc) q.y += Math.sin(k * Math.PI) * 0.8 * CH; }
    else { const k = Math.min(1, (t - out) / back); q = new THREE.Vector3().lerpVectors(dest, p.position.clone().setY(p.position.y + 1.3), k * k); }
    const prev = holder.position.clone();
    holder.position.copy(q);
    if (prev.lengthSq() > 0) holder.lookAt(q.clone().add(q.clone().sub(prev)));
    holder.rotateZ(t * 30);
    if (t < out) {
      const c1 = ice ? new THREE.Color(1, 0.75, 0.35) : new THREE.Color(1, 0.85, 0.4);
      for (let i = 0; i < 3; i++) fx.fire.emit(q.x + rnd(0.08), q.y + rnd(0.08), q.z + rnd(0.08), { vx: 0, vy: 0.4, vz: 0, life: 0.3, size: 0.45, size1: 0.15, color: c1, color1: new THREE.Color(0.9, 0.15, 0.05), alpha: 1, alpha1: 0 });
      if (haze && Math.random() < 0.5) fx.smoke.emit(q.x, q.y, q.z, { vx: 0, vy: 0.3, vz: 0, life: 0.5, size: 0.3, size1: 0.6, color: new THREE.Color(0.7, 0.8, 0.5), color1: new THREE.Color(0.5, 0.6, 0.4), alpha: 0.4, alpha1: 0 });
    } else if (!hit) {
      hit = true;
      onHit && onHit(dest.clone(), tg && !tg.dead ? tg : null);
    } else if (Math.random() < 0.5) fx.streak.emit(q.x, q.y, q.z, { vx: 0, vy: 0, vz: 0, life: 0.15, size: 0.08, color: W, color1: W, alpha: 0.8, alpha1: 0 });
    if (t >= out + back) { scene.remove(holder); if (p.weapon) p.weapon.visible = true; return false; }
    return true;
  } });
  g.audio.play('slashWave', { pitch: 1.2 });
}
function fieryRing(p, at) {
  const fx = p.fx;
  fx.shockwave(at, { color: 0xff7a20, radius: 0.8 * CH, duration: 0.4, width: 0.3, vertical: true, y: 0 });
  fx.fireBurst(at, { count: 8, size: 0.6, size1: 1.3, life: 0.4, color: 0xff6a10, speed: 3, up: 0.5, spread: 0.6 });
}
function hazeSphere(p, at) { p.fx.cloudBurst(at, { color: 0xc8e060, color2: 0xffffc0, radius: 1.4, count: 8, life: 0.5, rise: 0.2 }); }
function knockdownJolt(p) { p.game.engine.shake(0.25); }

// ---------------------------------------------------------------- skill builders
const sword = (steps, dur, shape = { type: 'single' }, status, extra = {}) => skill({ dur, reach: 1.0 * CH, shape, steps, status, cres: PINKW, ...extra });
const ranged = (steps, dur, extra = {}) => skill({ dur, range: 14, shape: { type: 'single' }, steps, cres: PINKW, ...extra });
const fallenOnly = (p) => !!p.game.combat.nearest(p.position, 8, (o) => o.down > 0);
const fallen = (steps, dur) => skill({ dur, reach: 1.0 * CH, fallen: true, canCast: fallenOnly, shape: { type: 'single', fallen: true }, status: { fallen: true }, steps, cres: PGREEN });
const shot = (color, color2, impactColor, mult = 1, size = 1, opts = {}) => (p, s, d) => crescentShot(p, d, { color, color2, size, edge: !!opts.edge, onHit: (at, m) => {
  burstSphere(p, at, impactColor, opts.burst ?? 1.4, opts.ring);
  if (m) p.game.combat.playerHit(m, p.skillMult(s.mult * mult), { color: 0xffffff, from: p.position, noFx: true, knock: 0.6 });
  if (opts.fire) fieryRing(p, at);
  if (opts.lightning) later(p, 0.15, () => blueSwirl(p));
} });
const dance = (opts, mult = 1) => (p, s, d) => swordThrow(p, d, { ...opts, onHit: (at, m) => {
  starburst(p, at, 1.2);
  if (opts.ice) burstSphere(p, at, 0xa8e0ff, 2.0);
  else if (opts.haze) hazeSphere(p, at);
  else fieryRing(p, at);
  // piercing line (Snake/Typhoon/Heaven) or area (Petal/Chaotic) around the target
  const g = p.game, hit = new Set();
  if (m) { hit.add(m); g.combat.playerHit(m, p.skillMult(s.mult * mult), { color: 0xffffff, from: p.position, noFx: true, knock: 0.6 }); }
  const extra = opts.area ? g.combat.monsters.filter((o) => !o.dead && !hit.has(o) && o.position.distanceTo(at) < 4) : g.combat.monsters.filter((o) => !o.dead && !hit.has(o) && o.position.distanceTo(at) < 2.5);
  extra.slice(0, opts.area ? opts.n - 1 : 2).forEach((o) => { g.combat.playerHit(o, p.skillMult(s.mult * mult * 0.8), { color: 0xffffff, from: p.position, noFx: true }); starburst(p, chest(o), 0.8); });
} });

export const BICHEON = {
  // ---- Row 1: Smash
  bc_strike_smash: sword([[0, 'anim', 'SS_Chop', 0.7], [0.2, 'cres', 'high', { scale: 0.7 }], [0.45, 'fn', (p) => slashAt(p, 'down')], [0.7, 'hit', 1, { burst: 1.3 }], [1.0, 'cres', 'low', { scale: 0.6, sound: false }]], 1.4),
  bc_stab_smash: sword([[0.1, 'anim', 'SS_Lunge', 1.0], [0.55, 'jab', 1.5], [0.6, 'hit', 1, { burst: 1.2 }], [0.65, 'beam', { past: 0.2, thick: 0.3, dur: 0.6, from: 0, core: 0xfff0a0, edge: 0xff7a20 }]], 1.6),
  bc_crosswise_smash: sword([[0, 'anim', 'Attack2', 0.5], [0.4, 'fn', (p) => slashAt(p, 'flat')], [0.5, 'hit', 1], [0.55, 'fn', (p, s, d) => p.fx.flare(aim(p, d), new THREE.Color(1, 0.95, 0.6), 1.6, 0.2)], [0.8, 'anim', 'SS_Upper', 0.7], [0.9, 'fn', (p) => slashAt(p, 'dome', CYAN)], [1.05, 'hit', 1, { burst: 1.3 }], [1.05, 'fn', (p, s, d) => gpulse(p, aim(p, d))]], 1.4),
  bc_flying_stone_smash: sword([[0.2, 'anim', 'SS_Plunge', 1.0], [0.45, 'cres', 'high', { scale: 0.6, sound: false }], [0.55, 'fn', (p) => slashAt(p, 'ring', PGREEN)], [0.6, 'hit', 1, { bleedP: 0.3 }], [0.7, 'fn', (p, s, d) => gpulse(p, aim(p, d), 0xffe070, 0.9 * CH)], [1.15, 'anim', 'SS_Lunge', 0.8], [1.3, 'jab', 1.4], [1.3, 'hit', 1, { bleedP: 0.3, burst: 1.3 }], [1.4, 'beam', { past: 0.2, thick: 0.3, dur: 0.5, from: 0 }]], 1.9),
  bc_twin_energy_smash: sword([[0, 'anim', 'SS_Chop', 0.6], [0.3, 'fn', (p) => slashAt(p, 'down', CYAN)], [0.4, 'fn', (p) => slashAt(p, 'low', PGREEN)], [0.5, 'hit', 1, { bleedP: 0.3 }], [0.55, 'anim', 'Attack2', 0.5], [0.6, 'fn', (p) => slashAt(p, 'flat', PGREEN)], [0.75, 'hit', 1], [0.8, 'fn', (p, s, d) => gpulse(p, aim(p, d), 0xd0ff60)], [1.05, 'anim', 'SS_Chop', 0.6], [1.2, 'fn', (p) => slashAt(p, 'down')], [1.35, 'hit', 1, { burst: 1.3 }], [1.6, 'fn', (p, s, d) => flamePillar(p, aim(p, d), 0.6 * CH)]], 1.9),
  bc_destruction_smash: sword([[0, 'anim', 'SS_Upper', 0.9], [0.35, 'fn', (p) => slashAt(p, 'flat', { color: 0xf0fff8, color2: 0x80ffc0, scale: 1.2 })], [0.5, 'fn', (p, s, d) => { const at = ground(p, aim(p, d)); p.fx.slash(at, p.yaw, { color: 0xe0fff0, color2: 0x80ffc0, radius: 0.85 * CH, width: 0.3, angle: TAU * 0.97, y: 0.2, duration: 0.25, sparks: false }); }], [0.6, 'hit', 1, { kb: 0.6, burst: 1.8 }], [0.65, 'fn', (p, s, d) => gpulse(p, aim(p, d), 0xd0ff60, 0.8 * CH)], [0.9, 'cres', 'low', { scale: 0.7, sound: false }], [1.2, 'anim', 'SS_Chop', 0.6], [1.3, 'fn', (p) => slashAt(p, 'low', PGREEN)], [1.4, 'fn', (p) => slashAt(p, 'dome', { color: 0xffffff, color2: 0xd8f8ff, scale: 1.2 })], [1.45, 'hit', 1, { kb: 0.6, burst: 1.6 }]], 1.8, { type: 'front', r: 3.8, n: 3 }),

  // ---- Row 2: Chain (gold sunburst discs)
  bc_chain_illusion: chainS([[0.5, 'down'], [1.2, 'flat'], [1.9, 'down']], 2.3),
  bc_chain_blood: chainS([[0.6, 'down'], [1.0, 'flat'], [1.6, 'down'], [2.2, 'flat']], 2.6),
  bc_chain_billow: chainS([[0.5, 'low', 'leap'], [0.8, 'flat'], [1.4, 'ring'], [1.9, 'thrust'], [2.4, 'thrust']], 2.8),
  bc_chain_ascension: chainS([[0.7, 'up'], [1.2, 'up', 'leap'], [1.7, 'down'], [2.2, 'flat']], 2.6),
  bc_chain_heaven: chainS([[0.2, 'thrust'], [0.45, 'thrust'], [1.4, 'down', 'flip'], [1.9, 'flat'], [2.4, 'down']], 2.8),
  bc_chain_lightning: chainS([[0.4, 'down'], [0.6, 'flat', 'blue'], [1.0, 'flat'], [1.6, 'up', 'blue'], [2.1, 'down', 'spark'], [2.6, 'down']], 3.0),
  bc_chain_thousand_army: chainS([[0.2, 'thrust'], [0.4, 'low'], [0.55, 'up', 'flip'], [1.3, 'flat'], [1.8, 'down'], [2.3, 'flat', 'big']], 2.7),
  bc_chain_heavenly: chainS([[0.5, 'thrust'], [0.8, 'flat', 'leap'], [1.1, 'down'], [1.4, 'flat'], [1.8, 'down'], [2.2, 'up', 'blue'], [2.7, 'flat', 'big']], 3.1),

  // ---- Row 3: Shield buffs (need a shield)
  bc_castle_shield: shieldBuff({ defPct: 15 }, 15, 0xfff0a0),
  bc_mountain_shield: shieldBuff({ block: 20 }, 15, 0xffb040, true),
  bc_ironwall_shield: shieldBuff({ defPct: 25 }, 15, 0xffe080),
  bc_iron_castle_shield: shieldBuff({ defPct: 30, block: 10 }, 15, 0xffd060, true),
  bc_sun_guard_shield: shieldBuff({ defPct: 35, block: 15 }, 15, 0xffa020, true),

  // ---- Row 4: Cut Blade (ranged crescents)
  bc_cut_soul: ranged([[0, 'anim', 'Attack2', 0.6], [0.45, 'fn', (p) => slashAt(p, 'flat')], [0.5, 'fn', shot(0xffe0a0, 0xff7a10, 0xffa040, 1, 1, { fire: true })]], 1.3),
  bc_cut_evil: ranged([[0, 'anim', 'SS_Chop', 0.6], [0.4, 'fn', (p) => slashAt(p, 'dome', CYAN)], [0.55, 'fn', shot(0xffe0a0, 0xff7a10, 0xffa040, 1, 1.2, { fire: true })]], 1.2),
  bc_cut_devil: ranged([[0.2, 'anim', 'Attack2', 0.5], [0.45, 'fn', shot(0xf0ffe0, 0x9aff40, 0xc0ff40, 1, 1.1)], [1.1, 'anim', 'Attack3', 0.5], [1.25, 'fn', (p) => slashAt(p, 'dome', CYAN)], [1.3, 'fn', shot(0xf0ffe0, 0x9aff40, 0xc0ff40, 1, 1.1)]], 1.9),
  bc_cut_demon: ranged([[0, 'anim', 'Skill', 0.8], [0.6, 'fn', (p) => p.fx.starFlash(p.position.clone().setY(p.position.y + 1), W, 1.4, 0.2)], [0.95, 'fn', shot(0xffffc0, 0xc8ff40, 0xd0ff40, 1, 1, { edge: true, burst: 1.6 })], [1.3, 'anim', 'Attack2', 0.5], [1.4, 'fn', (p) => slashAt(p, 'dome', CYAN)], [1.5, 'fn', shot(0xffffc0, 0xc8ff40, 0xd0ff40, 1, 1, { edge: true, burst: 1.9 })]], 2.3),
  bc_cut_ghost: ranged([[0.3, 'anim', 'Attack1', 0.5], [0.8, 'fn', (p) => p.fx.starFlash(p.position.clone().setY(p.position.y + 1.2), new THREE.Color(0xc0e8ff), 1.6, 0.2)], [0.95, 'fn', (p) => slashAt(p, 'dome', CYAN)], [1.0, 'fn', shot(0xe0ffff, 0x60d8ff, 0xa0e8ff, 1, 1, { edge: true, burst: 1.7 })], [1.4, 'anim', 'Attack2', 0.5], [1.45, 'fn', shot(0xe0ffff, 0x60d8ff, 0xa0e8ff, 1, 1, { edge: true, burst: 2.0 })], [2.0, 'anim', 'Attack3', 0.5], [2.1, 'fn', shot(0xe0ffff, 0x60d8ff, 0xffffff, 1, 1, { edge: true, burst: 1.5 })]], 2.6),
  bc_cut_emperor: ranged([[0.2, 'anim', 'Attack2', 0.5], [0.4, 'fn', (p) => slashAt(p, 'dome', CYAN)], [0.7, 'fn', (p) => slashAt(p, 'dome', { ...CYAN, scale: 1.3 })], [0.7, 'fn', shot(0xe0ffff, 0x60d8ff, 0xa0e8ff, 1, 1.2, { edge: true, burst: 2.0, lightning: true })], [1.35, 'anim', 'Attack3', 0.5], [1.4, 'fn', shot(0xe0ffff, 0x60d8ff, 0xa0e8ff, 1, 1.2, { edge: true, burst: 1.8 })], [1.6, 'fn', (p) => sparkChain(p)], [2.0, 'anim', 'Attack2', 0.5], [2.05, 'fn', shot(0xe0ffff, 0x60d8ff, 0xffffff, 1, 1.2, { edge: true, burst: 2.0, lightning: true })]], 2.6),

  // ---- Row 5: Blade Force (knock-down)
  bc_force_blood: sword([[0, 'anim', 'SS_Kneel', 0.7], [0.55, 'anim', 'SS_Upper', 0.9], [0.8, 'fn', (p) => p.fx.starFlash(ground(p, p.position.clone().addScaledVector(p.forward(), 0.8)).setY(p.position.y + 0.3), new THREE.Color(0xc0e8ff), 1.4, 0.2)], [0.85, 'fn', (p) => slashAt(p, 'up', { ...CYAN, scale: 1.3 })], [0.95, 'hit', 1, { downP: 0.6, downT: 3.5, burst: 1.4 }], [0.95, 'fn', knockdownJolt], [1.1, 'fn', (p, s, d) => p.fx.slash(ground(p, aim(p, d)), p.yaw, { ...CYAN, radius: 0.7 * CH, width: 0.3, angle: Math.PI, y: 0.2, tilt: Math.PI / 2, duration: 0.25, sparks: false })]], 1.8),
  bc_force_soul: sword([[0, 'anim', 'Attack2', 0.4], [0.2, 'fn', (p) => slashAt(p, 'flat', CYAN)], [0.35, 'anim', 'SS_Kneel', 0.8], [0.65, 'fn', (p) => p.fx.spikeBurst(ground(p, p.position.clone().addScaledVector(p.forward(), 0.8)).setY(p.position.y + 0.3), new THREE.Color(0xd0f8ff), 1.2, 0.3)], [1.0, 'anim', 'SS_Upper', 0.8], [1.1, 'fn', (p) => p.fx.slash(p.position, p.yaw, { ...PGREEN, radius: 0.85 * CH, width: 0.3, angle: TAU * 0.97, y: 0.15, duration: 0.25, sparks: false })], [1.15, 'fn', (p, s, d) => p.fx.energyWave(ground(p, p.position).setY(p.position.y + 0.4), aim(p, d).setY(p.position.y + 0.4), { color: 0x60e0ff, color2: 0xffffff, duration: 0.25, width: 0.5 * CH })], [1.35, 'hit', 1, { downP: 0.5, downT: 3.5 }]], 2.2, { type: 'front', r: 3.8, n: 3 }),
  bc_force_demon: sword([[0, 'anim', 'SS_Kneel', 0.9], [0.7, 'fn', (p) => { p.fx.starFlash(p.position.clone().setY(p.position.y + 0.9), new THREE.Color(0xc0ffff), 1.6, 0.25); p.fx.spikeBurst(p.position.clone().setY(p.position.y + 0.9), new THREE.Color(1, 0.6, 1), 1.2, 0.3); }], [1.1, 'anim', 'SS_Lunge', 0.8], [1.3, 'jab', 2.2], [1.3, 'fn', (p, s, d) => p.fx.lightning(p.position.clone().setY(p.position.y + 1.1), aim(p, d), { color: 0x60e0ff, core: 0xffffff, width: 0.025, duration: 0.25, segments: 4, jitter: 0.05, branches: 0 })], [1.4, 'hit', 1, { downP: 0.5, downT: 3.5, burst: 1.3 }], [1.5, 'anim', 'SS_Plunge', 0.8], [1.65, 'cres', 'vertical', { scale: 0.9, color2: 0xff6080 }]], 2.3),
  bc_force_ocean: sword([[0.3, 'anim', 'SS_Kneel', 0.8], [0.9, 'fn', (p) => { const c = p.position.clone().setY(p.position.y + 1); p.fx.shockSphere(c, 0x30d8c8, 0.75 * CH, 0.35); p.fx.spikeBurst(c, new THREE.Color(0xc0ffff), 1.4 * CH, 0.3); }], [1.15, 'anim', 'SS_Lunge', 0.6], [1.35, 'beam', { past: 0.3, thick: 0.18, dur: 0.35, from: 0, core: 0xffffff, edge: 0xfff0a0 }], [1.4, 'hit', 1, { downP: 0.6, downT: 3.5, burst: 1.5 }], [1.5, 'anim', 'SS_Plunge', 0.8], [1.6, 'fn', knockdownJolt], [1.6, 'cres', 'vertical', { scale: 1.0 }], [1.85, 'fn', (p) => blueSwirl(p)], [2.4, 'fn', (p) => sparkChain(p)]], 2.6, { type: 'front', r: 4.4, n: 3 }),
  bc_force_sky: sword([[0.3, 'anim', 'SS_Lunge', 0.9], [0.9, 'fn', (p, s, d) => { const from = p.tipNode ? p.tipNode.getWorldPosition(new THREE.Vector3()) : p.position.clone().setY(p.position.y + 1.1); const to = aim(p, d); const dir = to.clone().sub(from).normalize(); p.fx.timed(0.45, () => { for (let i = 0; i < 3; i++) { const sp = from.distanceTo(to) / 0.2; p.fx.fire.emit(from.x, from.y, from.z, { vx: dir.x * sp + rnd(0.5), vy: dir.y * sp + rnd(0.5), vz: dir.z * sp + rnd(0.5), life: 0.2, size: 0.25, size1: 0.6, color: new THREE.Color(1, 0.6, 0.7), color1: new THREE.Color(1, 0.25, 0.05), alpha: 0.8, alpha1: 0 }); } }); p.game.audio.play('fire'); }], [0.95, 'hit', 1], [1.6, 'anim', 'SS_Upper', 0.8], [1.8, 'fn', (p) => p.fx.starFlash(p.position.clone().setY(p.position.y + 1), new THREE.Color(0xc0f0ff), 1.6, 0.2)], [2.05, 'fn', (p) => slashAt(p, 'dome', { ...CYAN, scale: 1.3 })], [2.1, 'fn', (p, s, d) => p.fx.energyWave(ground(p, p.position).setY(p.position.y + 0.3), aim(p, d).setY(p.position.y + 0.3), { color: 0x60e0ff, color2: 0xffffff, duration: 0.2, width: 0.4 * CH })], [2.15, 'hit', 1, { downP: 0.5, downT: 3.5, burst: 1.4 }]], 2.6),

  // ---- Row 6: fallen-enemy finishers (only on knocked-down targets, +50% damage)
  bc_flower_bloom: fallen([[0, 'anim', 'Dash', 0.5], [0.4, 'anim', 'SS_Plunge', 0.9], [0.7, 'cres', 'vertical', { scale: 0.9 }], [0.85, 'fn', (p) => flameSpike(p)], [1.0, 'hit', 1, { burst: 1.3 }], [1.0, 'fn', (p, s, d) => flamePillar(p, aim(p, d))]], 1.6),
  bc_flower_bud: fallen([[0.1, 'anim', 'SS_Plunge', 1.2], [0.9, 'cres', 'vertical', { scale: 1.0 }], [1.0, 'fn', (p) => flameSpike(p)], [1.0, 'hit', 1, { burst: 1.5 }], [1.3, 'fn', (p, s, d) => flamePillar(p, aim(p, d))]], 1.8),
  bc_dragon_sore: fallen([[0.1, 'anim', 'SS_Chop', 0.6], [0.45, 'cres', 'vertical', { scale: 0.9 }], [0.5, 'fn', (p) => flameSpike(p)], [0.6, 'hit', 1, { burst: 1.3 }], [0.7, 'fn', (p, s, d) => flamePillar(p, aim(p, d))], [1.05, 'anim', 'SS_Chop', 0.6], [1.3, 'cres', 'vertical', { scale: 1.0 }], [1.4, 'hit', 1, { burst: 1.3 }], [1.6, 'fn', (p, s, d) => flamePillar(p, aim(p, d))]], 2.0),
  bc_asura_cut: fallen([[0.1, 'anim', 'SS_Chop', 0.6], [0.45, 'cres', 'vertical', { scale: 1.0 }], [0.55, 'hit', 1, { burst: 1.4 }], [0.6, 'fn', (p, s, d) => flamePillar(p, aim(p, d))], [1.0, 'anim', 'SS_Chop', 0.6], [1.25, 'cres', 'vertical', { scale: 1.1 }], [1.35, 'hit', 1, { burst: 1.4 }], [1.5, 'fn', (p, s, d) => flamePillar(p, aim(p, d), 0.9 * CH)]], 1.9),
  bc_heavenly_blade: fallen([[0.1, 'anim', 'SS_Upper', 0.6], [0.4, 'cres', 'vertical', { scale: 0.9 }], [0.45, 'anim', 'SS_Chop', 0.6], [0.5, 'cres', 'dome', { scale: 1.3 }], [0.6, 'hit', 1, { burst: 1.6 }], [0.7, 'fn', (p) => flameSpike(p)], [1.2, 'anim', 'SS_Chop', 0.7], [1.55, 'cres', 'dome', { scale: 1.4 }], [1.6, 'hit', 1, { burst: 1.6 }], [1.8, 'fn', (p, s, d) => flamePillar(p, aim(p, d), 1.0 * CH)]], 2.2),
  bc_mad_dragon: fallen([[0.3, 'anim', 'SS_Plunge', 1.0], [0.9, 'cres', 'vertical', { scale: 1.1 }], [1.1, 'cres', 'dome', { scale: 1.1 }], [1.2, 'hit', 1, { burst: 1.5 }], [1.2, 'fn', (p, s, d) => flamePillar(p, aim(p, d), 0.9 * CH, 0xff9a20)], [1.25, 'fn', (p) => flameSpike(p)], [1.35, 'hit', 1, { burst: 1.3 }]], 1.6),

  // ---- Row 7: Sword Dance (thrown flaming sword)
  bc_dance_snake: ranged([[0, 'anim', 'Skill', 0.4], [0.45, 'anim', 'SS_Fling', 0.6], [0.6, 'fn', dance({})]], 1.2),
  bc_dance_petal: ranged([[0, 'anim', 'Skill', 0.4], [0.35, 'anim', 'SS_Fling', 0.6], [0.45, 'fn', dance({ arc: true, area: true, n: 3 })]], 1.3),
  bc_dance_typhoon: ranged([[0, 'anim', 'Skill', 0.4], [0.35, 'anim', 'SS_Fling', 0.6], [0.45, 'fn', dance({ haze: true })]], 1.2),
  bc_dance_chaotic: ranged([[0, 'anim', 'Attack2', 0.3], [0.2, 'anim', 'SS_Fling', 0.6], [0.4, 'fn', dance({ arc: true, haze: true, area: true, n: 4 })]], 1.2),
  bc_dance_heaven: ranged([[0.3, 'anim', 'Attack2', 0.4], [0.55, 'anim', 'SS_Fling', 0.6], [0.8, 'fn', dance({ ice: true })], [1.2, 'fn', (p) => blueSwirl(p)], [1.45, 'anim', 'SS_Fling', 0.6], [1.6, 'fn', dance({ ice: true })], [2.1, 'fn', (p) => sparkChain(p)]], 2.3),

  // ---- Row 8: Bicheon Force (120 s: more attack, less shield defence)
  bc_force_glacial: forceBuff('Glacial Flame', 0x80d8ff, 0x3a7cff, 8, 10),
  bc_force_banshee: forceBuff('Banshee', 0xc080ff, 0x6a3aff, 12, 12),
  bc_force_summit: forceBuff('Summit & Depth', 0xffd060, 0xa06a20, 16, 14),
  bc_force_celestial: forceBuff('Celestial Ground', 0xffffff, 0xffe0a0, 20, 16),
  bc_force_light: forceBuff('Light Bearers', 0xfff0a0, 0xffb020, 24, 18),
};

// chain combos: orange crescents + gold sunburst disc per hit
function chainS(hits, dur) {
  const steps = [];
  for (const [t, mv, extra] of hits) {
    const anim = { down: 'SS_Chop', flat: 'Attack2', low: 'Attack1', up: 'SS_Upper', ring: 'Skill', thrust: 'SS_Lunge' }[mv];
    steps.push([Math.max(0, t - 0.25), 'anim', extra === 'leap' ? 'SS_Plunge' : extra === 'flip' ? 'BW_Backflip' : anim, extra === 'leap' ? 0.8 : 0.5]);
    if (mv === 'thrust') steps.push([t - 0.05, 'jab', 1.2]);
    else steps.push([t - 0.08, 'fn', (p) => slashAt(p, mv === 'ring' ? 'ring' : mv, { ...ORANGE, scale: extra === 'big' ? 1.4 : 1 })]);
    steps.push([t, 'hit', 1, { burst: 0.6 }]);
    steps.push([t, 'fn', (p, s, d) => sunburst(p, aim(p, d), extra === 'big' ? 2.4 : 1.3 + Math.random() * 0.5)]);
    if (extra === 'blue') steps.push([t + 0.05, 'fn', (p) => blueSwirl(p)]);
    if (extra === 'spark') steps.push([t - 0.3, 'fn', (p) => sparkChain(p)]);
    if (extra === 'big') steps.push([t, 'fn', (p, s, d) => p.fx.decal(ground(p, aim(p, d)), { tex: 'nova', color: 0xffb020, radius: 1.2 * CH, duration: 0.5, spin: 0, opacity: 0.7, fadeIn: 0.02, fadeOut: 0.3 })]);
  }
  return skill({ dur, reach: 1.0 * CH, shape: { type: 'single' }, steps, cres: ORANGE });
}

function shieldBuff(mods, dur, color, aura = false) {
  return skill({ dur: 0.8, shape: { type: 'single' }, buffGroup: 'bc_shield', steps: [[0, 'anim', 'SS_Block', 0.6], [0.3, 'fn', (p, s) => {
    const fx = p.fx, at = ground(p, p.position);
    fx.flare(p.position.clone().setY(p.position.y + 1.2), W, 2.5, 0.2);
    fx.streaks(p.position.clone().setY(p.position.y + 1.1), 14, { speed: 7, color: W, color1: col(color), life: 0.3, size: 0.12, gravity: 0 });
    fx.shockwave(at, { color, radius: 1.5 * CH, duration: 0.5, width: 0.22 });
    later(p, 0.1, () => fx.shockwave(at, { color, radius: 1.2 * CH, duration: 0.45, width: 0.14 }));
    fx.decal(at, { tex: 'disc', color, radius: 1.4 * CH, duration: 0.6, grow: 0.2, spin: 0, opacity: 0.4, fadeIn: 0.02, fadeOut: 0.4 });
    let shell = null, ring = null;
    if (aura) { shell = fx.shell(p.obj, color, 0xffe0a0, { thickness: 0.02, intensity: 0.7, flame: 1.2 }); ring = fx.decal(p.position, { follow: p, tex: 'rings1', color: 0xffffff, radius: 0.5 * CH, spin: 0.5, opacity: 0.6 }); }
    p.addBuff('bc_shield', { id: s.id, name: s.name, dur: dur + s.lv * 0.5, mods: { ...mods, defPct: (mods.defPct || 0) + s.lv }, color: '#c08020', fx: aura ? { end: () => { shell.dispose(); ring.end(0); } } : null });
    p.game.audio.play('anvil', { pitch: 1.3 });
  }]] });
}

function forceBuff(name, color, color2, atk, def) {
  return skill({ dur: 1.0, shape: { type: 'single' }, buffGroup: 'bc_force', steps: [[0, 'anim', 'Cast', 0.9], [0.3, 'fn', (p, s) => {
    const fx = p.fx, at = ground(p, p.position);
    fx.pillar(at, { color, color2, radius: 0.55 * CH, height: 1.4 * CH, duration: 0.9, speed: 3 });
    fx.decal(at, { tex: 'rings3', color, radius: 1.1 * CH, duration: 0.9, spin: 1.5, opacity: 0.8, fadeIn: 0.05, fadeOut: 0.4 });
    fx.rise(at, { color, color1: color2, count: 24, radius: 0.8, speed: 3, life: 0.8, size: 0.25 });
    const shell = fx.shell(p.obj, color, color2, { thickness: 0.015, intensity: 0.6, flame: 1.0 });
    p.addBuff('bc_force', { id: s.id, name: name + ' Bicheon Force', dur: 120, mods: { atkPct: atk + s.lv, defPct: -def }, color: '#' + col(color2).getHexString(), fx: { end: () => shell.dispose() } });
    p.game.audio.play('choir', { pitch: 1.4 });
  }]] });
}

export default BICHEON;
