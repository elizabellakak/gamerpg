import * as THREE from 'three';
import { softDot, sparkTex } from './textures.js';

// CPU-simulated additive point particles with per-particle color/size/life.
export class ParticleSystem {
  constructor(max = 8000, { texture = softDot(), blending = THREE.AdditiveBlending, dust = false } = {}) {
    this.max = max;
    this.cursor = 0;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.grav = new Float32Array(max);
    this.drag = new Float32Array(max);
    this.s0 = new Float32Array(max);
    this.s1 = new Float32Array(max);
    this.c0 = new Float32Array(max * 3);
    this.c1 = new Float32Array(max * 3);
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: dust ? THREE.NormalBlending : blending,
      uniforms: { uTex: { value: texture }, uScale: { value: window.innerHeight * 0.5 } },
      vertexShader: `
        attribute float size; attribute float alpha; varying vec3 vColor; varying float vAlpha; uniform float uScale;
        void main(){
          vColor = color; vAlpha = alpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uScale / max(0.1, -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D uTex; varying vec3 vColor; varying float vAlpha;
        void main(){ vec4 t = texture2D(uTex, gl_PointCoord);
          ${dust ? 'gl_FragColor = vec4(vColor, t.a * vAlpha * 0.55);' : 'gl_FragColor = vec4(vColor * t.rgb * t.a * vAlpha * 1.6, 1.0);'} }`,
      vertexColors: true,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 10;
    this.geo = g;
    window.addEventListener('resize', () => { this.mat.uniforms.uScale.value = window.innerHeight * 0.5; });
  }

  // o: {pos, vel, life, size, size1, color, color1, gravity, drag}
  emit(x, y, z, vx, vy, vz, life, size, color, { size1 = 0, color1 = null, gravity = 0, drag = 0 } = {}) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.max;
    const i3 = i * 3;
    this.pos[i3] = x; this.pos[i3 + 1] = y; this.pos[i3 + 2] = z;
    this.vel[i3] = vx; this.vel[i3 + 1] = vy; this.vel[i3 + 2] = vz;
    this.life[i] = life; this.maxLife[i] = life;
    this.s0[i] = size; this.s1[i] = size1;
    const c = color, c1 = color1 || color;
    this.c0[i3] = c.r; this.c0[i3 + 1] = c.g; this.c0[i3 + 2] = c.b;
    this.c1[i3] = c1.r; this.c1[i3 + 1] = c1.g; this.c1[i3 + 2] = c1.b;
    this.grav[i] = gravity; this.drag[i] = drag;
  }

  // burst helper
  burst(center, count, { speed = 5, spread = 1, up = 0, life = 0.8, lifeVar = 0.4, size = 0.4, size1 = 0, color, color1 = null, gravity = 0, drag = 1.5, radius = 0, flat = false } = {}) {
    for (let k = 0; k < count; k++) {
      let dx = Math.random() * 2 - 1, dy = flat ? 0 : Math.random() * 2 - 1, dz = Math.random() * 2 - 1;
      const l = Math.hypot(dx, dy, dz) || 1; dx /= l; dy /= l; dz /= l;
      const sp = speed * (0.4 + Math.random() * 0.6 * spread + 0.3);
      const r = radius * Math.random();
      this.emit(center.x + dx * r, center.y + dy * r, center.z + dz * r, dx * sp, dy * sp + up, dz * sp,
        life + Math.random() * lifeVar, size * (0.6 + Math.random() * 0.8), color, { size1, color1, gravity, drag });
    }
  }

  update(dt) {
    const { pos, vel, life, maxLife, size, alpha, col, c0, c1, s0, s1, grav, drag } = this;
    for (let i = 0; i < this.max; i++) {
      if (life[i] <= 0) { if (alpha[i] !== 0) { alpha[i] = 0; size[i] = 0; } continue; }
      life[i] -= dt;
      const i3 = i * 3;
      const t = 1 - Math.max(0, life[i]) / maxLife[i];
      const dk = Math.max(0, 1 - drag[i] * dt);
      vel[i3] *= dk; vel[i3 + 1] = vel[i3 + 1] * dk - grav[i] * dt; vel[i3 + 2] *= dk;
      pos[i3] += vel[i3] * dt; pos[i3 + 1] += vel[i3 + 1] * dt; pos[i3 + 2] += vel[i3 + 2] * dt;
      size[i] = s0[i] + (s1[i] - s0[i]) * t;
      alpha[i] = t < 0.1 ? t * 10 : 1 - (t - 0.1) / 0.9;
      col[i3] = c0[i3] + (c1[i3] - c0[i3]) * t;
      col[i3 + 1] = c0[i3 + 1] + (c1[i3 + 1] - c0[i3 + 1]) * t;
      col[i3 + 2] = c0[i3 + 2] + (c1[i3 + 2] - c0[i3 + 2]) * t;
    }
    const a = this.geo.attributes;
    a.position.needsUpdate = a.color.needsUpdate = a.size.needsUpdate = a.alpha.needsUpdate = true;
  }
}

export function makeSparkSystem(max = 3000) {
  return new ParticleSystem(max, { texture: sparkTex() });
}
