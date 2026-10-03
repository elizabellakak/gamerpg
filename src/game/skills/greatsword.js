import * as THREE from 'three';
import { V, C, targetPoint, hitCircle, hitLine, spectralWeapon, explosion } from './common.js';

function seismicLine(p, yaw, s, hitSet, delay0 = 0) {
  const g = p.game, fx = p.fx;
  const dir = V(Math.sin(yaw), 0, Math.cos(yaw));
  for (let i = 0; i < 8; i++) {
    setTimeout(() => {
      const q = p.position.clone().addScaledVector(dir, 2 + i * 1.7); q.y = g.world.heightAt(q.x, q.z);
      fx.spikes(q, { color: p.elColor, count: 6, radius: 1.3, height: 2.2 + i * 0.12, duration: 1.2, ice: false });
      fx.debris(q, { count: 8, speed: 7, size: 0.35 });
      fx.scorch(q, 1.5, p.elColor, 3.5);
      fx.glow.burst(q.clone().setY(q.y + 0.5), 12, { speed: 4, up: 4, life: 0.5, size: 0.5, color: C(p.elColor2), color1: C(p.elColor), drag: 2 });
      if (i % 2 === 0) { g.engine.shake(0.35); g.audio.play('boom'); }
      g.combat.inCircle(q, 1.9, (m) => { if (hitSet.has(m)) return; hitSet.add(m); g.combat.playerHit(m, p.skillMult(s.mult), { color: p.elColor, knock: 3, heavy: true, from: p.position }); });
    }, (delay0 + i * 0.055) * 1000);
  }
}

export default {
  gs_seismic: {
    start(p, s, d) {
      p.anim(['GS_Attack3', 'Attack3'], { once: true, dur: 0.75, fade: 0.05 });
      targetPoint(p, 14);
      p.game.audio.play('swingHeavy');
    },
    update(p, dt, s, d) {
      if (!d.done && p.stateT > 0.42) {
        d.done = true;
        const g = p.game;
        const hit = new Set();
        g.engine.ripple(p.position.clone().setY(p.position.y + 0.5), 0.9, 1.2, 0.35);
        p.fx.shockwave(p.position.clone().add(p.forward().multiplyScalar(1.6)), { color: p.elColor, radius: 3, duration: 0.4 });
        seismicLine(p, p.yaw, s, hit);
        if (p.awakened('gs_seismic')) { seismicLine(p, p.yaw - 0.45, s, hit, 0.08); seismicLine(p, p.yaw + 0.45, s, hit, 0.08); }
      }
      if (p.stateT > 0.8) p.toMove();
    },
  },

  gs_whirl: {
    start(p, s, d) {
      p.skillMove = 0.7;
      p.anim(['GS_Spin', 'Skill'], { dur: 0.55, fade: 0.05 });
      p.fx.tornado(p.obj, { color: p.elColor, color2: p.elColor2, radius: 3.4, height: 3.2, duration: 2.6 });
      p.fx.magicCircle(p.position, { color: p.elColor, radius: 4.2, duration: 2.6, follow: p.obj, style: 1, seed: 71, rot: 3, opacity: 0.7 });
      p.game.audio.play('whirl');
    },
    update(p, dt, s, d) {
      const g = p.game;
      d.tick = (d.tick || 0) - dt; d.ring = (d.ring || 0) - dt;
      if (d.ring <= 0) {
        d.ring = 0.26;
        p.fx.slash(p.position, Math.random() * Math.PI * 2, { color: p.elColor, color2: p.elColor2, radius: 3.8, width: 1.5, angle: Math.PI * 1.7, tilt: (Math.random() - 0.5) * 0.3, duration: 0.22, y: 0.7 + Math.random() * 1.0, sparks: false });
        g.audio.play('swingHeavy', { pitch: 1.2 });
      }
      // vortex pull
      for (const m of g.combat.monsters) {
        if (m.dead || m.tpl.boss) continue;
        const dx = p.position.x - m.position.x, dz = p.position.z - m.position.z, dd = Math.hypot(dx, dz);
        if (dd < 8 && dd > 1.5) { m.vel.x += dx / dd * 14 * dt; m.vel.z += dz / dd * 14 * dt; }
      }
      if (d.tick <= 0) { d.tick = 0.22; hitCircle(p, p.position, 4.2, s.mult, { knock: 0.3 }); }
      if (p.stateT > 2.5) p.toMove();
    },
  },

  gs_leap: {
    start(p, s, d) {
      const t = targetPoint(p, 12, 8);
      d.from = p.position.clone(); d.to = t.point;
      const dist = d.from.distanceTo(d.to);
      if (dist < 2) d.to = d.from.clone().add(p.forward().multiplyScalar(3));
      p.anim(['GS_Leap', 'Attack3'], { once: true, dur: 1.0, fade: 0.05 });
      p.invuln = Math.max(p.invuln, 1.0);
      p.skillLock = true;
      p.fx.telegraph(d.to, { radius: 5, duration: 0.65, color: p.elColor });
      p.game.audio.play('dash');
    },
    update(p, dt, s, d) {
      const g = p.game, fx = p.fx;
      const k = THREE.MathUtils.clamp((p.stateT - 0.12) / 0.58, 0, 1);
      if (p.stateT < 0.72) {
        p.position.x = THREE.MathUtils.lerp(d.from.x, d.to.x, k);
        p.position.z = THREE.MathUtils.lerp(d.from.z, d.to.z, k);
        p.lift = Math.sin(k * Math.PI) * 4.5;
        p.vel.set(0, 0, 0);
        if (k > 0 && k < 1) fx.afterimage(p.obj, p.elColor, 0.25);
      }
      if (!d.hit && p.stateT >= 0.72) {
        d.hit = true; p.lift = 0;
        const c = d.to.clone(); c.y = g.world.heightAt(c.x, c.z);
        explosion(p, c.clone().setY(c.y + 0.5), { radius: 5.5, mult: p.skillMult(s.mult), big: true, opts: { knock: 5, heavy: true } });
        fx.spikes(c, { color: p.elColor, count: 12, radius: 4.2, height: 2.4, duration: 1.4, ice: false });
        fx.shockwave(c, { color: 0xffffff, radius: 8, duration: 0.5 });
        fx.scorch(c, 5.5, p.elColor, 6);
        g.engine.shake(1.4); g.engine.doHitStop(0.08); g.engine.ripple(c.clone().setY(c.y + 1), 1.6, 1.0, 0.5);
      }
      if (p.stateT > 1.0) { p.lift = 0; p.toMove(); }
    },
  },

  // ULT: titan blade splits the earth
  gs_titan: {
    start(p, s, d) {
      const g = p.game, fx = p.fx;
      p.skillLock = true; p.invuln = 3;
      p.anim(['Cast', 'GS_Attack3'], { once: true, dur: 1.0, fade: 0.06 });
      targetPoint(p, 16);
      d.dir = p.forward().clone(); d.origin = p.position.clone();
      g.cinematic(2.8, p.position.clone().addScaledVector(d.dir, 9));
      g.audio.play('charge'); g.audio.play('roar');
      fx.magicCircle(p.position, { color: p.elColor, radius: 4, duration: 2.6, style: 0, seed: 81, rot: 2 });
      fx.pillar(p.position, { color: p.elColor, color2: p.elColor2, radius: 1.4, height: 14, duration: 1.4, speed: 3 });
      d.sw = spectralWeapon(p, 7, p.elColor, p.elColor2, { rainbow: p.plus >= 15 });
      d.sw.holder.position.copy(p.position).addScaledVector(d.dir, -1.5); d.sw.holder.position.y += 2;
      d.sw.holder.rotation.order = 'YXZ';
      d.sw.holder.rotation.set(-0.3, Math.atan2(d.dir.x, d.dir.z), 0);
      d.sw.setOpacity(0);
    },
    update(p, dt, s, d) {
      const g = p.game, fx = p.fx;
      const sw = d.sw;
      if (p.stateT < 1.0) {
        sw.setOpacity(Math.min(1, p.stateT * 2));
        sw.holder.rotation.x = -0.3 - p.stateT * 0.6; // wind up overhead
        fx.rise(p.position, { color: p.elColor2, color1: p.elColor, count: 4, radius: 2, speed: 6, life: 0.8, size: 0.4 });
      } else if (p.stateT < 1.3) {
        const k = (p.stateT - 1.0) / 0.3;
        sw.holder.rotation.x = -0.9 + k * k * 2.55; // swing down into the ground
      } else if (!d.slammed) {
        d.slammed = true;
        g.engine.doFlash(0.7, 0xffffff); g.engine.shake(2.4); g.engine.doHitStop(0.1); g.engine.pulseAberration(1.2);
        g.audio.play('boom'); g.audio.play('thunder');
        const hit = new Set();
        for (let i = 0; i < 14; i++) {
          setTimeout(() => {
            const q = d.origin.clone().addScaledVector(d.dir, 2.5 + i * 1.5); q.y = g.world.heightAt(q.x, q.z);
            fx.spikes(q, { color: 0xff5a10, count: 5, radius: 1.8, height: 2.8, duration: 2.2, ice: false });
            fx.scorch(q, 2.6, p.elColor, 7);
            fx.glow.burst(q.clone().setY(q.y + 0.6), 26, { speed: 6, up: 6, life: 0.8, size: 0.9, color: C(p.elColor2), color1: C(p.elColor), drag: 1.5 });
            fx.pillar(q, { color: p.elColor, color2: p.elColor2, radius: 0.8, height: 6 + Math.random() * 4, duration: 0.7, speed: 4 });
            fx.debris(q, { count: 10, speed: 10 });
            if (i % 3 === 0) { g.engine.ripple(q.clone().setY(q.y + 1), 0.9, 1.2, 0.3); fx.light(q.clone().setY(q.y + 2), p.elColor, 70, 0.5, 16); }
            g.engine.shake(0.5);
            g.combat.inCircle(q, 3.2, (m) => { if (hit.has(m)) return; hit.add(m); g.combat.playerHit(m, p.skillMult(s.mult), { color: p.elColor, knock: 5, heavy: true, from: d.origin, ult: true }); });
          }, i * 45);
        }
      } else {
        const k = Math.min(1, (p.stateT - 1.3) / 1.0);
        sw.setOpacity(1 - k);
      }
      if (p.stateT > 2.4) { sw.dispose(); p.toMove(); }
    },
  },
};
