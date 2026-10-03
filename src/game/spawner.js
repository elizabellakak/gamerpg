import * as THREE from 'three';
import { ZONES } from '../data/monsters.js';
import { Monster } from './monster.js';

export class Spawner {
  constructor(game) {
    this.game = game;
    this.zones = ZONES.filter((z) => z.mobs).map((z) => ({ zone: z, alive: [], timers: [] }));
  }

  init() {
    for (const zs of this.zones) for (let i = 0; i < zs.zone.count; i++) this.spawn(zs);
  }

  spawn(zs) {
    const z = zs.zone, g = this.game;
    let p = null;
    for (let t = 0; t < 30; t++) {
      const a = Math.random() * Math.PI * 2, r = z.boss ? 0 : Math.sqrt(Math.random()) * z.r * 0.9;
      const x = z.x + Math.cos(a) * r, zz = z.z + Math.sin(a) * r;
      if (z.boss || g.world.colliders.free(x, zz, 1.5)) { p = new THREE.Vector3(x, g.world.heightAt(x, zz), zz); break; }
    }
    if (!p) return;
    const total = z.mobs.reduce((s, m) => s + m[1], 0);
    let r = Math.random() * total, id = z.mobs[0][0];
    for (const [mid, w] of z.mobs) { if ((r -= w) <= 0) { id = mid; break; } }
    const lv = z.level[0] + Math.floor(Math.random() * (z.level[1] - z.level[0] + 1));
    const m = new Monster(g, id, lv, p, z);
    zs.alive.push(m);
    g.combat.monsters.push(m);
    if (z.boss) g.boss = m;
    return m;
  }

  update(dt) {
    const g = this.game;
    for (const zs of this.zones) {
      for (let i = zs.alive.length - 1; i >= 0; i--) {
        const m = zs.alive[i];
        if (!m.update(dt)) {
          m.dispose();
          zs.alive.splice(i, 1);
          const idx = g.combat.monsters.indexOf(m);
          if (idx >= 0) g.combat.monsters.splice(idx, 1);
          zs.timers.push(zs.zone.boss ? 90 : 7 + Math.random() * 6);
        }
      }
      for (let i = zs.timers.length - 1; i >= 0; i--) {
        zs.timers[i] -= dt;
        if (zs.timers[i] <= 0) {
          // don't respawn on top of the player
          const pz = Math.hypot(g.player.position.x - zs.zone.x, g.player.position.z - zs.zone.z);
          if (zs.zone.boss && pz < zs.zone.r) { zs.timers[i] = 5; continue; }
          zs.timers.splice(i, 1); this.spawn(zs);
        }
      }
    }
  }
}
