import * as THREE from 'three';

const v = new THREE.Vector3();

// Pooled DOM floating combat text
export class DamageText {
  constructor(root, camera) {
    this.root = root;
    this.camera = camera;
    this.pool = [];
    this.active = [];
    for (let i = 0; i < 70; i++) {
      const el = document.createElement('div');
      el.className = 'dmg';
      el.style.display = 'none';
      root.appendChild(el);
      this.pool.push(el);
    }
  }

  spawn(pos, text, cls = '', { life = 0.9, rise = 1.6, scale = 1 } = {}) {
    const el = this.pool.pop() || this.active.shift()?.el;
    if (!el) return;
    el.textContent = text;
    el.className = 'dmg ' + cls;
    el.style.display = 'block';
    this.active.push({ el, pos: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.8, 0, (Math.random() - 0.5) * 0.8)), t: 0, life, rise, scale, drift: (Math.random() - 0.5) * 40 });
  }

  update(dt) {
    const w = window.innerWidth, h = window.innerHeight;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const a = this.active[i];
      a.t += dt;
      const k = a.t / a.life;
      if (k >= 1) { a.el.style.display = 'none'; this.pool.push(a.el); this.active.splice(i, 1); continue; }
      v.copy(a.pos); v.y += a.rise * (1 - Math.pow(1 - k, 2.5));
      v.project(this.camera);
      if (v.z > 1) { a.el.style.opacity = 0; continue; }
      const x = (v.x * 0.5 + 0.5) * w + a.drift * k, y = (-v.y * 0.5 + 0.5) * h;
      const pop = k < 0.12 ? 0.6 + (k / 0.12) * 0.9 : k < 0.25 ? 1.5 - (k - 0.12) / 0.13 * 0.5 : 1;
      a.el.style.transform = `translate(-50%,-50%) translate(${x}px,${y}px) scale(${pop * a.scale})`;
      a.el.style.opacity = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
    }
  }
}
