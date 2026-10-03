import * as THREE from 'three';
import { noiseTex, magicCircleTex } from './textures.js';

const common = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide };

export const globalUniforms = { uTime: { value: 0 } };

// Arc strip in XZ plane facing +Z. u = along arc (0 = start/right, 1 = end/left), v = radial (0 inner, 1 outer)
export function arcGeometry(rIn, rOut, angle, segs = 48) {
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const a = -angle / 2 + t * angle;
    const s = Math.sin(a), c = Math.cos(a);
    // taper the ends
    const taper = Math.sin(t * Math.PI) * 0.85 + 0.15;
    const ri = rOut - (rOut - rIn) * taper;
    pos.push(s * ri, 0, c * ri, s * rOut, 0, c * rOut);
    uv.push(t, 0, t, 1);
    if (i < segs) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

export function slashMaterial(color, color2) {
  return new THREE.ShaderMaterial({
    ...common,
    uniforms: {
      uColor: { value: new THREE.Color(color) }, uColor2: { value: new THREE.Color(color2 ?? 0xffffff) },
      uProgress: { value: 0 }, uFade: { value: 1 }, uTrail: { value: 0.75 }, uNoise: { value: noiseTex() }, uTime: globalUniforms.uTime,
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform vec3 uColor; uniform vec3 uColor2; uniform float uProgress; uniform float uFade; uniform sampler2D uNoise; uniform float uTime; uniform float uTrail;
      varying vec2 vUv;
      void main(){
        float head = uProgress * 1.35;
        float d = head - vUv.x;
        if (d < 0.0) discard;
        float trail = smoothstep(uTrail, 0.0, d);
        float edge = pow(vUv.y, 3.0);
        float n = texture2D(uNoise, vec2(vUv.x * 2.0 - uTime * 0.6, vUv.y * 0.6)).r;
        float streak = smoothstep(0.35, 0.8, texture2D(uNoise, vec2(vUv.x * 0.5, vUv.y * 4.0 + uTime)).r);
        float a = trail * (edge * 1.3 + streak * 0.35 * vUv.y) * (0.6 + n * 0.8);
        vec3 col = mix(uColor, uColor2, smoothstep(0.75, 1.0, vUv.y));
        col += vec3(1.0) * smoothstep(0.93, 1.0, vUv.y) * trail;
        gl_FragColor = vec4(col * a * 1.7 * uFade, 1.0);
      }`,
  });
}

export function ringMaterial(color, { width = 0.25, noise = true } = {}) {
  return new THREE.ShaderMaterial({
    ...common,
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: 1 }, uWidth: { value: width }, uNoise: { value: noiseTex() }, uTime: globalUniforms.uTime, uUseNoise: { value: noise ? 1 : 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uOpacity; uniform sampler2D uNoise; uniform float uTime; uniform float uUseNoise;
      varying vec2 vUv;
      void main(){
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        float ring = smoothstep(0.55, 0.92, r) * smoothstep(1.0, 0.94, r);
        float ang = atan(p.y, p.x);
        float n = mix(1.0, texture2D(uNoise, vec2(ang * 0.5 + uTime * 0.2, r - uTime * 0.5)).r * 1.6, uUseNoise);
        vec3 col = uColor + vec3(1.0) * smoothstep(0.9, 0.97, r) * 0.3;
        gl_FragColor = vec4(col * ring * n * uOpacity * 1.2, 1.0);
      }`,
  });
}

export function pillarMaterial(color, color2 = 0xffffff) {
  return new THREE.ShaderMaterial({
    ...common,
    uniforms: { uColor: { value: new THREE.Color(color) }, uColor2: { value: new THREE.Color(color2) }, uOpacity: { value: 1 }, uNoise: { value: noiseTex() }, uTime: globalUniforms.uTime, uSpeed: { value: 1.5 } },
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `
      uniform vec3 uColor; uniform vec3 uColor2; uniform float uOpacity; uniform sampler2D uNoise; uniform float uTime; uniform float uSpeed;
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){
        float n = texture2D(uNoise, vec2(vUv.x * 3.0, vUv.y * 1.2 - uTime * uSpeed)).r;
        float n2 = texture2D(uNoise, vec2(vUv.x * 5.0 + 0.3, vUv.y * 2.0 - uTime * uSpeed * 1.7)).r;
        float v = pow(1.0 - vUv.y, 1.4) * smoothstep(0.0, 0.08, vUv.y);
        float rim = 1.0 - abs(dot(vN, vV));
        float a = v * (0.2 + n * n2 * 1.8) * (0.25 + rim * 0.9);
        vec3 col = mix(uColor, uColor2, n2 * v);
        gl_FragColor = vec4(col * a * uOpacity * 1.1, 1.0);
      }`,
  });
}

export function magicCircleMaterial(color, seed = 1, style = 0) {
  return new THREE.ShaderMaterial({
    ...common,
    uniforms: { uMap: { value: magicCircleTex(seed, style) }, uColor: { value: new THREE.Color(color) }, uOpacity: { value: 1 }, uRot: { value: 0 }, uTime: globalUniforms.uTime, uPulse: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform sampler2D uMap; uniform vec3 uColor; uniform float uOpacity; uniform float uRot; uniform float uTime; uniform float uPulse;
      varying vec2 vUv;
      vec2 rot(vec2 p, float a){ float c = cos(a), s = sin(a); return vec2(c*p.x - s*p.y, s*p.x + c*p.y); }
      void main(){
        vec2 p = vUv - 0.5;
        float r = length(p) * 2.0;
        // outer part rotates one way, inner the other
        float a = r > 0.52 ? uRot : -uRot * 1.6;
        vec2 q = rot(p, a) + 0.5;
        float m = pow(texture2D(uMap, q).r, 1.7);
        float glow = smoothstep(1.0, 0.0, r) * 0.08;
        float wave = smoothstep(0.08, 0.0, abs(r - fract(uTime * 0.6))) * 0.6 * uPulse;
        vec3 col = uColor * (m * 1.1 + glow + wave) + vec3(1.0) * m * 0.12;
        gl_FragColor = vec4(col * uOpacity, 1.0);
      }`,
  });
}

export function tornadoMaterial(color, color2 = 0xffffff) {
  return new THREE.ShaderMaterial({
    ...common,
    uniforms: { uColor: { value: new THREE.Color(color) }, uColor2: { value: new THREE.Color(color2) }, uOpacity: { value: 1 }, uNoise: { value: noiseTex() }, uTime: globalUniforms.uTime, uSpeed: { value: 3 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform vec3 uColor; uniform vec3 uColor2; uniform float uOpacity; uniform sampler2D uNoise; uniform float uTime; uniform float uSpeed;
      varying vec2 vUv;
      void main(){
        vec2 q = vec2(vUv.x * 2.0 + vUv.y * 0.8 - uTime * uSpeed, vUv.y * 0.7 - uTime * 0.4);
        float n = texture2D(uNoise, q).r;
        float streak = smoothstep(0.5, 0.85, texture2D(uNoise, vec2(vUv.x * 4.0 + vUv.y * 1.5 - uTime * uSpeed * 1.3, vUv.y * 0.3)).r);
        float v = smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.6, vUv.y);
        float a = v * (n * 0.6 + streak * 1.4);
        vec3 col = mix(uColor, uColor2, streak);
        gl_FragColor = vec4(col * a * uOpacity * 0.6, 1.0);
      }`,
  });
}

// Shell around meshes: pushed along normals, fresnel + flame noise
export function auraShellMaterial(color, color2, { thickness = 0.02, intensity = 1, rainbow = 0, flame = 1 } = {}) {
  return new THREE.ShaderMaterial({
    ...common,
    side: THREE.FrontSide,
    uniforms: {
      uColor: { value: new THREE.Color(color) }, uColor2: { value: new THREE.Color(color2) },
      uThick: { value: thickness }, uIntensity: { value: intensity }, uRainbow: { value: rainbow }, uFlame: { value: flame },
      uNoise: { value: noiseTex() }, uTime: globalUniforms.uTime,
    },
    vertexShader: `
      uniform float uThick; uniform float uTime; uniform sampler2D uNoise; uniform float uFlame;
      varying vec3 vN; varying vec3 vV; varying vec3 vWorld; varying float vFl;
      void main(){
        vec3 wp = (modelMatrix * vec4(position, 1.0)).xyz;
        float n = texture2D(uNoise, vec2(wp.x * 1.5 + wp.z * 1.5, wp.y * 1.2 - uTime * 1.2)).r;
        vFl = n;
        vec3 p = position + normal * uThick * (1.0 + n * uFlame * 1.5);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        #ifdef USE_INSTANCING
        mv = modelViewMatrix * instanceMatrix * vec4(p, 1.0);
        #endif
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        vWorld = wp;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor; uniform vec3 uColor2; uniform float uIntensity; uniform float uRainbow; uniform float uTime; uniform sampler2D uNoise;
      varying vec3 vN; varying vec3 vV; varying vec3 vWorld; varying float vFl;
      vec3 hue(float h){ return clamp(abs(mod(h*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0, 0.0, 1.0); }
      void main(){
        float fr = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);
        float n = texture2D(uNoise, vec2(vWorld.x * 2.0 + vWorld.z, vWorld.y * 2.5 - uTime * 2.0)).r;
        vec3 col = mix(uColor, uColor2, n);
        col = mix(col, hue(fract(vWorld.y * 0.35 - uTime * 0.25)) * 1.2 + 0.2, uRainbow);
        float a = (pow(fr, 1.4) * 1.3 + 0.05) * (0.35 + n * vFl * 1.6) * uIntensity;
        gl_FragColor = vec4(col * a, 1.0);
      }`,
  });
}

export function decalMaterial(color = 0xff2a2a) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.NormalBlending, side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color(color) }, uFill: { value: 0 }, uOpacity: { value: 1 }, uAngle: { value: Math.PI * 2 }, uTime: globalUniforms.uTime },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uFill; uniform float uOpacity; uniform float uAngle; uniform float uTime;
      varying vec2 vUv;
      void main(){
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        if (r > 1.0) discard;
        float ang = abs(atan(p.x, p.y));
        if (ang > uAngle * 0.5) discard;
        float edge = smoothstep(0.92, 0.98, r) + smoothstep(uAngle*0.5 - 0.03, uAngle*0.5, ang) * step(uAngle, 6.0);
        float fill = step(r, uFill) * (0.35 + 0.25 * smoothstep(uFill - 0.08, uFill, r));
        float base = 0.18 + 0.05 * sin(uTime * 10.0);
        float a = max(edge * 0.9, max(fill, base));
        gl_FragColor = vec4(uColor * (1.0 + edge), a * uOpacity);
      }`,
  });
}

export function ghostMaterial(color) {
  return new THREE.ShaderMaterial({
    ...common,
    side: THREE.FrontSide,
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: 1 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uOpacity; varying vec3 vN; varying vec3 vV;
      void main(){ float fr = pow(1.0 - abs(dot(vN, vV)), 1.5); gl_FragColor = vec4(uColor * (0.25 + fr * 1.4) * uOpacity, 1.0); }`,
  });
}

export function basicAdd(color, opacity = 1) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
}

// Portal swirl
export function portalMaterial(color = 0x7a5cff, color2 = 0x2ef0ff) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color(color) }, uColor2: { value: new THREE.Color(color2) }, uNoise: { value: noiseTex() }, uTime: globalUniforms.uTime },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform vec3 uColor; uniform vec3 uColor2; uniform sampler2D uNoise; uniform float uTime;
      varying vec2 vUv;
      void main(){
        vec2 p = vUv * 2.0 - 1.0; float r = length(p); if (r > 1.0) discard;
        float a = atan(p.y, p.x);
        float sw = texture2D(uNoise, vec2(a / 6.2831 * 2.0 + r * 1.5 - uTime * 0.3, r * 0.8 - uTime * 0.5)).r;
        float core = smoothstep(1.0, 0.0, r);
        vec3 col = mix(uColor, uColor2, sw) * (sw * 0.9 + 0.08) * (0.35 + core * 0.6);
        col += mix(uColor2, vec3(1.0), 0.5) * pow(core, 8.0) * 0.5;
        float edge = smoothstep(1.0, 0.85, r);
        gl_FragColor = vec4(col * edge, 1.0);
      }`,
  });
}

// Ground burn / crack decal left after big impacts
export function scorchMaterial(color = 0xff7a20) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -2,
    uniforms: { uColor: { value: new THREE.Color(color) }, uLife: { value: 1 }, uGlow: { value: 1 }, uNoise: { value: noiseTex() }, uSeed: { value: Math.random() * 10 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uLife; uniform float uGlow; uniform sampler2D uNoise; uniform float uSeed;
      varying vec2 vUv;
      void main(){
        vec2 p = vUv * 2.0 - 1.0; float r = length(p); if (r > 1.0) discard;
        float a = atan(p.y, p.x);
        float n = texture2D(uNoise, vUv * 0.8 + uSeed).r;
        float burn = smoothstep(1.0, 0.25, r + (n - 0.5) * 0.5);
        // radial cracks
        float cr = abs(sin(a * 7.0 + n * 6.0 + uSeed)) ;
        float crack = smoothstep(0.08, 0.0, cr * (0.4 + r)) * smoothstep(1.0, 0.15, r);
        float ringCrack = smoothstep(0.03, 0.0, abs(r - 0.45 - (n - 0.5) * 0.2)) * 0.8;
        float cracks = max(crack, ringCrack);
        vec3 col = vec3(0.04, 0.03, 0.025) * (1.0 - cracks);
        col += uColor * cracks * 3.0 * uGlow;
        float alpha = max(burn * 0.75, cracks) * uLife;
        gl_FragColor = vec4(col, alpha);
      }`,
  });
}

// Hexagon energy dome (barrier)
export function hexShieldMaterial(color) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: 1 }, uTime: globalUniforms.uTime, uHit: { value: 0 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vP = position; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uOpacity; uniform float uTime; uniform float uHit;
      varying vec3 vN; varying vec3 vV; varying vec3 vP;
      float hexDist(vec2 p){ p = abs(p); return max(dot(p, normalize(vec2(1.0,1.732))), p.x); }
      void main(){
        vec3 n = normalize(vP);
        vec2 uv = vec2(atan(n.z, n.x) * 3.0, n.y * 5.0);
        vec2 r = vec2(1.0, 1.732); vec2 h = r * 0.5;
        vec2 a = mod(uv, r) - h; vec2 b = mod(uv - h, r) - h;
        vec2 g = dot(a,a) < dot(b,b) ? a : b;
        float edge = smoothstep(0.42, 0.5, hexDist(g));
        float fr = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.5);
        float scan = smoothstep(0.06, 0.0, abs(fract(vP.y * 0.25 - uTime * 0.6) - 0.5));
        float a2 = (edge * 0.3 + fr * 0.6 + scan * 0.15 + uHit * 0.5) * uOpacity;
        gl_FragColor = vec4(uColor * a2 + vec3(1.0) * edge * fr * 0.3 * uOpacity, 1.0);
      }`,
  });
}

// Long flowing spirit (dragon) along a tube: reveals with uHead, scales pattern
export function spiritMaterial(color, color2) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color(color) }, uColor2: { value: new THREE.Color(color2) }, uHead: { value: 0 }, uLen: { value: 0.45 }, uOpacity: { value: 1 }, uNoise: { value: noiseTex() }, uTime: globalUniforms.uTime },
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `
      uniform vec3 uColor; uniform vec3 uColor2; uniform float uHead; uniform float uLen; uniform float uOpacity; uniform sampler2D uNoise; uniform float uTime;
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){
        float d = uHead - vUv.x;
        if (d < 0.0 || d > uLen) discard;
        float body = smoothstep(uLen, uLen * 0.3, d) * smoothstep(0.0, 0.02, d);
        float scales = smoothstep(0.3, 0.9, abs(sin(vUv.x * 260.0 + vUv.y * 18.0)) * texture2D(uNoise, vec2(vUv.x * 6.0 - uTime, vUv.y)).r * 1.6);
        float fr = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 1.5);
        vec3 col = mix(uColor, uColor2, scales) * (0.4 + fr * 1.4 + scales * 0.6);
        col += vec3(1.0) * smoothstep(0.03, 0.0, d) * 2.0;
        gl_FragColor = vec4(col * body * uOpacity, 1.0);
      }`,
  });
}

// Brush-stroke slash with strand erosion (textured, layered)
export function slashMaterial2(map, color, color2) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: {
      uMap: { value: map }, uNoise: { value: noiseTex() }, uColor: { value: new THREE.Color(color) }, uColor2: { value: new THREE.Color(color2) },
      uProgress: { value: 0 }, uFade: { value: 1 }, uTrail: { value: 0.85 }, uTime: globalUniforms.uTime, uGain: { value: 1 },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform sampler2D uMap; uniform sampler2D uNoise; uniform vec3 uColor; uniform vec3 uColor2; uniform float uProgress; uniform float uFade; uniform float uTrail; uniform float uTime; uniform float uGain;
      varying vec2 vUv;
      void main(){
        float head = uProgress * 1.35;
        float d = head - vUv.x;
        if (d < 0.0) discard;
        float trail = smoothstep(uTrail, 0.0, d);
        vec4 t = texture2D(uMap, vec2(vUv.x * 0.9 + uProgress * 0.15, vUv.y));
        float s = t.r;
        // strands erode from the tail
        float n = texture2D(uNoise, vec2(vUv.x * 3.0 - uTime * 0.7, vUv.y * 0.35)).r;
        float erode = smoothstep(d * 1.25 - 0.1, d * 1.25 + 0.15, n + 0.25);
        float a = s * trail * erode;
        vec3 col = mix(uColor, uColor2, smoothstep(0.35, 0.85, s));
        col += vec3(1.0, 0.97, 0.9) * smoothstep(0.82, 1.0, s) * smoothstep(0.25, 0.0, d);
        gl_FragColor = vec4(col * a * uFade * uGain * 1.5, 1.0);
      }`,
  });
}

// Expanding fresnel shock sphere
export function shockSphereMaterial(color) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide,
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: 1 }, uNoise: { value: noiseTex() }, uTime: globalUniforms.uTime },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vP = position; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uOpacity; uniform sampler2D uNoise; uniform float uTime; varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main(){
        float fr = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 3.0);
        float n = texture2D(uNoise, vec2(atan(vP.z, vP.x) * 0.6 + uTime * 0.2, vP.y * 0.8)).r;
        gl_FragColor = vec4(uColor * fr * (0.6 + n * 0.9) * uOpacity * 1.4, 1.0);
      }`,
  });
}
