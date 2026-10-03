import * as THREE from 'three';
import { auraTier } from '../data/enhance.js';

const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpC = new THREE.Vector3();
const hueColor = new THREE.Color();

// Visual aura for enhanced weapons (+ ground aura on character at high tiers)
export class AuraController {
  constructor(fx) {
    this.fx = fx;
    this.tier = null;
    this.handles = [];
    this.emitAcc = 0;
    this.boltAcc = 0;
    this.groundCircle = null;
    this.heroShell = null;
  }

  clear() {
    for (const h of this.handles) h.dispose();
    this.handles = [];
    if (this.groundCircle) { this.groundCircle.end(); this.groundCircle = null; }
    if (this.groundCircle2) { this.groundCircle2.end(); this.groundCircle2 = null; }
    if (this.heroShell) { this.heroShell.dispose(); this.heroShell = null; }
    if (this.weaponRoot && this.origEmissive) {
      for (const [m, v] of this.origEmissive) m.emissiveIntensity = v;
    }
    this.origEmissive = null;
  }

  // weaponRoot: object containing weapon meshes, hero: object3D (feet position) or null
  apply(weaponRoot, plus, hero = null, { scale = 1 } = {}) {
    this.clear();
    this.weaponRoot = weaponRoot;
    this.hero = hero;
    const t = auraTier(plus);
    this.tier = t;
    this.plus = plus;
    if (!weaponRoot) return;
    // boost own glowing materials
    this.origEmissive = [];
    weaponRoot.traverse((o) => {
      if (o.isMesh && !o.userData.isShell && o.material && o.material.emissive) {
        if (!o.userData.ownMat) { o.material = o.material.clone(); o.userData.ownMat = true; }
        this.origEmissive.push([o.material, o.material.emissiveIntensity]);
        if (o.material.userData.glow || o.material.emissiveIntensity > 0) {
          o.material.emissiveIntensity *= 1 + plus * 0.06;
        }
      }
    });
    if (t.intensity <= 0) return;
    const shell = this.fx.shell(weaponRoot, t.color, t.color2, {
      thickness: (0.008 + t.intensity * 0.009) * scale / Math.max(0.001, weaponRoot.getWorldScale(tmpA).x),
      intensity: t.intensity * 0.75,
      rainbow: t.rainbow ? 1 : 0,
      flame: t.particles >= 3 ? 1.6 : 0.6,
    });
    this.handles.push(shell);
    if (hero && t.ground) {
      const c = t.rainbow ? 0xfff2c0 : t.color;
      this.groundCircle = this.fx.magicCircle(hero.position, { color: c, radius: t.rainbow ? 1.9 : 1.5, duration: Infinity, seed: 3, style: t.rainbow ? 2 : 1, rot: 0.6, follow: hero, y: 0.06, opacity: 0.32 });
      if (t.rainbow) this.groundCircle2 = this.fx.magicCircle(hero.position, { color: 0xa070ff, radius: 3.0, duration: Infinity, seed: 8, style: 0, rot: -0.3, follow: hero, y: 0.05, opacity: 0.2 });
    }
    if (hero && plus >= 14) {
      this.heroShell = this.fx.shell(hero, t.color, t.color2, { thickness: 0.015, intensity: t.rainbow ? 0.35 : 0.22, rainbow: t.rainbow ? 1 : 0, flame: 1.2 });
    }
  }

  update(dt, base, tip) {
    const t = this.tier;
    if (!t || t.intensity <= 0 || !base || !tip) return;
    const fx = this.fx;
    const c1 = new THREE.Color(t.color), c2 = new THREE.Color(t.color2);
    // blade particles
    const rate = [2, 6, 14, 26, 40, 60][t.particles || 0];
    this.emitAcc += dt * rate;
    while (this.emitAcc > 1) {
      this.emitAcc -= 1;
      const k = Math.random();
      tmpA.lerpVectors(base, tip, k);
      let ca = c1, cb = c2;
      if (t.rainbow) { hueColor.setHSL(Math.random(), 1, 0.6); ca = hueColor.clone(); cb = new THREE.Color(1, 1, 1); }
      const up = t.particles >= 3 ? 2.2 : 0.8;
      fx.glow.emit(tmpA.x, tmpA.y, tmpA.z, (Math.random() - 0.5) * 0.6, up * (0.5 + Math.random()), (Math.random() - 0.5) * 0.6,
        0.5 + Math.random() * 0.6, (0.12 + t.intensity * 0.06) * (0.6 + Math.random()), ca, { color1: cb, drag: 1 });
    }
    // ground motes
    if (this.hero && t.ground) {
      if (Math.random() < dt * (t.rainbow ? 40 : 20)) {
        const p = this.hero.position;
        const a = Math.random() * Math.PI * 2, r = 0.4 + Math.random() * 1.4;
        let ca = c1;
        if (t.rainbow) { hueColor.setHSL(Math.random(), 1, 0.6); ca = hueColor.clone(); }
        fx.glow.emit(p.x + Math.cos(a) * r, p.y + 0.1, p.z + Math.sin(a) * r, 0, 1.2 + Math.random() * 2.2, 0,
          0.8 + Math.random() * 0.8, 0.18 + Math.random() * 0.2, ca, { color1: c2, drag: 0.3 });
      }
    }
    // electric arcs
    if (t.lightning || this.plus >= 13) {
      this.boltAcc += dt;
      if (this.boltAcc > (t.lightning ? 0.18 : 0.6)) {
        this.boltAcc = 0;
        tmpB.lerpVectors(base, tip, Math.random());
        tmpC.copy(tmpB).add(new THREE.Vector3((Math.random() - 0.5) * 0.8, (Math.random() - 0.2) * 0.8, (Math.random() - 0.5) * 0.8));
        fx.lightning(tmpB.clone(), tmpC.clone(), { color: t.rainbow ? 0xb48cff : t.color, width: 0.012, duration: 0.12, segments: 5, jitter: 0.25, branches: 0 });
      }
      if (t.lightning && this.hero && Math.random() < dt * 2.5) {
        const p = this.hero.position;
        const a = Math.random() * Math.PI * 2;
        const s = new THREE.Vector3(p.x + Math.cos(a) * 1.0, p.y + 0.1 + Math.random() * 1.6, p.z + Math.sin(a) * 1.0);
        const e = s.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.2));
        fx.lightning(s, e, { color: 0x9a7bff, width: 0.015, duration: 0.15, segments: 6, jitter: 0.35, branches: 1 });
      }
    }
  }
}
