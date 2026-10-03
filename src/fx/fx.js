import * as THREE from 'three';
import { ParticleSystem, makeSparkSystem } from './particles.js';
import { SpriteSystem, RockSystem } from './sprites.js';
import { flipbook, streakTex, starTex, slashTex, spikeBurstTex, swirlTex, novaTex, tongueTex } from './vfxtex.js';
import {
  arcGeometry, slashMaterial, ringMaterial, pillarMaterial, magicCircleMaterial, tornadoMaterial,
  decalMaterial, ghostMaterial, basicAdd, globalUniforms, auraShellMaterial, scorchMaterial, hexShieldMaterial, spiritMaterial, slashMaterial2, shockSphereMaterial,
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
    // volumetric VFX layers
    const fireFB = flipbook('fire'), smokeFB = flipbook('smoke');
    this.fire = new SpriteSystem(1400, { map: fireFB.tex, cols: fireFB.cols, rows: fireFB.rows, mode: 'fire' });
    this.smoke = new SpriteSystem(1000, { map: smokeFB.tex, cols: smokeFB.cols, rows: smokeFB.rows, mode: 'smoke' });
    this.streak = new SpriteSystem(2600, { map: streakTex(), mode: 'add', stretch: 0.09 });
    this.star = new SpriteSystem(260, { map: starTex(4), mode: 'add' });
    this.cloud = new SpriteSystem(900, { map: smokeFB.tex, cols: smokeFB.cols, rows: smokeFB.rows, mode: 'cloud', intensity: 0.75 });
    this.spike = new SpriteSystem(160, { map: spikeBurstTex(), mode: 'add' });
    this.tongue = new SpriteSystem(500, { map: tongueTex(), mode: 'add', stretch: 0.05 });
    this.rocks = new RockSystem(300, (x, z) => this.heightAt(x, z));
    this.layers = [this.fire, this.smoke, this.streak, this.star, this.cloud, this.spike, this.tongue];
    for (const l of this.layers) scene.add(l.mesh);
    scene.add(this.rocks.mesh);
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
    for (const o of [this.glow.points, this.sparks.points, this.dust.points, ...this.lights, ...this.layers.map((l) => l.mesh), this.rocks.mesh]) scene.add(o);
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
    for (const l of this.layers) l.update(dt);
    this.rocks.update(dt);
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
    intensity *= 0.5;
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
  slash(pos, yaw, { color = 0xffffff, color2 = 0xffffff, radius = 2.6, width = 1.3, angle = Math.PI * 1.1, tilt = 0, flip = false, duration = 0.32, y = 1.1, pitch = 0, sparks = true } = {}) {
    // layered brush-stroke slash: main arc + offset second layer (depth) + thin core + edge sparks
    const root = new THREE.Object3D();
    root.position.set(pos.x, pos.y + y, pos.z);
    root.rotation.order = 'YXZ';
    root.rotation.set(pitch, yaw, tilt);
    this.scene.add(root);
    root.updateMatrixWorld(true);
    const layers = [];
    const mk = (rIn, rOut, ang, seed, gain, trail, ox, rx) => {
      const geo = arcGeometry(rIn, rOut, ang, 48);
      const mat = slashMaterial2(slashTex(seed), color, color2);
      mat.uniforms.uGain.value = gain; mat.uniforms.uTrail.value = trail;
      const m = this.mesh(geo, mat, root);
      m.position.y = ox; m.rotation.x = rx;
      if (flip) m.scale.x = -1;
      layers.push({ geo, mat, m });
    };
    mk(radius - width, radius, angle, 1, 1.0, 0.85, 0, 0);
    mk(radius - width * 0.75, radius * 0.94, angle * 0.96, 2, 0.55, 0.6, 0.12, 0.09);
    mk(radius - width * 1.1, radius * 1.05, angle * 1.02, 3, 0.35, 1.0, -0.1, -0.07);
    const c1 = col(color), c2 = col(color2), white = new THREE.Color(1, 1, 1);
    const hp = new THREE.Vector3();
    return this.timed(duration + 0.22, (k, dt, t) => {
      const prog = Math.min(1, t / duration);
      const fade = t > duration ? 1 - (t - duration) / 0.22 : 1;
      for (const L of layers) {
        L.mat.uniforms.uProgress.value = prog; L.mat.uniforms.uFade.value = fade;
        const sc = 1 + k * 0.06; L.m.scale.set(flip ? -sc : sc, 1, sc);
      }
      if (sparks && t < duration) {
        const u = Math.min(1, prog * 1.35);
        const a = -angle / 2 + u * angle;
        hp.set(Math.sin(a) * radius * (flip ? -1 : 1), 0, Math.cos(a) * radius).applyMatrix4(root.matrixWorld);
        const tx = Math.cos(a) * (flip ? -1 : 1), tz = -Math.sin(a);
        for (let i = 0; i < 2; i++) {
          const dir = new THREE.Vector3(tx + (Math.random() - 0.5) * 0.5, (Math.random() - 0.2) * 0.8, tz + (Math.random() - 0.5) * 0.5).transformDirection(root.matrixWorld).multiplyScalar(6 + Math.random() * 8);
          this.streak.emit(hp.x, hp.y, hp.z, { vx: dir.x, vy: dir.y, vz: dir.z, life: 0.22 + Math.random() * 0.15, size: 0.12, color: white, color1: c2, alpha: 1, alpha1: 0, gravity: 9, drag: 2.5 });
        }
        if (Math.random() < 0.5) this.glow.emit(hp.x, hp.y, hp.z, 0, 0.3, 0, 0.25, 0.45, c1, { color1: c2, drag: 1 });
      }
    }, () => { this.scene.remove(root); layers.forEach((L) => { L.geo.dispose(); L.mat.dispose(); }); });
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
        this.streak.emit(group.position.x + Math.cos(a) * r, group.position.y + Math.random() * height, group.position.z + Math.sin(a) * r,
          { vx: -Math.sin(a) * 12, vy: 2, vz: Math.cos(a) * 12, life: 0.35, size: 0.14, color: col(color2), alpha: 1, alpha1: 0, drag: 1 });
      }
      if (Math.random() < 0.35) {
        const a = Math.random() * Math.PI * 2, r = radius * 0.9;
        this.smoke.emit(group.position.x + Math.cos(a) * r, group.position.y + 0.2, group.position.z + Math.sin(a) * r,
          { vx: -Math.sin(a) * 6, vy: 2.5, vz: Math.cos(a) * 6, life: 1.0, size: 1.0, size1: 2.4, color: new THREE.Color(0.6, 0.56, 0.5), alpha: 0.35, alpha1: 0, drag: 1.2 });
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

  scorch(pos, radius = 3, color = 0xff7a20, duration = 5) {
    const mat = scorchMaterial(color);
    const m = this.mesh(this.planeGeo, mat);
    m.renderOrder = 1;
    m.position.set(pos.x, this.heightAt(pos.x, pos.z) + 0.07, pos.z);
    m.rotation.y = Math.random() * Math.PI * 2;
    m.scale.set(radius * 2, 1, radius * 2);
    return this.timed(duration, (k) => {
      mat.uniforms.uGlow.value = Math.max(0, 1 - k * 2.2);
      mat.uniforms.uLife.value = k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25;
    }, () => { this.scene.remove(m); mat.dispose(); });
  }

  // Erupting spikes (rock or ice) around a point
  spikes(pos, { color = 0x6fe7ff, count = 7, radius = 1.4, height = 2.2, duration = 1.4, ice = true } = {}) {
    if (!this._spikeGeo) this._spikeGeo = new THREE.ConeGeometry(0.28, 1, 5, 1).translate(0, 0.5, 0);
    const mat = ice
      ? new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.35), emissive: color, emissiveIntensity: 1.6, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.92, flatShading: true })
      : new THREE.MeshStandardMaterial({ color: 0x4a3f36, emissive: color, emissiveIntensity: 0.0, roughness: 0.9, flatShading: true, transparent: true });
    const im = new THREE.InstancedMesh(this._spikeGeo, mat, count);
    im.castShadow = true;
    const data = [];
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.6, r = i === 0 ? 0 : radius * (0.4 + Math.random() * 0.6);
      const x = pos.x + Math.cos(a) * r, z = pos.z + Math.sin(a) * r;
      data.push({ x, z, y: this.heightAt(x, z), h: height * (i === 0 ? 1.2 : 0.5 + Math.random() * 0.6), w: 0.8 + Math.random() * 0.8,
        rx: (Math.random() - 0.5) * 0.6 + (r ? Math.sin(a) * 0.25 : 0), rz: (Math.random() - 0.5) * 0.6 - (r ? Math.cos(a) * 0.25 : 0), d: Math.random() * 0.08 });
    }
    this.scene.add(im);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), p = new THREE.Vector3();
    return this.timed(duration, (k, dt, t) => {
      for (let i = 0; i < count; i++) {
        const s = data[i];
        const tt = Math.max(0, t - s.d);
        const up = Math.min(1, tt / 0.1);
        const down = t > duration - 0.35 ? 1 - (t - (duration - 0.35)) / 0.35 : 1;
        const hh = s.h * (1 - Math.pow(1 - up, 3)) * Math.max(0.001, down);
        e.set(s.rx, i, s.rz); q.setFromEuler(e); sc.set(s.w, hh, s.w); p.set(s.x, s.y - 0.1, s.z);
        m4.compose(p, q, sc); im.setMatrixAt(i, m4);
      }
      im.instanceMatrix.needsUpdate = true;
      if (!ice) mat.emissiveIntensity = Math.max(0, 1.5 - t * 2);
    }, () => { this.scene.remove(im); mat.dispose(); im.dispose(); });
  }

  // Spiral drill cone pointing along dir
  drill(from, dir, { length = 8, radius = 1.4, color = 0xffffff, color2 = 0xffffff, duration = 0.4 } = {}) {
    // wide end at the origin, point leading along +Z
    const geo = new THREE.ConeGeometry(radius, length, 32, 1, true).rotateX(Math.PI / 2).translate(0, 0, length / 2);
    const mats = [tornadoMaterial(color, color2), tornadoMaterial(color2, 0xffffff)];
    mats[0].uniforms.uSpeed.value = 6; mats[1].uniforms.uSpeed.value = 9;
    const root = new THREE.Object3D();
    root.position.copy(from);
    root.lookAt(from.clone().add(dir));
    const m1 = this.mesh(geo, mats[0], root); const m2 = this.mesh(geo, mats[1], root);
    m2.scale.set(0.6, 0.6, 1.02);
    this.scene.add(root);
    return this.timed(duration, (k, dt) => {
      const grow = Math.min(1, k * 5);
      root.scale.set(1, 1, grow);
      m1.rotation.z += dt * 14; m2.rotation.z -= dt * 20;
      const f = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
      mats[0].uniforms.uOpacity.value = f; mats[1].uniforms.uOpacity.value = f;
    }, () => { this.scene.remove(root); geo.dispose(); mats.forEach((m) => m.dispose()); });
  }

  // Straight energy beam with spiral sleeve and travelling rings
  beam(from, dir, { length = 40, radius = 1.2, color = 0xffffff, color2 = 0xffffff, duration = 1.0 } = {}) {
    const root = new THREE.Object3D();
    root.position.copy(from);
    root.lookAt(from.clone().add(dir));
    this.scene.add(root);
    const core = new THREE.CylinderGeometry(radius * 0.35, radius * 0.35, length, 20, 1, true).rotateX(Math.PI / 2).translate(0, 0, length / 2);
    const sleeve = new THREE.CylinderGeometry(radius, radius, length, 32, 1, true).rotateX(Math.PI / 2).translate(0, 0, length / 2);
    const mCore = basicAdd(0xffffff, 1);
    const mSleeve = tornadoMaterial(color, color2); mSleeve.uniforms.uSpeed.value = 8;
    const mSleeve2 = tornadoMaterial(color2, color); mSleeve2.uniforms.uSpeed.value = -6;
    const a = this.mesh(core, mCore, root), b = this.mesh(sleeve, mSleeve, root), c = this.mesh(sleeve, mSleeve2, root);
    c.scale.set(1.5, 1.5, 1);
    const rings = [];
    for (let i = 0; i < 5; i++) {
      const rm = ringMaterial(color2, { noise: false });
      const r = this.mesh(this.planeGeo, rm, root);
      r.rotation.x = Math.PI / 2; r.userData.z = (i / 5) * length; r.userData.mat = rm;
      rings.push(r);
    }
    return this.timed(duration, (k, dt) => {
      const w = k < 0.1 ? k / 0.1 : k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      root.scale.set(w, w, 1);
      b.rotation.z += dt * 10; c.rotation.z -= dt * 7;
      mCore.opacity = w;
      for (const r of rings) {
        r.userData.z = (r.userData.z + dt * length * 1.2) % length;
        r.position.z = r.userData.z;
        const s = radius * 3.2 * (0.7 + 0.3 * Math.sin(r.userData.z));
        r.scale.set(s, 1, s);
        r.userData.mat.uniforms.uOpacity.value = w * 0.8;
      }
    }, () => { this.scene.remove(root); core.dispose(); sleeve.dispose(); mCore.dispose(); mSleeve.dispose(); mSleeve2.dispose(); rings.forEach((r) => r.userData.mat.dispose()); });
  }

  // Hex barrier dome following an object
  dome(follow, { radius = 2.2, color = 0xffd86b, duration = 6 } = {}) {
    const geo = new THREE.IcosahedronGeometry(radius, 4);
    const mat = hexShieldMaterial(color);
    const m = this.mesh(geo, mat);
    let t = 0, dur = duration;
    return this.add({
      mat, hit() { mat.uniforms.uHit.value = 1; }, end() { dur = Math.min(dur, t + 0.3); },
      update: (dt) => {
        t += dt;
        m.position.copy(follow.position); m.position.y += radius * 0.45;
        const k = Math.min(1, t / 0.25);
        m.scale.setScalar(0.6 + 0.4 * (1 - Math.pow(1 - k, 3)));
        mat.uniforms.uOpacity.value = Math.min(k, Math.max(0, (dur - t) / 0.3));
        mat.uniforms.uHit.value *= Math.pow(0.02, dt);
        m.rotation.y += dt * 0.3;
        return t < dur;
      },
      dispose: () => { this.scene.remove(m); geo.dispose(); mat.dispose(); },
    });
  }

  // Spirit (e.g. dragon) flying along a curve; onArrive when head reaches end
  spirit(points, { color = 0xff7a1f, color2 = 0xffd04a, radius = 0.9, duration = 1.4, len = 0.4, onArrive = null } = {}) {
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
    const geo = new THREE.TubeGeometry(curve, 220, radius, 12, false);
    // taper toward tail via vertex scaling around the curve
    const mat = spiritMaterial(color, color2);
    mat.uniforms.uLen.value = len;
    const m = this.mesh(geo, mat);
    const head = new THREE.Vector3();
    let arrived = false;
    const c2 = col(color2), c1 = col(color);
    return this.timed(duration, (k) => {
      const h = Math.min(1 + len, k * (1 + len) * 1.15);
      mat.uniforms.uHead.value = h;
      const hk = Math.min(1, h);
      curve.getPoint(hk, head);
      if (h < 1) {
        this.glow.emit(head.x, head.y, head.z, 0, 0, 0, 0.35, radius * 2.4, c2, { color1: c1, size1: 0.2 });
        for (let i = 0; i < 3; i++) this.sparks.emit(head.x, head.y, head.z, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, 0.3, 0.3, c2, { color1: c1, drag: 2 });
      }
      if (!arrived && h >= 1) { arrived = true; onArrive && onArrive(head.clone()); }
      mat.uniforms.uOpacity.value = k > 0.85 ? 1 - (k - 0.85) / 0.15 : 1;
    }, () => { this.scene.remove(m); geo.dispose(); mat.dispose(); });
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

  // Combined hit impact: star flash, stretched sparks, soft glow, a little smoke
  impact(pos, color = 0xffffff, scale = 1, { crit = false } = {}) {
    const c = col(color), white = new THREE.Color(1, 1, 1);
    this.spikeBurst(pos, c, (crit ? 3.4 : 2.0) * scale, crit ? 0.3 : 0.2);
    this.streaks(pos, Math.round((crit ? 22 : 12) * scale), { speed: (crit ? 16 : 11) * scale, color: white, color1: c, life: 0.28, size: 0.14 * scale, gravity: 10 });
    this.glow.burst(pos, Math.round(8 * scale), { speed: 4 * scale, life: 0.3, lifeVar: 0.2, size: 0.5 * scale, color: c, drag: 3 });
    if (crit) this.cloudBurst(pos, { color: c, color2: white, radius: 1.4 * scale, count: 6, life: 0.5, rise: 0.3 });
  }

  starFlash(pos, color, size = 2, life = 0.15) {
    const c = col(color);
    this.star.emit(pos.x, pos.y, pos.z, { life, size: size * 0.6, size1: size, rot: Math.random() * Math.PI, rotV: 0, color: new THREE.Color(1, 1, 1), color1: c, alpha: 1, alpha1: 0 });
    this.star.emit(pos.x, pos.y, pos.z, { life: life * 1.4, size: size * 1.4, size1: size * 2.2, rot: Math.random() * Math.PI, rotV: 0, color: c, color1: c, alpha: 0.6, alpha1: 0 });
  }

  streaks(pos, n, { speed = 10, color, color1 = null, life = 0.35, size = 0.15, gravity = 8, up = 0, dir = null, spread = 1 } = {}) {
    const c = col(color || 0xffffff), c1 = color1 ? col(color1) : c;
    for (let i = 0; i < n; i++) {
      let d = new THREE.Vector3().randomDirection();
      if (dir) d.lerp(dir, 1 - spread).normalize();
      const sp = speed * (0.4 + Math.random() * 0.8);
      this.streak.emit(pos.x, pos.y, pos.z, { vx: d.x * sp, vy: d.y * sp + up, vz: d.z * sp, life: life * (0.6 + Math.random() * 0.8), size: size * (0.7 + Math.random() * 0.6), color: c, color1: c1, alpha: 1, alpha1: 0, gravity, drag: 1.6 });
    }
  }

  smokePuff(pos, { count = 6, size = 1.5, size1 = null, life = 1.6, color = null, alpha = 0.55, rise = 0.8, spread = 1, speed = 1.5 } = {}) {
    const c = color ? col(color) : new THREE.Color(0.42, 0.4, 0.38);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * spread;
      const sp = speed * (0.4 + Math.random());
      this.smoke.emit(pos.x + Math.cos(a) * r, pos.y + Math.random() * 0.3, pos.z + Math.sin(a) * r, {
        vx: Math.cos(a) * sp, vy: rise * (0.5 + Math.random()), vz: Math.sin(a) * sp,
        life: life * (0.7 + Math.random() * 0.6), size: size * (0.7 + Math.random() * 0.5), size1: (size1 ?? size * 2.4) * (0.8 + Math.random() * 0.4),
        rotV: (Math.random() - 0.5) * 0.8, color: c, color1: c.clone().multiplyScalar(0.8), alpha, alpha1: 0, drag: 1.4,
      });
    }
  }

  fireBurst(pos, { count = 10, size = 1.6, size1 = null, life = 0.7, color = 0xff6a10, speed = 4, up = 2, spread = 0.6 } = {}) {
    const c = col(color);
    for (let i = 0; i < count; i++) {
      const d = new THREE.Vector3().randomDirection();
      const sp = speed * (0.3 + Math.random());
      this.fire.emit(pos.x + d.x * spread, pos.y + Math.abs(d.y) * spread, pos.z + d.z * spread, {
        vx: d.x * sp, vy: Math.abs(d.y) * sp + up, vz: d.z * sp, life: life * (0.7 + Math.random() * 0.6),
        size: size * (0.6 + Math.random() * 0.6), size1: (size1 ?? size * 2) * (0.8 + Math.random() * 0.4), rotV: (Math.random() - 0.5) * 2,
        color: c, color1: c, alpha: 1, alpha1: 0.6, drag: 2,
      });
    }
  }

  shockSphere(pos, color, radius = 4, duration = 0.45) {
    if (!this._sphGeo) this._sphGeo = new THREE.SphereGeometry(1, 32, 20);
    const mat = shockSphereMaterial(color);
    const m = this.mesh(this._sphGeo, mat);
    m.position.copy(pos);
    return this.timed(duration, (k) => {
      const e = 1 - Math.pow(1 - k, 3);
      m.scale.set(radius * e, radius * e * 0.75, radius * e);
      mat.uniforms.uOpacity.value = 1 - k;
    }, () => { this.scene.remove(m); mat.dispose(); });
  }

  // ---- classic-MMO style primitives (matched to reference clips) ----

  // radial spike starburst flash
  spikeBurst(pos, color, size = 3, life = 0.28) {
    const c = col(color);
    this.spike.emit(pos.x, pos.y, pos.z, { life, size: size * 0.5, size1: size * 1.3, rot: Math.random() * 6.28, rotV: 0.5, color: new THREE.Color(1, 1, 1), color1: c, alpha: 1, alpha1: 0 });
    this.spike.emit(pos.x, pos.y, pos.z, { life: life * 1.3, size: size * 0.8, size1: size * 1.8, rot: Math.random() * 6.28, rotV: -0.4, color: c, color1: c, alpha: 0.8, alpha1: 0 });
  }

  // big billowing coloured energy cloud
  cloudBurst(pos, { color = 0x6fd0ff, color2 = 0xffffff, radius = 3, count = 18, life = 1.1, rise = 0.6, speed = 1 } = {}) {
    const c1 = col(color), c2 = col(color2);
    for (let i = 0; i < count; i++) {
      const d = new THREE.Vector3().randomDirection(); d.y = Math.abs(d.y) * 0.6;
      const r = Math.random() * radius * 0.45;
      const sp = radius * speed * (0.5 + Math.random() * 0.8);
      this.cloud.emit(pos.x + d.x * r, pos.y + d.y * r, pos.z + d.z * r, {
        vx: d.x * sp, vy: d.y * sp + rise, vz: d.z * sp, life: life * (0.6 + Math.random() * 0.7),
        size: radius * (0.45 + Math.random() * 0.35), size1: radius * (1.1 + Math.random() * 0.7), rotV: (Math.random() - 0.5) * 1.2,
        color: i % 3 === 0 ? c2 : c1, color1: c1, alpha: 1, alpha1: 0, drag: 2.2, frame0: Math.random() * 3,
      });
    }
  }

  // flat swirling vortex on the ground
  groundSwirl(pos, { color = 0x7fb8ff, color2 = 0xc890ff, radius = 5, duration = 0.9, spin = 5, y = 0.1 } = {}) {
    const g = this.planeGeo;
    const mk = (c, seed) => new THREE.MeshBasicMaterial({ map: swirlTex(seed), color: c, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
    const m1 = mk(col(color), 5), m2 = mk(col(color2), 9);
    const a = this.mesh(g, m1), b = this.mesh(g, m2);
    const gy = this.heightAt(pos.x, pos.z) + y;
    a.position.set(pos.x, gy, pos.z); b.position.set(pos.x, gy + 0.02, pos.z);
    return this.timed(duration, (k, dt) => {
      const e = 1 - Math.pow(1 - k, 2.5);
      const s1 = radius * 2 * (0.45 + e * 0.6), s2 = radius * 2 * (0.3 + e * 0.75);
      a.scale.set(s1, 1, s1); b.scale.set(s2, 1, s2);
      a.rotation.y -= dt * spin; b.rotation.y -= dt * spin * 1.4;
      const f = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
      m1.opacity = f; m2.opacity = f * 0.85;
    }, () => { this.scene.remove(a); this.scene.remove(b); m1.dispose(); m2.dispose(); });
  }

  // glowing ground disc with bright expanding rim
  groundNova(pos, { color = 0xffa030, radius = 4, duration = 0.7 } = {}) {
    const m = new THREE.MeshBasicMaterial({ map: novaTex(), color: col(color), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
    const mesh = this.mesh(this.planeGeo, m);
    mesh.position.set(pos.x, this.heightAt(pos.x, pos.z) + 0.1, pos.z);
    this.shockwave(pos, { color, radius: radius * 1.2, duration: duration * 0.8 });
    return this.timed(duration, (k) => {
      const e = 1 - Math.pow(1 - k, 3);
      const s = radius * 2 * (0.35 + e * 0.75);
      mesh.scale.set(s, 1, s);
      m.opacity = k < 0.1 ? k / 0.1 : 1 - (k - 0.1) / 0.9;
    }, () => { this.scene.remove(mesh); m.dispose(); });
  }

  // fan of flame tongues erupting upward
  flameRays(pos, { color = 0xff8a20, color2 = 0xffe070, count = 14, height = 4, spread = 0.9, life = 0.45 } = {}) {
    const c1 = col(color), c2 = col(color2);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, tilt = Math.random() * spread;
      const sp = height * (2.5 + Math.random() * 2.5);
      this.tongue.emit(pos.x, pos.y, pos.z, {
        vx: Math.cos(a) * Math.sin(tilt) * sp, vy: Math.cos(tilt) * sp, vz: Math.sin(a) * Math.sin(tilt) * sp,
        life: life * (0.6 + Math.random() * 0.6), size: height * 0.07, size1: height * 0.12, color: c2, color1: c1, alpha: 0.75, alpha1: 0, drag: 5, gravity: 0,
      });
    }
    this.fireBurst(pos, { count: Math.round(count * 0.35), size: height * 0.22, size1: height * 0.45, life: life * 1.2, color: c1, speed: height * 0.5, up: height * 0.7, spread: 0.4 });
  }

  // wispy energy wave travelling over the ground from a to b; onArrive at the end
  energyWave(from, to, { color = 0x8a8aff, color2 = 0xffffff, duration = 0.35, width = 1.2, onArrive = null } = {}) {
    const c1 = col(color), c2 = col(color2);
    const head = new THREE.Vector3();
    let arrived = false;
    return this.timed(duration + 0.05, (k) => {
      head.lerpVectors(from, to, Math.min(1, k));
      for (let i = 0; i < 4; i++) {
        this.cloud.emit(head.x + (Math.random() - 0.5) * width, head.y + (Math.random() - 0.3) * width * 0.7, head.z + (Math.random() - 0.5) * width, {
          vx: (Math.random() - 0.5), vy: 0.6, vz: (Math.random() - 0.5), life: 0.45 + Math.random() * 0.3,
          size: width * 0.9, size1: width * 1.6, color: i % 2 ? c1 : c2, color1: c1, alpha: 0.8, alpha1: 0, drag: 2,
        });
      }
      this.glow.emit(head.x, head.y, head.z, 0, 0, 0, 0.15, width * 1.6, c2, { color1: c1, size1: 0 });
      if (!arrived && k >= 1) { arrived = true; onArrive && onArrive(to.clone()); }
    });
  }

  // tilted ring orbiting a character (fire ring look)
  orbitRing(follow, { color = 0xff8a20, color2 = 0xffe070, radius = 1.6, duration = 1.2 } = {}) {
    const mat = ringMaterial(color, { noise: true });
    const m = this.mesh(this.planeGeo, mat);
    const c2 = col(color2);
    let a = 0;
    return this.timed(duration, (k, dt) => {
      a += dt * 9;
      m.position.copy(follow.position); m.position.y += 1.1;
      m.rotation.set(0.55 * Math.sin(a * 0.5), a, 0.4);
      const s = radius * 2 * (0.8 + Math.sin(k * Math.PI) * 0.35);
      m.scale.set(s, 1, s);
      mat.uniforms.uOpacity.value = Math.sin(k * Math.PI) * 1.4;
      const pa = a * 1.3;
      this.fire.emit(m.position.x + Math.cos(pa) * radius, m.position.y + Math.sin(pa * 0.7) * 0.5, m.position.z + Math.sin(pa) * radius, { vx: 0, vy: 1, vz: 0, life: 0.35, size: 0.5, size1: 0.2, color: c2, alpha: 1, alpha1: 0 });
    }, () => { this.scene.remove(m); mat.dispose(); });
  }

  // expanding dark ground disk (under big explosions)
  darkDisk(pos, { color = 0x3a1040, radius = 6, duration = 1.4 } = {}) {
    const m = new THREE.MeshBasicMaterial({ map: novaTex(), color: col(color), transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide });
    const mesh = this.mesh(this.planeGeo, m);
    mesh.renderOrder = 1;
    mesh.position.set(pos.x, this.heightAt(pos.x, pos.z) + 0.06, pos.z);
    return this.timed(duration, (k) => {
      const s = radius * 2 * (0.3 + (1 - Math.pow(1 - k, 3)) * 0.8);
      mesh.scale.set(s, 1, s);
      m.opacity = 0.6 * (k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4);
    }, () => { this.scene.remove(mesh); m.dispose(); });
  }

  // flames clinging to a target for a while (burn debuff look)
  burning(target, { color = 0xff6a10, duration = 2, height = 1.6 } = {}) {
    const c = col(color);
    return this.timed(duration, () => {
      if (target.dead) return;
      const p = target.position;
      if (Math.random() < 0.8) this.fire.emit(p.x + (Math.random() - 0.5) * 0.8, p.y + Math.random() * height, p.z + (Math.random() - 0.5) * 0.8, {
        vx: 0, vy: 1.8, vz: 0, life: 0.45, size: 0.5, size1: 0.9, color: c, alpha: 1, alpha1: 0.2, drag: 1,
      });
    });
  }

  // Full volumetric explosion: flash, fireball, shock sphere, smoke column, sparks, rocks
  explode(pos, { color = 0xff6a10, color2 = 0xffd04a, radius = 3, power = 1, fire = true } = {}) {
    const c1 = col(color), c2 = col(color2), white = new THREE.Color(1, 1, 1);
    const ground = pos.clone(); ground.y = this.heightAt(pos.x, pos.z);
    this.spikeBurst(pos, c2, radius * 1.25 * power, 0.28);
    this.shockSphere(pos, c2, radius * 1.2, 0.3);
    this.cloudBurst(pos, { color: c1, color2: c2, radius: radius * 0.9, count: Math.round(5 + radius * 2 * power), life: 0.9, rise: radius * 0.3 });
    if (power >= 1) this.darkDisk(ground, { radius: radius * 1.6, duration: 1.4 });
    if (fire) this.fireBurst(pos, { count: Math.round(5 + radius * 2 * power), size: radius * 0.4, size1: radius * 0.9, life: 0.6, color: c1, speed: radius * 1.6, up: radius * 0.7, spread: radius * 0.25 });
    this.glow.burst(pos, Math.round(30 * power), { speed: radius * 3, up: 2, life: 0.5, lifeVar: 0.3, size: 0.6, color: c2, color1: c1, drag: 2.5 });
    this.streaks(pos, Math.round(26 * power), { speed: radius * 6, color: white, color1: c2, life: 0.45, size: 0.18, gravity: 12, up: 3 });
    this.smokePuff(ground, { count: Math.round(5 + radius * 2 * power), size: radius * 0.6, size1: radius * 1.7, life: 2.2, alpha: 0.6, rise: radius * 0.5, spread: radius * 0.6, speed: radius * 0.8 });
    this.rockBurst(ground, { count: Math.round(radius * 3 * power), speed: radius * 3.2, size: 0.12 + radius * 0.04 });
    this.shockwave(ground, { color: c1, radius: radius * 1.5, duration: 0.5 });
  }

  rockBurst(pos, { count = 10, speed = 9, size = 0.2, color = 0x6a5a4a } = {}) {
    const base = col(color);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, sp = speed * (0.35 + Math.random() * 0.7);
      const c = base.clone().multiplyScalar(0.7 + Math.random() * 0.5);
      this.rocks.emit(pos.x + Math.cos(a) * 0.3, pos.y + 0.2, pos.z + Math.sin(a) * 0.3, Math.cos(a) * sp * 0.55, sp * (0.6 + Math.random() * 0.6), Math.sin(a) * sp * 0.55, size * (0.5 + Math.random()), c, 1.8 + Math.random());
    }
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
    // real rock chunks + rolling dust clouds
    this.rockBurst(pos, { count: Math.round(count * 0.6), speed, size: size * 0.55, color });
    this.smokePuff(pos, { count: Math.max(2, Math.round(count * 0.25)), size: 1.0 + size, size1: 2.6 + size * 3, life: 1.6, color: new THREE.Color(0.62, 0.56, 0.48), alpha: 0.5, rise: 0.6, spread: 0.8, speed: speed * 0.35 });
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
