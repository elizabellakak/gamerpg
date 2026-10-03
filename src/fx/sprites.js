import * as THREE from 'three';

// Instanced camera-facing quads with flipbook atlases, rotation and velocity stretch.
// mode: 'add' (texture luminance/alpha), 'fire' (density ramp, additive), 'smoke' (lit, alpha blended)
export class SpriteSystem {
  constructor(max, { map, cols = 1, rows = 1, mode = 'add', stretch = 0, intensity = 1 } = {}) {
    this.max = max;
    this.cursor = 0;
    this.mode = mode;
    const base = new THREE.PlaneGeometry(1, 1);
    const g = new THREE.InstancedBufferGeometry();
    g.index = base.index;
    g.setAttribute('position', base.attributes.position);
    g.setAttribute('uv', base.attributes.uv);
    const mk = (n) => { const a = new THREE.InstancedBufferAttribute(new Float32Array(max * n), n); a.setUsage(THREE.DynamicDrawUsage); return a; };
    this.aPos = mk(3); this.aVel = mk(3); this.aSize = mk(2); this.aCol = mk(4); this.aFrame = mk(1);
    g.setAttribute('iPos', this.aPos); g.setAttribute('iVel', this.aVel); g.setAttribute('iSize', this.aSize);
    g.setAttribute('iCol', this.aCol); g.setAttribute('iFrame', this.aFrame);
    g.instanceCount = max;
    this.geo = g;
    // CPU state
    this.p = new Float32Array(max * 3); this.v = new Float32Array(max * 3);
    this.life = new Float32Array(max); this.maxLife = new Float32Array(max);
    this.s0 = new Float32Array(max); this.s1 = new Float32Array(max);
    this.rot = new Float32Array(max); this.rotV = new Float32Array(max);
    this.c0 = new Float32Array(max * 4); this.c1 = new Float32Array(max * 4);
    this.grav = new Float32Array(max); this.drag = new Float32Array(max);
    this.fr0 = new Float32Array(max); this.frames = cols * rows;
    this.aspect = new Float32Array(max);

    const blending = mode === 'smoke' || mode === 'dark' ? THREE.NormalBlending : THREE.AdditiveBlending;
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending,
      uniforms: { uMap: { value: map }, uGrid: { value: new THREE.Vector2(cols, rows) }, uStretch: { value: stretch }, uIntensity: { value: intensity } },
      vertexShader: `
        attribute vec3 iPos; attribute vec3 iVel; attribute vec2 iSize; attribute vec4 iCol; attribute float iFrame;
        uniform vec2 uGrid; uniform float uStretch;
        varying vec2 vUv0; varying vec2 vUv1; varying float vBlend; varying vec4 vCol;
        vec2 frameUv(float f, vec2 q){ float c = mod(f, uGrid.x); float r = floor(f / uGrid.x); return vec2((q.x + c) / uGrid.x, (q.y + (uGrid.y - 1.0 - r)) / uGrid.y); }
        void main(){
          vCol = iCol;
          float total = uGrid.x * uGrid.y;
          float f0 = floor(iFrame); float f1 = min(f0 + 1.0, total - 1.0);
          vBlend = fract(iFrame);
          vUv0 = frameUv(f0, uv); vUv1 = frameUv(f1, uv);
          vec4 mv = modelViewMatrix * vec4(iPos, 1.0);
          vec2 q = position.xy;
          if (uStretch > 0.0) {
            vec2 vv = (viewMatrix * vec4(iVel, 0.0)).xy;
            float l = length(vv);
            vec2 d = l > 1e-4 ? vv / l : vec2(0.0, 1.0);
            vec2 n = vec2(-d.y, d.x);
            float len = iSize.x * (1.0 + l * uStretch);
            mv.xy += n * q.x * iSize.x * 0.35 + d * q.y * len;
          } else {
            float s = sin(iSize.y), c = cos(iSize.y);
            mv.xy += vec2(c * q.x - s * q.y, s * q.x + c * q.y) * iSize.x;
          }
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D uMap; uniform float uIntensity;
        varying vec2 vUv0; varying vec2 vUv1; varying float vBlend; varying vec4 vCol;
        void main(){
          vec4 t = mix(texture2D(uMap, vUv0), texture2D(uMap, vUv1), vBlend);
          ${mode === 'smoke' || mode === 'dark' ? `
          gl_FragColor = vec4(vCol.rgb * t.rgb, t.a * vCol.a);` : mode === 'cloud' ? `
          // additive billowing energy cloud: lit smoke atlas tinted, hot core where dense
          float a = pow(t.a, 1.35);
          vec3 c = vCol.rgb * (0.2 + t.r * 1.15) + vCol.rgb * pow(t.a, 3.0) * 0.6;
          gl_FragColor = vec4(c * a * vCol.a * uIntensity, 1.0);` : mode === 'fire' ? `
          float d = t.r, core = t.g;
          vec3 c = mix(vCol.rgb, mix(vCol.rgb, vec3(1.0, 0.92, 0.75), 0.75), core);
          gl_FragColor = vec4(c * d * vCol.a * uIntensity * 0.95, 1.0);` : `
          float a = max(t.a * max(max(t.r, t.g), t.b), 0.0);
          gl_FragColor = vec4(vCol.rgb * a * vCol.a * uIntensity, 1.0);`}
        }`,
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = mode === 'smoke' || mode === 'dark' ? 3 : 9;
  }

  // o: {vx,vy,vz, life, size, size1, rot, rotV, color(Color), color1, alpha, alpha1, gravity, drag, frame0}
  emit(x, y, z, o) {
    const i = this.cursor; this.cursor = (this.cursor + 1) % this.max;
    const i3 = i * 3, i4 = i * 4;
    this.p[i3] = x; this.p[i3 + 1] = y; this.p[i3 + 2] = z;
    this.v[i3] = o.vx || 0; this.v[i3 + 1] = o.vy || 0; this.v[i3 + 2] = o.vz || 0;
    this.life[i] = this.maxLife[i] = o.life || 1;
    this.s0[i] = o.size ?? 1; this.s1[i] = o.size1 ?? this.s0[i];
    this.rot[i] = o.rot ?? Math.random() * Math.PI * 2; this.rotV[i] = o.rotV ?? (Math.random() - 0.5) * 1.5;
    const c = o.color || WHITE, c1 = o.color1 || c;
    this.c0[i4] = c.r; this.c0[i4 + 1] = c.g; this.c0[i4 + 2] = c.b; this.c0[i4 + 3] = o.alpha ?? 1;
    this.c1[i4] = c1.r; this.c1[i4 + 1] = c1.g; this.c1[i4 + 2] = c1.b; this.c1[i4 + 3] = o.alpha1 ?? 0;
    this.grav[i] = o.gravity || 0; this.drag[i] = o.drag || 0;
    this.fr0[i] = o.frame0 ?? 0;
  }

  update(dt) {
    const { p, v, life, maxLife, s0, s1, rot, rotV, c0, c1, grav, drag, fr0 } = this;
    const P = this.aPos.array, VV = this.aVel.array, S = this.aSize.array, C = this.aCol.array, F = this.aFrame.array;
    const frames = this.frames;
    for (let i = 0; i < this.max; i++) {
      const i2 = i * 2, i3 = i * 3, i4 = i * 4;
      if (life[i] <= 0) { if (S[i2] !== 0) S[i2] = 0; continue; }
      life[i] -= dt;
      const t = 1 - Math.max(0, life[i]) / maxLife[i];
      const dk = Math.max(0, 1 - drag[i] * dt);
      v[i3] *= dk; v[i3 + 1] = v[i3 + 1] * dk - grav[i] * dt; v[i3 + 2] *= dk;
      p[i3] += v[i3] * dt; p[i3 + 1] += v[i3 + 1] * dt; p[i3 + 2] += v[i3 + 2] * dt;
      rot[i] += rotV[i] * dt;
      P[i3] = p[i3]; P[i3 + 1] = p[i3 + 1]; P[i3 + 2] = p[i3 + 2];
      VV[i3] = v[i3]; VV[i3 + 1] = v[i3 + 1]; VV[i3 + 2] = v[i3 + 2];
      // ease-out growth
      const te = 1 - (1 - t) * (1 - t);
      S[i2] = s0[i] + (s1[i] - s0[i]) * te; S[i2 + 1] = rot[i];
      const fadeIn = Math.min(1, t * 12);
      C[i4] = c0[i4] + (c1[i4] - c0[i4]) * t;
      C[i4 + 1] = c0[i4 + 1] + (c1[i4 + 1] - c0[i4 + 1]) * t;
      C[i4 + 2] = c0[i4 + 2] + (c1[i4 + 2] - c0[i4 + 2]) * t;
      C[i4 + 3] = (c0[i4 + 3] + (c1[i4 + 3] - c0[i4 + 3]) * t) * fadeIn;
      F[i] = Math.min(frames - 1.001, fr0[i] + t * (frames - 1));
    }
    this.aPos.needsUpdate = this.aVel.needsUpdate = this.aSize.needsUpdate = this.aCol.needsUpdate = this.aFrame.needsUpdate = true;
  }
}

const WHITE = new THREE.Color(1, 1, 1);

// Physically simulated debris chunks (lit, shadowed, bounce on terrain)
export class RockSystem {
  constructor(max = 260, heightAt = () => 0) {
    this.max = max; this.cursor = 0; this.heightAt = heightAt;
    const geo = new THREE.IcosahedronGeometry(1, 0);
    this.mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true });
    this.mesh = new THREE.InstancedMesh(geo, this.mat, max);
    this.mesh.castShadow = true; this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
    this.p = new Float32Array(max * 3); this.v = new Float32Array(max * 3); this.q = []; this.w = new Float32Array(max * 3);
    this.life = new Float32Array(max); this.size = new Float32Array(max);
    for (let i = 0; i < max; i++) this.q.push(new THREE.Quaternion());
    this.m4 = new THREE.Matrix4(); this.sc = new THREE.Vector3(); this.pos = new THREE.Vector3(); this.e = new THREE.Euler(); this.dq = new THREE.Quaternion();
    for (let i = 0; i < max; i++) { this.m4.makeScale(0, 0, 0); this.mesh.setMatrixAt(i, this.m4); }
  }
  emit(x, y, z, vx, vy, vz, size, color, life = 2.2) {
    const i = this.cursor; this.cursor = (this.cursor + 1) % this.max;
    const i3 = i * 3;
    this.p[i3] = x; this.p[i3 + 1] = y; this.p[i3 + 2] = z;
    this.v[i3] = vx; this.v[i3 + 1] = vy; this.v[i3 + 2] = vz;
    this.w[i3] = (Math.random() - 0.5) * 14; this.w[i3 + 1] = (Math.random() - 0.5) * 14; this.w[i3 + 2] = (Math.random() - 0.5) * 14;
    this.q[i].setFromEuler(this.e.set(Math.random() * 6, Math.random() * 6, Math.random() * 6));
    this.life[i] = life; this.size[i] = size;
    this.mesh.setColorAt(i, color);
    this.mesh.instanceColor.needsUpdate = true;
  }
  update(dt) {
    const { p, v, w, life, size } = this;
    let any = false;
    for (let i = 0; i < this.max; i++) {
      if (life[i] <= 0) continue;
      any = true;
      const i3 = i * 3;
      life[i] -= dt;
      v[i3 + 1] -= 22 * dt;
      p[i3] += v[i3] * dt; p[i3 + 1] += v[i3 + 1] * dt; p[i3 + 2] += v[i3 + 2] * dt;
      const gy = this.heightAt(p[i3], p[i3 + 2]) + size[i] * 0.6;
      if (p[i3 + 1] < gy) {
        p[i3 + 1] = gy;
        if (v[i3 + 1] < -2) { v[i3 + 1] *= -0.35; v[i3] *= 0.6; v[i3 + 2] *= 0.6; w[i3] *= 0.5; w[i3 + 2] *= 0.5; }
        else { v[i3 + 1] = 0; v[i3] *= 0.9; v[i3 + 2] *= 0.9; w[i3] *= 0.9; w[i3 + 1] *= 0.9; w[i3 + 2] *= 0.9; }
      }
      this.dq.setFromEuler(this.e.set(w[i3] * dt, w[i3 + 1] * dt, w[i3 + 2] * dt));
      this.q[i].multiply(this.dq);
      const s = size[i] * Math.min(1, life[i] / 0.5);
      this.sc.set(s, s * 0.8, s * 1.1);
      this.pos.set(p[i3], p[i3 + 1], p[i3 + 2]);
      this.m4.compose(this.pos, this.q[i], life[i] > 0 ? this.sc : this.sc.set(0, 0, 0));
      this.mesh.setMatrixAt(i, this.m4);
    }
    if (any) this.mesh.instanceMatrix.needsUpdate = true;
  }
}
