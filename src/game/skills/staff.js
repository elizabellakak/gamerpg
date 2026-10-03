import * as THREE from 'three';
import { V, C, targetPoint, hitCircle, projectile, aimDir, explosion } from './common.js';

function staffTip(p) {
  if (p.tipNode) return p.tipNode.getWorldPosition(new THREE.Vector3());
  return p.position.clone().add(V(0, 1.8, 0));
}

function meteor(p, at, size, mult, delay = 0, big = false) {
  const g = p.game, fx = p.fx;
  const c1 = C(p.elColor), c2 = C(p.elColor2);
  setTimeout(() => {
    const start = at.clone().add(V(10, 32, 6));
    const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8 * size, 2), new THREE.MeshStandardMaterial({ color: 0x2a1a14, emissive: p.elColor, emissiveIntensity: 2.2, roughness: 0.8, flatShading: true }));
    g.world.scene.add(ball);
    if (big) fx.telegraph(at, { radius: 8, duration: 1.0, color: p.elColor });
    g.audio.play('meteor');
    fx.timed(big ? 1.0 : 0.65, (k, dt) => {
      ball.position.lerpVectors(start, at, k * k);
      ball.rotation.x += dt * 4; ball.rotation.y += dt * 3;
      for (let i = 0; i < (big ? 10 : 3); i++) fx.glow.emit(ball.position.x + (Math.random() - 0.5) * size, ball.position.y + (Math.random() - 0.5) * size, ball.position.z + (Math.random() - 0.5) * size, 1.5, 3, 1, big ? 0.9 : 0.5, (big ? 2.4 : 1.2) * size * 0.6, c2, { color1: c1, size1: 0.3, drag: 1 });
    }, () => {
      g.world.scene.remove(ball); ball.geometry.dispose(); ball.material.dispose();
      explosion(p, at.clone().setY(at.y + 0.5), { radius: big ? 9 : 2.8, mult, big, opts: { knock: big ? 6 : 1.5, heavy: big, ult: big } });
      if (big) {
        g.engine.doFlash(0.8, 0xffffff); g.engine.shake(2.6); g.engine.doHitStop(0.12); g.engine.pulseAberration(1.5);
        g.engine.ripple(at.clone().setY(at.y + 1), 2.2, 0.75, 0.75);
        fx.pillar(at, { color: p.elColor, color2: 0xffffff, radius: 3.5, height: 50, duration: 1.6, speed: 4 });
        fx.shockwave(at, { color: 0xffffff, radius: 15, duration: 0.8 });
        fx.shockwave(at, { color: p.elColor2, radius: 10, duration: 1.1 });
        fx.spikes(at, { color: p.elColor, count: 14, radius: 6.5, height: 2.6, duration: 2, ice: false });
        fx.scorch(at, 10, p.elColor, 8);
        fx.debris(at, { count: 60, speed: 15, size: 0.5 });
        fx.cloudBurst(at.clone().setY(at.y + 1.5), { color: 0xff3aa0, color2: 0xffe070, radius: 8, count: 40, life: 1.8, rise: 2.5 });
        fx.darkDisk(at, { radius: 12, duration: 2 });
        g.audio.play('thunder');
      }
    });
  }, delay * 1000);
}

export default {
  st_fireball: {
    start(p, s, d) {
      aimDir(p, staffTip(p), 24);
      p.anim(['ST_Point', 'ST_Attack1', 'Attack1'], { once: true, dur: 0.5, fade: 0.05 });
      p.fx.magicCircle(p.position, { color: 0xffc040, radius: 1.8, duration: 0.9, style: 1, seed: 121, rot: 4 });
      p.game.audio.play('fire');
    },
    update(p, dt, s, d) {
      if (!d.fired && p.stateT > 0.25) {
        d.fired = true;
        const from = staffTip(p);
        const { dir, target } = aimDir(p, from, 24);
        const n = p.awakened('st_fireball') ? 3 : 1;
        for (let i = 0; i < n; i++) {
          const a = (i - (n - 1) / 2) * 0.28;
          const dd = V(dir.x * Math.cos(a) - dir.z * Math.sin(a), dir.y, dir.z * Math.cos(a) + dir.x * Math.sin(a));
          projectile(p, {
            from: from.clone(), dir: dd, speed: 24, range: 26, radius: 1.2, kind: 'orb', size: 2.6, homing: i === 0 ? target : null,
            onEnd: (at) => {
              explosion(p, at, { radius: 4.5, mult: p.skillMult(s.mult), big: true, opts: { knock: 3, heavy: true } });
              p.fx.cloudBurst(at, { color: p.elColor, color2: 0xfff0a0, radius: 4.2, count: 26, life: 1.3, rise: 1.2 });
              p.fx.flameRays(at, { color: p.elColor, color2: p.elColor2, count: 14, height: 4, life: 0.45 });
            },
          });
        }
        p.game.engine.ripple(from, 0.6, 1.5, 0.25);
      }
      if (p.stateT > 0.55) p.toMove();
    },
  },

  st_ice: {
    start(p, s, d) {
      const t = targetPoint(p, 16, 10);
      d.dir = t.point.clone().sub(p.position).setY(0).normalize();
      if (!isFinite(d.dir.x)) d.dir = p.forward().clone();
      p.anim(['ST_Attack3', 'Attack3'], { once: true, dur: 0.65, fade: 0.05 });
      p.fx.magicCircle(p.position, { color: 0xffc040, radius: 1.8, duration: 0.9, style: 2, seed: 123, rot: 4 });
    },
    update(p, dt, s, d) {
      const g = p.game, fx = p.fx;
      if (!d.done && p.stateT > 0.38) {
        d.done = true;
        fx.shockwave(p.position, { color: p.elColor, radius: 2.5, duration: 0.4 });
        const hit = new Set();
        for (let i = 0; i < 9; i++) {
          setTimeout(() => {
            const q = p.position.clone().addScaledVector(d.dir, 1.8 + i * 1.6); q.y = g.world.heightAt(q.x, q.z);
            fx.spikes(q, { color: p.elColor, count: 6, radius: 1.3, height: 2.4 + i * 0.1, duration: 1.8, ice: true });
            fx.cloudBurst(q.clone().setY(q.y + 0.8), { color: 0x9fdcff, color2: 0xffffff, radius: 2, count: 6, life: 0.9, rise: 0.5, speed: 0.6 });
            fx.sparks.burst(q.clone().setY(q.y + 0.6), 10, { speed: 5, up: 4, life: 0.4, size: 0.35, color: new THREE.Color(1, 1, 1), color1: C(p.elColor), gravity: 8 });
            fx.dust.burst(q.clone().setY(q.y + 0.4), 6, { speed: 2, up: 1, life: 1, size: 1.4, size1: 2.5, color: new THREE.Color(0.85, 0.95, 1), drag: 2 });
            if (i % 3 === 0) g.audio.play('crit');
            g.combat.inCircle(q, 1.8, (m) => { if (hit.has(m)) return; hit.add(m); g.combat.playerHit(m, p.skillMult(s.mult), { color: p.elColor, knock: 1, slow: 3, from: p.position }); });
          }, i * 60);
        }
        g.engine.shake(0.5);
      }
      if (p.stateT > 0.7) p.toMove();
    },
  },

  thunder: {
    start(p, s, d) {
      const g = p.game, fx = p.fx;
      p.skillLock = true;
      p.anim(['ST_Channel', 'Cast', 'Attack3'], { once: true, dur: 0.9, fade: 0.08 });
      fx.magicCircle(p.position, { color: 0xffc040, radius: 2, duration: 1.2, style: 0, seed: 125, rot: 4 });
      const t = targetPoint(p, 14, 7);
      d.center = t.point;
      const c = d.center;
      fx.magicCircle(c, { color: 0x8a7bff, radius: 7, duration: 2.1, style: 2, seed: 11, rot: 1.2 });
      fx.magicCircle(c.clone().setY(c.y + 14), { color: 0xb7a8ff, radius: 5, duration: 2.0, style: 0, seed: 4, rot: -2, y: 0 });
      fx.magicCircle(p.position, { color: p.elColor, radius: 2.2, duration: 1.0, style: 1, seed: 2, rot: 3 });
      g.audio.play('charge');
    },
    update(p, dt, s, d) {
      const g = p.game, fx = p.fx;
      if (p.stateT > 0.45 && p.stateT < 1.75) {
        d.acc = (d.acc || 0) + dt;
        while (d.acc > 0.11) {
          d.acc -= 0.11;
          const c = d.center;
          const enemies = g.combat.monsters.filter((m) => !m.dead && m.position.distanceTo(c) < 7.5);
          let q;
          if (enemies.length && Math.random() < 0.7) { q = enemies[Math.floor(Math.random() * enemies.length)].position.clone(); q.x += Math.random() - 0.5; q.z += Math.random() - 0.5; }
          else { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 6.5; q = V(c.x + Math.cos(a) * r, 0, c.z + Math.sin(a) * r); }
          q.y = g.world.heightAt(q.x, q.z);
          const top = q.clone().add(V((Math.random() - 0.5) * 4, 15, (Math.random() - 0.5) * 4));
          fx.lightning(top, q, { color: 0x8f7bff, core: 0xf0ecff, width: 0.09, duration: 0.3, segments: 14, jitter: 1.4, branches: 3 });
          fx.shockwave(q, { color: 0x9b8bff, radius: 2.4, duration: 0.35 });
          fx.scorch(q, 1.6, 0x9b7bff, 3.5);
          fx.streaks(q.clone().setY(q.y + 0.3), 18, { speed: 12, up: 4, life: 0.35, size: 0.16, color: new THREE.Color(0xffffff), color1: new THREE.Color(0x7b6bff), gravity: 12 });
          fx.starFlash(q.clone().setY(q.y + 0.4), new THREE.Color(0xa898ff), 3, 0.18);
          fx.smokePuff(q, { count: 2, size: 1.0, size1: 2.6, life: 1.2, alpha: 0.4, rise: 1 });
          fx.light(q.clone().setY(q.y + 2), 0xa090ff, 60, 0.25, 18);
          if (Math.random() < 0.35) g.engine.ripple(q.clone().setY(q.y + 1), 0.5, 1.6, 0.2);
          g.engine.shake(0.35);
          g.audio.play('thunder');
          hitCircle(p, q, 2.4, s.mult * 0.45, { knock: 0.5, noFx: true });
        }
      }
      if (p.stateT > 0.95) p.skillLock = false;
      if (p.stateT > 1.0) p.skillMove = 1;
      if (p.stateT > 1.8) p.toMove();
    },
  },

  // ULT: doomsday meteor storm
  st_meteor: {
    start(p, s, d) {
      const g = p.game, fx = p.fx;
      p.skillLock = true; p.invuln = 3.4;
      p.anim(['ST_Channel', 'Cast'], { dur: 1.0, fade: 0.08 });
      const t = targetPoint(p, 18, 10);
      d.c = t.point;
      const c = d.c;
      g.cinematic(3.4, c);
      g.audio.play('charge'); g.audio.play('choir');
      fx.magicCircle(p.position, { color: 0xffc040, radius: 3, duration: 3, style: 2, seed: 131, rot: 3 });
      fx.pillar(p.position, { color: p.elColor, color2: p.elColor2, radius: 1.2, height: 30, duration: 2.6, speed: 3 });
      fx.magicCircle(c, { color: p.elColor, radius: 10, duration: 3.4, style: 0, seed: 132, rot: 0.6 });
      [24, 28, 32].forEach((h, i) => fx.magicCircle(c.clone().setY(c.y + h), { color: i === 1 ? p.elColor2 : p.elColor, radius: 6 + i * 2.5, duration: 3.0, style: i, seed: 133 + i, rot: i % 2 ? -1 : 1, y: 0 }));
      g.engine.grade.uniforms.uDesat.value = 0.25;
      setTimeout(() => { g.engine.grade.uniforms.uDesat.value = 0; }, 3200);
    },
    update(p, dt, s, d) {
      const g = p.game;
      if (p.stateT > 0.5 && p.stateT < 2.0) {
        d.acc = (d.acc || 0) + dt;
        while (d.acc > 0.12) {
          d.acc -= 0.12;
          const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 8;
          const at = V(d.c.x + Math.cos(a) * r, 0, d.c.z + Math.sin(a) * r); at.y = g.world.heightAt(at.x, at.z);
          meteor(p, at, 0.8 + Math.random() * 0.5, p.skillMult(s.mult * 0.08));
        }
      }
      if (!d.big && p.stateT > 1.6) { d.big = true; meteor(p, d.c.clone(), 4, p.skillMult(s.mult * 0.7), 0, true); }
      if (p.stateT > 3.2) p.toMove();
    },
  },
};
