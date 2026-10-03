import * as THREE from 'three';
import { assets } from '../core/assets.js';
import { WEAPON_BY_ID, ELEMENT, RARITY } from '../data/weapons.js';
import { KITS, ALL_SKILLS } from '../data/skills.js';
import { Trail } from '../fx/trail.js';
import { AuraController } from '../fx/aura.js';
import { projectile, aimDir, explosion } from './skills/common.js';
import swordSkills from './skills/sword.js';
import greatswordSkills from './skills/greatsword.js';
import spearSkills from './skills/spear.js';
import bowSkills from './skills/bow.js';
import staffSkills from './skills/staff.js';

const HANDLERS = { ...swordSkills, ...greatswordSkills, ...spearSkills, ...bowSkills, ...staffSkills };

const tmpV = new THREE.Vector3();
const tmpV2 = new THREE.Vector3();

export class Player {
  constructor(game) {
    this.game = game;
    this.fx = game.fx;
    const { scene, animations } = assets.clone('hero');
    this.obj = scene;
    this.position = scene.position;
    game.world.scene.add(scene);
    this.mixer = new THREE.AnimationMixer(scene);
    this.actions = {};
    for (const clip of animations) this.actions[clip.name] = this.mixer.clipAction(clip);
    this.current = null;
    this.socket = scene.getObjectByName('weapon_socket') || scene.getObjectByName('hand_R') || scene;
    this.bowSocket = scene.getObjectByName('bow_socket') || scene.getObjectByName('hand_L') || this.socket;
    this.shieldSocket = scene.getObjectByName('shield_socket') || scene.getObjectByName('forearm_L') || null;
    this.kit = KITS.sword;
    this.cls = 'sword';
    this.lift = 0;
    this.barrier = 0;
    this.handR = scene.getObjectByName('hand_R');
    // dynamic bowstring drawn while aiming (the modelled string is static)
    const sg = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3));
    this.bowString = new THREE.Line(sg, new THREE.LineBasicMaterial({ color: 0xfff4d0, transparent: true, opacity: 0.9 }));
    this.bowString.frustumCulled = false;
    this.bowString.visible = false;
    game.world.scene.add(this.bowString);
    this.yaw = 0;
    this.targetYaw = 0;
    this.vel = new THREE.Vector3();
    this.state = 'move';
    this.stateT = 0;
    this.combo = 0;
    this.queued = false;
    this.cooldowns = {};
    for (const s of ALL_SKILLS) this.cooldowns[s.id] = 0;
    this.dashCd = 0;
    this.invuln = 0;
    this.hp = 1; this.mp = 1;
    this.dead = false;
    this.trail = new Trail(game.world.scene);
    this.aura = new AuraController(this.fx);
    this.radius = 0.5;
    this.speed = 7.5;
    this.autoMode = false;
    this.autoTarget = null;
    this.regenT = 0;
    this.play('Idle');
  }

  get mastery() { return this.game.stats.mastery || { skillPct: 0, awaken: new Set() }; }
  skillMult(m) { return m * (1 + (this.mastery.skillPct || 0) / 100); }
  awakened(id) { return this.mastery.awaken && this.mastery.awaken.has(id); }

  // play first available clip; 'idle' / 'run' resolve to the class variant
  resolveAnim(name) {
    if (name === 'idle') return this.actions[this.kit.anims.idle] ? this.kit.anims.idle : 'Idle';
    if (name === 'run') return this.actions[this.kit.anims.run] ? this.kit.anims.run : 'Run';
    return name;
  }
  anim(names, opts = {}) {
    for (const n of names) {
      const r = this.resolveAnim(n);
      if (this.actions[r]) { this.play(r, opts); return r; }
    }
    return null;
  }

  // ---------- animation ----------
  play(name, { once = false, dur = null, fade = 0.12, restart = true } = {}) {
    const a = this.actions[name];
    if (!a) return;
    if (this.current === a && !restart) return;
    a.reset();
    a.enabled = true;
    a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    a.clampWhenFinished = once;
    a.timeScale = dur ? a.getClip().duration / dur : 1;
    a.setEffectiveWeight(1);
    if (this.current && this.current !== a) a.crossFadeFrom(this.current, fade, false);
    a.play();
    this.current = a;
  }

  // ---------- equipment ----------
  equip(inst) {
    if (this.weapon) { this.weapon.parent && this.weapon.parent.remove(this.weapon); }
    if (this.shield) { this.shield.parent && this.shield.parent.remove(this.shield); this.shield = null; }
    const def = WEAPON_BY_ID[inst.id];
    this.cls = def.cls || 'sword';
    this.kit = KITS[this.cls];
    const { scene } = assets.clone(def.id);
    this.weapon = scene;
    this.weaponDef = def;
    (this.cls === 'bow' ? this.bowSocket : this.socket).add(scene);
    if (this.cls === 'sword' && this.shieldSocket) {
      const ord = RARITY[def.rarity].order;
      const key = ord >= 4 ? 'shield_aegis' : ord >= 2 ? 'shield_knight' : 'shield_iron';
      if (assets.has(key)) { this.shield = assets.clone(key).scene; this.shieldSocket.add(this.shield); }
    }
    this.tipNode = scene.getObjectByName('tip');
    this.baseNode = scene.getObjectByName('base');
    if (!this.tipNode || !this.baseNode) {
      const box = new THREE.Box3().setFromObject(scene);
      const sz = box.getSize(new THREE.Vector3());
      this.tipNode = new THREE.Object3D(); this.tipNode.position.set(0, sz.y || 1, 0);
      this.baseNode = new THREE.Object3D(); this.baseNode.position.set(0, (sz.y || 1) * 0.2, 0);
      scene.add(this.tipNode, this.baseNode);
    }
    const el = ELEMENT[def.element];
    this.elColor = el.color; this.elColor2 = el.color2;
    this.trail.setColor(el.color, el.color2);
    this.plus = inst.plus;
    this.aura.apply(scene, inst.plus, this.obj);
    const len = this.tipNode.position.length();
    this.reach = this.kit.ranged ? 0 : THREE.MathUtils.clamp(len * 0.9, 0, 1.6) * (1 + ((this.game.stats.mastery && this.game.stats.mastery.reach) || 0) / 100);
    if (this.state === 'move') this.anim(['idle'], { fade: 0.2 });
  }

  refreshAura(plus) { this.plus = plus; this.aura.apply(this.weapon, plus, this.obj); }

  tipWorld(out) { return this.tipNode.getWorldPosition(out); }
  baseWorld(out) { return this.baseNode.getWorldPosition(out); }
  forward(out = new THREE.Vector3()) { return out.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)); }

  // ---------- update ----------
  update(dt, input, camYaw) {
    const g = this.game;
    const st = g.stats;
    this.stateT += dt;
    for (const k in this.cooldowns) this.cooldowns[k] = Math.max(0, this.cooldowns[k] - dt);
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.invuln = Math.max(0, this.invuln - dt);

    // regen
    this.regenT += dt;
    if (this.regenT > 1) {
      this.regenT = 0;
      if (!this.dead) {
        this.mp = Math.min(st.maxMp, this.mp + (st.maxMp * 0.035 + 2) * (1 + (this.mastery.mpRegen || 0) / 100));
        const inCombat = g.time - (this.lastHurt || -99) < 6;
        this.hp = Math.min(st.maxHp, this.hp + st.maxHp * (inCombat ? 0.004 : g.zoneSafe ? 0.08 : 0.02));
      }
    }

    if (this.dead) { this.mixer.update(dt); return; }

    // movement intent
    let mx = input.move.x, my = input.move.y;
    const auto = this.autoMode && Math.hypot(mx, my) < 0.1;
    const holdAttack = input.enabled && (input.mouseDown || input.isDown('attack') || input.isDown('j'));
    let wantAttack = input.wasPressed('mouse0') || input.wasPressed('j') || holdAttack;
    let wantSkill = null;
    this.kit.skills.forEach((s, i) => { if (input.wasPressed(s.key) || input.wasPressed('skill_' + i)) wantSkill = s; });
    const wantDash = input.wasPressed(' ') || input.wasPressed('dash') || input.wasPressed('shift');

    const fwdX = -Math.sin(camYaw), fwdZ = -Math.cos(camYaw);
    let dirX = fwdX * my + (-fwdZ) * mx;
    let dirZ = fwdZ * my + (fwdX) * mx;

    if (auto) {
      const r = this.autoThink();
      if (r) { dirX = r.dirX; dirZ = r.dirZ; wantAttack = wantAttack || r.attack; wantSkill = wantSkill || r.skill; }
    }
    const moving = Math.hypot(dirX, dirZ) > 0.05;

    // state machine
    if (wantDash && this.dashCd <= 0 && this.state !== 'dash' && !(this.state === 'skill' && this.skillLock)) {
      this.startDash(moving ? Math.atan2(dirX, dirZ) : (this.kit.dash === 'backflip' ? this.yaw + Math.PI : this.yaw));
    } else if (wantSkill && (this.state === 'move' || (this.state === 'attack' && this.stateT > this.atk.hit))) {
      this.tryCast(wantSkill);
    } else if (wantAttack) {
      if (this.state === 'move') this.startAttack(0);
      else if (this.state === 'attack' && this.stateT > this.atkDur * 0.35) this.queued = true;
    }

    const spd = this.speed * (1 + (this.mastery.movePct || 0) / 100) * (this.state === 'skill' && this.skillMove ? this.skillMove : 1);
    if (this.state === 'move' || (this.state === 'skill' && this.skillMove)) {
      if (moving) {
        this.vel.set(dirX, 0, dirZ).normalize().multiplyScalar(spd);
        if (this.state === 'move') this.targetYaw = Math.atan2(dirX, dirZ);
        if (this.state === 'move') this.anim(['run'], { restart: false, fade: 0.15 });
      } else {
        this.vel.multiplyScalar(Math.pow(0.0001, dt));
        if (this.state === 'move') this.anim(['idle'], { restart: false, fade: 0.2 });
      }
    } else if (this.state === 'attack') {
      this.vel.multiplyScalar(Math.pow(0.001, dt));
      this.updateAttack(dt);
    } else if (this.state === 'dash') {
      this.updateDash(dt);
    } else if (this.state === 'hit') {
      this.vel.multiplyScalar(Math.pow(0.001, dt));
      if (this.stateT > 0.3) this.toMove();
    }
    if (this.state === 'skill') this.updateSkill(dt);

    // integrate
    this.position.x += this.vel.x * dt;
    this.position.z += this.vel.z * dt;
    g.world.colliders.resolve(this.position, this.radius);
    this.position.y = g.world.heightAt(this.position.x, this.position.z) + this.lift;
    // barrier timer
    if (this.barrierT > 0) { this.barrierT -= dt; if (this.barrierT <= 0 || this.barrier <= 0) { this.barrier = 0; this.barrierT = 0; if (this.barrierFx) { this.barrierFx.end(); this.barrierFx = null; } } }

    // rotation
    let dy = this.targetYaw - this.yaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    this.yaw += dy * Math.min(1, dt * (this.state === 'move' ? 14 : 22));
    this.obj.rotation.y = this.yaw;

    this.mixer.update(dt);
    this.obj.updateMatrixWorld(true);
    const tip = this.tipWorld(tmpV), base = this.baseWorld(tmpV2);
    this.trail.update(dt, base, tip);
    this.aura.update(dt, base, tip);
    this.updateBowString(tip, base);
  }

  updateBowString(tip, base) {
    const cur = this.current && this.current.getClip().name;
    const drawing = this.cls === 'bow' && this.handR && (cur === 'BW_Aim' || cur === 'BW_Up' || (cur === 'BW_Shoot' && this.current.time < this.current.getClip().duration * 0.6));
    this.bowString.visible = !!drawing;
    if (!drawing) return;
    const hand = this.handR.getWorldPosition(new THREE.Vector3());
    const a = this.bowString.geometry.attributes.position;
    a.setXYZ(0, tip.x, tip.y, tip.z); a.setXYZ(1, hand.x, hand.y, hand.z); a.setXYZ(2, base.x, base.y, base.z);
    a.needsUpdate = true;
  }

  toMove() { this.state = 'move'; this.stateT = 0; this.trail.active = false; this.skillMove = 0; this.skillLock = false; this.lift = 0; }

  faceNearest(maxDist = 7) {
    const m = this.game.combat.nearest(this.position, maxDist);
    if (m) this.targetYaw = Math.atan2(m.position.x - this.position.x, m.position.z - this.position.z);
    return m;
  }

  // ---------- basic attacks ----------
  startAttack(i) {
    const g = this.game;
    const atks = this.kit.attacks;
    this.state = 'attack'; this.stateT = 0;
    this.combo = i % atks.length; this.queued = false;
    this.atk = atks[this.combo];
    this.atkDur = this.atk.dur / (g.stats.spd || 1);
    this.hitDone = false; this.slashDone = false;
    this.faceNearest(this.kit.ranged ? this.atk.range : 7);
    this.yaw = this.targetYaw;
    this.anim([this.atk.anim, this.atk.fb || 'Attack1'], { once: true, dur: this.atkDur, fade: 0.06 });
    this.trail.active = !this.kit.ranged;
    this.vel.copy(this.forward()).multiplyScalar(this.atk.push);
  }

  updateAttack() {
    const a = this.atk, g = this.game;
    const hitT = a.hit * this.atkDur / a.dur;
    if (a.type === 'melee' && !this.hitDone && this.stateT >= hitT * 0.6 && !this.slashDone) {
      this.slashDone = true;
      g.audio.play(a.sfx);
      const s = a.slash;
      g.fx.slash(this.position, this.yaw, { color: this.elColor, color2: this.elColor2, radius: (s.radius || 2.5) + this.reach * 0.6, width: s.width || 1.4, angle: s.angle, tilt: s.tilt, flip: s.flip, duration: 0.2, y: 1.05 });
    }
    if (!this.hitDone && this.stateT >= hitT) {
      this.hitDone = true;
      this['hit_' + a.type](a);
    }
    if (this.stateT >= this.atkDur * 0.92 || (this.queued && this.stateT >= this.atkDur * 0.6)) {
      if (this.queued) this.startAttack(this.combo + 1);
      else this.toMove();
    }
  }

  hit_melee(a) {
    const g = this.game;
    g.combat.inArc(this.position, this.yaw, a.range + this.reach, a.angle, (m) => {
      g.combat.playerHit(m, a.mult, { color: this.elColor, knock: a.heavy ? 3 : 1, from: this.position, heavy: a.heavy });
    });
    if (a.heavy) {
      const p = this.position.clone().add(this.forward().multiplyScalar(2.2));
      p.y = g.world.heightAt(p.x, p.z);
      g.fx.shockwave(p, { color: this.elColor, radius: a.quake ? 4.5 : 3.5, duration: 0.45 });
      g.fx.debris(p, { count: a.quake ? 22 : 12, speed: 7 });
      g.fx.scorch(p, a.quake ? 2.6 : 1.8, this.elColor, 3);
      g.engine.ripple(p.clone().setY(p.y + 0.5), a.quake ? 0.9 : 0.6, 1.4, 0.25);
      g.fx.glow.burst(p.clone().setY(p.y + 0.3), 30, { speed: 7, up: 3, life: 0.5, size: 0.4, color: new THREE.Color(this.elColor2), color1: new THREE.Color(this.elColor), drag: 2.5 });
      g.engine.shake(a.quake ? 0.9 : 0.6);
      if (a.quake) g.fx.spikes(p, { color: this.elColor, count: 5, radius: 1.6, height: 1.6, duration: 0.9, ice: false });
    }
  }

  hit_thrust(a) {
    const g = this.game;
    const from = this.position.clone(); from.y += 1.15;
    g.audio.play(a.sfx);
    g.fx.drill(from, this.forward(), { length: a.range + this.reach, radius: a.heavy ? 1.1 : 0.6, color: this.elColor, color2: this.elColor2, duration: a.heavy ? 0.35 : 0.22 });
    const fwd = this.forward();
    for (const m of g.combat.monsters) {
      if (m.dead) continue;
      const dx = m.position.x - this.position.x, dz = m.position.z - this.position.z;
      const t = dx * fwd.x + dz * fwd.z;
      if (t < 0 || t > a.range + this.reach + m.tpl.radius) continue;
      if (Math.hypot(dx - fwd.x * t, dz - fwd.z * t) > 1.1 + m.tpl.radius) continue;
      g.combat.playerHit(m, a.mult, { color: this.elColor, knock: a.heavy ? 4 : 1.5, from: this.position, heavy: a.heavy });
    }
    if (a.heavy) { g.engine.ripple(from.clone().add(fwd.clone().multiplyScalar(3)), 0.6, 1.5, 0.25); g.engine.shake(0.5); }
  }

  hit_arrow(a) {
    const g = this.game;
    const from = this.position.clone(); from.y += 1.35; from.add(this.forward().multiplyScalar(0.6));
    const { dir, target } = aimDir(this, from, a.range);
    let n = a.count || 1;
    if (Math.random() * 100 < (this.mastery.multishot || 0)) n++;
    for (let i = 0; i < n; i++) {
      const ang = (i - (n - 1) / 2) * 0.12;
      const d = new THREE.Vector3(dir.x * Math.cos(ang) - dir.z * Math.sin(ang), dir.y, dir.z * Math.cos(ang) + dir.x * Math.sin(ang));
      projectile(this, { from: from.clone(), dir: d, speed: 50, range: a.range + 4, radius: 0.7, mult: a.mult, kind: 'arrow', size: a.heavy ? 1.3 : 1, homing: i === 0 && n === 1 ? target : null, heavy: a.heavy });
    }
    g.audio.play('swing', { pitch: 1.5 });
  }

  // staff combo finisher: billowing flame breath cone
  hit_breath(a) {
    const g = this.game, fx = this.fx;
    const from = this.tipNode.getWorldPosition(new THREE.Vector3());
    const fwd = this.forward().clone();
    const c1 = new THREE.Color(this.elColor), c2 = new THREE.Color(this.elColor2);
    fx.magicCircle(this.position, { color: 0xffc040, radius: 1.6, duration: 0.7, style: 1, seed: 127, rot: 5 });
    g.audio.play('fire');
    let ticks = 0;
    fx.timed(0.5, () => {
      for (let i = 0; i < 5; i++) {
        const spread = (Math.random() - 0.5) * 0.6;
        const d = new THREE.Vector3(fwd.x * Math.cos(spread) - fwd.z * Math.sin(spread), -0.05 + (Math.random() - 0.5) * 0.12, fwd.z * Math.cos(spread) + fwd.x * Math.sin(spread));
        const sp = 14 + Math.random() * 6;
        fx.cloud.emit(from.x, from.y, from.z, { vx: d.x * sp, vy: d.y * sp + 0.5, vz: d.z * sp, life: 0.65, size: 0.6, size1: 3.6, color: i % 2 ? c2 : c1, color1: c1, alpha: 1, alpha1: 0, drag: 1.6, rotV: (Math.random() - 0.5) * 3 });
        if (i % 2 === 0) fx.fire.emit(from.x, from.y, from.z, { vx: d.x * sp, vy: d.y * sp, vz: d.z * sp, life: 0.55, size: 0.5, size1: 2.6, color: c1, alpha: 1, alpha1: 0.3, drag: 1.6 });
      }
    });
    for (let k = 0; k < 4; k++) setTimeout(() => {
      g.combat.inArc(this.position, this.yaw, a.range, 0.9, (m) => { g.combat.playerHit(m, a.mult, { color: this.elColor, knock: 0.6, from: this.position, noFx: true }); if (k === 0) fx.burning(m, { color: this.elColor, duration: 1.5, height: m.tpl.height }); });
    }, k * 110);
  }

  hit_bolt(a) {
    const g = this.game;
    const from = this.tipNode.getWorldPosition(new THREE.Vector3());
    const { dir, target } = aimDir(this, from, a.range);
    projectile(this, {
      from, dir, speed: a.big ? 26 : 32, range: a.range + 4, radius: 0.8, kind: 'orb', size: a.big ? 1.8 : 1.1, homing: target,
      mult: a.big ? 0 : a.mult,
      onEnd: a.big ? (at) => explosion(this, at, { radius: 2.8, mult: a.mult, big: false, opts: { knock: 1.5 } }) : null,
    });
    g.audio.play('fire');
  }

  // ---------- dash ----------
  startDash(yaw) {
    const style = this.kit.dash;
    this.state = 'dash'; this.stateT = 0;
    this.dashCd = 0.9;
    this.invuln = 0.4;
    this.ghostT = 0;
    this.dashStyle = style;
    this.game.audio.play('dash');
    if (style === 'blink') {
      // instant teleport with particle bursts
      const c1 = new THREE.Color(this.elColor), c2 = new THREE.Color(this.elColor2);
      const from = this.position.clone();
      this.fx.afterimage(this.obj, this.elColor, 0.5);
      this.fx.glow.burst(from.clone().setY(from.y + 1), 40, { speed: 5, life: 0.5, size: 0.4, color: c2, color1: c1, drag: 2 });
      this.yaw = this.targetYaw = yaw;
      this.position.add(this.forward().multiplyScalar(8));
      this.game.world.colliders.resolve(this.position, this.radius);
      this.position.y = this.game.world.heightAt(this.position.x, this.position.z);
      this.fx.glow.burst(this.position.clone().setY(this.position.y + 1), 40, { speed: 5, life: 0.5, size: 0.4, color: c2, color1: c1, drag: 2 });
      this.fx.magicCircle(this.position, { color: this.elColor, radius: 1.4, duration: 0.5, style: 1, seed: 141, rot: 5 });
      this.game.engine.ripple(this.position.clone().setY(this.position.y + 1), 0.5, 1.5, 0.2);
      this.vel.set(0, 0, 0);
      return;
    }
    if (style === 'backflip') {
      // keep facing, hop backwards
      const back = yaw;
      this.vel.set(Math.sin(back), 0, Math.cos(back)).multiplyScalar(17);
      this.anim(['BW_Backflip', 'Dash', 'Run'], { once: true, dur: 0.45, fade: 0.05 });
      return;
    }
    this.yaw = this.targetYaw = yaw;
    this.vel.copy(this.forward()).multiplyScalar(24);
    this.anim(['Dash', 'Run'], { once: true, dur: 0.3, fade: 0.05 });
    this.fx.debris(this.position, { count: 6, speed: 3, size: 0.25 });
  }
  updateDash(dt) {
    if (this.dashStyle === 'blink') { if (this.stateT > 0.12) this.toMove(); return; }
    if (this.dashStyle === 'backflip') this.lift = Math.sin(Math.min(1, this.stateT / 0.42) * Math.PI) * 1.2;
    this.ghostT -= dt;
    if (this.ghostT <= 0) { this.ghostT = 0.04; this.fx.afterimage(this.obj, this.elColor, 0.35); }
    if (this.stateT > (this.dashStyle === 'backflip' ? 0.42 : 0.26)) { this.vel.multiplyScalar(0.25); this.toMove(); }
  }

  // ---------- damage ----------
  takeDamage(amount, { from = null, source = '' } = {}) {
    if (this.dead || this.invuln > 0) return 0;
    const g = this.game;
    const st = g.stats;
    let dmg = Math.max(1, Math.round(amount * (1 - st.def / (st.def + 300)) * (0.9 + Math.random() * 0.2)));
    if (Math.random() * 100 < (this.mastery.block || 0)) {
      dmg = Math.round(dmg * 0.3);
      g.dmgText.spawn(this.position.clone().setY(this.position.y + 2.2), 'BLOCK', 'block');
      this.fx.flare(this.position.clone().setY(this.position.y + 1.2).add(this.forward().multiplyScalar(0.6)), new THREE.Color(this.elColor2), 2, 0.15);
      g.audio.play('anvil', { pitch: 1.4 });
    }
    if (this.barrier > 0) {
      const ab = Math.min(this.barrier, dmg);
      this.barrier -= ab; dmg -= ab;
      if (this.barrierFx) this.barrierFx.hit();
      if (dmg <= 0) { g.dmgText.spawn(this.position.clone().setY(this.position.y + 2.2), 'ABSORB', 'block'); return 0; }
    }
    this.hp -= dmg;
    this.lastHurt = g.time;
    g.dmgText.spawn(this.position.clone().setY(this.position.y + 2), '-' + dmg, 'hurt');
    g.audio.play('hurt');
    g.ui.hurtFlash();
    if (this.hp <= 0) { this.hp = 0; this.die(); return dmg; }
    if (amount > st.maxHp * 0.12 && this.state !== 'skill') {
      this.state = 'hit'; this.stateT = 0; this.trail.active = false;
      this.play('Hit', { once: true, dur: 0.3, fade: 0.05 });
      if (from) { const d = tmpV.subVectors(this.position, from).setY(0).normalize(); this.vel.copy(d).multiplyScalar(6); }
    }
    return dmg;
  }

  die() {
    this.dead = true;
    this.state = 'dead';
    this.trail.active = false;
    this.lift = 0;
    this.play('Die', { once: true, fade: 0.1 });
    this.game.onPlayerDeath();
  }

  respawn(pos) {
    this.dead = false;
    this.hp = this.game.stats.maxHp; this.mp = this.game.stats.maxMp;
    this.position.copy(pos);
    this.toMove();
    this.anim(['idle']);
    this.invuln = 2;
  }

  // ---------- auto battle ----------
  autoThink() {
    const g = this.game;
    let t = this.autoTarget;
    if (!t || t.dead || t.position.distanceTo(this.position) > 45) {
      t = this.autoTarget = g.combat.nearest(this.position, 45, (m) => !m.tpl.boss || g.allowAutoBoss);
    }
    if (!t) return null;
    const dx = t.position.x - this.position.x, dz = t.position.z - this.position.z;
    const d = Math.hypot(dx, dz) - t.tpl.radius;
    const res = { dirX: 0, dirZ: 0, attack: false, skill: null };
    const engage = this.kit.ranged ? 16 : 2.4 + this.reach * 0.5;
    if (d > engage) { res.dirX = dx; res.dirZ = dz; }
    else {
      res.attack = true;
      const st = g.stats;
      // use skills smartly
      const near = g.combat.monsters.filter((m) => !m.dead && m.position.distanceTo(this.position) < 9).length;
      for (const s of [...this.kit.skills].reverse()) {
        if (this.cooldowns[s.id] > 0 || this.mp < this.mpCost(s)) continue;
        if (s.ult && !(t.tpl.boss || t.maxHp > st.atk * 25 || near >= 4)) continue;
        if (['gs_whirl', 'sp_twirl', 'ss_aegis'].includes(s.id) && near < 2) continue;
        res.skill = s; break;
      }
    }
    return res;
  }

  // ---------- skills ----------
  mpCost(s) { return Math.round(s.mp * (1 - (this.mastery.mpCost || 0) / 100)); }

  tryCast(s) {
    const g = this.game;
    if (this.cooldowns[s.id] > 0) return;
    const cost = this.mpCost(s);
    if (this.mp < cost) { g.ui.toast('MP ไม่พอ!', 'warn'); return; }
    this.mp -= cost;
    this.cooldowns[s.id] = s.cd * (1 - (this.mastery.cdr || 0) / 100);
    this.state = 'skill'; this.stateT = 0;
    this.skill = s; this.skillData = {};
    this.skillMove = 0; this.skillLock = false;
    this.trail.active = !this.kit.ranged;
    this.faceNearest(14);
    this.yaw = this.targetYaw;
    this.vel.set(0, 0, 0);
    const h = HANDLERS[s.id];
    if (h && h.start) h.start(this, s, this.skillData);
    g.ui.skillFlash(s);
  }

  updateSkill(dt) {
    const h = HANDLERS[this.skill.id];
    if (h && h.update) h.update(this, dt, this.skill, this.skillData);
    else if (this.stateT > 0.5) this.toMove();
  }
}
