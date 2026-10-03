import * as THREE from 'three';
import { ParticleSystem, makeSparkSystem } from './particles.js';
import {
  arcGeometry, slashMaterial, ringMaterial, pillarMaterial, magicCircleMaterial, tornadoMaterial,
  decalMaterial, ghostMaterial, basicAdd, globalUniforms, auraShellMaterial, scorchMaterial, hexShieldMaterial, spiritMaterial,
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
    // layered slash: wide soft arc + thin white-hot core + sparks flung off the leading edge
    const geo = arcGeometry(radius - width, radius, angle, 40);
    const mat = slashMaterial(color, color2);
    const geoCore = arcGeometry(radius - width * 0.22, radius + 0.04, angle, 40);
    const matCore = slashMaterial(color2, 0xffffff);
    matCore.uniforms.uTrail.value = 0.35;
    const root = new THREE.Object3D();
    root.position.set(pos.x, pos.y + y, pos.z);
    root.rotation.order = 'YXZ';
    root.rotation.set(pitch, yaw, tilt);
    this.scene.add(root);
    root.updateMatrixWorld(true);
    const m = this.mesh(geo, mat, root);
    const mc = this.mesh(geoCore, matCore, root);
    if (flip) { m.scale.x = -1; mc.scale.x = -1; }
    const c1 = col(color), c2 = col(color2), white = new THREE.Color(1, 1, 1);
    const hp = new THREE.Vector3();
    return this.timed(duration + 0.18, (k, dt, t) => {
      const prog = Math.min(1, t / duration);
      mat.uniforms.uProgress.value = prog; matCore.uniforms.uProgress.value = prog;
      const fade = t > duration ? 1 - (t - duration) / 0.18 : 1;
      mat.uniforms.uFade.value = fade; matCore.uniforms.uFade.value = fade * 1.2;
      const sc = 1 + k * 0.08;
      m.scale.set(flip ? -sc : sc, 1, sc); mc.scale.copy(m.scale);
      if (sparks && t < duration) {
        const u = Math.min(1, prog * 1.35);
        const a = -angle / 2 + u * angle;
        hp.set(Math.sin(a) * radius * (flip ? -1 : 1), 0, Math.cos(a) * radius).applyMatrix4(root.matrixWorld);
        for (let i = 0; i < 3; i++) {
          const tx = Math.cos(a) * (flip ? -1 : 1), tz = -Math.sin(a);
          const dir = new THREE.Vector3(tx, (Math.random() - 0.3) * 0.6, tz).transformDirection(root.matrixWorld).multiplyScalar(4 + Math.random() * 6);
          this.sparks.emit(hp.x, hp.y, hp.z, dir.x, dir.y, dir.z, 0.18 + Math.random() * 0.15, 0.22 + Math.random() * 0.2, white, { color1: c2, drag: 3, gravity: 4 });
        }
        this.glow.emit(hp.x, hp.y, hp.z, 0, 0.3, 0, 0.25, 0.5, c1, { color1: c2, drag: 1 });
      }
    }, () => { this.scene.remove(root); geo.dispose(); mat.dispose(); geoCore.dispose(); matCore.dispose(); });
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
