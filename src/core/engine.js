import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';

// GTAO that ignores transparent / additive FX so they don't cast AO halos
class CleanGTAOPass extends GTAOPass {
  render(renderer, writeBuffer, readBuffer, deltaTime, maskActive) {
    const hidden = [];
    this.scene.traverseVisible((o) => {
      if (o.isPoints || o.isSprite || o.isLine || ((o.isMesh) && (o.material.transparent || o.material.isShaderMaterial && !o.isInstancedMesh))) { hidden.push(o); }
    });
    for (const o of hidden) o.visible = false;
    super.render(renderer, writeBuffer, readBuffer, deltaTime, maskActive);
    for (const o of hidden) o.visible = true;
  }
}

// Final grading: vignette + chromatic aberration pulse + flash
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uFlash: { value: 0 },
    uFlashColor: { value: new THREE.Color(1, 1, 1) },
    uAberr: { value: 0 },
    uVignette: { value: 0.9 },
    uTime: { value: 0 },
    uDesat: { value: 0 },
    uContrast: { value: 1.08 },
    uSat: { value: 1.12 },
    uGrain: { value: 0.035 },
    uRipples: { value: [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()] },
    uAspect: { value: 1 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uFlash; uniform vec3 uFlashColor; uniform float uAberr; uniform float uVignette; uniform float uDesat;
    uniform float uContrast; uniform float uSat; uniform float uGrain; uniform float uTime;
    uniform vec4 uRipples[4]; uniform float uAspect;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    varying vec2 vUv;
    void main(){
      vec2 uv = vUv;
      // shockwave refraction rings (xy = screen center, z = radius, w = strength)
      for (int i = 0; i < 4; i++) {
        vec4 rp = uRipples[i];
        if (rp.w <= 0.0) continue;
        vec2 dv = uv - rp.xy; dv.x *= uAspect;
        float dist = length(dv);
        float band = smoothstep(0.09, 0.0, abs(dist - rp.z));
        uv -= normalize(dv + 1e-5) / vec2(uAspect, 1.0) * band * rp.w * 0.035;
      }
      vec2 d = uv - 0.5;
      float r2 = dot(d,d);
      vec2 off = d * uAberr * 0.02;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + off).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - off).b;
      float g = dot(col, vec3(0.299,0.587,0.114));
      // cinematic grade: saturation, contrast, teal shadows / warm highlights
      col = mix(vec3(g), col, uSat);
      col = (col - 0.5) * uContrast + 0.5;
      col += mix(vec3(-0.012, 0.004, 0.02), vec3(0.025, 0.012, -0.015), smoothstep(0.1, 0.8, g));
      col = max(col, 0.0);
      g = dot(col, vec3(0.299,0.587,0.114));
      col = mix(col, vec3(g), uDesat);
      col += (hash(vUv * 1000.0 + fract(uTime) * 37.0) - 0.5) * uGrain;
      col *= mix(1.0, smoothstep(0.85, 0.2, r2 * 1.6), uVignette * 0.55);
      col = mix(col, uFlashColor, clamp(uFlash,0.0,1.0));
      gl_FragColor = vec4(col, 1.0);
    }`,
};

export class Engine {
  constructor(container) {
    this.container = container;
    const isMobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
    this.isMobile = isMobile;
    const qp = new URLSearchParams(location.search).get('q');
    this.quality = qp || (isMobile ? 'low' : 'high');
    const renderer = new THREE.WebGLRenderer({ antialias: !isMobile, powerPreference: 'high-performance' });
    renderer.setPixelRatio(this.quality === 'low' ? 1 : Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    this.renderer = renderer;

    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1200);
    this.scene = null;

    const rt = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, { type: THREE.HalfFloatType, samples: this.quality === 'low' ? 0 : 4 });
    this.composer = new EffectComposer(renderer, rt);
    this.renderPass = new RenderPass(new THREE.Scene(), this.camera);
    this.composer.addPass(this.renderPass);
    if (this.quality === 'high') {
      this.gtao = new CleanGTAOPass(new THREE.Scene(), this.camera, window.innerWidth, window.innerHeight);
      this.gtao.blendIntensity = 0.85;
      this.gtao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.5, thickness: 1.5, scale: 1.0, samples: 12 });
      this.gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
      this.composer.addPass(this.gtao);
    }
    this.bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.55, 0.45, 0.88);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);

    this.timer = new THREE.Timer();
    this.time = 0;
    this.timeScale = 1;
    this.hitStop = 0;
    this.shakeAmt = 0;
    this.shakeOffset = new THREE.Vector3();
    this.flash = 0;
    this.aberr = 0;
    this.updaters = new Set();
    this.ripples = [];

    window.addEventListener('resize', () => this.resize());
  }

  setScene(scene, camera) {
    this.scene = scene;
    if (camera) this.camera = camera;
    this.renderPass.scene = scene;
    this.renderPass.camera = this.camera;
    if (this.gtao) { this.gtao.scene = scene; this.gtao.camera = this.camera; this.gtao.enabled = !scene.userData.noAO; }
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.onResize) this.onResize(w, h);
  }

  shake(amount) { this.shakeAmt = Math.min(2.5, Math.max(this.shakeAmt, amount)); }
  doFlash(amount = 0.6, color = 0xffffff) { this.flash = Math.max(this.flash, amount); this.grade.uniforms.uFlashColor.value.set(color); }
  doHitStop(t) { this.hitStop = Math.max(this.hitStop, t); }
  pulseAberration(a) { this.aberr = Math.max(this.aberr, a); }
  // screen-space shockwave distortion at a world position
  ripple(worldPos, strength = 1, speed = 0.9, maxR = 0.6) {
    const p = worldPos.clone().project(this.camera);
    if (p.z > 1) return;
    if (this.ripples.length >= 4) this.ripples.shift();
    this.ripples.push({ x: p.x * 0.5 + 0.5, y: p.y * 0.5 + 0.5, r: 0, s: strength, speed, maxR });
  }

  start(loop) {
    const tick = () => {
      requestAnimationFrame(tick);
      this.timer.update();
      let rawDt = Math.min(this.timer.getDelta(), 0.05);
      let dt = rawDt * this.timeScale;
      if (this.hitStop > 0) { this.hitStop -= rawDt; dt *= 0.06; }
      this.time += dt;
      loop(dt, rawDt);
      for (const u of this.updaters) u(dt, rawDt);
      // camera shake (applied after game camera update)
      if (this.shakeAmt > 0.001) {
        const s = this.shakeAmt * 0.18;
        this.shakeOffset.set((Math.random() - 0.5) * s, (Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
        this.camera.position.add(this.shakeOffset);
        this.shakeAmt *= Math.pow(0.0015, rawDt);
      }
      this.flash *= Math.pow(0.002, rawDt);
      this.aberr *= Math.pow(0.01, rawDt);
      this.grade.uniforms.uFlash.value = this.flash;
      this.grade.uniforms.uAberr.value = this.aberr;
      this.grade.uniforms.uTime.value = this.time;
      this.grade.uniforms.uAspect.value = this.camera.aspect;
      const ru = this.grade.uniforms.uRipples.value;
      for (let i = this.ripples.length - 1; i >= 0; i--) {
        const r = this.ripples[i];
        r.r += rawDt * r.speed;
        if (r.r > r.maxR) this.ripples.splice(i, 1);
      }
      for (let i = 0; i < 4; i++) {
        const r = this.ripples[i];
        if (r) ru[i].set(r.x, r.y, r.r, r.s * (1 - r.r / r.maxR));
        else ru[i].set(0, 0, 0, 0);
      }
      if (this.scene) this.composer.render(rawDt);
      if (this.shakeAmt > 0.001) this.camera.position.sub(this.shakeOffset);
    };
    tick();
  }
}
