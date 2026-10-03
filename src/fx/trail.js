import * as THREE from 'three';

// Ribbon trail between two moving points (weapon base & tip)
export class Trail {
  constructor(scene, { length = 22, color = 0xffffff, color2 = 0xffffff } = {}) {
    this.length = length;
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
    this.base.push(basePos.clone()); this.tip.push(tipPos.clone());
    // add interpolated sample for smoother arcs
    while (this.base.length > this.length) { this.base.shift(); this.tip.shift(); }
    const n = this.length, cnt = this.base.length;
    for (let i = 0; i < n; i++) {
      const j = Math.max(0, cnt - n + i);
      const b = this.base[Math.min(j, cnt - 1)], t = this.tip[Math.min(j, cnt - 1)];
      this.positions.set([b.x, b.y, b.z, t.x, t.y, t.z], i * 6);
    }
    this.geo.attributes.position.needsUpdate = true;
  }

  dispose() { this.scene.remove(this.mesh); this.geo.dispose(); this.mat.dispose(); }
}
