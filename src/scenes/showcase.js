import * as THREE from 'three';
import { assets } from '../core/assets.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { FX } from '../fx/fx.js';
import { AuraController } from '../fx/aura.js';
import { WEAPON_BY_ID, ELEMENT, RARITY } from '../data/weapons.js';
import { auraTier } from '../data/enhance.js';

const RCOL = { N: 0x9fb3c8, R: 0x3d9bff, SR: 0xb04dff, SSR: 0xffb300, UR: 0xff3355 };

// Dedicated cinematic scene for enhancing & gacha
export class Showcase {
  constructor(engine, audio) {
    this.engine = engine;
    this.audio = audio;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05060d);
    this.scene.fog = new THREE.FogExp2(0x05060d, 0.035);
    this.scene.userData.noAO = true;
    {
      const pm = new THREE.PMREMGenerator(engine.renderer);
      this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
      this.scene.environmentIntensity = 0.6;
      pm.dispose();
    }
    this.camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 400);
    this.fx = new FX(this.scene, engine);
    this.aura = new AuraController(this.fx);
    this.time = 0;
    this.mode = null;
    this.camTarget = new THREE.Vector3(0, 1.6, 0);
    this.camPos = new THREE.Vector3(0, 2.2, 7.5);
    this.camera.position.copy(this.camPos);

    const s = this.scene;
    s.add(new THREE.HemisphereLight(0x8090ff, 0x100808, 0.35));
    const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(3, 6, 5); s.add(key);
    const rim = new THREE.DirectionalLight(0x88aaff, 2.5); rim.position.set(-4, 3, -5); s.add(rim);
    this.rimLight = rim;
    this.pointLight = new THREE.PointLight(0xffffff, 6, 6, 2); this.pointLight.position.set(0, 2.6, 2.2); s.add(this.pointLight);

    // floor: dark glossy disc + magic circle
    const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x05060c, roughness: 0.9, metalness: 0, envMapIntensity: 0 }));
    s.add(floor);
    // stars
    const N = 1500, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(80 + Math.random() * 100);
      v.y = Math.abs(v.y) * 0.8 + 5; pos.set([v.x, v.y, v.z], i * 3);
    }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    s.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xaab8ff, size: 0.5, sizeAttenuation: true, fog: false })));

    this.floorCircle = this.fx.magicCircle(new THREE.Vector3(), { color: 0x5a7bff, radius: 3.2, duration: Infinity, style: 0, seed: 31, rot: 0.25, opacity: 0.5 });
    this.floorCircle2 = this.fx.magicCircle(new THREE.Vector3(), { color: 0x8a5bff, radius: 5.5, duration: Infinity, style: 2, seed: 32, rot: -0.12, opacity: 0.22, y: 0.05 });

    // weapon pivot
    this.pivot = new THREE.Group();
    this.pivot.position.set(0, 1.0, 0);
    s.add(this.pivot);
    this.spin = 0.45;
    this.weapon = null;

    // anvil-ish pedestal for enhance
    const ped = new THREE.Group();
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x2a2a35, roughness: 0.6, metalness: 0.4 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xc9a24a, roughness: 0.3, metalness: 1 });
    const runeMat = new THREE.MeshStandardMaterial({ color: 0x223, emissive: 0x4a7bff, emissiveIntensity: 3 });
    const p1 = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, 0.35, 8), stoneMat); p1.position.y = 0.175;
    const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.0, 0.25, 8), stoneMat); p2.position.y = 0.47;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.05, 8, 48).rotateX(Math.PI / 2), goldMat); ring.position.y = 0.35;
    const rune = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.03, 8, 48).rotateX(Math.PI / 2), runeMat); rune.position.y = 0.6;
    ped.add(p1, p2, ring, rune);
    this.runeMat = runeMat;
    this.pedestal = ped;
    s.add(ped);
    this.orbs = [];
  }

  resize(w, h) { this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }

  setWeapon(inst, { animateIn = false } = {}) {
    if (this.weapon) { this.pivot.remove(this.weapon); this.aura.clear(); }
    if (!inst) { this.weapon = null; return; }
    const def = WEAPON_BY_ID[inst.id];
    const { scene } = assets.clone(def.id);
    // fit weapon to ~2.6 units tall, centered
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const k = 3.3 / Math.max(size.y, 0.3);
    const holder = new THREE.Group();
    scene.position.sub(center);
    holder.add(scene);
    holder.scale.setScalar(k);
    holder.rotation.z = 0.3;
    this.weapon = holder;
    this.pivot.add(holder);
    this.pivot.position.y = 1.0 + 1.45;
    this.inst = inst; this.def = def;
    this.weaponScale = k;
    this.tip = scene.getObjectByName('tip'); this.base = scene.getObjectByName('base');
    this.aura.apply(scene, inst.plus, null, { scale: 1.0 });
    const el = ELEMENT[def.element];
    this.rimLight.color.set(el.color);
    this.pointLight.color.set(el.color2);
    if (animateIn) { holder.scale.setScalar(0.01); this.growT = 0; } else this.growT = 1;
  }

  refreshAura(plus) {
    if (!this.weapon) return;
    this.inst.plus = plus;
    this.aura.apply(this.weapon.children[0], plus, null, { scale: 1.0 });
  }

  enter(mode) {
    this.mode = mode;
    this.time = 0;
    this.pedestal.visible = mode === 'enhance';
    this.pivot.visible = true;
    if (mode === 'enhance') {
      this.camPos.set(-1.3, 2.6, 6.8); this.camTarget.set(-1.3, 2.3, 0);
      this.floorCircle.mat.uniforms.uColor.value.set(0xff8a3a);
    } else {
      this.camPos.set(0, 3.0, 11); this.camTarget.set(0, 2.2, 0);
      this.floorCircle.mat.uniforms.uColor.value.set(0x5a7bff);
      this.setWeapon(null);
    }
    this.camera.position.copy(this.camPos);
  }

  // ---------------- ENHANCE ----------------
  // returns promise resolved after anim
  playEnhance(result, color) {
    return new Promise((resolve) => {
      const fx = this.fx, a = this.audio, e = this.engine;
      const strikes = 3;
      const elc = new THREE.Color(color);
      this.spin = 4;
      a.play('charge');
      const center = new THREE.Vector3(0, 2.4, 0);
      fx.magicCircle(new THREE.Vector3(0, 0.62, 0), { color: 0xffa040, radius: 1.8, duration: 2.0, style: 1, seed: 40, rot: 4 });
      for (let i = 0; i < strikes; i++) {
        setTimeout(() => {
          a.play('anvil', { pitch: 1 + i * 0.12 });
          const p = center.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 1.6, 0.3));
          fx.sparks.burst(p, 40, { speed: 9, up: 3, life: 0.5, size: 0.35, color: new THREE.Color(1, 0.9, 0.6), color1: new THREE.Color(1, 0.4, 0.1), gravity: 10, drag: 1.5 });
          fx.flare(p, new THREE.Color(1, 0.8, 0.5), 2.5, 0.15);
          fx.light(p, 0xffa040, 40, 0.3, 10);
          e.shake(0.25 + i * 0.1);
        }, 300 + i * 420);
      }
      // converging energy
      fx.timed(1.6, () => {
        for (let i = 0; i < 4; i++) {
          const d = new THREE.Vector3().randomDirection().multiplyScalar(4);
          fx.glow.emit(center.x + d.x, center.y + d.y, center.z + d.z, -d.x * 2.4, -d.y * 2.4, -d.z * 2.4, 0.4, 0.25, elc, { drag: 0 });
        }
      });
      setTimeout(() => {
        this.spin = 0.45;
        const r = result.result;
        if (r === 'success') {
          const t = auraTier(result.to);
          const c = t.intensity > 0 ? t.color : 0xffffff;
          const big = result.to >= 7;
          a.play(big ? 'bigSuccess' : 'success');
          e.doFlash(big ? 0.75 : 0.45, c === 0xffffff && t.rainbow ? 0xffffff : c);
          e.shake(big ? 1.2 : 0.4);
          fx.pillar(new THREE.Vector3(0, 0, 0), { color: c, color2: 0xffffff, radius: 0.9, height: 30, duration: 1.4, speed: 3 });
          fx.shockwave(new THREE.Vector3(0, 0, 0), { color: c, radius: 7, duration: 0.8 });
          fx.shockwave(center, { color: 0xffffff, radius: 4, duration: 0.5, vertical: true });
          fx.glow.burst(center, big ? 220 : 90, { speed: 10, life: 1, lifeVar: 0.6, size: 0.5, color: new THREE.Color(0xffffff), color1: new THREE.Color(c), drag: 1.5 });
          fx.sparks.burst(center, 80, { speed: 14, life: 0.7, size: 0.6, color: new THREE.Color(1, 1, 0.9), color1: new THREE.Color(c), gravity: 4, drag: 1.2 });
          fx.light(center, c, 120, 1.0, 20);
          e.ripple(center, big ? 1.6 : 0.9, 0.9, 0.6);
          if (big) for (let i = 0; i < 6; i++) setTimeout(() => {
            const p = new THREE.Vector3((Math.random() - 0.5) * 6, 0, (Math.random() - 0.5) * 3 - 1);
            fx.lightning(p.clone().setY(14), p, { color: c, duration: 0.3 });
          }, i * 70);
          this.refreshAura(result.to);
          this.growPulse = 1;
        } else if (r === 'crash') {
          a.play('crash');
          e.doFlash(0.6, 0xff0000); e.shake(1.6); e.pulseAberration(2);
          fx.sparks.burst(center, 200, { speed: 16, life: 0.9, size: 0.5, color: new THREE.Color(1, 0.4, 0.3), color1: new THREE.Color(0.3, 0, 0), gravity: 12, drag: 0.8 });
          fx.debris(new THREE.Vector3(0, 0.6, 0), { count: 30, speed: 7, color: 0x222222 });
          fx.shockwave(new THREE.Vector3(0, 0, 0), { color: 0xff2020, radius: 6, duration: 0.6 });
          this.refreshAura(result.to);
          this.shakeWeapon = 0.8;
        } else if (r === 'protected') {
          a.play('fail');
          e.doFlash(0.3, 0x80c0ff);
          fx.shockwave(center, { color: 0x80c0ff, radius: 2.5, duration: 0.6, vertical: true });
          fx.glow.burst(center, 60, { speed: 5, life: 0.8, size: 0.4, color: new THREE.Color(0x80c0ff), drag: 2 });
          this.shakeWeapon = 0.3;
        } else {
          a.play('fail');
          e.shake(0.6);
          fx.debris(new THREE.Vector3(0, 0.6, 0), { count: 20, speed: 4, color: 0x333333 });
          fx.glow.burst(center, 40, { speed: 4, life: 0.8, size: 0.4, color: new THREE.Color(0.4, 0.4, 0.5), drag: 2 });
          if (r === 'down') this.refreshAura(result.to);
          this.shakeWeapon = 0.5;
        }
        resolve();
      }, 1700);
    });
  }

  // ---------------- GACHA ----------------
  playSummon(results) {
    return new Promise((resolve) => {
      const fx = this.fx, a = this.audio, e = this.engine;
      const best = results.reduce((b, r) => (RARITY[r.rarity].order > RARITY[b.rarity].order ? r : b), results[0]);
      const bestOrder = RARITY[best.rarity].order;
      a.play('summon');
      const circleCol = 0x5a7bff;
      const big = fx.magicCircle(new THREE.Vector3(0, 0, 0), { color: circleCol, radius: 6, duration: 4.8, style: 2, seed: 50, rot: 1.5 });
      const sky = fx.magicCircle(new THREE.Vector3(0, 16, 0), { color: circleCol, radius: 6, duration: 3.0, style: 0, seed: 51, rot: -2, y: 0 });
      this.camPos.set(0, 4.5, 13); this.camTarget.set(0, 4, 0);
      // gather energy
      fx.timed(1.4, () => {
        for (let i = 0; i < 6; i++) {
          const ang = Math.random() * Math.PI * 2, r = 7 + Math.random() * 3;
          fx.glow.emit(Math.cos(ang) * r, 0.3, Math.sin(ang) * r, -Math.cos(ang) * r * 1.2, 3 + Math.random() * 3, -Math.sin(ang) * r * 1.2, 0.8, 0.35, new THREE.Color(0.6, 0.7, 1), { drag: 0.2 });
        }
      });
      // color escalation: starts blue, upgrades to best rarity (fake-out)
      const stages = [0x3d9bff];
      if (bestOrder >= 2) stages.push(RCOL.SR);
      if (bestOrder >= 3) stages.push(RCOL.SSR);
      if (bestOrder >= 4) stages.push(RCOL.UR);
      stages.forEach((c, i) => setTimeout(() => {
        big.mat.uniforms.uColor.value.set(c); sky.mat.uniforms.uColor.value.set(c);
        e.doFlash(0.3, c);
        fx.shockwave(new THREE.Vector3(0, 0, 0), { color: c, radius: 8, duration: 0.6 });
        a.play('reveal', { pitch: 1 + i * 0.25 });
        if (i >= 2) { e.shake(0.6); fx.pillar(new THREE.Vector3(0, 0, 0), { color: c, color2: 0xffffff, radius: 2, height: 40, duration: 1.2, speed: 3 }); }
      }, 1300 + i * 450));
      // falling orbs
      const n = results.length;
      const t0 = 1400 + stages.length * 450;
      results.forEach((r, i) => {
        setTimeout(() => {
          const c = RCOL[r.rarity];
          const x = n === 1 ? 0 : ((i % 5) - 2) * 1.8, z = n === 1 ? 0 : (i < 5 ? -1 : 1.2);
          const target = new THREE.Vector3(x, 0.4, z);
          const start = target.clone().add(new THREE.Vector3(3, 22, -6));
          const orb = new THREE.Sprite(new THREE.SpriteMaterial({ map: fx.glow.mat.uniforms.uTex.value, color: c, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
          orb.scale.setScalar(1.6);
          this.scene.add(orb);
          this.orbs.push(orb);
          a.play('meteor');
          const cc = new THREE.Color(c);
          fx.timed(0.55, (k) => {
            orb.position.lerpVectors(start, target, k * k);
            for (let j = 0; j < 3; j++) fx.glow.emit(orb.position.x, orb.position.y, orb.position.z, (Math.random() - 0.5), 1, (Math.random() - 0.5), 0.5, 0.6, cc, { drag: 1 });
          }, () => {
            fx.shockwave(target, { color: c, radius: RARITY[r.rarity].order >= 3 ? 3 : 1.6, duration: 0.5 });
            fx.sparks.burst(target, RARITY[r.rarity].order >= 3 ? 60 : 16, { speed: 7, up: 3, life: 0.5, size: 0.4, color: new THREE.Color(1, 1, 1), color1: cc, gravity: 6 });
            if (RARITY[r.rarity].order >= 3) { fx.pillar(target, { color: c, color2: 0xffffff, radius: 0.6, height: 25, duration: 2.5, speed: 2 }); e.shake(0.4); }
            fx.light(target, c, 30, 0.6, 10);
            a.play('reveal', { pitch: 0.8 + RARITY[r.rarity].order * 0.15 });
          });
        }, t0 + i * (n === 1 ? 0 : 140));
      });
      const tEnd = t0 + (n === 1 ? 0 : n * 140) + 900;
      setTimeout(() => {
        // hero reveal of the best weapon (SR+ weapon)
        if (best.weapon && bestOrder >= 2) {
          for (const o of this.orbs) this.scene.remove(o);
          this.orbs = [];
          this.camPos.set(0, 2.6, 7.2); this.camTarget.set(0, 2.4, 0);
          this.setWeapon({ id: best.weapon, plus: bestOrder >= 4 ? 15 : bestOrder >= 3 ? 10 : 7 }, { animateIn: true });
          const c = RCOL[best.rarity];
          a.play(bestOrder >= 3 ? 'bigSuccess' : 'success');
          if (bestOrder >= 3) a.play('choir');
          e.doFlash(0.9, 0xffffff); e.shake(bestOrder >= 4 ? 1.5 : 0.8);
          e.ripple(new THREE.Vector3(0, 2.4, 0), 2, 0.8, 0.7);
          fx.pillar(new THREE.Vector3(0, 0, 0), { color: c, color2: 0xffffff, radius: 2.2, height: 50, duration: 2.5, speed: 3 });
          fx.shockwave(new THREE.Vector3(0, 0, 0), { color: c, radius: 10, duration: 1 });
          fx.glow.burst(new THREE.Vector3(0, 2.4, 0), 250, { speed: 12, life: 1.2, lifeVar: 0.6, size: 0.55, color: new THREE.Color(0xffffff), color1: new THREE.Color(c), drag: 1.4 });
          resolve({ showcase: best });
        } else resolve({ showcase: null });
      }, tEnd);
    });
  }

  clearOrbs() {
    for (const o of this.orbs) { this.scene.remove(o); o.material.dispose(); }
    this.orbs = [];
  }

  update(dt) {
    this.time += dt;
    this.fx.update(dt);
    if (this.weapon) {
      this.pivot.rotation.y += dt * this.spin;
      this.pivot.position.y = 2.45 + Math.sin(this.time * 1.6) * 0.08;
      if (this.growT < 1) { this.growT = Math.min(1, this.growT + dt * 1.6); const k = 1 - Math.pow(1 - this.growT, 3); this.weapon.scale.setScalar(this.weaponScale * k); }
      if (this.shakeWeapon > 0) { this.shakeWeapon -= dt; this.pivot.position.x = (Math.random() - 0.5) * 0.15 * this.shakeWeapon * 3; } else this.pivot.position.x = 0;
      if (this.growPulse > 0) { this.growPulse -= dt * 2; const k = 1 + Math.max(0, this.growPulse) * 0.12; this.weapon.scale.setScalar(this.weaponScale * k); }
      this.pivot.updateMatrixWorld(true);
      if (this.tip && this.base) this.aura.update(dt, this.base.getWorldPosition(new THREE.Vector3()), this.tip.getWorldPosition(new THREE.Vector3()));
    }
    this.runeMat.emissiveIntensity = 2.5 + Math.sin(this.time * 3) * 1;
    this.camera.position.lerp(this.camPos, Math.min(1, dt * 3));
    const look = this.camTarget.clone();
    this.camera.lookAt(look);
  }
}
