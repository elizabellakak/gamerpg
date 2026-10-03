import * as THREE from 'three';
import { ParticleSystem, makeSparkSystem } from './particles.js';
import {
  arcGeometry, slashMaterial, ringMaterial, pillarMaterial, magicCircleMaterial, tornadoMaterial,
  decalMaterial, ghostMaterial, basicAdd, globalUniforms, auraShellMaterial,
} from './materials.js';

const tmpV = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const col = (c) => (c instanceof THREE.Color ? c : new THREE.Color(c));

export class FX {
  constructor(scene, engine) {
    this.scene = scene;
    this.engine = engine;
    this.effects = [];
    this.glow = new ParticleSystem(9000);
    this.sparks = makeSparkSystem(2500);
    this.dust = new ParticleSystem(2500, { dust: true });
    scene.add(this.glow.points, this.sparks.points, this.dust.points);
    this.planeGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    // pooled lights
    this.lights = [];
    for (let i = 0; i < 6; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 12, 2);
      l.userData.t = 0; l.userData.dur = 1; l.userData.peak = 0;
      scene.add(l); this.lights.push(l);
    }
    this.heightAt = () => 0;
  }

  setScene(scene) {
    // move shared systems into another scene (showcase)
    for (const o of [this.glow.points, this.sparks.points, this.dust.points, ...this.lights]) scene.add(o);
    this.scene = scene;
  }

  add(effect) { this.effects.push(effect); return effect; }

  update(dt) {
    globalUniforms.uTime.value += dt;
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i];
      let alive = true;
      try { alive = e.update(dt); } catch (err) { console.error(err); alive = false; }
      if (!alive) {
        if (e.dispose) e.dispose();
        this.effects.splice(i, 1);
      }
    }
    this.glow.update(dt); this.sparks.update(dt); this.dust.update(dt);
    for (const l of this.lights) {
      if (l.intensity <= 0) continue;
      l.userData.t += dt;
      const k = 1 - l.userData.t / l.userData.dur;
      l.intensity = k > 0 ? l.userData.peak * k * k : 0;
    }
  }

  light(pos, color, intensity = 30, dur = 0.4, distance = 14) {
    let best = this.lights[0];
    for (const l of this.lights) if (l.intensity < best.intensity) best = l;
    best.position.copy(pos);
    best.color.set(color);
    best.distance = distance;
    best.userData.t = 0; best.userData.dur = dur; best.userData.peak = intensity;
    best.intensity = intensity;
  }

  mesh(geo, mat, parent = this.scene) {
    const m = new THREE.Mesh(geo, mat);
    m.renderOrder = 5;
    m.frustumCulled = false;
    parent.add(m);
    return m;
  }

  // Generic timed effect with update(t01, dt)
  timed(duration, onUpdate, onEnd) {
    let t = 0;
    return this.add({
      update: (dt) => { t += dt; const k = Math.min(1, t / duration); onUpdate(k, dt, t); return t < duration; },
      dispose: onEnd,
    });
  }

  // ---------- primitives ----------
  slash(pos, yaw, { color = 0xffffff, color2 = 0xffffff, radius = 2.6, width = 1.3, angle = Math.PI * 1.1, tilt = 0, flip = false, duration = 0.32, y = 1.1, pitch = 0 } = {}) {
    const geo = arcGeometry(radius - width, radius, angle, 40);
    const mat = slashMaterial(color, color2);
    const root = new THREE.Object3D();
    root.position.set(pos.x, pos.y + y, pos.z);
    root.rotation.order = 'YXZ';
    root.rotation.set(pitch, yaw, tilt);
    this.scene.add(root);
    const m = this.mesh(geo, mat, root);
    if (flip) m.scale.x = -1;
    return this.timed(duration + 0.18, (k, dt, t) => {
      mat.uniforms.uProgress.value = Math.min(1, t / duration);
      mat.uniforms.uFade.value = t > duration ? 1 - (t - duration) / 0.18 : 1;
      m.scale.setScalar(1 + k * 0.08); if (flip) m.scale.x *= -1;
    }, () => { this.scene.remove(root); geo.dispose(); mat.dispose(); });
  }

  shockwave(pos, { color = 0xffffff, radius = 6, duration = 0.5, y = 0.15, width = 0.25, start = 0.2, vertical = false } = {}) {
    const mat = ringMaterial(color, { width });
    const m = this.mesh(this.planeGeo, mat);
    m.position.set(pos.x, pos.y + y, pos.z);
    if (vertical) m.rotation.x = Math.PI / 2;
    return this.timed(duration, (k) => {
      const e = 1 - Math.pow(1 - k, 3);
      const s = (start + (1 - start) * e) * radius * 2;
      m.scale.set(s, 1, s);
      mat.uniforms.uOpacity.value = 1 - k;
    }, () => { this.scene.remove(m); mat.dispose(); });
  }

  pillar(pos, { color = 0xffffff, color2 = 0xffffff, radius = 1.2, height = 12, duration = 1.0, grow = 0.15, speed = 1.5 } = {}) {
    const geo = new THREE.CylinderGeometry(radius, radius * 0.6, height, 32, 1, true).translate(0, height / 2, 0);
    const mat = pillarMaterial(color, color2);
    mat.uniforms.uSpeed.value = speed;
    const m = this.mesh(geo, mat);
    m.position.copy(pos);
    return this.timed(duration, (k) => {
      const g = Math.min(1, k / grow);
      m.scale.set(0.3 + g * 0.7 + k * 0.2, g, 0.3 + g * 0.7 + k * 0.2);
      mat.uniforms.uOpacity.value = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
    }, () => { this.scene.remove(m); geo.dispose(); mat.dispose(); });
  }

  magicCircle(pos, { color = 0xffffff, radius = 4, duration = 2, seed = 1, style = 0, rot = 1, y = 0.08, follow = null, vertical = false, fadeIn = 0.25, fadeOut = 0.3, opacity = 1 } = {}) {
    const mat = magicCircleMaterial(color, seed, style);
    mat.uniforms.uPulse.value = 1;
    const m = this.mesh(this.planeGeo, mat);
    m.scale.set(radius * 2, 1, radius * 2);
    m.position.set(pos.x, pos.y + y, pos.z);
    if (vertical) { m.rotation.x = Math.PI / 2; }
    let t = 0, dur = duration;
    const eff = this.add({
      mesh: m, mat,
      end() { dur = Math.min(dur, t + fadeOut); },
      update: (dt) => {
        t += dt;
        if (follow) m.position.set(follow.position.x, follow.position.y + y, follow.position.z);
        mat.uniforms.uRot.value += dt * rot;
        const fi = Math.min(1, t / fadeIn);
        const fo = Math.min(1, Math.max(0, (dur - t) / fadeOut));
        mat.uniforms.uOpacity.value = fi * fo * opacity;
        const s = radius * 2 * (0.6 + 0.4 * (1 - Math.pow(1 - fi, 3)));
        m.scale.set(s, 1, s);
        return t < dur;
      },
      dispose: () => { m.parent && m.parent.remove(m); mat.dispose(); },
    });
    return eff;
  }

  // jagged bolt from a to b
  lightning(a, b, { color = 0x9b7bff, core = 0xffffff, width = 0.07, duration = 0.35, segments = 12, jitter = 0.8, branches = 2 } = {}) {
    const group = new THREE.Group();
    this.scene.add(group);
    const mats = [];
    const makeBolt = (p0, p1, w, jit, segs) => {
      const pts = [];
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const p = new THREE.Vector3().lerpVectors(p0, p1, t);
        if (i > 0 && i < segs) p.add(new THREE.Vector3((Math.random() - 0.5) * jit, (Math.random() - 0.5) * jit * 0.5, (Math.random() - 0.5) * jit));
        pts.push(p);
      }
      const path = new THREE.CurvePath();
      for (let i = 0; i < pts.length - 1; i++) path.add(new THREE.LineCurve3(pts[i], pts[i + 1]));
      const g1 = new THREE.TubeGeometry(path, segs * 2, w, 5, false);
      const g2 = new THREE.TubeGeometry(path, segs * 2, w * 4, 6, false);
      const m1 = basicAdd(core, 1), m2 = basicAdd(color, 0.45);
      mats.push(m1, m2);
      group.add(new THREE.Mesh(g1, m1), new THREE.Mesh(g2, m2));
      return pts;
    };
    const pts = makeBolt(a, b, width, jitter, segments);
    for (let i = 0; i < branches; i++) {
      const s = pts[1 + Math.floor(Math.random() * (pts.length - 3))];
      const e = s.clone().add(new THREE.Vector3((Math.random() - 0.5) * 4, -Math.random() * 3, (Math.random() - 0.5) * 4));
      makeBolt(s, e, width * 0.6, jitter * 0.6, 6);
    }
    group.children.forEach((c) => { c.renderOrder = 6; c.frustumCulled = false; });
    return this.timed(duration, (k) => {
      const flick = Math.random() > 0.25 ? 1 : 0.2;
      for (let i = 0; i < mats.length; i++) mats[i].opacity = (i % 2 ? 0.45 : 1) * (1 - k) * flick;
    }, () => {
      this.scene.remove(group);
      group.traverse((o) => o.geometry && o.geometry.dispose());
      mats.forEach((m) => m.dispose());
    });
  }

  tornado(follow, { color = 0xffffff, color2 = 0xffffff, radius = 3.2, height = 3.2, duration = 2.5 } = {}) {
    const group = new THREE.Group();
    this.scene.add(group);
    const layers = [];
    for (let i = 0; i < 3; i++) {
      const r1 = radius * (0.65 + i * 0.2), r0 = r1 * 0.55;
      const geo = new THREE.CylinderGeometry(r1, r0, height * (1 - i * 0.12), 40, 1, true).translate(0, height * (1 - i * 0.12) / 2, 0);
      const mat = tornadoMaterial(color, color2);
      mat.uniforms.uSpeed.value = 2.5 + i;
      const m = this.mesh(geo, mat, group);
      layers.push({ m, geo, mat, spin: 6 + i * 3 });
    }
    return this.timed(duration, (k, dt) => {
      group.position.copy(follow.position);
      const fade = Math.min(1, k * 8) * (k > 0.8 ? (1 - k) / 0.2 : 1);
      for (const L of layers) { L.m.rotation.y -= L.spin * dt; L.mat.uniforms.uOpacity.value = fade; }
      if (Math.random() < 0.8) {
        const a = Math.random() * Math.PI * 2, r = radius * (0.6 + Math.random() * 0.5);
        this.glow.emit(group.position.x + Math.cos(a) * r, group.position.y + Math.random() * height, group.position.z + Math.sin(a) * r,
          -Math.sin(a) * 8, 2, Math.cos(a) * 8, 0.5, 0.35, col(color2), { size1: 0, drag: 2 });
      }
    }, () => { this.scene.remove(group); layers.forEach((L) => { L.geo.dispose(); L.mat.dispose(); }); });
  }

  // ground telegraph; onDone fires when filled
  telegraph(pos, { radius = 3, angle = Math.PI * 2, yaw = 0, duration = 1, color = 0xff2a2a, onDone = null } = {}) {
    const mat = decalMaterial(color);
    mat.uniforms.uAngle.value = angle;
    const m = this.mesh(this.planeGeo, mat);
    m.position.set(pos.x, this.heightAt(pos.x, pos.z) + 0.12, pos.z);
    m.rotation.y = yaw;
    m.scale.set(radius * 2, 1, radius * 2);
    let fired = false;
    return this.timed(duration + 0.15, (k, dt, t) => {
      mat.uniforms.uFill.value = Math.min(1, t / duration);
      if (t >= duration && !fired) { fired = true; onDone && onDone(); }
      mat.uniforms.uOpacity.value = t > duration ? 1 - (t - duration) / 0.15 : 1;
    }, () => { this.scene.remove(m); mat.dispose(); });
  }

  // Snapshot of an object's meshes as glowing ghost
  afterimage(root, color = 0x88ccff, duration = 0.45) {
    const mat = ghostMaterial(color);
    const group = new THREE.Group();
    root.updateMatrixWorld(true);
    root.traverse((o) => {
      if (o.isMesh && o.visible && !o.userData.noGhost && !o.isSkinnedMesh) {
        const g = new THREE.Mesh(o.geometry, mat);
        o.matrixWorld.decompose(g.position, g.quaternion, g.scale);
        g.frustumCulled = false;
        group.add(g);
      }
    });
    this.scene.add(group);
    return this.timed(duration, (k) => { mat.uniforms.uOpacity.value = 1 - k; }, () => { this.scene.remove(group); mat.dispose(); });
  }

  // Combined hit impact
  impact(pos, color = 0xffffff, scale = 1, { crit = false } = {}) {
    const c = col(color);
    this.sparks.burst(pos, Math.round(10 * scale), { speed: 9 * scale, life: 0.25, lifeVar: 0.2, size: 0.5 * scale, color: new THREE.Color(1, 1, 1), color1: c, drag: 4 });
    this.glow.burst(pos, Math.round(14 * scale), { speed: 5 * scale, life: 0.35, lifeVar: 0.3, size: 0.45 * scale, color: c, drag: 3 });
    if (crit) {
      this.sparks.burst(pos, 14, { speed: 14, life: 0.3, size: 0.9, color: new THREE.Color(1, 0.95, 0.7), color1: c, drag: 5 });
      this.flare(pos, c, 2.4 * scale, 0.18);
    } else this.flare(pos, c, 1.3 * scale, 0.12);
  }

  // billboard flash sprite
  flare(pos, color, size = 2, duration = 0.15) {
    const mat = new THREE.SpriteMaterial({ map: this.glow.mat.uniforms.uTex.value, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false });
    const s = new THREE.Sprite(mat);
    s.position.copy(pos); s.renderOrder = 8;
    this.scene.add(s);
    return this.timed(duration, (k) => { s.scale.setScalar(size * (0.6 + k * 0.8)); mat.opacity = 1 - k; }, () => { this.scene.remove(s); mat.dispose(); });
  }

  // Embers / sparkles rising in a radius
  rise(pos, { color = 0xffffff, color1 = null, count = 30, radius = 2, speed = 3, life = 1.2, size = 0.3 } = {}) {
    const c = col(color), c1 = color1 ? col(color1) : null;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * radius;
      this.glow.emit(pos.x + Math.cos(a) * r, pos.y + Math.random() * 0.3, pos.z + Math.sin(a) * r,
        (Math.random() - 0.5) * 0.6, speed * (0.5 + Math.random()), (Math.random() - 0.5) * 0.6,
        life * (0.6 + Math.random() * 0.8), size * (0.5 + Math.random()), c, { color1: c1, drag: 0.5 });
    }
  }

  debris(pos, { count = 20, speed = 8, color = 0x6b5a48, size = 0.35 } = {}) {
    const c = col(color);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, sp = speed * (0.4 + Math.random() * 0.6);
      this.dust.emit(pos.x, pos.y + 0.2, pos.z, Math.cos(a) * sp * 0.6, sp * (0.6 + Math.random() * 0.6), Math.sin(a) * sp * 0.6,
        0.9 + Math.random() * 0.5, size * (0.6 + Math.random()), c, { gravity: 16, drag: 0.6 });
    }
    // dust cloud
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, sp = speed * 0.5 * Math.random();
      this.dust.emit(pos.x, pos.y + 0.3, pos.z, Math.cos(a) * sp, Math.random() * 1.5, Math.sin(a) * sp,
        1.2 + Math.random() * 0.8, 1.2 + Math.random(), new THREE.Color(0.75, 0.7, 0.62), { size1: 3, drag: 2.5 });
    }
  }

  // Shell glow over all meshes in root (returns handle with .setVisible/.dispose/.material)
  shell(root, color, color2, opts = {}) {
    const mat = auraShellMaterial(color, color2, opts);
    const shells = [];
    root.traverse((o) => {
      if (o.isMesh && !o.userData.isShell && !o.userData.noShell) {
        const s = new THREE.Mesh(o.geometry, mat);
        s.userData.isShell = true; s.userData.noGhost = true; s.userData.noShell = true;
        s.renderOrder = 4; s.castShadow = false; s.receiveShadow = false;
        shells.push([o, s]);
      }
    });
    for (const [o, s] of shells) o.add(s);
    return {
      material: mat,
      dispose() { for (const [o, s] of shells) o.remove(s); mat.dispose(); },
      setVisible(v) { for (const [, s] of shells) s.visible = v; },
    };
  }

  clearAll() {
    for (const e of this.effects) if (e.dispose) e.dispose();
    this.effects.length = 0;
  }
}

export { UP, tmpV };
