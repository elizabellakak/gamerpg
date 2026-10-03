import * as THREE from 'three';

// Ribbon trail between two moving points (weapon base & tip)
export class Trail {
  constructor(scene, { length = 48, samples = 14, color = 0xffffff, color2 = 0xffffff } = {}) {
    this.length = length;      // rendered (resampled) points
    this.samples = samples;    // raw history kept
    this.base = []; this.tip = [];
    const n = length;
    this.positions = new Float32Array(n * 2 * 3);
    this.alphas = new Float32Array(n * 2);
    const uvs = new Float32Array(n * 2 * 2);
    const idx = [];
    for (let i = 0; i < n; i++) {
      uvs[i * 4] = i / (n - 1); uvs[i * 4 + 1] = 0; uvs[i * 4 + 2] = i / (n - 1); uvs[i * 4 + 3] = 1;
      if (i < n - 1) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    g.setIndex(idx);
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uColor: { value: new THREE.Color(color) }, uColor2: { value: new THREE.Color(color2) }, uOpacity: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 uColor; uniform vec3 uColor2; uniform float uOpacity; varying vec2 vUv;
        void main(){
          float head = 1.0 - vUv.x;            // 0 newest
          float a = pow(1.0 - head, 1.6) * smoothstep(0.0, 0.6, vUv.y);
          vec3 c = mix(uColor, uColor2, smoothstep(0.7, 1.0, vUv.y));
          c += vec3(1.0) * smoothstep(0.92, 1.0, vUv.y) * (1.0 - head) * 0.8;
          gl_FragColor = vec4(c * a * uOpacity * 1.8, 1.0);
        }`,
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 7;
    this.geo = g;
    scene.add(this.mesh);
    this.active = false;
    this.opacity = 0;
    this.scene = scene;
  }

  setColor(c1, c2) { this.mat.uniforms.uColor.value.set(c1); this.mat.uniforms.uColor2.value.set(c2); }

  update(dt, basePos, tipPos) {
    this.opacity += ((this.active ? 1 : 0) - this.opacity) * Math.min(1, dt * (this.active ? 30 : 8));
    this.mat.uniforms.uOpacity.value = this.opacity;
    this.t = (this.t || 0) + dt;
    this.times = this.times || [];
    this.base.push(basePos.clone()); this.tip.push(tipPos.clone()); this.times.push(this.t);
    while (this.base.length > this.samples || (this.base.length > 3 && this.t - this.times[0] > 0.24)) { this.base.shift(); this.tip.shift(); this.times.shift(); }
    // resample the raw history with a centripetal Catmull-Rom so arcs stay smooth at any frame rate
    const n = this.length, cnt = this.base.length;
    if (cnt < 2) return;
    const cb = this._cb || (this._cb = new THREE.CatmullRomCurve3([], false, 'centripetal'));
    const ct = this._ct || (this._ct = new THREE.CatmullRomCurve3([], false, 'centripetal'));
    cb.points = this.base; ct.points = this.tip;
    const pb = this._pb || (this._pb = new THREE.Vector3()), pt = this._pt || (this._pt = new THREE.Vector3());
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      cb.getPoint(u, pb); ct.getPoint(u, pt);
      const o = i * 6;
      this.positions[o] = pb.x; this.positions[o + 1] = pb.y; this.positions[o + 2] = pb.z;
      this.positions[o + 3] = pt.x; this.positions[o + 4] = pt.y; this.positions[o + 5] = pt.z;
    }
    this.geo.attributes.position.needsUpdate = true;
  }

  dispose() { this.scene.remove(this.mesh); this.geo.dispose(); this.mat.dispose(); }
}
