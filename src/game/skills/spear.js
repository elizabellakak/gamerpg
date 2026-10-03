import * as THREE from 'three';
import { V, C, targetPoint, hitCircle, hitLine, explosion } from './common.js';
import { basicAdd } from '../../fx/materials.js';

let jabGeo = null;
function jabStreak(p, from, dir, len, color) {
  if (!jabGeo) jabGeo = new THREE.ConeGeometry(0.16, 1, 6, 1, true).rotateX(Math.PI / 2).translate(0, 0, 0.5);
  const mat = basicAdd(color, 1);
  const m = new THREE.Mesh(jabGeo, mat);
  m.position.copy(from); m.lookAt(from.clone().add(dir));
  m.renderOrder = 6;
  p.game.world.scene.add(m);
  p.fx.timed(0.16, (k) => { m.scale.set(1 - k * 0.5, 1 - k * 0.5, len * Math.min(1, k * 4)); mat.opacity = 1 - k; }, () => { p.game.world.scene.remove(m); mat.dispose(); });
}

function helixDragon(p, start, end, rise, color, color2, phase, onArrive, duration = 2.0) {
  const pts = [];
  const N = 30;
  for (let i = 0; i <= N; i++) {
    const t = i / N, a = t * Math.PI * 5 + phase, r = 2.6 * (1 - t * 0.3);
    pts.push(V(start.x + Math.cos(a) * r, start.y + 0.5 + t * rise, start.z + Math.sin(a) * r));
  }
  const top = pts[pts.length - 1];
  for (let i = 1; i <= 10; i++) {
    const t = i / 10;
    const q = new THREE.Vector3().lerpVectors(top, end, t);
    q.y += Math.sin(t * Math.PI) * 3;
    pts.push(q);
  }
  return p.fx.spirit(pts, { color, color2, radius: 0.9, duration, len: 0.38, onArrive });
}

export default {
  sp_pierce: {
    start(p, s, d) {
      targetPoint(p, 12);
      p.anim(['SP_Lunge', 'SP_Attack1', 'Attack1'], { once: true, dur: 0.5, fade: 0.04 });
      p.vel.copy(p.forward()).multiplyScalar(30);
      p.invuln = Math.max(p.invuln, 0.35);
      d.hit = new Set();
      const from = p.position.clone(); from.y += 1.2;
      p.fx.drill(from, p.forward(), { length: 10, radius: 1.2, color: p.elColor, color2: p.elColor2, duration: 0.4 });
      const to = from.clone().add(p.forward().multiplyScalar(11));
      p.fx.energyWave(from.clone().setY(from.y - 0.4), to, { color: p.elColor, color2: p.elColor2, duration: 0.3, width: 1.3, onArrive: (at) => {
        p.fx.spikeBurst(at, p.elColor2, 4.2, 0.3);
        p.fx.cloudBurst(at, { color: p.elColor, color2: p.elColor2, radius: 2.2, count: 10, life: 0.7 });
      } });
      p.game.engine.ripple(from, 0.8, 1.4, 0.3);
      p.game.audio.play('slashWave');
      if (p.awakened('sp_pierce')) {
        const end = p.position.clone().add(p.forward().multiplyScalar(14)); end.y = p.game.world.heightAt(end.x, end.z) + 1.2;
        for (const ph of [0, Math.PI]) {
          const pts = [];
          for (let i = 0; i <= 24; i++) { const t = i / 24, a = t * Math.PI * 4 + ph; const q = new THREE.Vector3().lerpVectors(from, end, t); q.x += Math.cos(a) * 1.2 * Math.cos(p.yaw); q.z -= Math.cos(a) * 1.2 * Math.sin(p.yaw); q.y += Math.sin(a) * 1.2; pts.push(q); }
          p.fx.spirit(pts, { color: p.elColor, color2: p.elColor2, radius: 0.45, duration: 0.6, len: 0.5 });
        }
        hitLine(p, p.position, p.forward(), 14, 1.6, s.mult * 0.8, { knock: 2 });
      }
    },
    update(p, dt, s, d) {
      if (p.stateT < 0.3) {
        hitLine(p, p.position, p.forward(), 2.6, 1.3, s.mult, { knock: 3, heavy: true }, d.hit);
        p.fx.afterimage(p.obj, p.elColor, 0.3);
      } else p.vel.multiplyScalar(Math.pow(0.001, dt));
      if (p.stateT > 0.5) p.toMove();
    },
  },

  sp_twirl: {
    start(p, s, d) {
      p.skillMove = 0.6;
      p.anim(['SP_Twirl', 'Skill'], { dur: 0.5, fade: 0.05 });
      p.fx.magicCircle(p.position, { color: p.elColor, radius: 4, duration: 2.4, follow: p.obj, style: 2, seed: 91, rot: 4, opacity: 0.5 });
      p.game.audio.play('whirl');
      d.swirl = 0;
    },
    update(p, dt, s, d) {
      const g = p.game, fx = p.fx;
      d.ring = (d.ring || 0) - dt; d.tick = (d.tick || 0) - dt; d.swirl -= dt;
      if (d.swirl <= 0) {
        d.swirl = 0.45;
        const alt = Math.floor(p.stateT / 0.45) % 2;
        fx.groundSwirl(p.position, { color: alt ? p.elColor : 0x7fb8ff, color2: alt ? p.elColor2 : 0xc890ff, radius: 5, duration: 0.9, spin: 6 });
      }
      if (d.ring <= 0) {
        d.ring = 0.14;
        d.a = (d.a || 0) + 2.1;
        fx.slash(p.position, d.a, { color: p.elColor, color2: p.elColor2, radius: 3.6, width: 0.9, angle: Math.PI * 1.2, tilt: Math.sin(d.a) * 0.25, duration: 0.14, y: 1.0 + Math.sin(d.a * 1.3) * 0.4, sparks: false });
      }
      for (const m of g.combat.monsters) {
        if (m.dead || m.tpl.boss) continue;
        const dx = p.position.x - m.position.x, dz = p.position.z - m.position.z, dd = Math.hypot(dx, dz);
        if (dd < 7 && dd > 2) { m.vel.x += dx / dd * 12 * dt; m.vel.z += dz / dd * 12 * dt; }
      }
      if (d.tick <= 0) { d.tick = 0.2; hitCircle(p, p.position, 3.8, s.mult, { knock: 0.2 }); g.audio.play('swing', { pitch: 1.3 }); }
      if (p.stateT > 2.3) p.toMove();
    },
  },

  sp_thousand: {
    start(p, s, d) {
      targetPoint(p, 8);
      p.anim(['SP_Jab', 'SP_Attack1', 'Attack1'], { dur: 0.22, fade: 0.04 });
      p.fx.magicCircle(p.position.clone().add(p.forward().multiplyScalar(4)), { color: p.elColor, radius: 3.5, duration: 1.6, style: 1, seed: 93, rot: 2, opacity: 0.6 });
    },
    update(p, dt, s, d) {
      const g = p.game;
      d.acc = (d.acc || 0) + dt; d.tick = (d.tick || 0) - dt;
      if (p.stateT < 1.2) {
        while (d.acc > 0.035) {
          d.acc -= 0.035;
          const a = p.yaw + (Math.random() - 0.5) * 1.0;
          const dir = V(Math.sin(a), (Math.random() - 0.5) * 0.25, Math.cos(a));
          const from = p.position.clone().add(V(0, 1.1 + (Math.random() - 0.5) * 0.8, 0));
          jabStreak(p, from, dir, 6 + Math.random() * 2, Math.random() < 0.5 ? p.elColor : p.elColor2);
        }
        if (d.tick <= 0) {
          d.tick = 0.09;
          g.combat.inArc(p.position, p.yaw, 7.5, 1.1, (m) => {
            g.combat.playerHit(m, p.skillMult(s.mult), { color: p.elColor, knock: 0.15, from: p.position, noFx: true });
            if (Math.random() < 0.4) p.fx.spikeBurst(m.position.clone().setY(m.position.y + m.tpl.height * 0.6), p.elColor2, 2.2, 0.16);
          });
          g.audio.play('swing', { pitch: 1.4 + Math.random() * 0.3 });
        }
      } else if (!d.fin) {
        d.fin = true;
        p.anim(['SP_Attack3', 'Attack3'], { once: true, dur: 0.4, fade: 0.03 });
        const from = p.position.clone(); from.y += 1.2;
        p.fx.drill(from, p.forward(), { length: 11, radius: 1.8, color: p.elColor, color2: p.elColor2, duration: 0.5 });
        const tip = from.clone().add(p.forward().multiplyScalar(9));
        explosion(p, tip, { radius: 3.5, mult: p.skillMult(s.mult * 4), big: true, opts: { knock: 4, heavy: true } });
      }
      if (p.stateT > 1.6) p.toMove();
    },
  },

  // ULT: twin dragon spirits spiral to the sky then dive
  sp_dragon: {
    start(p, s, d) {
      const g = p.game, fx = p.fx;
      p.skillLock = true; p.invuln = 3.2;
      p.anim(['SP_Twirl', 'Cast'], { dur: 0.5, fade: 0.06 });
      const t = targetPoint(p, 16, 9);
      d.c = t.point;
      g.cinematic(3.0, d.c);
      g.audio.play('charge'); g.audio.play('roar');
      fx.magicCircle(p.position, { color: p.elColor, radius: 4, duration: 2.0, style: 2, seed: 95, rot: 3 });
      fx.magicCircle(d.c, { color: p.elColor, radius: 9, duration: 3.0, style: 0, seed: 96, rot: 1 });
      fx.pillar(p.position, { color: p.elColor, color2: p.elColor2, radius: 1.6, height: 22, duration: 1.6, speed: 4 });
      helixDragon(p, p.position.clone(), d.c.clone().setY(d.c.y + 0.5), 18, p.elColor, p.elColor2, 0, null, 2.0);
      helixDragon(p, p.position.clone(), d.c.clone().setY(d.c.y + 0.5), 16, p.elColor2, p.elColor, Math.PI, (at) => impact(p, at, s, d), 2.15);
    },
    update(p, dt, s, d) {
      if (p.stateT > 1.0 && !d.cast) { d.cast = true; p.anim(['Cast', 'Attack3'], { once: true, dur: 0.8 }); }
      if (p.stateT > 2.9) p.toMove();
    },
  },
};

function impact(p, at, s, d) {
  const g = p.game, fx = p.fx, c = d.c;
  g.engine.doFlash(0.75, 0xffffff); g.engine.shake(2.4); g.engine.doHitStop(0.1); g.engine.pulseAberration(1.3);
  g.engine.ripple(c.clone().setY(c.y + 1), 2.0, 0.8, 0.7);
  g.audio.play('boom'); g.audio.play('roar');
  explosion(p, c.clone().setY(c.y + 1), { radius: 9, mult: p.skillMult(s.mult), big: true, opts: { knock: 6, heavy: true, ult: true } });
  fx.pillar(c, { color: p.elColor, color2: 0xffffff, radius: 3, height: 40, duration: 1.4, speed: 4 });
  fx.spikes(c, { color: p.elColor, count: 14, radius: 6, height: 3, duration: 1.8, ice: false });
  fx.shockwave(c, { color: 0xffffff, radius: 13, duration: 0.7 });
  fx.shockwave(c, { color: p.elColor2, radius: 9, duration: 1.0 });
  fx.scorch(c, 8, p.elColor, 7);
  fx.debris(c, { count: 40, speed: 13 });
}
