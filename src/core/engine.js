import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

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
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uFlash; uniform vec3 uFlashColor; uniform float uAberr; uniform float uVignette; uniform float uDesat;
    varying vec2 vUv;
    void main(){
      vec2 d = vUv - 0.5;
      float r2 = dot(d,d);
      vec2 off = d * uAberr * 0.02;
      vec3 col;
      col.r = texture2D(tDiffuse, vUv + off).r;
      col.g = texture2D(tDiffuse, vUv).g;
      col.b = texture2D(tDiffuse, vUv - off).b;
      float g = dot(col, vec3(0.299,0.587,0.114));
      col = mix(col, vec3(g), uDesat);
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
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    this.renderer = renderer;

    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1200);
    this.scene = null;

    this.composer = new EffectComposer(renderer);
    this.renderPass = new RenderPass(new THREE.Scene(), this.camera);
    this.composer.addPass(this.renderPass);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.75, 0.55, 0.82);
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

    window.addEventListener('resize', () => this.resize());
  }

  setScene(scene, camera) {
    this.scene = scene;
    if (camera) this.camera = camera;
    this.renderPass.scene = scene;
    this.renderPass.camera = this.camera;
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
      if (this.scene) this.composer.render(rawDt);
      if (this.shakeAmt > 0.001) this.camera.position.sub(this.shakeOffset);
    };
    tick();
  }
}
