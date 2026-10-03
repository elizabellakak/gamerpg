import * as THREE from 'three';
import { World } from '../world/world.js';
import { FX } from '../fx/fx.js';
import { Player } from './player.js';
import { Combat } from './combat.js';
import { Spawner } from './spawner.js';
import { Showcase } from '../scenes/showcase.js';
import { DamageText } from '../ui/dmgtext.js';
import { UI } from '../ui/ui.js';
import { audio } from '../core/audio.js';
import { loadState, saveState } from '../core/save.js';
import { playerStats, equippedWeapon, xpToNext, addItem, questEvent } from '../systems/progress.js';
import { ensureSkillState } from '../systems/skills.js';
import { CLASSES } from '../data/weapons.js';
import { LOOT, ZONES } from '../data/monsters.js';
import { ITEMS } from '../data/weapons.js';

export class Game {
  constructor(engine, input) {
    this.engine = engine;
    this.input = input;
    this.audio = audio;
    this.state = ensureSkillState(loadState());
    this.time = 0;
    this.mode = 'world';
    this.cam = { yaw: 0, pitch: 0.34, dist: 8.5, targetDist: 8.5 };
    this.camLook = new THREE.Vector3();
    this.cine = null;
  }

  init() {
    const e = this.engine;
    this.world = new World(e);
    this.world.build();
    this.fx = new FX(this.world.scene, e);
    this.fx.heightAt = this.world.heightAt;
    this.combat = new Combat(this);
    this.stats = playerStats(this.state);
    this.dmgText = new DamageText(document.getElementById('dmg-layer'), e.camera);
    this.ui = new UI(this);
    this.player = new Player(this);
    this.player.position.set(0, 0, 6);
    this.player.yaw = this.player.targetYaw = Math.PI;
    this.player.equip(equippedWeapon(this.state));
    this.player.hp = this.stats.maxHp; this.player.mp = this.stats.maxMp;
    this.spawner = new Spawner(this);
    this.spawner.init();
    this.showcase = new Showcase(e, audio);
    e.setScene(this.world.scene, e.camera);
    e.onResize = (w, h) => { this.showcase.resize(w, h); this.mainCam.aspect = w / h; this.mainCam.updateProjectionMatrix(); };
    this.mainCam = e.camera;
    this.cam.yaw = 0; // camera behind (+z) looking toward -z
    this.ui.build();
    this.ui.refreshAll();
    this.ui.refreshSkills();
    setInterval(() => this.save(), 15000);
    window.addEventListener('beforeunload', () => this.save());
  }

  save() { saveState(this.state); }

  recalcStats() {
    const old = this.stats ? this.stats.cp : 0;
    this.stats = playerStats(this.state);
    if (this.player) {
      this.player.hp = Math.min(this.player.hp, this.stats.maxHp);
      this.player.mp = Math.min(this.player.mp, this.stats.maxMp);
    }
    if (old && this.stats.cp !== old) this.ui.cpChange(old, this.stats.cp);
    this.ui.refreshAll();
  }

  equip(uid) {
    this.state.equipped = uid;
    const w = equippedWeapon(this.state);
    w.isNew = false;
    this.recalcStats();
    this.player.equip(w);
    this.ui.refreshSkills();
    this.fx.starFlash(this.player.position.clone().setY(this.player.position.y + 1.2), new THREE.Color(this.player.elColor2), 2.5, 0.25);
    this.fx.shockwave(this.player.position, { color: this.player.elColor, radius: 3, duration: 0.5 });
    audio.play('success');
    this.save();
  }

  // -------- showcase modes --------
  enterShowcase(mode) {
    this.mode = mode;
    this.showcase.enter(mode);
    this.engine.setScene(this.showcase.scene, this.showcase.camera);
    this.engine.bloom.strength = 0.5;
    this.engine.bloom.threshold = 0.92;
    this.input.enabled = false;
  }
  exitShowcase() {
    this.mode = 'world';
    this.showcase.setWeapon(null);
    this.showcase.clearOrbs();
    this.engine.setScene(this.world.scene, this.mainCam);
    this.dmgText.camera = this.mainCam;
    this.engine.bloom.strength = 0.55;
    this.engine.bloom.threshold = 0.88;
    this.input.enabled = true;
    // re-apply aura of equipped weapon (plus may have changed)
    const w = equippedWeapon(this.state);
    this.recalcStats();
    this.player.equip(w);
    this.ui.refreshSkills();
  }

  cinematic(dur, focus) {
    this.cine = { t: 0, dur, focus: focus.clone() };
  }

  // -------- events --------
  onMonsterKilled(m) {
    const s = this.state;
    s.kills[m.id] = (s.kills[m.id] || 0) + 1;
    const gold = Math.round((m.tpl.gold[0] + Math.random() * (m.tpl.gold[1] - m.tpl.gold[0])) * (1 + (m.level - 1) * 0.12));
    s.gold += gold;
    this.gainXp(m.xp);
    // skill points (SP) from every kill, like SP experience in the reference game
    const sp = Math.round(m.xp * 1.6 + 5);
    s.sp += sp;
    const drops = [];
    for (const [id, chance, a, b] of LOOT[m.id] || []) {
      if (Math.random() < chance) {
        const q = a + Math.floor(Math.random() * (b - a + 1));
        addItem(s, id, q);
        drops.push([id, q]);
      }
    }
    // soul orbs fly into the player
    const p = m.position.clone(); p.y += m.tpl.height * 0.5;
    this.spawnLootOrbs(p, 4 + drops.length * 2, m.tpl.boss);
    this.ui.lootLog(gold, drops, m.xp, sp);
    if (questEvent(s, 'kill', { id: m.id })) this.ui.questReady();
    this.ui.refreshQuest();
    if (m.tpl.boss) {
      this.onBossDisengage(m, true);
      this.ui.bossBanner('ปราบมังกรเพลิงโลกันตร์สำเร็จ!!', false, true);
      audio.play('bigSuccess');
      this.engine.doFlash(0.6, 0xffd070);
      this.fx.pillar(m.position, { color: 0xffb020, color2: 0xffffff, radius: 4, height: 50, duration: 3 });
    }
    if (this.player.autoTarget === m) this.player.autoTarget = null;
    this.ui.refreshAll();
  }

  spawnLootOrbs(from, n, big) {
    const pl = this.player;
    const c1 = new THREE.Color(0xffd86b), c2 = new THREE.Color(0x7dd8ff);
    for (let i = 0; i < n; i++) {
      const vel = new THREE.Vector3((Math.random() - 0.5) * 6, 4 + Math.random() * 4, (Math.random() - 0.5) * 6);
      const p = from.clone();
      const col = i % 3 === 0 ? c2 : c1;
      let t = 0;
      this.fx.add({
        update: (dt) => {
          t += dt;
          const target = pl.position.clone(); target.y += 1.2;
          if (t > 0.35) {
            const d = target.sub(p);
            const l = d.length();
            if (l < 0.6) { audio.play('pickup'); this.fx.glow.burst(pl.position.clone().setY(pl.position.y + 1.2), 4, { speed: 2, life: 0.3, size: 0.4, color: col }); return false; }
            vel.lerp(d.normalize().multiplyScalar(18 + t * 10), Math.min(1, dt * 6));
          } else vel.y -= 12 * dt;
          p.addScaledVector(vel, dt);
          this.fx.glow.emit(p.x, p.y, p.z, 0, 0, 0, 0.3, big ? 0.6 : 0.4, col, { size1: 0 });
          return t < 4;
        },
      });
    }
  }

  gainXp(xp) {
    const s = this.state;
    s.xp += xp;
    let leveled = false;
    while (s.xp >= xpToNext(s.level) && s.level < 60) {
      s.xp -= xpToNext(s.level);
      s.level++;
      leveled = true;
    }
    if (leveled) {
      this.recalcStats();
      this.player.hp = this.stats.maxHp; this.player.mp = this.stats.maxMp;
      const p = this.player.position;
      audio.play('levelup');
      this.fx.pillar(p, { color: 0xffd86b, color2: 0xffffff, radius: 1.4, height: 14, duration: 1.4, speed: 2.5 });
      this.fx.shockwave(p, { color: 0xffd86b, radius: 5, duration: 0.7 });
      this.fx.magicCircle(p, { color: 0xffd86b, radius: 2.6, duration: 1.6, style: 1, seed: 77, rot: 2 });
      this.fx.rise(p, { color: 0xfff2b0, color1: 0xffa020, count: 60, radius: 1.5, speed: 5, life: 1.2, size: 0.35 });
      this.ui.levelUp(s.level);
    }
  }

  onPlayerDeath() {
    this.ui.showDeath();
    audio.play('fail');
    this.engine.grade.uniforms.uDesat.value = 0.8;
  }

  respawn() {
    this.engine.grade.uniforms.uDesat.value = 0;
    this.player.respawn(new THREE.Vector3(0, 0, 6));
    this.onBossDisengage(this.boss);
    this.fx.pillar(this.player.position, { color: 0xffffff, color2: 0x9fd0ff, radius: 1.2, height: 12, duration: 1.2 });
  }

  onBossEngage(m) {
    this.bossActive = m;
    this.ui.showBossBar(m);
    audio.stopBgm(); audio.startBgm('boss');
    audio.play('roar');
    this.engine.shake(1.2);
    this.ui.bossBanner('⚠ ' + m.tpl.name + ' Lv.' + m.level + ' ปรากฏตัว!', true);
  }
  onBossDisengage(m) {
    if (!this.bossActive) return;
    this.bossActive = null;
    this.ui.hideBossBar();
    audio.stopBgm(); audio.startBgm('field');
  }

  warpTo(zoneId) {
    const z = ZONES.find((zz) => zz.id === zoneId);
    if (!z) return;
    const p = this.player.position;
    this.fx.pillar(p, { color: 0x7a5cff, color2: 0x2ef0ff, radius: 1.3, height: 15, duration: 0.8 });
    audio.play('dash');
    let x = z.x, zz = z.z;
    if (z.id === 'town') { x = 0; zz = 6; }
    else { const d = Math.hypot(z.x, z.z); x = z.x - (z.x / d) * z.r * (z.boss ? 1.25 : 0.8); zz = z.z - (z.z / d) * z.r * (z.boss ? 1.25 : 0.8); }
    p.set(x, this.world.heightAt(x, zz), zz);
    this.cam.yaw = Math.atan2(-z.x, -z.z);
    if (z.id === 'town') this.cam.yaw = 0;
    this.player.yaw = this.player.targetYaw = this.cam.yaw + Math.PI;
    this.engine.doFlash(0.6, 0xa090ff);
    setTimeout(() => {
      this.fx.pillar(p, { color: 0x7a5cff, color2: 0x2ef0ff, radius: 1.3, height: 15, duration: 0.9 });
      this.fx.shockwave(p, { color: 0x7a5cff, radius: 4, duration: 0.6 });
    }, 50);
  }

  usePotion(kind) {
    const s = this.state, st = this.stats, pl = this.player;
    const id = kind === 'hp' ? 'potion_hp' : 'potion_mp';
    if (!s.items[id] || pl.dead) return false;
    if (kind === 'hp' && pl.hp >= st.maxHp) return false;
    if (kind === 'mp' && pl.mp >= st.maxMp) return false;
    s.items[id]--;
    if (kind === 'hp') pl.hp = Math.min(st.maxHp, pl.hp + st.maxHp * 0.4);
    else pl.mp = Math.min(st.maxMp, pl.mp + st.maxMp * 0.5);
    const c = kind === 'hp' ? 0xff5a7a : 0x5aa8ff;
    this.fx.rise(pl.position, { color: c, color1: 0xffffff, count: 25, radius: 0.8, speed: 3, life: 0.8, size: 0.3 });
    audio.play('pickup');
    this.ui.refreshAll();
    return true;
  }

  // -------- main loop --------
  update(dt, rawDt) {
    this.time += dt;
    const input = this.input;
    input.update();
    if (this.mode === 'world') this.updateWorld(dt, rawDt);
    else this.showcase.update(rawDt);
    this.ui.update(rawDt);
    input.endFrame();
  }

  updateWorld(dt, rawDt) {
    const input = this.input, pl = this.player;
    // camera input
    this.cam.yaw -= input.camDelta.x * 0.006;
    this.cam.pitch = THREE.MathUtils.clamp(this.cam.pitch + input.camDelta.y * 0.004, 0.12, 1.2);
    this.cam.targetDist = THREE.MathUtils.clamp(this.cam.targetDist + input.wheel * 1.2, 5, 22);
    if (input.wasPressed('h')) this.ui.toggleAuto();
    if (input.wasPressed('q')) this.usePotion('hp');
    if (input.wasPressed('e')) this.usePotion('mp');
    if (input.wasPressed('b') || input.wasPressed('i')) this.ui.openPanel('inventory');
    if (input.wasPressed('m')) this.ui.openPanel('warp');
    if (input.wasPressed('k')) this.ui.openPanel('skills');
    for (let i = 0; i < 4; i++) if (input.wasPressed('f' + (i + 1))) this.ui.hotbarPage(i, true);
    if (input.wasPressed('f') || input.wasPressed('interact')) this.interact();
    if (input.wasPressed('escape')) { if (this.ui.skillWin.el) this.ui.skillWin.close(); else this.ui.closePanels(); }

    pl.update(dt, input, this.cam.yaw);
    // auto potion
    if (this.state.settings.autoPotion && !pl.dead && pl.hp < this.stats.maxHp * 0.3) this.usePotion('hp');
    if (this.state.settings.autoPotion && !pl.dead && pl.mp < this.stats.maxMp * 0.15 && pl.autoMode) this.usePotion('mp');

    this.spawner.update(dt);
    this.world.update(dt, pl.position);
    this.fx.update(dt);
    this.dmgText.update(rawDt);

    // zone tracking
    const z = this.world.zoneAt(pl.position.x, pl.position.z);
    this.zoneSafe = !!(z && z.safe);
    if ((z && z.id) !== this.zoneId) {
      this.zoneId = z && z.id;
      if (z) this.ui.zoneBanner(z);
    }
    // nearby interactable
    let near = null;
    for (const it of this.world.interactables) {
      if (Math.hypot(it.pos.x - pl.position.x, it.pos.z - pl.position.z) < it.radius) near = it;
    }
    this.nearInteract = near;
    this.ui.setInteract(near);

    this.updateCamera(rawDt);
  }

  interact() {
    const it = this.nearInteract;
    if (!it) return;
    if (it.kind === 'enhance') this.ui.openPanel('enhance');
    else if (it.kind === 'gacha') this.ui.openPanel('gacha');
    else if (it.kind === 'warp') this.ui.openPanel('warp');
  }

  updateCamera(dt) {
    const cam = this.mainCam, pl = this.player;
    this.cam.dist += (this.cam.targetDist - this.cam.dist) * Math.min(1, dt * 6);
    let yaw = this.cam.yaw, pitch = this.cam.pitch, dist = this.cam.dist;
    const look = pl.position.clone(); look.y += 1.4;
    if (this.cine) {
      const c = this.cine;
      c.t += dt;
      const k = Math.min(1, c.t / c.dur);
      const w = Math.sin(Math.min(1, k * 1.15) * Math.PI); // in & out
      dist += w * 9; pitch += w * 0.25;
      yaw += w * 0.35;
      look.lerp(c.focus.clone().setY(c.focus.y + 3), w * 0.6);
      if (c.t >= c.dur) this.cine = null;
    }
    this.camLook.lerp(look, Math.min(1, dt * 10));
    const off = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(dist);
    const target = this.camLook.clone().add(off);
    const gh = this.world.heightAt(target.x, target.z) + 0.8;
    if (target.y < gh) target.y = gh;
    cam.position.lerp(target, Math.min(1, dt * 12));
    cam.lookAt(this.camLook);
  }
}
