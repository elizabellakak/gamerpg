import * as THREE from 'three';

const tmp = new THREE.Vector3();

export class Combat {
  constructor(game) {
    this.game = game;
    this.monsters = [];
  }

  // Calculates & applies damage from player to a monster
  playerHit(m, mult, { color = 0xffffff, knock = 0, from = null, heavy = false, noFx = false, stun = 0, slow = 0, ult = false, down = 0 } = {}) {
    if (m.dead) return 0;
    const st = this.game.stats;
    const me = st.mastery || {};
    const crit = Math.random() * 100 < st.crit;
    const def = m.def * (1 - (me.pen || 0) / 100);
    const defF = 1 - def / (def + 120);
    if (ult) mult *= 1 + (me.ultPct || 0) / 100;
    let dmg = st.atk * mult * (0.9 + Math.random() * 0.2) * defF;
    if (crit) dmg *= st.cdmg / 100;
    if (m.exposed > 0) dmg *= 1.1;
    dmg = Math.max(1, Math.round(dmg));
    m.takeDamage(dmg, { knock, from, crit, heavy });
    if (stun && !m.tpl.boss) m.stun = Math.max(m.stun || 0, stun);
    if (slow) m.slow = Math.max(m.slow || 0, slow);
    if (down && !m.tpl.boss) m.down = Math.max(m.down || 0, down);
    if (me.lifesteal) { const pl = this.game.player; pl.hp = Math.min(st.maxHp, pl.hp + dmg * me.lifesteal / 100); }
    const p = tmp.copy(m.position); p.y += m.tpl.height * 0.75;
    const g = this.game;
    g.dmgText.spawn(p, dmg.toLocaleString(), crit ? 'crit' : (heavy ? 'heavy' : ''), { scale: crit ? 1.25 : 1 });
    if (!noFx) {
      const hp = p.clone(); hp.y -= m.tpl.height * 0.2;
      g.fx.impact(hp, color, crit ? 1.4 : 1, { crit });
    }
    if (crit) g.audio.play('crit'); else g.audio.play('hit', { pitch: 0.9 + Math.random() * 0.3 });
    if (crit || heavy) g.engine.doHitStop(crit && heavy ? 0.09 : 0.045);
    return dmg;
  }

  // Shape queries ---------------------------------------
  inArc(center, yaw, radius, angle, cb) {
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    const half = angle / 2;
    let n = 0;
    for (const m of this.monsters) {
      if (m.dead) continue;
      const dx = m.position.x - center.x, dz = m.position.z - center.z;
      const d = Math.hypot(dx, dz);
      if (d - m.tpl.radius > radius) continue;
      if (d > m.tpl.radius + 0.5) {
        const a = Math.acos(Math.max(-1, Math.min(1, (dx * fx + dz * fz) / d)));
        if (a > half + Math.atan2(m.tpl.radius, d)) continue;
      }
      cb(m); n++;
    }
    return n;
  }

  inCircle(center, radius, cb) {
    let n = 0;
    for (const m of this.monsters) {
      if (m.dead) continue;
      if (Math.hypot(m.position.x - center.x, m.position.z - center.z) - m.tpl.radius <= radius) { cb(m); n++; }
    }
    return n;
  }

  nearest(pos, maxDist = 1e9, filter = null) {
    let best = null, bd = maxDist;
    for (const m of this.monsters) {
      if (m.dead || (filter && !filter(m))) continue;
      const d = Math.hypot(m.position.x - pos.x, m.position.z - pos.z) - m.tpl.radius;
      if (d < bd) { bd = d; best = m; }
    }
    return best;
  }
}
