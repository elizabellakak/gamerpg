import * as THREE from 'three';
import { assets } from '../core/assets.js';
import { MONSTERS, scaledStats } from '../data/monsters.js';

const tmp = new THREE.Vector3();
const STUN_COL = new THREE.Color(1, 0.9, 0.3);
const SLOW_COL = new THREE.Color(0.5, 0.85, 1);
let barTex = null;
function getBarTex() {
  if (barTex) return barTex;
  const c = document.createElement('canvas'); c.width = 64; c.height = 8;
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 64, 8);
  barTex = new THREE.CanvasTexture(c);
  return barTex;
}

export class Monster {
  constructor(game, id, level, pos, zone) {
    this.game = game;
    this.id = id;
    this.tpl = MONSTERS[id];
    this.level = level;
    this.zone = zone;
    const st = scaledStats(this.tpl, level);
    this.maxHp = st.maxHp; this.hp = st.maxHp; this.atk = st.atk; this.def = st.def; this.xp = st.xp;
    const { scene, animations } = assets.clone(this.tpl.model);
    this.obj = scene;
    scene.scale.setScalar(this.tpl.scale);
    this.position = scene.position;
    this.position.copy(pos);
    this.home = pos.clone();
    this.mats = [];
    scene.traverse((o) => {
      if (o.isMesh) {
        o.material = o.material.clone();
        if (o.material.emissive) this.mats.push({ m: o.material, e: o.material.emissive.clone(), i: o.material.emissiveIntensity });
      }
    });
    game.world.scene.add(scene);
    this.mixer = new THREE.AnimationMixer(scene);
    this.actions = {};
    for (const c of animations) this.actions[c.name] = this.mixer.clipAction(c);
    this.play('Idle');
    this.state = 'idle'; this.stateT = Math.random() * 3;
    this.yaw = Math.random() * Math.PI * 2;
    this.vel = new THREE.Vector3();
    this.atkCd = 1 + Math.random();
    this.flash = 0;
    this.dead = false;
    this.aggro = false;
    // hp bar
    const mk = (color, depth) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: getBarTex(), color, depthTest: depth, transparent: true, toneMapped: false }));
      s.center.set(0, 0.5); s.renderOrder = 20;
      return s;
    };
    this.barW = this.tpl.boss ? 0 : Math.max(1.2, this.tpl.radius * 1.6);
    this.barBg = mk(0x1a0d0d, true); this.barFg = mk(0xff3b3b, true);
    this.barBg.scale.set(this.barW, 0.13, 1); this.barFg.scale.set(this.barW, 0.1, 1);
    this.barBg.visible = this.barFg.visible = false;
    game.world.scene.add(this.barBg, this.barFg);
    this.hitTime = -99;
  }

  play(name, { once = false, dur = null, fade = 0.15 } = {}) {
    let a = this.actions[name];
    if (!a && name === 'Attack2') a = this.actions.Attack;
    if (!a) return;
    if (this.cur === a && !once) return;
    a.reset(); a.enabled = true;
    a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    a.clampWhenFinished = once;
    a.timeScale = dur ? a.getClip().duration / dur : 1;
    if (this.cur && this.cur !== a) a.crossFadeFrom(this.cur, fade, false);
    a.play();
    this.cur = a;
  }

  takeDamage(dmg, { knock = 0, from = null, heavy = false } = {}) {
    this.hp -= dmg;
    this.flash = 0.12;
    this.aggro = true;
    this.hitTime = this.game.time;
    if (from && knock > 0 && !this.tpl.boss) {
      tmp.subVectors(this.position, from).setY(0).normalize();
      const k = knock * (this.id === 'golem' ? 0.3 : 1);
      this.vel.addScaledVector(tmp, k * 4);
    }
    if (this.hp <= 0) { this.hp = 0; this.die(); return; }
    if (heavy && !this.tpl.boss && this.state !== 'attack' && this.id !== 'golem') {
      this.state = 'hit'; this.stateT = 0;
      this.play('Hit', { once: true, dur: 0.35, fade: 0.05 });
    }
  }

  die() {
    this.dead = true;
    this.state = 'dead'; this.stateT = 0;
    this.play('Die', { once: true, fade: 0.08, dur: this.tpl.boss ? 2.5 : 1.0 });
    this.barBg.visible = this.barFg.visible = false;
    this.game.onMonsterKilled(this);
  }

  dispose() {
    const s = this.game.world.scene;
    s.remove(this.obj, this.barBg, this.barFg);
    this.barBg.material.dispose(); this.barFg.material.dispose();
    for (const { m } of this.mats) m.dispose();
  }

  faceTo(p, dt, rate = 8) {
    const ty = Math.atan2(p.x - this.position.x, p.z - this.position.z);
    let d = ty - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    this.yaw += d * Math.min(1, dt * rate);
  }

  update(dt) {
    const g = this.game;
    const player = g.player;
    const distP = Math.hypot(player.position.x - this.position.x, player.position.z - this.position.z);
    const far = distP > 110;
    this.stateT += dt;
    if (this.dead) {
      this.mixer.update(dt);
      if (this.stateT > (this.tpl.boss ? 4 : 1.6)) this.position.y -= dt * (this.tpl.boss ? 1 : 1.5);
      return this.stateT < (this.tpl.boss ? 7 : 3);
    }
    if (far) return true;

    // flash
    if (this.flash > 0) {
      this.flash -= dt;
      const k = Math.max(0, this.flash / 0.12);
      for (const { m, e, i } of this.mats) { m.emissive.copy(e).lerp(new THREE.Color(1, 1, 1), k); m.emissiveIntensity = Math.max(i, k * 1.5); }
    }

    if (this.slow > 0) this.slow -= dt;
    if (this.stun > 0) {
      this.stun -= dt;
      this.vel.multiplyScalar(Math.pow(0.05, dt));
      if (Math.random() < dt * 8) {
        const a = g.time * 6 + Math.random();
        g.fx.sparks.emit(this.position.x + Math.cos(a) * 0.5, this.position.y + this.tpl.height + 0.2, this.position.z + Math.sin(a) * 0.5, 0, 0.3, 0, 0.4, 0.35, STUN_COL, { drag: 1 });
      }
    } else if (this.tpl.boss) this.updateBoss(dt, distP);
    else this.updateNormal(dt, distP);
    if (this.slow > 0) {
      this.vel.multiplyScalar(Math.pow(0.15, dt));
      if (Math.random() < dt * 4) g.fx.glow.emit(this.position.x + (Math.random() - 0.5), this.position.y + Math.random() * this.tpl.height, this.position.z + (Math.random() - 0.5), 0, 0.5, 0, 0.6, 0.3, SLOW_COL, { drag: 1 });
    }

    // integrate
    this.position.addScaledVector(this.vel, dt);
    this.vel.multiplyScalar(Math.pow(0.02, dt));
    g.world.colliders.resolve(this.position, this.tpl.radius * 0.6);
    // keep monsters near their zone
    const z = this.zone;
    const dz = Math.hypot(this.position.x - z.x, this.position.z - z.z);
    if (dz > z.r * 1.3) { this.position.x = z.x + (this.position.x - z.x) / dz * z.r * 1.3; this.position.z = z.z + (this.position.z - z.z) / dz * z.r * 1.3; }
    this.position.y = g.world.heightAt(this.position.x, this.position.z);
    this.obj.rotation.y = this.yaw;
    if (distP < 70) this.mixer.update(dt);

    // hp bar
    const showBar = !this.tpl.boss && (g.time - this.hitTime < 6 || this.hp < this.maxHp) && distP < 40;
    this.barBg.visible = this.barFg.visible = showBar;
    if (showBar) {
      const y = this.position.y + this.tpl.height * this.tpl.scale + 0.35;
      this.barBg.position.set(this.position.x, y, this.position.z);
      this.barFg.position.copy(this.barBg.position);
      // center sprites horizontally
      const camRight = tmp.set(1, 0, 0).applyQuaternion(g.engine.camera.quaternion);
      this.barBg.position.addScaledVector(camRight, -this.barW / 2);
      this.barFg.position.copy(this.barBg.position);
      this.barFg.scale.x = this.barW * (this.hp / this.maxHp);
    }
    return true;
  }

  updateNormal(dt, distP) {
    const g = this.game, player = g.player, tpl = this.tpl;
    this.atkCd -= dt;
    const canSee = !player.dead && (distP < tpl.aggro || (this.aggro && distP < tpl.aggro * 2.2));
    switch (this.state) {
      case 'idle':
        this.play('Idle');
        if (canSee) { this.state = 'chase'; break; }
        if (this.stateT > 3 + Math.random() * 3) {
          this.state = 'wander'; this.stateT = 0;
          const a = Math.random() * Math.PI * 2, r = Math.random() * 8;
          this.wanderTo = new THREE.Vector3(this.home.x + Math.cos(a) * r, 0, this.home.z + Math.sin(a) * r);
        }
        break;
      case 'wander': {
        if (canSee) { this.state = 'chase'; break; }
        this.play('Move');
        const d = Math.hypot(this.wanderTo.x - this.position.x, this.wanderTo.z - this.position.z);
        this.faceTo(this.wanderTo, dt, 4);
        if (d < 0.5 || this.stateT > 6) { this.state = 'idle'; this.stateT = 0; break; }
        this.vel.x = Math.sin(this.yaw) * tpl.speed * 0.35; this.vel.z = Math.cos(this.yaw) * tpl.speed * 0.35;
        break;
      }
      case 'chase':
        if (!canSee) { this.state = 'idle'; this.stateT = 0; this.aggro = false; break; }
        this.faceTo(player.position, dt, 8);
        if (distP < tpl.range + tpl.radius * 0.5) {
          this.vel.multiplyScalar(0.5);
          this.play('Idle');
          if (this.atkCd <= 0) this.startAttack();
        } else {
          this.play('Move');
          this.vel.x = Math.sin(this.yaw) * tpl.speed; this.vel.z = Math.cos(this.yaw) * tpl.speed;
        }
        break;
      case 'attack': {
        this.faceTo(player.position, dt, 3);
        const wind = this.id === 'golem' ? 1.0 : 0.45;
        if (!this.atkHit && this.stateT > wind) {
          this.atkHit = true;
          if (this.id === 'golem') {
            const p = this.slamPos;
            g.fx.shockwave(p, { color: 0x6fe7ff, radius: 4, duration: 0.5 });
            g.fx.debris(p, { count: 20, speed: 9 });
            g.fx.scorch(p, 2.6, 0x4adfff, 4);
            g.engine.ripple(p.clone().setY(p.y + 0.5), 0.8, 1.2, 0.3);
            g.engine.shake(0.5);
            g.audio.play('boom');
            if (Math.hypot(player.position.x - p.x, player.position.z - p.z) < 3.8) player.takeDamage(this.atk * 1.4, { from: this.position });
          } else {
            const fwd = tmp.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
            const dx = player.position.x - this.position.x, dz = player.position.z - this.position.z;
            const d = Math.hypot(dx, dz);
            if (d < tpl.range + tpl.radius + 0.4 && (dx * fwd.x + dz * fwd.z) / (d || 1) > 0.2) player.takeDamage(this.atk, { from: this.position });
            g.fx.slash(this.position, this.yaw, { color: 0xff5040, color2: 0xffb0a0, radius: tpl.range + 0.4, width: 0.6, angle: Math.PI * 0.6, duration: 0.15, y: tpl.height * 0.5 });
          }
        }
        if (this.stateT > wind + 0.5) { this.state = 'chase'; this.stateT = 0; }
        break;
      }
      case 'hit':
        if (this.stateT > 0.35) { this.state = 'chase'; this.stateT = 0; }
        break;
    }
  }

  startAttack() {
    const g = this.game;
    this.state = 'attack'; this.stateT = 0; this.atkHit = false;
    this.atkCd = this.tpl.atkCd * (0.8 + Math.random() * 0.4);
    const wind = this.id === 'golem' ? 1.0 : 0.45;
    this.play('Attack', { once: true, dur: wind + 0.4, fade: 0.08 });
    if (this.id === 'golem') {
      const p = this.position.clone().add(new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)).multiplyScalar(2.2));
      this.slamPos = p;
      g.fx.telegraph(p, { radius: 3.8, duration: wind });
    }
  }

  // ---------------- BOSS ----------------
  updateBoss(dt, distP) {
    const g = this.game, player = g.player, tpl = this.tpl;
    const engaged = !player.dead && (distP < tpl.aggro || (this.aggro && distP < 70));
    if (engaged && !this.engaged) { this.engaged = true; g.onBossEngage(this); this.atkCd = 1.5; }
    if (!engaged && this.engaged) { this.engaged = false; g.onBossDisengage(this); this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.5); }
    if (!engaged) {
      this.play('Idle');
      const dh = Math.hypot(this.home.x - this.position.x, this.home.z - this.position.z);
      if (dh > 2) { this.faceTo(this.home, dt, 3); this.vel.x = Math.sin(this.yaw) * tpl.speed; this.vel.z = Math.cos(this.yaw) * tpl.speed; this.play('Move'); }
      return;
    }
    const enraged = this.hp < this.maxHp * 0.5;
    if (enraged && !this.enraged) {
      this.enraged = true;
      g.audio.play('roar'); g.engine.shake(1.5);
      g.ui.bossBanner('มังกรคลั่ง!! พลังโจมตีเพิ่มขึ้น', true);
      g.fx.shockwave(this.position, { color: 0xff3a10, radius: 16, duration: 1.0 });
      g.fx.pillar(this.position, { color: 0xff3a10, color2: 0xffb040, radius: 4, height: 30, duration: 1.5 });
    }
    this.atkCd -= dt * (enraged ? 1.35 : 1);
    if (this.state === 'pattern') { this.updatePattern(dt); return; }
    this.faceTo(player.position, dt, 3);
    if (distP > tpl.range + 1) {
      this.play('Move');
      this.vel.x = Math.sin(this.yaw) * tpl.speed; this.vel.z = Math.cos(this.yaw) * tpl.speed;
    } else this.play('Idle');
    if (this.atkCd <= 0) {
      const choices = distP < 8 ? ['bite', 'tail', 'breath', 'bite'] : ['breath', 'meteor', 'charge'];
      if (enraged) choices.push('meteor');
      this.startPattern(choices[Math.floor(Math.random() * choices.length)]);
    }
  }

  startPattern(name) {
    const g = this.game, player = g.player;
    this.state = 'pattern'; this.stateT = 0; this.pattern = name; this.pd = {};
    this.vel.set(0, 0, 0);
    const fwdYaw = Math.atan2(player.position.x - this.position.x, player.position.z - this.position.z);
    this.yaw = fwdYaw;
    const fwd = new THREE.Vector3(Math.sin(fwdYaw), 0, Math.cos(fwdYaw));
    switch (name) {
      case 'bite':
        this.play('Attack', { once: true, dur: 1.3 });
        g.fx.telegraph(this.position.clone().addScaledVector(fwd, 1), { radius: 8, angle: Math.PI * 0.5, yaw: fwdYaw, duration: 0.9, onDone: () => this.coneHit(fwd, 8.5, Math.PI * 0.5, 1.3) });
        this.pd.end = 1.6;
        break;
      case 'tail':
        this.play('Attack', { once: true, dur: 1.6 });
        g.fx.telegraph(this.position, { radius: 8.5, duration: 1.1, onDone: () => {
          g.fx.shockwave(this.position, { color: 0xff6030, radius: 9, duration: 0.5 });
          g.fx.debris(this.position, { count: 30, speed: 12 });
          g.fx.scorch(this.position, 8, 0xff5a10, 5);
          g.engine.ripple(this.position.clone().setY(this.position.y + 1), 1.4, 1.0, 0.5);
          g.engine.shake(1); g.audio.play('boom');
          if (Math.hypot(player.position.x - this.position.x, player.position.z - this.position.z) < 8.8) player.takeDamage(this.atk * 1.2, { from: this.position });
        } });
        this.pd.end = 1.9;
        break;
      case 'breath':
        this.play('Attack2', { once: true, dur: 3.0 });
        g.audio.play('roar');
        g.fx.telegraph(this.position.clone().addScaledVector(fwd, 1.5), { radius: 15, angle: Math.PI / 3, yaw: fwdYaw, duration: 1.2 });
        this.pd.fwd = fwd; this.pd.end = 3.0;
        break;
      case 'meteor': {
        this.play('Attack2', { once: true, dur: 1.2 });
        g.audio.play('roar');
        g.ui.bossBanner('ฝนอุกกาบาตโลกันตร์!');
        const n = this.enraged ? 12 : 8;
        for (let i = 0; i < n; i++) {
          const delay = i * 0.18;
          setTimeout(() => {
            if (this.dead) return;
            const p = player.position.clone();
            if (i > 0) { const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 9; p.x += Math.cos(a) * r; p.z += Math.sin(a) * r; }
            this.meteor(p);
          }, delay * 1000);
        }
        this.pd.end = 2.0;
        break;
      }
      case 'charge':
        this.play('Move', {});
        g.fx.telegraph(this.position.clone().addScaledVector(fwd, 9), { radius: 9.5, angle: 0.55, yaw: fwdYaw, duration: 0.9 });
        this.pd.fwd = fwd; this.pd.end = 1.8;
        break;
    }
  }

  coneHit(fwd, range, angle, mult) {
    const g = this.game, p = g.player;
    const dx = p.position.x - this.position.x, dz = p.position.z - this.position.z;
    const d = Math.hypot(dx, dz);
    const a = Math.acos(Math.max(-1, Math.min(1, (dx * fwd.x + dz * fwd.z) / (d || 1))));
    g.fx.slash(this.position, Math.atan2(fwd.x, fwd.z), { color: 0xff4020, color2: 0xffc080, radius: range, width: 2.5, angle, duration: 0.18, y: 1.5 });
    g.engine.shake(0.8); g.audio.play('swingHeavy');
    if (d < range && a < angle / 2 + 0.15) p.takeDamage(this.atk * mult, { from: this.position });
  }

  meteor(p) {
    const g = this.game;
    p.y = g.world.heightAt(p.x, p.z);
    const R = 3.2;
    g.fx.telegraph(p, { radius: R, duration: 1.3 });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffa040, toneMapped: false }));
    ball.scale.setScalar(1.4);
    const start = p.clone().add(new THREE.Vector3(8, 34, 8));
    ball.position.copy(start);
    g.world.scene.add(ball);
    g.audio.play('meteor');
    const fireC = new THREE.Color(0xff6a10), fireC2 = new THREE.Color(0xffe080);
    g.fx.timed(1.3, (k) => {
      ball.position.lerpVectors(start, p, k * k);
      for (let i = 0; i < 3; i++) g.fx.fire.emit(ball.position.x + (Math.random() - 0.5), ball.position.y + (Math.random() - 0.5), ball.position.z + (Math.random() - 0.5), { vx: 0, vy: 2, vz: 0, life: 0.6, size: 1.6, size1: 0.6, color: fireC, alpha: 1, alpha1: 0.2, drag: 1 });
      if (Math.random() < 0.5) g.fx.smoke.emit(ball.position.x, ball.position.y, ball.position.z, { vx: 0, vy: 1, vz: 0, life: 1.2, size: 1.2, size1: 3, color: new THREE.Color(0.3, 0.27, 0.25), alpha: 0.5, alpha1: 0, drag: 1 });
    }, () => {
      g.world.scene.remove(ball); ball.geometry.dispose(); ball.material.dispose();
      g.fx.shockwave(p, { color: 0xff6a10, radius: R + 1, duration: 0.5 });
      g.fx.explode(p.clone().setY(p.y + 0.6), { color: fireC, color2: fireC2, radius: R, power: 1 });
      g.fx.scorch(p, R, 0xff5a10, 6);
      g.engine.ripple(p.clone().setY(p.y + 0.5), 0.9, 1.2, 0.3);
      g.fx.light(p.clone().setY(p.y + 2), 0xff6a10, 60, 0.4, 16);
      g.engine.shake(0.6);
      g.audio.play('boom');
      const pl = g.player;
      if (Math.hypot(pl.position.x - p.x, pl.position.z - p.z) < R) pl.takeDamage(this.atk * 0.9, { from: p });
    });
  }

  updatePattern(dt) {
    const g = this.game, pd = this.pd, player = g.player;
    if (this.pattern === 'breath' && this.stateT > 1.2 && this.stateT < 2.8) {
      // fire breath stream
      const fwd = pd.fwd;
      const head = this.position.clone().addScaledVector(fwd, 3.5); head.y += 2.6;
      const c1 = new THREE.Color(0xffe080), c2 = new THREE.Color(0xff3a08);
      for (let i = 0; i < 14; i++) {
        const spread = (Math.random() - 0.5) * 0.9;
        const dir = new THREE.Vector3(fwd.x * Math.cos(spread) - fwd.z * Math.sin(spread), -0.12 + (Math.random() - 0.5) * 0.15, fwd.z * Math.cos(spread) + fwd.x * Math.sin(spread));
        const sp = 16 + Math.random() * 8;
        if (i % 2 === 0) g.fx.fire.emit(head.x, head.y, head.z, { vx: dir.x * sp, vy: dir.y * sp, vz: dir.z * sp, life: 0.8, size: 0.5, size1: 3.2, color: c2, alpha: 1, alpha1: 0.4, drag: 1.2, rotV: (Math.random() - 0.5) * 3 });
        else g.fx.glow.emit(head.x, head.y, head.z, dir.x * sp, dir.y * sp, dir.z * sp, 0.6, 0.4, c1, { color1: c2, size1: 1.6, drag: 1.2 });
      }
      if (Math.random() < 0.4) { const q = head.clone().addScaledVector(fwd, 8 + Math.random() * 6); q.y = g.world.heightAt(q.x, q.z); g.fx.smokePuff(q, { count: 1, size: 1.5, size1: 4, life: 1.6, alpha: 0.45, rise: 1.5 }); }
      if (!pd.sfx) { pd.sfx = true; g.audio.play('fire'); }
      pd.tick = (pd.tick || 0) - dt;
      if (pd.tick <= 0) {
        pd.tick = 0.3;
        g.engine.shake(0.25);
        const dx = player.position.x - this.position.x, dz = player.position.z - this.position.z;
        const d = Math.hypot(dx, dz);
        const a = Math.acos(Math.max(-1, Math.min(1, (dx * fwd.x + dz * fwd.z) / (d || 1))));
        if (d < 15.5 && a < Math.PI / 6 + 0.1) player.takeDamage(this.atk * 0.35, { from: this.position });
      }
    }
    if (this.pattern === 'charge' && this.stateT > 0.9 && this.stateT < 1.5) {
      this.vel.copy(pd.fwd).multiplyScalar(18);
      if (!pd.hit && Math.hypot(player.position.x - this.position.x, player.position.z - this.position.z) < 4) {
        pd.hit = true; player.takeDamage(this.atk * 1.1, { from: this.position });
      }
      if (Math.random() < 0.5) g.fx.debris(this.position, { count: 3, speed: 5 });
    }
    if (this.stateT > pd.end) { this.state = 'chase'; this.stateT = 0; this.atkCd = this.tpl.atkCd * (0.7 + Math.random() * 0.6); }
  }
}
