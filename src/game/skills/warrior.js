// Warrior (Silkroad Online EU) - skills read from the reference clip's Melee > Warrior window.
// One-handed sword skills draw green crescents with a pale yellow edge; dual-axe skills draw blue-white
// spin rings and throw white crescent "blade waves" at the target. Times are the clip's (seconds).
import * as THREE from 'three';
import { V } from './common.js';
import { skill, crescent, starburst, jabStreak, groundStreak, later, ground, chest, aim, CH } from './heuksal.js';

const TAU = Math.PI * 2;
const W = new THREE.Color(1, 1, 1);
const col = (c) => (c instanceof THREE.Color ? c.clone() : new THREE.Color(c));
const rnd = (a = 1) => (Math.random() - 0.5) * 2 * a;
const GREEN = { color: 0xf4ffb0, color2: 0x3ad020 };
const AXE = { color: 0xffffff, color2: 0x6ab8ff };

// ---------------------------------------------------------------- warrior visuals
// white crescent blade-wave erupting at the target (axe hits)
function bladeWave(p, d, { vertical = true, scale = 1, color = 0xffffff, color2 = 0x9ad8ff } = {}) {
  const at = ground(p, aim(p, d));
  p.fx.slash(at.clone().addScaledVector(p.forward(), -0.3), p.yaw, { color, color2, radius: 0.75 * CH * scale, width: 0.45 * scale, angle: Math.PI * 0.9, y: vertical ? 0.1 : 0.9, tilt: vertical ? Math.PI / 2 + rnd(0.3) : 0.2, duration: 0.14, sparks: false });
}
// blue spin ring at the attacker's feet / waist
function blueRing(p, y = 0.2, vertical = false) {
  const fx = p.fx, pp = p.position;
  if (vertical) { fx.slash(pp, p.yaw + Math.PI / 2, { ...AXE, radius: 0.9 * CH, width: 0.35, angle: TAU * 0.95, y: 1.0, tilt: Math.PI / 2, duration: 0.25, sparks: false }); return; }
  fx.slash(pp, p.yaw, { color: 0xd8f0ff, color2: 0x4a8cff, radius: 0.85 * CH, width: 0.32, angle: TAU * 0.97, y, tilt: 0.05, duration: 0.22, sparks: false });
}
function tint(p, color, dur) { const sh = p.fx.shell(p.obj, color, 0xffffff, { thickness: 0.012, intensity: 0.8 }); later(p, dur, () => sh.dispose()); }
function shieldFlare(p, color = 0xff7ad0) {
  const q = p.position.clone().setY(p.position.y + 1.1).addScaledVector(p.forward(), 0.5);
  p.fx.flare(q, col(color), 1.6, 0.18);
  p.fx.glow.burst(q, 10, { speed: 3, life: 0.3, size: 0.3, color: col(color), drag: 3 });
}
function bigBurst(p, d, scale = 1.6, color = 0xa8e8ff) {
  const at = aim(p, d);
  p.fx.spikeBurst(at, col(color), 3.4 * scale, 0.3);
  p.fx.streaks(at, 26, { speed: 12 * scale, color: W, color1: col(0xffb060), life: 0.4, size: 0.12, gravity: 4 });
  p.game.engine.shake(0.3 * scale);
}
// shield emblem above the head (Iron Skin gold, Mana Skin blue)
let emblemTex = null;
function emblem(p, color) {
  if (!emblemTex) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    g.translate(32, 32); g.fillStyle = '#fff'; g.shadowColor = '#fff'; g.shadowBlur = 8;
    g.beginPath(); g.moveTo(0, -24); g.lineTo(18, -16); g.lineTo(16, 6); g.quadraticCurveTo(10, 18, 0, 26); g.quadraticCurveTo(-10, 18, -16, 6); g.lineTo(-18, -16); g.closePath(); g.fill();
    emblemTex = new THREE.CanvasTexture(c);
  }
  const mat = new THREE.SpriteMaterial({ map: emblemTex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false });
  const sp = new THREE.Sprite(mat); sp.renderOrder = 8;
  p.game.world.scene.add(sp);
  p.fx.timed(1.4, (k) => {
    sp.position.copy(p.position).setY(p.position.y + 2.35);
    sp.scale.setScalar(0.5 * (0.7 + Math.min(1, k * 6) * 0.3));
    mat.opacity = k < 0.85 ? 1 : 1 - (k - 0.85) / 0.15;
    if (k > 0.5 && k < 0.65) p.fx.glow.emit(sp.position.x, sp.position.y, sp.position.z, 0, 0, 0, 0.15, 0.9, col(color), { size1: 1.2 });
  }, () => { p.game.world.scene.remove(sp); mat.dispose(); });
}
function shout(p, color, color2) {
  const fx = p.fx, at = ground(p, p.position);
  fx.spikeBurst(p.position.clone().setY(p.position.y + 2.3), col(color2), 1.4, 0.3);
  later(p, 0.4, () => {
    fx.shockwave(at, { color, radius: 2.6 * CH, duration: 0.7, width: 0.22, start: 0.5 });
    later(p, 0.12, () => fx.shockwave(at, { color, radius: 2.0 * CH, duration: 0.6, width: 0.14, start: 0.4 }));
    later(p, 0.24, () => fx.shockwave(at, { color: color2, radius: 1.5 * CH, duration: 0.5, width: 0.1, start: 0.4 }));
    fx.pillar(at, { color, color2, radius: 0.5, height: 2.4, duration: 0.6, speed: 2 });
    // taunt: every monster around turns on the warrior
    p.game.combat.inCircle(at, 30, (m) => { m.aggro = true; if (m.state === 'idle' || m.state === 'wander') m.state = 'chase'; });
    p.game.audio.play('roar', { pitch: 1.3 });
  });
}
function vitalIncrease(p) {
  const fx = p.fx;
  shieldFlare(p, 0xff7ad0);
  later(p, 0.3, () => { fx.orbitRing(p, { color: 0xd8ff60, color2: 0xffe070, radius: 0.6 * CH, duration: 0.9 }); later(p, 0.12, () => fx.orbitRing(p, { color: 0xffd040, color2: 0xfff0a0, radius: 0.55 * CH, duration: 0.8 })); });
  later(p, 0.6, () => fx.pillar(ground(p, p.position), { color: 0xff9a20, color2: 0xffe0a0, radius: 0.28, height: 3.5 * CH, duration: 1.1, speed: 2 }));
  p.game.audio.play('choir', { pitch: 1.2 });
}
function linkBuff(p, color) {
  const fx = p.fx, at = ground(p, p.position);
  fx.decal(at, { tex: 'rings2', color, radius: 0.9 * CH, duration: 0.8, spin: 1, opacity: 0.8, fadeIn: 0.05, fadeOut: 0.4 });
  fx.rise(at, { color, count: 20, radius: 0.7, speed: 2.5, life: 0.8, size: 0.25 });
}
function axisQuiver(p, d) {
  const fx = p.fx, at = ground(p, p.position.clone().addScaledVector(p.forward(), 1.3 * CH));
  fx.flare(at.clone().setY(at.y + 0.3), W, 3, 0.15);
  fx.decal(at, { tex: 'nova', color: 0xffa020, radius: 2.0 * CH, duration: 0.9, spin: 0, opacity: 0.9, fadeIn: 0.03, fadeOut: 0.5 });
  fx.flameRays(at, { color: 0xff9a20, color2: 0xfff0a0, count: 26, height: 1.8 * CH, spread: 0.55, life: 0.5 });
  fx.timed(0.35, () => { for (let i = 0; i < 4; i++) { const a = Math.random() * TAU, r = Math.random() * 2 * CH; fx.tongue.emit(at.x + Math.cos(a) * r, at.y + 0.1, at.z + Math.sin(a) * r * 0.6, { vx: 0, vy: 14 + Math.random() * 8, vz: 0, life: 0.25, size: 0.25, size1: 0.1, color: new THREE.Color(1, 0.95, 0.6), color1: new THREE.Color(1, 0.55, 0.1), alpha: 0.9, alpha1: 0 }); } });
  later(p, 0.25, () => fx.smokePuff(at, { count: 10, size: 1.2, size1: 3, life: 0.9, color: new THREE.Color(1, 0.6, 0.25), alpha: 0.5, rise: 0.2, spread: 2.5, speed: 2 }));
  fx.light(at.clone().setY(at.y + 1), 0xffa040, 40, 0.5, 14);
  p.game.engine.shake(0.6);
  p.game.audio.play('boom', { pitch: 1.1 });
}
function downCross(p, d) {
  const fx = p.fx, at = ground(p, aim(p, d));
  bladeWave(p, d, { vertical: true, scale: 1.3, color2: 0x80c8ff });
  later(p, 0.1, () => groundStreak(p, d, 0xffffff));
  later(p, 0.2, () => { for (let i = 0; i < 3; i++) later(p, i * 0.06, () => { const q = p.position.clone().addScaledVector(p.forward(), 0.8); q.y = p.game.world.heightAt(q.x, q.z) + 0.1; fx.lightning(q, q.clone().add(V(rnd(0.8), 0.05, rnd(0.8))), { color: 0x6ab8ff, core: 0xffffff, width: 0.04, duration: 0.15, segments: 6, jitter: 0.3, branches: 0 }); }); });
}

// ---------------------------------------------------------------- skills
const ONE = (steps, dur, shape, status, extra = {}) => skill({ dur, reach: 1.1 * CH, shape, steps, status, cres: GREEN, ...extra });
const DUAL = (steps, dur, shape, status, extra = {}) => skill({ dur, reach: 1.1 * CH, shape, steps, status, cres: AXE, ...extra });
const single = { type: 'single' }, front2 = { type: 'front', r: 3.6, n: 3 };
const buffSkill = (dur, fn, extra = {}) => skill({ dur, shape: single, steps: [[0, 'anim', 'Cast', 0.9], [0.05, 'fn', fn]], ...extra });

export const WARRIOR = {
  // ---- Row 1: self buffs & shouts
  wr_vital_increase: buffSkill(1.2, (p, s) => { vitalIncrease(p); p.addBuff('vital', { id: s.id, name: 'Vital Increase', dur: 900, mods: { hpPct: 20 + s.lv, absorb: 18 + s.lv }, color: '#c08030' }); }, { buffGroup: 'vital' }),
  wr_descry: buffSkill(0.8, (p, s) => { linkBuff(p, 0xff6040); p.game.combat.inCircle(p.position, 10, (m) => { m.exposed = Math.max(m.exposed || 0, 120); }); p.game.ui.toast('Descry: เปิดเผยศัตรูที่ล่องหนรอบตัว 10 ม.', ''); }),
  wr_iron_skin: buffSkill(0.6, (p, s) => { shieldFlare(p); emblem(p, 0xffd040); p.addBuff('ironskin', { id: s.id, name: 'Iron Skin', dur: 45, mods: { defPct: 20 + 2 * s.lv }, color: '#c09020' }); }, { buffGroup: 'ironskin' }),
  wr_howling_shout: skill({ dur: 1.3, shape: single, hpCost: 0.1, steps: [[0, 'anim', 'Cast', 1.2], [0.05, 'fn', (p) => { shieldFlare(p); shout(p, 0xffc040, 0xfff0a0); }]] }),
  wr_mana_skin: buffSkill(0.6, (p, s) => { shieldFlare(p); emblem(p, 0x60a8ff); p.addBuff('manaskin', { id: s.id, name: 'Mana Skin', dur: 45, mods: { defPct: 15 + 2 * s.lv }, color: '#3060c0' }); }, { buffGroup: 'manaskin' }),
  // ---- Row 2: link buffs (no party in this game -> applied to yourself)
  wr_pain_quota: buffSkill(0.8, (p, s) => { linkBuff(p, 0xff8060); p.addBuff('painquota', { id: s.id, name: 'Pain Quota', dur: 300, mods: { absorb: 5 + s.lv }, color: '#c04030' }); }, { buffGroup: 'painquota' }),
  wr_physical_fence: buffSkill(0.8, (p, s) => { linkBuff(p, 0xffd060); p.addBuff('pfence', { id: s.id, name: 'Physical Fence', dur: 1800, mods: { absorb: 5 + Math.round(s.lv * 0.7) }, color: '#c0a030' }); }, { buffGroup: 'pfence' }),
  wr_magical_fence: buffSkill(0.8, (p, s) => { linkBuff(p, 0x80b0ff); p.addBuff('mfence', { id: s.id, name: 'Magical Fence', dur: 1800, mods: { defPct: 5 + s.lv }, color: '#3060c0' }); }, { buffGroup: 'mfence' }),
  wr_protect: buffSkill(0.8, (p, s) => { linkBuff(p, 0xffffff); p.addBuff('protect', { id: s.id, name: 'Protect', dur: 1800, mods: { defPct: 5 + s.lv }, color: '#a0a0a0' }); }, { buffGroup: 'protect' }),
  wr_physical_screen: buffSkill(0.8, (p, s) => { linkBuff(p, 0xffb040); p.addBuff('pscreen', { id: s.id, name: 'Physical Screen', dur: 600, mods: { absorb: 8 + s.lv }, color: '#c08030' }); }, { buffGroup: 'pscreen' }),
  wr_morale_screen: buffSkill(0.8, (p, s) => { linkBuff(p, 0x60ffb0); p.addBuff('mscreen', { id: s.id, name: 'Morale Screen', dur: 600, mods: { atkPct: 5 + s.lv }, color: '#30a060' }); }, { buffGroup: 'mscreen' }),
  wr_ultimate_screen: buffSkill(0.8, (p, s) => { linkBuff(p, 0xff60ff); p.addBuff('uscreen', { id: s.id, name: 'Ultimate Screen', dur: 600, mods: { absorb: 10 + s.lv, defPct: 10 + s.lv }, color: '#a040a0' }); }, { buffGroup: 'uscreen' }),

  // ---- Row 4: one-handed sword + shield
  wr_shield_trash: ONE([[0, 'anim', 'SS_Bash', 0.6], [0.05, 'fn', (p) => shieldFlare(p)], [0.1, 'hit', 1, { kb: 0.8, dullP: 0.4, burst: 1.3 }], [0.25, 'fn', (p, s, d) => bigBurst(p, d, 1.1, 0xc8f0ff)]], 0.8, front2),
  wr_double_stab: ONE([[0, 'anim', 'Attack1', 0.45], [0.05, 'jab', 1.0], [0.1, 'hit', 1], [0.5, 'anim', 'Attack1', 0.45], [0.55, 'fn', (p) => p.fx.slash(p.position, p.yaw, { ...GREEN, radius: 1.0 * CH, width: 0.7, angle: Math.PI * 0.35, y: 1.1, duration: 0.15 })], [0.6, 'jab', 1.0], [0.8, 'hit', 1]], 1.3, single),
  wr_berserker: ONE([[0, 'anim', 'Skill', 0.6], [0.0, 'cres', 'low', { scale: 0.5, sound: false }], [0.3, 'cres', 'flat', { scale: 0.9 }], [0.5, 'cres', 'ellipse', { scale: 0.75 }], [0.5, 'hit', 1], [0.75, 'anim', 'Attack3', 0.6], [0.8, 'cres', 'vertical', { scale: 0.8 }], [1.2, 'cres', 'flat', { scale: 1.1 }], [1.4, 'hit', 1]], 1.5, single, null, { hpCost: 0.1 }),
  wr_shield_crush: ONE([[0, 'anim', 'SS_Bash', 0.6], [0.0, 'fn', (p) => shieldFlare(p)], [0.1, 'hit', 1, { dullP: 0.25, burst: 1.3 }], [0.4, 'fn', (p) => tint(p, 0xffd040, 0.3)], [0.55, 'anim', 'SS_Bash', 0.6], [0.7, 'hit', 1, { kb: 0.8, dullP: 0.25, burst: 1.8 }], [0.72, 'fn', (p, s, d) => bigBurst(p, d, 1.7)]], 1.4, front2),
  wr_cunning_stab: ONE([[0, 'anim', 'Attack1', 0.45], [0.15, 'jab', 1.0], [0.2, 'hit', 1], [0.5, 'anim', 'Attack1', 0.45], [0.65, 'jab', 1.0], [0.7, 'hit', 1], [1.0, 'anim', 'Attack1', 0.45], [1.15, 'jab', 1.1], [1.2, 'hit', 1], [1.4, 'anim', 'Attack1', 0.45], [1.55, 'jab', 1.2], [1.6, 'hit', 1, { burst: 1.3 }]], 1.9, single),
  wr_daring_berserker: ONE([[0, 'anim', 'Skill', 0.6], [0.05, 'cres', 'low', { scale: 0.5, sound: false }], [0.2, 'cres', 'ellipse', { scale: 0.7 }], [0.3, 'hit', 1], [0.55, 'anim', 'Attack3', 0.5], [0.7, 'cres', 'high'], [0.8, 'hit', 1], [1.2, 'anim', 'Skill', 0.6], [1.45, 'cres', 'ellipse', { scale: 0.75 }], [1.5, 'hit', 1], [1.7, 'cres', 'high', { flip: true }], [1.8, 'hit', 1, { burst: 1.3 }]], 2.1, single, null, { hpCost: 0.1 }),

  // ---- Row 6: two-handed sword (not cast in the clip; same white/yellow crescent language)
  wr_maddening: skill({ dur: 1.4, reach: 1.2 * CH, shape: front2, cres: { color: 0xfff6d0, color2: 0xffb040 }, steps: [[0, 'anim', 'GS_Attack2', 0.6], [0.3, 'cres', 'flat', { scale: 1.1 }], [0.4, 'hit', 1], [0.6, 'anim', 'GS_Attack3', 0.8], [0.95, 'cres', 'vertical', { scale: 1.2 }], [1.05, 'hit', 1]] }),
  wr_charge_swing: skill({ dur: 1.2, reach: 1.2 * CH, shape: front2, cres: { color: 0xfff6d0, color2: 0xffb040 }, steps: [[0, 'anim', 'GS_Attack3', 0.8], [0.45, 'cres', 'vertical', { scale: 1.3 }], [0.55, 'hit', 1, { kb: 0.5 }], [0.6, 'streak', 0xffd060]] }),
  wr_triple_swing: skill({ dur: 1.8, reach: 1.2 * CH, shape: front2, cres: { color: 0xfff6d0, color2: 0xffb040 }, steps: [[0, 'anim', 'GS_Attack1', 0.5], [0.3, 'cres', 'flat'], [0.35, 'hit', 1], [0.55, 'anim', 'GS_Attack2', 0.5], [0.85, 'cres', 'flat', { flip: true }], [0.9, 'hit', 1], [1.1, 'anim', 'GS_Attack3', 0.7], [1.45, 'cres', 'vertical', { scale: 1.2 }], [1.5, 'hit', 1]] }),
  wr_dare_devil: skill({ dur: 1.6, reach: 1.2 * CH, hpCost: 0.1, shape: { type: 'pierce', len: 4 * CH, n: 3 }, cres: { color: 0xfff6d0, color2: 0xff7020 }, steps: [[0, 'anim', 'GS_Leap', 1.0], [0.55, 'cres', 'vertical', { scale: 1.3 }], [0.6, 'hit', 1, { burst: 1.4 }], [0.65, 'streak', 0xff9a40], [0.95, 'cres', 'flat', { scale: 1.2 }], [1.05, 'hit', 1]] }),

  // ---- Row 8: dual axe
  wr_down_cross: DUAL([[0, 'anim', 'GS_Attack3', 0.8], [0.12, 'cres', 'vertical', { color2: 0x9a60ff }], [0.2, 'hit', 1, { burst: 1.2 }], [0.2, 'fn', (p, s, d) => downCross(p, d)]], 0.8, single),
  wr_double_twist: DUAL([[0, 'anim', 'GS_Attack1', 0.5], [0.1, 'cres', 'high'], [0.2, 'hit', 1, { bleedP: 0.25, stunP: 0.2, stunT: 2 }], [0.3, 'fn', (p, s, d) => bladeWave(p, d, { vertical: false, scale: 1.1, color: 0xfff8d0, color2: 0xffe080 })], [0.7, 'anim', 'GS_Attack2', 0.5], [0.8, 'cres', 'high', { flip: true }], [0.95, 'hit', 1, { bleedP: 0.25, stunP: 0.2, stunT: 2 }], [0.95, 'fn', (p, s, d) => bladeWave(p, d, { vertical: false })]], 1.2, single),
  wr_axis_quiver: DUAL([[0, 'anim', 'GS_Attack3', 0.9], [0.0, 'fn', (p) => p.fx.glow.burst(p.position.clone().setY(p.position.y + 2), 12, { speed: 2, life: 0.4, size: 0.3, color: new THREE.Color(0x80c0ff), drag: 2 })], [0.45, 'cres', 'vertical', { scale: 1.1 }], [0.55, 'fn', (p, s, d) => axisQuiver(p, d)], [0.6, 'hit', 1, { stunP: 0.5, stunT: 5, burst: 1.2 }]], 1.2, { type: 'front', r: 6.5, n: 8 }),
  wr_dual_counter: DUAL([[0, 'anim', 'GS_Attack2', 0.5], [0.05, 'cres', 'high'], [0.1, 'hit', 1], [0.2, 'fn', (p, s, d) => bladeWave(p, d)], [0.5, 'anim', 'GS_Attack1', 0.5], [0.65, 'cres', 'flat'], [0.75, 'hit', 1], [0.95, 'anim', 'GS_Spin', 0.5], [1.0, 'fn', (p) => blueRing(p, 0.2)], [1.15, 'fn', (p, s, d) => bladeWave(p, d, { scale: 1.2 })], [1.2, 'hit', 1, { burst: 1.2 }]], 1.4, front2),
  wr_crisis_rush: DUAL([[0, 'fn', (p) => tint(p, 0x4a8cff, 1.3)], [0, 'anim', 'GS_Spin', 0.5], [0.15, 'fn', (p) => blueRing(p, 1.0)], [0.4, 'cres', 'flat', { scale: 1.1 }], [0.45, 'hit', 1], [0.55, 'fn', (p) => blueRing(p, 1.0)], [0.65, 'hit', 1], [0.85, 'anim', 'GS_Attack3', 0.6], [1.0, 'fn', (p) => blueRing(p, 1, true)], [1.1, 'fn', (p, s, d) => bladeWave(p, d, { scale: 1.3 })], [1.1, 'hit', 1], [1.2, 'hit', 1, { burst: 1.3 }], [1.3, 'streak', 0xffffff]], 1.5, front2, null, { hpCost: 0.1 }),
  wr_sudden_twist: DUAL([[0, 'anim', 'GS_Spin', 0.5], [0.0, 'fn', (p) => blueRing(p, 0.2)], [0.15, 'fn', (p, s, d) => bladeWave(p, d, { scale: 1.2 })], [0.2, 'hit', 1, { bleedP: 0.2, stunP: 0.15, stunT: 2 }], [0.35, 'anim', 'GS_Attack3', 0.6], [0.45, 'cres', 'vertical'], [0.55, 'fn', (p, s, d) => bladeWave(p, d)], [0.6, 'hit', 1, { bleedP: 0.2 }], [1.0, 'anim', 'GS_Attack3', 0.6], [1.1, 'fn', (p) => blueRing(p, 1, true)], [1.3, 'fn', (p, s, d) => bladeWave(p, d, { vertical: false, scale: 1.4 })], [1.35, 'hit', 1, { bleedP: 0.2, burst: 1.3 }]], 1.6, single),
  wr_deadly_counter: DUAL([[0, 'anim', 'GS_Spin', 0.5], [0, 'fn', (p) => blueRing(p, 0.2)], [0.2, 'fn', (p, s, d) => bladeWave(p, d)], [0.2, 'hit', 1], [0.5, 'fn', (p) => blueRing(p, 1.0)], [0.6, 'cres', 'flat'], [0.65, 'hit', 1], [0.85, 'anim', 'GS_Spin', 0.5], [0.9, 'fn', (p) => blueRing(p, 0.2)], [1.05, 'hit', 1], [1.25, 'anim', 'GS_Attack3', 0.6], [1.35, 'cres', 'high'], [1.55, 'fn', (p, s, d) => bladeWave(p, d, { vertical: false, scale: 1.5 })], [1.6, 'hit', 1, { burst: 1.3 }]], 1.8, front2),
  wr_crutial_rush: DUAL([[0, 'fn', (p) => tint(p, 0x8a60ff, 1.6)], [0, 'anim', 'GS_Spin', 0.5], [0.1, 'fn', (p) => blueRing(p, 1.0)], [0.35, 'hit', 1], [0.45, 'fn', (p, s, d) => bladeWave(p, d, { vertical: false, scale: 1.3 })], [0.5, 'hit', 1], [0.8, 'fn', (p) => p.fx.sparks.burst(p.position.clone().setY(p.position.y + 2.1), 12, { speed: 3, life: 0.3, size: 0.25, color: new THREE.Color(0x80c0ff) })], [0.8, 'anim', 'GS_Attack3', 0.5], [0.9, 'cres', 'vertical'], [0.95, 'hit', 1], [1.05, 'anim', 'GS_Attack1', 0.45], [1.15, 'cres', 'flat'], [1.2, 'hit', 1], [1.4, 'jab', 1.6], [1.55, 'hit', 1, { burst: 1.5 }], [1.55, 'streak', 0xffffff]], 1.7, front2, null, { hpCost: 0.1 }),

  // ---- Row 9: Lv 125 tier
  wr_beast_shout: skill({ dur: 1.3, shape: single, hpCost: 0.1, steps: [[0, 'anim', 'Cast', 1.2], [0.1, 'fn', (p) => shout(p, 0x8a1a20, 0xff6040)]] }),
  wr_vital_increase2: buffSkill(1.2, (p, s) => { vitalIncrease(p); p.addBuff('vital', { id: s.id, name: 'Vital Increase', dur: 900, mods: { hpPct: 37, absorb: 35 }, color: '#d09030' }); }, { buffGroup: 'vital' }),
  wr_destructive_dare_devil: skill({ dur: 2.0, reach: 1.2 * CH, hpCost: 0.09, shape: { type: 'pierce', len: 4.5 * CH, n: 3 }, cres: { color: 0xffffff, color2: 0xff4020 }, steps: [[0, 'anim', 'GS_Attack2', 0.5], [0.3, 'cres', 'flat', { scale: 1.3 }], [0.35, 'hit', 1], [0.55, 'anim', 'GS_Leap', 1.0], [1.05, 'cres', 'vertical', { scale: 1.5 }], [1.1, 'hit', 1, { burst: 1.5 }], [1.1, 'streak', 0xff7030], [1.15, 'fn', (p, s, d) => bigBurst(p, d, 1.6, 0xffc080)], [1.5, 'cres', 'ellipse', { scale: 1.2 }], [1.6, 'hit', 1, { burst: 1.5 }]] }),
  wr_edge_shield: ONE([[0, 'anim', 'SS_Bash', 0.6], [0, 'fn', (p) => shieldFlare(p, 0xffe060)], [0.1, 'hit', 1, { burst: 1.3 }], [0.45, 'anim', 'Attack3', 0.6], [0.6, 'cres', 'ellipse', { scale: 0.8, color: 0xffffe0, color2: 0xffc020 }], [0.7, 'hit', 1], [1.0, 'anim', 'SS_Bash', 0.6], [1.1, 'fn', (p, s, d) => bigBurst(p, d, 1.9, 0xfff0a0)], [1.15, 'hit', 1, { kb: 0.8, burst: 1.8 }]], 1.6, front2),
};

export default WARRIOR;
