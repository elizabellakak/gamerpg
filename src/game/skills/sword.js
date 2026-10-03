import * as THREE from 'three';
import { V, C, targetPoint, hitCircle, hitLine, spectralWeapon } from './common.js';

export default {
  // 1) Shield charge with stun
  ss_bash: {
    start(p, s, d) {
      p.anim(['SS_Bash', 'Attack3'], { once: true, dur: 0.5, fade: 0.05 });
      targetPoint(p, 9);
      p.vel.copy(p.forward()).multiplyScalar(24);
      p.invuln = Math.max(p.invuln, 0.4);
      d.hit = new Set();
      p.game.audio.play('dash');
      p.game.engine.ripple(p.position.clone().setY(p.position.y + 1.2), 0.5, 1.5, 0.25);
    },
    update(p, dt, s, d) {
      const g = p.game, fx = p.fx;
      const front = p.position.clone().add(p.forward().multiplyScalar(1.1)); front.y += 1.1;
      if (p.stateT < 0.28) {
        fx.glow.emit(front.x, front.y, front.z, 0, 0, 0, 0.18, 1.6, C(p.elColor2), { color1: C(p.elColor), size1: 0.4 });
        if (Math.random() < 0.5) fx.debris(p.position, { count: 2, speed: 3, size: 0.25 });
        hitLine(p, p.position, p.forward(), 2.2, 1.4, s.mult, { knock: 5, heavy: true, stun: 1.5 }, d.hit);
      } else if (!d.stop) {
        d.stop = true;
        p.vel.multiplyScalar(0.1);
        fx.shockwave(front, { color: p.elColor, radius: 3, duration: 0.4, vertical: true });
        fx.spikeBurst(front, p.elColor2, 4.5, 0.32);
        fx.cloudBurst(front, { color: p.elColor, color2: p.elColor2, radius: 2.4, count: 12, life: 0.75, rise: 0.4 });
        fx.sparks.burst(front, 40, { speed: 10, life: 0.4, size: 0.5, color: new THREE.Color(1, 1, 1), color1: C(p.elColor), drag: 2 });
        g.engine.shake(0.5);
        g.audio.play('crit');
        if (p.awakened('ss_bash')) {
          fx.shockwave(p.position, { color: p.elColor, radius: 5, duration: 0.5 });
          fx.pillar(p.position, { color: p.elColor, color2: p.elColor2, radius: 1, height: 7, duration: 0.6 });
          hitCircle(p, p.position, 4.5, s.mult * 0.6, { knock: 3, stun: 1 });
        }
      }
      if (p.stateT > 0.5) p.toMove();
    },
  },

  // 2) Three-hit combo + holy cross burst
  ss_cross: {
    start(p, s, d) {
      const t = targetPoint(p, 8, 3);
      d.center = t.point.clone();
      d.step = 0;
      p.trail.active = true;
    },
    update(p, dt, s, d) {
      const g = p.game, fx = p.fx;
      const times = [0, 0.18, 0.36];
      const anims = ['Attack1', 'Attack2', 'Attack1'];
      while (d.step < 3 && p.stateT >= times[d.step]) {
        const i = d.step++;
        p.play(anims[i], { once: true, dur: 0.24, fade: 0.03 });
        fx.slash(p.position, p.yaw, { color: p.elColor, color2: p.elColor2, radius: 3, width: 1.4, angle: Math.PI * 1.1, tilt: [-0.5, 0.5, Math.PI / 2][i], flip: i === 1, duration: 0.14 });
        g.audio.play('swing', { pitch: 1 + i * 0.1 });
        g.combat.inArc(p.position, p.yaw, 3.8, Math.PI, (m) => g.combat.playerHit(m, p.skillMult(s.mult), { color: p.elColor, knock: 0.8, from: p.position }));
      }
      if (!d.cross && p.stateT > 0.62) {
        d.cross = true;
        const c = d.center; const base = c.clone();
        fx.groundNova(base, { color: p.elColor, radius: 4.5, duration: 0.8 });
        fx.pillar(base, { color: p.elColor, color2: 0xffffff, radius: 0.45, height: 9, duration: 1.0, speed: 4 });
        g.combat.inCircle(base, 3.5, (m) => fx.burning(m, { color: p.elColor, duration: 2.2, height: m.tpl.height }));
        const side = new THREE.Vector3(Math.cos(p.yaw), 0, -Math.sin(p.yaw));
        const from = base.clone().addScaledVector(side, -3); from.y += 5.6;
        fx.beam(from, side, { length: 6, radius: 0.45, color: p.elColor, color2: p.elColor2, duration: 1.0 });
        fx.magicCircle(base, { color: p.elColor, radius: 3.5, duration: 1.2, style: 2, seed: 61, rot: 2 });
        fx.shockwave(base, { color: p.elColor2, radius: 4.5, duration: 0.5 });
        fx.glow.burst(base.clone().setY(base.y + 4), 80, { speed: 8, life: 0.8, size: 0.6, color: C(p.elColor2), color1: C(p.elColor), drag: 2 });
        fx.light(base.clone().setY(base.y + 4), p.elColor2, 80, 0.6, 18);
        g.engine.doFlash(0.25, p.elColor2); g.engine.shake(0.6); g.engine.ripple(base.clone().setY(base.y + 3), 0.9, 1.2, 0.35);
        g.audio.play('choir'); g.audio.play('boom');
        hitCircle(p, base, 3.5, s.mult * 2.4, { knock: 2, heavy: true });
      }
      if (p.stateT > 0.95) p.toMove();
    },
  },

  // 3) Hex barrier dome
  ss_aegis: {
    start(p, s, d) {
      const g = p.game, fx = p.fx;
      p.anim(['SS_Block', 'Cast'], { once: true, dur: 0.6, fade: 0.06 });
      p.barrier = g.stats.maxHp * 0.35;
      if (p.barrierFx) p.barrierFx.end();
      p.barrierFx = fx.dome(p.obj, { radius: 2.3, color: p.elColor, duration: 6 });
      p.barrierT = 6;
      fx.magicCircle(p.position, { color: p.elColor, radius: 3, duration: 1.2, style: 1, seed: 63, rot: 3 });
      fx.shockwave(p.position, { color: p.elColor2, radius: 5, duration: 0.5 });
      fx.orbitRing(p.obj, { color: p.elColor, color2: p.elColor2, radius: 1.6, duration: 1.4 });
      fx.rise(p.position, { color: p.elColor2, color1: p.elColor, count: 50, radius: 2, speed: 5, life: 1, size: 0.35 });
      g.engine.ripple(p.position.clone().setY(p.position.y + 1), 0.8, 1.3, 0.3);
      g.audio.play('choir');
      hitCircle(p, p.position, 4.5, s.mult, { knock: 4 });
    },
    update(p, dt, s, d) { if (p.stateT > 0.55) p.toMove(); },
  },

  // 4) ULT: giant spectral sword from the heavens
  judgement: {
    start(p, s, d) {
      const g = p.game, fx = p.fx;
      p.skillLock = true;
      p.invuln = 3.2;
      p.anim(['Cast', 'Attack3'], { once: true, dur: 1.0, fade: 0.08 });
      const t = targetPoint(p, 16, 8);
      d.center = t.point;
      const col = p.elColor, col2 = p.elColor2, c = d.center;
      g.cinematic(2.9, c);
      g.engine.doFlash(0.35, col2);
      g.audio.play('charge'); g.audio.play('choir');
      fx.magicCircle(p.position, { color: col, radius: 3.2, duration: 1.4, style: 2, seed: 9, rot: 3 });
      fx.pillar(p.position, { color: col, color2: col2, radius: 1.3, height: 16, duration: 1.3, speed: 3 });
      fx.magicCircle(c, { color: col, radius: 11, duration: 3.0, style: 0, seed: 21, rot: 0.8 });
      fx.magicCircle(c, { color: col2, radius: 7, duration: 3.0, style: 2, seed: 22, rot: -1.4, y: 0.1 });
      fx.magicCircle(c.clone().setY(c.y + 26), { color: col2, radius: 9, duration: 2.0, style: 1, seed: 23, rot: 1.5, y: 0 });
      d.stage = 0;
    },
    update(p, dt, s, d) {
      const g = p.game, fx = p.fx, c = d.center;
      const col = p.elColor, col2 = p.elColor2, c1 = C(col), c2 = C(col2);
      if (p.stateT < 1.4) {
        for (let i = 0; i < 6; i++) {
          const a = Math.random() * Math.PI * 2, r = 9 + Math.random() * 4;
          fx.glow.emit(c.x + Math.cos(a) * r, c.y + 0.3 + Math.random() * 2, c.z + Math.sin(a) * r, -Math.cos(a) * r * 1.3, 2 + Math.random() * 4, -Math.sin(a) * r * 1.3, 0.75, 0.5, c2, { color1: c1, drag: 0.3 });
        }
        fx.rise(p.position, { color: col2, color1: col, count: 3, radius: 1.6, speed: 6, life: 0.8, size: 0.35 });
      }
      if (d.stage === 0 && p.stateT > 0.95) {
        d.stage = 1;
        d.sw = spectralWeapon(p, 9, col, col2, { rainbow: p.plus >= 15 });
        d.sw.inner.rotation.x = Math.PI;
        d.y = 38; d.vy = 8;
        d.sw.holder.position.set(c.x, c.y + d.y, c.z);
        fx.light(d.sw.holder.position, col2, 80, 1.2, 40);
      }
      if (d.stage === 1) {
        d.vy += dt * 120; d.y -= d.vy * dt;
        d.sw.holder.position.set(c.x, c.y + Math.max(d.y, 4.5), c.z);
        d.sw.holder.rotation.y += dt * 2;
        fx.glow.burst(d.sw.holder.position.clone().setY(d.sw.holder.position.y - 2), 6, { speed: 2, life: 0.5, size: 0.8, color: c2, color1: c1, drag: 1 });
        if (d.y <= 4.5) { d.stage = 2; d.fade = 0; impact(p, c, s); }
      }
      if (d.stage === 2) {
        d.fade += dt;
        d.sw.setOpacity(Math.max(0, 1 - d.fade / 1.2));
        if (d.fade > 1.2) { d.sw.dispose(); d.sw = null; d.stage = 3; }
      }
      if (p.stateT > 1.05 && !d.idle) { d.idle = true; p.anim(['idle'], { fade: 0.3 }); }
      if (p.stateT > 2.6) { if (d.sw) d.sw.dispose(); p.toMove(); }
    },
  },
};

function impact(p, c, s) {
  const g = p.game, fx = p.fx, col = p.elColor, col2 = p.elColor2;
  g.engine.doFlash(0.85, 0xffffff); g.engine.shake(2.5); g.engine.doHitStop(0.12); g.engine.pulseAberration(1.5);
  g.engine.ripple(c.clone().setY(c.y + 1), 2.2, 0.75, 0.75);
  setTimeout(() => g.engine.ripple(c.clone().setY(c.y + 1), 1.2, 0.9, 0.6), 120);
  g.audio.play('boom'); g.audio.play('thunder');
  fx.scorch(c, 9, col, 7);
  fx.shockwave(c, { color: 0xffffff, radius: 14, duration: 0.7, width: 0.2 });
  fx.shockwave(c, { color: col, radius: 10, duration: 0.9 });
  fx.shockwave(c, { color: col2, radius: 6, duration: 1.1 });
  fx.pillar(c, { color: col, color2: 0xffffff, radius: 3.5, height: 60, duration: 1.6, speed: 4 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const q = V(c.x + Math.cos(a) * 7, 0, c.z + Math.sin(a) * 7); q.y = g.world.heightAt(q.x, q.z);
    setTimeout(() => fx.pillar(q, { color: col, color2: col2, radius: 0.7, height: 18, duration: 1.0, speed: 3 }), i * 40);
    fx.lightning(c.clone().setY(c.y + 5), q.clone().setY(q.y + 12), { color: col, width: 0.06, duration: 0.5, branches: 2 });
  }
  fx.sparks.burst(c.clone().setY(c.y + 1), 160, { speed: 26, up: 6, life: 0.7, lifeVar: 0.5, size: 0.9, color: new THREE.Color(1, 1, 1), color1: C(col), gravity: 10, drag: 1.5 });
  fx.glow.burst(c.clone().setY(c.y + 1), 220, { speed: 16, up: 4, life: 1.0, lifeVar: 0.8, size: 1.0, color: C(col2), color1: C(col), drag: 1.8 });
  fx.debris(c, { count: 50, speed: 14, size: 0.5 });
  fx.light(c.clone().setY(c.y + 3), col2, 160, 1.2, 50);
  fx.flare(c.clone().setY(c.y + 2), C(col2), 22, 0.5);
  hitCircle(p, c, 11, s.mult, { knock: 6, heavy: true, ult: true });
  fx.timed(1.5, () => fx.rise(c, { color: col2, color1: col, count: 6, radius: 9, speed: 4, life: 1.4, size: 0.4 }));
}
