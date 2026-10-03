import * as THREE from 'three';
import { V, C, targetPoint, hitCircle, hitLine, projectile, aimDir, explosion } from './common.js';

function bowFrom(p) {
  const f = p.position.clone(); f.y += 1.35;
  return f.add(p.forward().multiplyScalar(0.6));
}

export default {
  bw_spiral: {
    start(p, s, d) {
      aimDir(p, bowFrom(p), 30);
      p.anim(['BW_Aim', 'BW_Shoot', 'Attack1'], { dur: 0.6, fade: 0.05 });
      p.fx.magicCircle(bowFrom(p), { color: p.elColor, radius: 0.9, duration: 0.6, style: 1, seed: 101, rot: 6, y: 0 }).mesh.lookAt(bowFrom(p).add(p.forward()));
      p.game.audio.play('charge');
    },
    update(p, dt, s, d) {
      const g = p.game, fx = p.fx;
      if (p.stateT < 0.4) {
        const f = bowFrom(p);
        for (let i = 0; i < 3; i++) { const r = V().randomDirection().multiplyScalar(1.5); fx.glow.emit(f.x + r.x, f.y + r.y, f.z + r.z, -r.x * 4, -r.y * 4, -r.z * 4, 0.25, 0.2, C(p.elColor2), { drag: 0 }); }
      }
      if (!d.fired && p.stateT > 0.42) {
        d.fired = true;
        p.anim(['BW_Shoot', 'Attack1'], { once: true, dur: 0.3, fade: 0.02 });
        const from = bowFrom(p);
        const { dir } = aimDir(p, from, 30);
        dir.y *= 0.3; dir.normalize();
        // blue laser arrow: thin bright beam + spiral sleeve + piercing arrow
        fx.beam(from, dir, { length: 32, radius: 0.35, color: 0x3a8cff, color2: 0xbfe6ff, duration: 0.45 });
        fx.drill(from, dir, { length: 30, radius: 0.9, color: p.elColor, color2: p.elColor2, duration: 0.5 });
        projectile(p, { from, dir, speed: 70, range: 32, radius: 1.2, mult: p.skillMult(s.mult), kind: 'arrow', size: 1.8, pierce: true, heavy: true, knock: 2,
          onHit: (m, at) => { fx.spikeBurst(at, 0xbfe6ff, 3.5, 0.25); fx.cloudBurst(at, { color: 0x3a8cff, color2: 0xffffff, radius: 1.6, count: 6, life: 0.5 }); } });
        g.engine.ripple(from, 0.8, 1.5, 0.3); g.engine.shake(0.4);
        g.audio.play('slashWave');
        p.vel.copy(p.forward()).multiplyScalar(-6);
      }
      if (p.stateT > 0.8) p.toMove();
    },
  },

  bw_rain: {
    start(p, s, d) {
      const t = targetPoint(p, 22, 12);
      d.c = t.point;
      d.R = p.awakened('bw_rain') ? 8.5 : 6;
      d.dur = p.awakened('bw_rain') ? 2.8 : 2.0;
      p.anim(['BW_Up', 'Cast'], { once: true, dur: 0.7, fade: 0.05 });
      p.fx.magicCircle(d.c, { color: p.elColor, radius: d.R, duration: d.dur + 0.9, style: 1, seed: 103, rot: 1.2 });
      p.fx.magicCircle(d.c.clone().setY(d.c.y + 18), { color: p.elColor2, radius: d.R * 0.8, duration: d.dur + 0.6, style: 0, seed: 104, rot: -1.5, y: 0 });
    },
    update(p, dt, s, d) {
      const g = p.game, fx = p.fx;
      if (!d.up && p.stateT > 0.35) {
        d.up = true;
        const from = bowFrom(p);
        projectile(p, { from, dir: V(0, 1, 0).add(p.forward().multiplyScalar(0.25)), speed: 60, range: 22, kind: 'arrow', size: 1.6 });
        g.audio.play('slashWave');
      }
      if (p.stateT > 0.7 && p.stateT < 0.7 + d.dur) {
        d.acc = (d.acc || 0) + dt;
        while (d.acc > 0.03) {
          d.acc -= 0.03;
          const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * d.R;
          const tx = d.c.x + Math.cos(a) * r, tz = d.c.z + Math.sin(a) * r;
          const from = V(tx - 2, d.c.y + 18, tz - 2);
          const to = V(tx, g.world.heightAt(tx, tz), tz);
          projectile(p, {
            from, dir: to.clone().sub(from), speed: 55, range: 30, radius: 0.9, kind: 'arrow', size: 1.1,
            mult: p.skillMult(s.mult), knock: 0.2,
            onEnd: (at) => {
              fx.sparks.burst(at, 5, { speed: 5, up: 3, life: 0.3, size: 0.3, color: C(p.elColor2), gravity: 10 });
              if (Math.random() < 0.3) fx.shockwave(at, { color: p.elColor, radius: 1, duration: 0.25 });
            },
          });
        }
        if (Math.random() < dt * 6) g.audio.play('swing', { pitch: 1.6 });
      }
      if (p.stateT > 0.9) p.skillMove = 1;
      if (p.stateT > 1.0 && !d.free) { d.free = true; p.toMove(); }
    },
  },

  bw_burst: {
    start(p, s, d) {
      aimDir(p, bowFrom(p), 24);
      p.anim(['BW_Shoot', 'Attack1'], { once: true, dur: 0.5, fade: 0.04 });
    },
    update(p, dt, s, d) {
      if (!d.fired && p.stateT > 0.28) {
        d.fired = true;
        const from = bowFrom(p);
        const base = aimDir(p, from, 24).dir;
        for (let i = -2; i <= 2; i++) {
          const a = i * 0.24;
          const dir = V(base.x * Math.cos(a) - base.z * Math.sin(a), base.y, base.z * Math.cos(a) + base.x * Math.sin(a));
          projectile(p, {
            from: from.clone(), dir, speed: 45, range: 24, radius: 0.9, kind: 'arrow', size: 1.3, mult: p.skillMult(s.mult * 0.4),
            onEnd: (at) => {
              explosion(p, at, { color: 0xff6a10, color2: 0xffd04a, radius: 2.6, mult: p.skillMult(s.mult), big: i === 0, opts: { knock: 2 } });
              setTimeout(() => p.fx.cloudBurst(at.clone().setY(at.y + 0.8), { color: 0x9a40ff, color2: 0xff7ad0, radius: 2.4, count: 8, life: 1.4, rise: 1.6, speed: 0.4 }), 150);
            },
          });
        }
        p.game.audio.play('slashWave');
        p.game.engine.shake(0.3);
      }
      if (p.stateT > 0.55) p.toMove();
    },
  },

  // ULT: star-forged beam arrow
  bw_starfall: {
    start(p, s, d) {
      const g = p.game, fx = p.fx;
      p.skillLock = true; p.invuln = 2.8;
      aimDir(p, bowFrom(p), 40);
      p.anim(['BW_Aim', 'BW_Shoot', 'Cast'], { dur: 1.0, fade: 0.05 });
      const f = bowFrom(p);
      d.circles = [1.4, 2.4, 3.4].map((r, i) => {
        const e = fx.magicCircle(f.clone().add(p.forward().multiplyScalar(0.8 + i * 1.1)), { color: i === 1 ? p.elColor2 : p.elColor, radius: r, duration: 2.0, style: i, seed: 110 + i, rot: (i % 2 ? -3 : 3), y: 0 });
        e.mesh.lookAt(e.mesh.position.clone().add(p.forward())); e.mesh.rotateX(Math.PI / 2);
        return e;
      });
      fx.magicCircle(p.position, { color: p.elColor, radius: 3, duration: 2, style: 2, seed: 113, rot: 2 });
      g.cinematic(2.6, p.position.clone().add(p.forward().multiplyScalar(14)));
      g.audio.play('charge'); g.audio.play('choir');
    },
    update(p, dt, s, d) {
      const g = p.game, fx = p.fx;
      const f = bowFrom(p);
      if (p.stateT < 1.4) {
        for (let i = 0; i < 6; i++) {
          const r = V().randomDirection().multiplyScalar(3 + Math.random() * 3);
          fx.glow.emit(f.x + r.x, f.y + r.y, f.z + r.z, -r.x * 2.5, -r.y * 2.5, -r.z * 2.5, 0.4, 0.3, C(i % 2 ? p.elColor : p.elColor2), { drag: 0 });
        }
        if (Math.random() < dt * 6) fx.lightning(f.clone().add(V().randomDirection().multiplyScalar(2)), f.clone(), { color: p.elColor, width: 0.03, duration: 0.12, segments: 6, jitter: 0.5, branches: 0 });
      }
      if (!d.fired && p.stateT > 1.4) {
        d.fired = true;
        p.anim(['BW_Shoot', 'Attack1'], { once: true, dur: 0.35, fade: 0.02 });
        const dir = p.forward().clone();
        fx.beam(f, dir, { length: 46, radius: 1.8, color: p.elColor, color2: p.elColor2, duration: 1.2 });
        fx.drill(f, dir, { length: 46, radius: 2.6, color: p.elColor2, color2: p.elColor, duration: 0.9 });
        g.engine.doFlash(0.7, p.elColor2); g.engine.shake(2); g.engine.pulseAberration(1.4);
        g.engine.ripple(f, 1.8, 0.9, 0.6);
        g.audio.play('boom'); g.audio.play('thunder');
        p.vel.copy(dir).multiplyScalar(-10);
        hitLine(p, p.position, dir, 46, 2.6, s.mult, { knock: 5, heavy: true, ult: true });
        for (let i = 1; i <= 8; i++) {
          setTimeout(() => {
            const q = f.clone().addScaledVector(dir, i * 5.5);
            explosion(p, q, { radius: 3, big: i % 2 === 0 });
          }, i * 60);
        }
      }
      if (p.stateT > 2.4) p.toMove();
    },
  },
};
