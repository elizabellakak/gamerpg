import * as THREE from 'three';
import { assets } from '../core/assets.js';
import { WEAPON_BY_ID, ELEMENT } from '../data/weapons.js';
import { SKILLS } from '../data/skills.js';
import { Trail } from '../fx/trail.js';
import { AuraController } from '../fx/aura.js';
import { arcGeometry, slashMaterial, ghostMaterial } from '../fx/materials.js';

const tmpV = new THREE.Vector3();
const tmpV2 = new THREE.Vector3();

const ATTACKS = [
  { anim: 'Attack1', dur: 0.46, hit: 0.17, mult: 1.0, range: 3.2, angle: Math.PI * 0.9, slash: { flip: false, tilt: -0.25, angle: Math.PI * 1.15 }, sfx: 'swing', push: 2.5 },
  { anim: 'Attack2', dur: 0.46, hit: 0.16, mult: 1.1, range: 3.2, angle: Math.PI * 0.9, slash: { flip: true, tilt: 0.3, angle: Math.PI * 1.15 }, sfx: 'swing', push: 2.5 },
  { anim: 'Attack3', dur: 0.68, hit: 0.3, mult: 1.9, range: 3.6, angle: Math.PI * 0.7, slash: { flip: false, tilt: Math.PI / 2 - 0.15, angle: Math.PI * 0.95, radius: 3.0 }, sfx: 'swingHeavy', push: 4, heavy: true },
];

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
    this.yaw = 0;
    this.targetYaw = 0;
    this.vel = new THREE.Vector3();
    this.state = 'move';
    this.stateT = 0;
    this.combo = 0;
    this.queued = false;
    this.cooldowns = {};
    for (const s of SKILLS) this.cooldowns[s.id] = 0;
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
    const def = WEAPON_BY_ID[inst.id];
    const { scene } = assets.clone(def.id);
    this.weapon = scene;
    this.weaponDef = def;
    this.socket.add(scene);
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
    // longer weapons reach further
    const len = this.tipNode.position.length();
    this.reach = THREE.MathUtils.clamp(len * 0.9, 0, 1.2);
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
        this.mp = Math.min(st.maxMp, this.mp + st.maxMp * 0.035 + 2);
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
    for (const s of SKILLS) if (input.wasPressed(s.key) || input.wasPressed('skill_' + s.id)) wantSkill = s;
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
      this.startDash(moving ? Math.atan2(dirX, dirZ) : this.yaw);
    } else if (wantSkill && (this.state === 'move' || (this.state === 'attack' && this.stateT > this.atk.hit))) {
      this.tryCast(wantSkill);
    } else if (wantAttack) {
      if (this.state === 'move') this.startAttack(0);
      else if (this.state === 'attack' && this.stateT > this.atkDur * 0.35) this.queued = true;
    }

    const spd = this.speed * (this.state === 'skill' && this.skillMove ? this.skillMove : 1);
    if (this.state === 'move' || (this.state === 'skill' && this.skillMove)) {
      if (moving) {
        this.vel.set(dirX, 0, dirZ).normalize().multiplyScalar(spd);
        if (this.state === 'move') this.targetYaw = Math.atan2(dirX, dirZ);
        if (this.state === 'move') this.play('Run', { restart: false, fade: 0.15 });
      } else {
        this.vel.multiplyScalar(Math.pow(0.0001, dt));
        if (this.state === 'move') this.play('Idle', { restart: false, fade: 0.2 });
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
    this.position.y = g.world.heightAt(this.position.x, this.position.z);

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
  }

  toMove() { this.state = 'move'; this.stateT = 0; this.trail.active = false; this.skillMove = 0; this.skillLock = false; }

  faceNearest(maxDist = 7) {
    const m = this.game.combat.nearest(this.position, maxDist);
    if (m) this.targetYaw = Math.atan2(m.position.x - this.position.x, m.position.z - this.position.z);
    return m;
  }

  // ---------- basic attacks ----------
  startAttack(i) {
    const g = this.game;
    this.state = 'attack'; this.stateT = 0;
    this.combo = i; this.queued = false;
    this.atk = ATTACKS[i];
    this.atkDur = this.atk.dur / (g.stats.spd || 1);
    this.hitDone = false;
    this.faceNearest(7);
    this.yaw = this.targetYaw;
    this.play(this.atk.anim, { once: true, dur: this.atkDur, fade: 0.06 });
    this.trail.active = true;
    // small lunge
    this.vel.copy(this.forward()).multiplyScalar(this.atk.push);
  }

  updateAttack() {
    const a = this.atk, g = this.game;
    const hitT = a.hit * this.atkDur / a.dur;
    if (!this.hitDone && this.stateT >= hitT * 0.6 && !this.slashDone) {
      this.slashDone = true;
      g.audio.play(a.sfx);
      const s = a.slash;
      g.fx.slash(this.position, this.yaw, { color: this.elColor, color2: this.elColor2, radius: (s.radius || 2.5) + this.reach * 0.6, width: 1.4, angle: s.angle, tilt: s.tilt, flip: s.flip, duration: 0.2, y: 1.05 });
    }
    if (!this.hitDone && this.stateT >= hitT) {
      this.hitDone = true;
      this.slashDone = false;
      const range = a.range + this.reach;
      g.combat.inArc(this.position, this.yaw, range, a.angle, (m) => {
        g.combat.playerHit(m, a.mult, { color: this.elColor, knock: a.heavy ? 3 : 1, from: this.position, heavy: a.heavy });
      });
      if (a.heavy) {
        const p = this.position.clone().add(this.forward().multiplyScalar(2.2));
        p.y = g.world.heightAt(p.x, p.z);
        g.fx.shockwave(p, { color: this.elColor, radius: 3.5, duration: 0.45 });
        g.fx.debris(p, { count: 12, speed: 7 });
        g.fx.glow.burst(p.clone().setY(p.y + 0.3), 30, { speed: 7, up: 3, life: 0.5, size: 0.4, color: new THREE.Color(this.elColor2), color1: new THREE.Color(this.elColor), drag: 2.5, flat: false });
        g.engine.shake(0.6);
      }
    }
    if (this.stateT >= this.atkDur * 0.92 || (this.queued && this.stateT >= this.atkDur * 0.6)) {
      if (this.queued) this.startAttack((this.combo + 1) % ATTACKS.length);
      else this.toMove();
    }
  }

  // ---------- dash ----------
  startDash(yaw) {
    this.state = 'dash'; this.stateT = 0;
    this.yaw = this.targetYaw = yaw;
    this.dashCd = 0.9;
    this.invuln = 0.35;
    this.ghostT = 0;
    this.vel.copy(this.forward()).multiplyScalar(24);
    this.play(this.actions.Dash ? 'Dash' : 'Run', { once: !!this.actions.Dash, dur: 0.3, fade: 0.05 });
    this.game.audio.play('dash');
    this.fx.debris(this.position, { count: 6, speed: 3, size: 0.25 });
  }
  updateDash(dt) {
    this.ghostT -= dt;
    if (this.ghostT <= 0) { this.ghostT = 0.04; this.fx.afterimage(this.obj, this.elColor, 0.35); }
    if (this.stateT > 0.26) { this.vel.multiplyScalar(0.25); this.toMove(); }
  }

  // ---------- damage ----------
  takeDamage(amount, { from = null, source = '' } = {}) {
    if (this.dead || this.invuln > 0) return 0;
    const g = this.game;
    const st = g.stats;
    const dmg = Math.max(1, Math.round(amount * (1 - st.def / (st.def + 300)) * (0.9 + Math.random() * 0.2)));
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
    this.play('Die', { once: true, fade: 0.1 });
    this.game.onPlayerDeath();
  }

  respawn(pos) {
    this.dead = false;
    this.hp = this.game.stats.maxHp; this.mp = this.game.stats.maxMp;
    this.position.copy(pos);
    this.toMove();
    this.play('Idle');
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
    if (d > 2.4 + this.reach * 0.5) { res.dirX = dx; res.dirZ = dz; }
    else {
      res.attack = true;
      const st = g.stats;
      // use skills smartly
      const near = g.combat.monsters.filter((m) => !m.dead && m.position.distanceTo(this.position) < 9).length;
      for (const s of [...SKILLS].reverse()) {
        if (this.cooldowns[s.id] > 0 || this.mp < s.mp) continue;
        if (s.ult && !(t.tpl.boss || t.maxHp > st.atk * 25 || near >= 4)) continue;
        if (s.id === 'tempest' && near < 2) continue;
        res.skill = s; break;
      }
    }
    return res;
  }

  // ---------- skills ----------
  tryCast(s) {
    const g = this.game;
    if (this.cooldowns[s.id] > 0) return;
    if (this.mp < s.mp) { g.ui.toast('MP ไม่พอ!', 'warn'); return; }
    this.mp -= s.mp;
    this.cooldowns[s.id] = s.cd;
    this.state = 'skill'; this.stateT = 0;
    this.skill = s; this.skillData = {};
    this.skillMove = 0; this.skillLock = false;
    this.trail.active = true;
    this.faceNearest(14);
    this.yaw = this.targetYaw;
    this.vel.set(0, 0, 0);
    const fn = this['start_' + s.id];
    if (fn) fn.call(this, s);
    g.ui.skillFlash(s);
  }

  updateSkill(dt) {
    const fn = this['update_' + this.skill.id];
    if (fn) fn.call(this, dt, this.skill, this.skillData);
  }

  // 1) Crescent wave
  start_crescent() {
    this.play('Attack1', { once: true, dur: 0.42, fade: 0.05 });
    this.game.audio.play('slashWave');
  }
  update_crescent(dt, s, d) {
    const g = this.game;
    if (!d.fired && this.stateT > 0.14) {
      d.fired = true;
      const yaw = this.yaw;
      const fwd = this.forward();
      g.fx.slash(this.position, yaw, { color: this.elColor, color2: this.elColor2, radius: 3, width: 1.6, angle: Math.PI * 1.2, tilt: -0.2, duration: 0.18, y: 1.1 });
      const count = this.plus >= 10 ? 3 : 1;
      for (let i = 0; i < count; i++) {
        const off = (i - (count - 1) / 2) * 0.32;
        this.spawnCrescent(yaw + off, fwd, s, i === 0 ? 1 : 0.7);
      }
    }
    if (this.stateT > 0.42) this.toMove();
  }
  spawnCrescent(yaw, fwd, s, scale) {
    const g = this.game;
    const geo = arcGeometry(1.2 * scale, 3.2 * scale, Math.PI * 0.95, 40);
    const mat = slashMaterial(this.elColor, this.elColor2);
    mat.uniforms.uProgress.value = 1; mat.uniforms.uTrail.value = 12;
    const root = new THREE.Object3D();
    root.position.copy(this.position); root.position.y += 1.1;
    root.rotation.order = 'YXZ'; root.rotation.set(0, yaw, -0.15);
    const mesh = new THREE.Mesh(geo, mat); mesh.position.z = -1.6 * scale; mesh.frustumCulled = false; mesh.renderOrder = 6;
    root.add(mesh);
    const core = new THREE.Mesh(geo, mat); core.scale.set(0.8, 1, 0.92); core.position.z = -1.4 * scale; root.add(core);
    g.world.scene.add(root);
    const dir = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const hit = new Set();
    const c1 = new THREE.Color(this.elColor), c2 = new THREE.Color(this.elColor2);
    const dur = 0.75;
    g.fx.timed(dur, (k, dt) => {
      root.position.addScaledVector(dir, dt * 26);
      root.position.y = g.world.heightAt(root.position.x, root.position.z) + 1.1;
      mat.uniforms.uFade.value = k < 0.8 ? 1 : 1 - (k - 0.8) / 0.2;
      for (let i = 0; i < 4; i++) {
        const side = (Math.random() - 0.5) * 5 * scale;
        g.fx.glow.emit(root.position.x + dir.z * side, root.position.y + (Math.random() - 0.5) * 0.8, root.position.z - dir.x * side,
          -dir.x * 3, 0.5, -dir.z * 3, 0.4, 0.35, c2, { color1: c1, drag: 2 });
      }
      g.combat.inCircle(root.position, 2.6 * scale, (m) => {
        if (hit.has(m)) return;
        hit.add(m);
        g.combat.playerHit(m, s.mult * scale, { color: this.elColor, knock: 2, from: this.position, heavy: true });
      });
    }, () => { g.world.scene.remove(root); geo.dispose(); mat.dispose(); });
  }

  // 2) Blade tempest
  start_tempest() {
    this.skillMove = 0.75;
    this.play('Skill', { fade: 0.05, dur: 0.6 });
    const g = this.game;
    g.fx.tornado(this.obj, { color: this.elColor, color2: this.elColor2, radius: 3.4, height: 3.4, duration: 2.6 });
    g.fx.magicCircle(this.position, { color: this.elColor, radius: 4, duration: 2.6, follow: this.obj, style: 1, seed: 5, rot: 2.5, opacity: 0.8 });
    g.audio.play('whirl');
  }
  update_tempest(dt, s, d) {
    const g = this.game;
    d.tick = (d.tick || 0) - dt;
    d.ring = (d.ring || 0) - dt;
    // keep spinning anim
    if (this.current !== this.actions.Skill) this.play('Skill', { dur: 0.6 });
    this.yaw += dt * 0; // anim handles spin
    if (d.ring <= 0) {
      d.ring = 0.3;
      g.fx.slash(this.position, Math.random() * Math.PI * 2, { color: this.elColor, color2: this.elColor2, radius: 3.4, width: 1.2, angle: Math.PI * 2, tilt: (Math.random() - 0.5) * 0.4, duration: 0.25, y: 0.6 + Math.random() * 1.6 });
      g.audio.play('swing', { pitch: 1.2 });
    }
    if (d.tick <= 0) {
      d.tick = 0.25;
      g.combat.inCircle(this.position, 3.8, (m) => g.combat.playerHit(m, s.mult, { color: this.elColor, knock: 0.6, from: this.position }));
    }
    if (this.stateT > 2.5) this.toMove();
  }

  // 3) Thunder wrath
  start_thunder(s) {
    const g = this.game;
    this.skillLock = true;
    this.play(this.actions.Cast ? 'Cast' : 'Attack3', { once: true, dur: 0.9, fade: 0.08 });
    const target = g.combat.nearest(this.position, 14);
    const c = target ? target.position.clone() : this.position.clone().add(this.forward().multiplyScalar(7));
    c.y = g.world.heightAt(c.x, c.z);
    this.skillData.center = c;
    g.fx.magicCircle(c, { color: 0x8a7bff, radius: 7, duration: 2.1, style: 2, seed: 11, rot: 1.2 });
    g.fx.magicCircle(c.clone().setY(c.y + 14), { color: 0xb7a8ff, radius: 5, duration: 2.0, style: 0, seed: 4, rot: -2, y: 0 });
    g.fx.magicCircle(this.position, { color: this.elColor, radius: 2.2, duration: 1.0, style: 1, seed: 2, rot: 3 });
    g.audio.play('charge');
  }
  update_thunder(dt, s, d) {
    const g = this.game;
    d.t = (d.t || 0);
    if (this.stateT > 0.45 && this.stateT < 1.75) {
      d.acc = (d.acc || 0) + dt;
      while (d.acc > 0.11) {
        d.acc -= 0.11;
        const c = d.center;
        // prefer enemies
        const enemies = g.combat.monsters.filter((m) => !m.dead && m.position.distanceTo(c) < 7.5);
        let p;
        if (enemies.length && Math.random() < 0.7) { p = enemies[Math.floor(Math.random() * enemies.length)].position.clone(); p.x += (Math.random() - 0.5); p.z += (Math.random() - 0.5); }
        else { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 6.5; p = new THREE.Vector3(c.x + Math.cos(a) * r, 0, c.z + Math.sin(a) * r); }
        p.y = g.world.heightAt(p.x, p.z);
        const top = p.clone().add(new THREE.Vector3((Math.random() - 0.5) * 4, 15, (Math.random() - 0.5) * 4));
        g.fx.lightning(top, p, { color: 0x8f7bff, core: 0xf0ecff, width: 0.09, duration: 0.3, segments: 14, jitter: 1.4, branches: 3 });
        g.fx.shockwave(p, { color: 0x9b8bff, radius: 2.4, duration: 0.35 });
        g.fx.sparks.burst(p.clone().setY(p.y + 0.3), 20, { speed: 10, up: 4, life: 0.35, size: 0.6, color: new THREE.Color(0xffffff), color1: new THREE.Color(0x7b6bff), gravity: 12, drag: 2 });
        g.fx.glow.burst(p.clone().setY(p.y + 0.5), 16, { speed: 4, life: 0.5, size: 0.7, color: new THREE.Color(0xb0a0ff), drag: 3 });
        g.fx.light(p.clone().setY(p.y + 2), 0xa090ff, 60, 0.25, 18);
        g.engine.shake(0.35);
        g.audio.play('thunder');
        g.combat.inCircle(p, 2.4, (m) => g.combat.playerHit(m, s.mult * 0.45, { color: 0x9b8bff, knock: 0.5, from: p, noFx: true }));
      }
    }
    if (this.stateT > 0.95 && this.skillLock) { this.skillLock = false; }
    if (this.stateT > 1.0 && this.state === 'skill' && this.stateT < 1.05) this.play('Idle', { fade: 0.25 });
    if (this.stateT > 1.8) this.toMove();
    // allow moving after cast
    if (this.stateT > 1.0) this.skillMove = 1;
  }

  // 4) Heaven's Judgement (ultimate)
  start_judgement() {
    const g = this.game;
    this.skillLock = true;
    this.invuln = 3.2;
    this.play(this.actions.Cast ? 'Cast' : 'Attack3', { once: true, dur: 1.0, fade: 0.08 });
    const target = g.combat.nearest(this.position, 16);
    const c = target ? target.position.clone() : this.position.clone().add(this.forward().multiplyScalar(8));
    c.y = g.world.heightAt(c.x, c.z);
    this.skillData.center = c;
    const col = this.elColor, col2 = this.elColor2;
    g.cinematic(2.9, c);
    g.engine.doFlash(0.35, col2);
    g.audio.play('charge'); g.audio.play('choir');
    g.fx.magicCircle(this.position, { color: col, radius: 3.2, duration: 1.4, style: 2, seed: 9, rot: 3 });
    g.fx.pillar(this.position, { color: col, color2: col2, radius: 1.3, height: 16, duration: 1.3, speed: 3 });
    g.fx.magicCircle(c, { color: col, radius: 11, duration: 3.0, style: 0, seed: 21, rot: 0.8 });
    g.fx.magicCircle(c, { color: col2, radius: 7, duration: 3.0, style: 2, seed: 22, rot: -1.4, y: 0.1 });
    g.fx.magicCircle(c.clone().setY(c.y + 26), { color: col2, radius: 9, duration: 2.0, style: 1, seed: 23, rot: 1.5, y: 0 });
    this.skillData.stage = 0;
  }
  update_judgement(dt, s, d) {
    const g = this.game;
    const c = d.center;
    const col = this.elColor, col2 = this.elColor2;
    const c1 = new THREE.Color(col), c2 = new THREE.Color(col2);
    // converging particles
    if (this.stateT < 1.4) {
      for (let i = 0; i < 6; i++) {
        const a = Math.random() * Math.PI * 2, r = 9 + Math.random() * 4;
        const px = c.x + Math.cos(a) * r, pz = c.z + Math.sin(a) * r;
        g.fx.glow.emit(px, c.y + 0.3 + Math.random() * 2, pz, -Math.cos(a) * r * 1.3, 2 + Math.random() * 4, -Math.sin(a) * r * 1.3, 0.75, 0.5, c2, { color1: c1, drag: 0.3 });
      }
      // rising light motes around player
      g.fx.rise(this.position, { color: col2, color1: col, count: 3, radius: 1.6, speed: 6, life: 0.8, size: 0.35 });
    }
    if (d.stage === 0 && this.stateT > 0.95) {
      d.stage = 1;
      // spectral giant weapon
      const { scene } = assets.clone(this.weaponDef.id);
      const mat = ghostMaterial(col2);
      scene.traverse((o) => { if (o.isMesh) { o.material = mat; o.castShadow = false; } });
      const holder = new THREE.Group();
      holder.add(scene);
      scene.rotation.x = Math.PI; // point down
      const S = 9;
      holder.scale.setScalar(S);
      const shell = g.fx.shell(scene, col, col2, { thickness: 0.02, intensity: 1.6, flame: 1.5, rainbow: this.plus >= 15 ? 1 : 0 });
      g.world.scene.add(holder);
      d.sword = holder; d.swordMat = mat; d.swordShell = shell;
      d.swordY = 38;
      holder.position.set(c.x, c.y + d.swordY, c.z);
      g.fx.light(holder.position, col2, 80, 1.2, 40);
    }
    if (d.stage === 1) {
      d.vy = (d.vy || 8) + dt * 120;
      d.swordY -= d.vy * dt;
      const tipOffset = 0; // weapon origin is grip; blade points down so grip is above
      d.sword.position.set(c.x, c.y + Math.max(d.swordY, 4.5) + tipOffset, c.z);
      d.sword.rotation.y += dt * 2;
      g.fx.glow.burst(d.sword.position.clone().setY(d.sword.position.y - 2), 6, { speed: 2, life: 0.5, size: 0.8, color: c2, color1: c1, drag: 1 });
      if (d.swordY <= 4.5) { d.stage = 2; this.judgementImpact(c, s); }
    }
    if (d.stage === 2) {
      d.fade = (d.fade || 0) + dt;
      d.swordMat.uniforms.uOpacity.value = Math.max(0, 1 - d.fade / 1.2);
      d.swordShell.material.uniforms.uIntensity.value = Math.max(0, 1.6 * (1 - d.fade / 1.0));
      if (d.fade > 1.2 && d.sword) { g.world.scene.remove(d.sword); d.swordShell.dispose(); d.swordMat.dispose(); d.sword = null; d.stage = 3; }
    }
    if (this.stateT > 1.05 && this.stateT < 1.1) this.play('Idle', { fade: 0.3 });
    if (this.stateT > 2.6) { if (d.sword) { g.world.scene.remove(d.sword); d.swordShell.dispose(); } this.toMove(); }
  }
  judgementImpact(c, s) {
    const g = this.game;
    const col = this.elColor, col2 = this.elColor2;
    g.engine.doFlash(0.85, 0xffffff);
    g.engine.shake(2.5);
    g.engine.doHitStop(0.12);
    g.engine.pulseAberration(1.5);
    g.audio.play('boom'); g.audio.play('thunder');
    g.fx.shockwave(c, { color: 0xffffff, radius: 14, duration: 0.7, width: 0.2 });
    g.fx.shockwave(c, { color: col, radius: 10, duration: 0.9 });
    g.fx.shockwave(c, { color: col2, radius: 6, duration: 1.1 });
    g.fx.shockwave(c.clone().setY(c.y + 1.5), { color: col2, radius: 8, duration: 0.6, vertical: false });
    g.fx.pillar(c, { color: col, color2: 0xffffff, radius: 3.5, height: 60, duration: 1.6, speed: 4 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const p = new THREE.Vector3(c.x + Math.cos(a) * 7, 0, c.z + Math.sin(a) * 7);
      p.y = g.world.heightAt(p.x, p.z);
      setTimeout(() => g.fx.pillar(p, { color: col, color2: col2, radius: 0.7, height: 18, duration: 1.0, speed: 3 }), i * 40);
      const top = p.clone().setY(p.y + 12);
      g.fx.lightning(c.clone().setY(c.y + 5), top, { color: col, width: 0.06, duration: 0.5, branches: 2 });
    }
    g.fx.sparks.burst(c.clone().setY(c.y + 1), 160, { speed: 26, up: 6, life: 0.7, lifeVar: 0.5, size: 0.9, color: new THREE.Color(0xffffff), color1: new THREE.Color(col), gravity: 10, drag: 1.5 });
    g.fx.glow.burst(c.clone().setY(c.y + 1), 220, { speed: 16, up: 4, life: 1.0, lifeVar: 0.8, size: 1.0, color: new THREE.Color(col2), color1: new THREE.Color(col), drag: 1.8 });
    g.fx.debris(c, { count: 50, speed: 14, size: 0.5 });
    g.fx.light(c.clone().setY(c.y + 3), col2, 160, 1.2, 50);
    g.fx.flare(c.clone().setY(c.y + 2), new THREE.Color(col2), 22, 0.5);
    g.combat.inCircle(c, 11, (m) => g.combat.playerHit(m, s.mult, { color: col, knock: 6, from: c, heavy: true }));
    // after-burst lingering embers
    g.fx.timed(1.5, () => g.fx.rise(c, { color: col2, color1: col, count: 6, radius: 9, speed: 4, life: 1.4, size: 0.4 }));
  }
}
