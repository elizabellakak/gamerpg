import * as THREE from 'three';

// Procedural VFX textures: lit smoke & fire flipbooks, streaks, slash strokes, star flares.

function hash3(x, y, z) {
  let h = x * 374761393 + y * 668265263 + z * 2147483647;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const l = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => hash3(xi + dx, yi + dy, zi + dz);
  return l(l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v),
    l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v), w);
}
function fbm3(x, y, z, oct = 5) {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { s += vnoise(x * f, y * f, z * f) * a; a *= 0.5; f *= 2.03; }
  return s;
}

const cache = {};

// Flipbook atlas: cols x rows frames. kind 'smoke' => RGB = lighting, A = density.
// kind 'fire' => R = density, G = hot core, B = edge
export function flipbook(kind, { cols = 4, rows = 4, size = 128 } = {}) {
  const key = kind + cols + rows + size;
  if (cache[key]) return cache[key];
  const W = cols * size, H = rows * size;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const img = g.createImageData(W, H);
  const frames = cols * rows;
  const L = [-0.5, 0.75, 0.45]; // light from upper-left-front
  const ll = Math.hypot(...L); L[0] /= ll; L[1] /= ll; L[2] /= ll;
  const dens = new Float32Array(size * size);
  for (let f = 0; f < frames; f++) {
    const t = f / frames;
    const fx = (f % cols) * size, fy = Math.floor(f / cols) * size;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const nx = x / size * 2 - 1, ny = y / size * 2 - 1;
      const r = Math.hypot(nx, ny);
      let d;
      if (kind === 'smoke') {
        const grow = 0.55 + t * 0.45;
        const n = fbm3(nx * 2.2 + 3, ny * 2.2 - t * 1.5, t * 2.5, 5);
        d = Math.max(0, n * 1.6 - 0.35 - Math.pow(r / grow, 2.2) * 0.9) * (1 - t * 0.55);
      } else {
        const n = fbm3(nx * 2.6, ny * 2.6 + t * 3.2, t * 3, 5);
        const flame = 1 - Math.pow(r / (0.95 - t * 0.35), 2) - Math.max(0, -ny) * 0.4 * t;
        d = Math.max(0, flame * 0.9 + (n - 0.5) * 1.6) * (1 - t * 0.85);
      }
      dens[y * size + x] = Math.min(1, d);
    }
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const i = ((fy + y) * W + fx + x) * 4;
      const d = dens[y * size + x];
      if (kind === 'smoke') {
        const dl = dens[y * size + Math.max(0, x - 1)], dr = dens[y * size + Math.min(size - 1, x + 1)];
        const du = dens[Math.max(0, y - 1) * size + x], dd = dens[Math.min(size - 1, y + 1) * size + x];
        let nxv = (dl - dr) * 6, nyv = (dd - du) * 6, nz = 0.6;
        const nl = Math.hypot(nxv, nyv, nz); nxv /= nl; nyv /= nl; nz /= nl;
        const lit = Math.max(0, nxv * L[0] + nyv * L[1] + nz * L[2]);
        const sh = 0.35 + lit * 0.75 + d * 0.15;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.min(255, sh * 255);
        img.data[i + 3] = Math.min(255, Math.pow(d, 0.8) * 300);
      } else {
        img.data[i] = d * 255;
        img.data[i + 1] = Math.pow(d, 2.2) * 255;
        img.data[i + 2] = (d > 0.02 && d < 0.25 ? 1 : 0) * 255;
        img.data[i + 3] = 255;
      }
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = kind === 'smoke' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.generateMipmaps = true;
  cache[key] = { tex, cols, rows };
  return cache[key];
}

// Elongated streak for velocity-stretched sparks
export function streakTex() {
  if (cache.streak) return cache.streak;
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, 'rgba(255,255,255,0)'); grd.addColorStop(0.15, 'rgba(255,255,255,1)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.beginPath(); g.ellipse(32, 128, 9, 126, 0, 0, Math.PI * 2); g.fill();
  const g2 = g.createRadialGradient(32, 40, 0, 32, 40, 30);
  g2.addColorStop(0, 'rgba(255,255,255,1)'); g2.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = g2; g.fillRect(0, 0, 64, 90);
  return (cache.streak = new THREE.CanvasTexture(c));
}

// 4/6 point star flare with soft core
export function starTex(points = 4) {
  const key = 'star' + points;
  if (cache[key]) return cache[key];
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  g.translate(S / 2, S / 2);
  const core = g.createRadialGradient(0, 0, 0, 0, 0, S / 2);
  core.addColorStop(0, 'rgba(255,255,255,1)'); core.addColorStop(0.08, 'rgba(255,255,255,0.9)'); core.addColorStop(0.25, 'rgba(255,255,255,0.25)'); core.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = core; g.fillRect(-S / 2, -S / 2, S, S);
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < points; i++) {
    g.save(); g.rotate((i / points) * Math.PI * 2 + (points === 4 ? 0 : Math.PI / 12));
    const len = i % 2 === 0 ? S / 2 : S * 0.32;
    const grd = g.createLinearGradient(0, 0, len, 0);
    grd.addColorStop(0, 'rgba(255,255,255,0.95)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.beginPath(); g.moveTo(0, -4); g.lineTo(len, 0); g.lineTo(0, 4); g.closePath(); g.fill();
    g.restore();
  }
  return (cache[key] = new THREE.CanvasTexture(c));
}

// Brush-stroke slash texture. x = along the arc, y = radial (top = outer edge)
export function slashTex(seed = 1) {
  const key = 'slash' + seed;
  if (cache[key]) return cache[key];
  const W = 1024, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  let s = seed * 1013;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  g.globalCompositeOperation = 'lighter';
  // main bright rim
  for (let k = 0; k < 3; k++) {
    const grd = g.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, 'rgba(255,255,255,0)');
    grd.addColorStop(0.04 + k * 0.02, 'rgba(255,255,255,0.9)');
    grd.addColorStop(0.18 + k * 0.05, 'rgba(255,255,255,0.15)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
  }
  // strands
  for (let i = 0; i < 70; i++) {
    const y = Math.pow(rnd(), 1.6) * H * 0.95;
    const x0 = rnd() * W * 0.5, x1 = x0 + W * (0.3 + rnd() * 0.7);
    const a = (1 - y / H) * (0.25 + rnd() * 0.6);
    const w = 1 + rnd() * 4 * (1 - y / H);
    const grd = g.createLinearGradient(x0, 0, x1, 0);
    grd.addColorStop(0, 'rgba(255,255,255,0)'); grd.addColorStop(0.3 + rnd() * 0.4, `rgba(255,255,255,${a})`); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(x0, y, x1 - x0, w);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  cache[key] = tex;
  return tex;
}

// Radial spike starburst (hit flash)
export function spikeBurstTex(seed = 3) {
  const key = 'spike' + seed;
  if (cache[key]) return cache[key];
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  let s = seed * 7919;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  g.translate(S / 2, S / 2);
  g.globalCompositeOperation = 'lighter';
  const core = g.createRadialGradient(0, 0, 0, 0, 0, S * 0.28);
  core.addColorStop(0, 'rgba(255,255,255,1)'); core.addColorStop(0.3, 'rgba(255,255,255,0.55)'); core.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = core; g.beginPath(); g.arc(0, 0, S * 0.28, 0, Math.PI * 2); g.fill();
  for (let i = 0; i < 46; i++) {
    const a = rnd() * Math.PI * 2;
    const len = S * (0.18 + Math.pow(rnd(), 1.8) * 0.32);
    const w = 1.5 + rnd() * 5;
    g.save(); g.rotate(a);
    const grd = g.createLinearGradient(0, 0, len, 0);
    grd.addColorStop(0, 'rgba(255,255,255,0.95)'); grd.addColorStop(0.6, 'rgba(255,255,255,0.5)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.beginPath(); g.moveTo(S * 0.03, -w); g.lineTo(len, 0); g.lineTo(S * 0.03, w); g.closePath(); g.fill();
    g.restore();
  }
  return (cache[key] = new THREE.CanvasTexture(c));
}

// Swirling ground vortex: many curved streaks spiralling outwards
export function swirlTex(seed = 5) {
  const key = 'swirl' + seed;
  if (cache[key]) return cache[key];
  const S = 1024, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  let s = seed * 104729;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  g.translate(S / 2, S / 2);
  g.globalCompositeOperation = 'lighter';
  g.lineCap = 'round';
  for (let i = 0; i < 140; i++) {
    const r = S * (0.12 + Math.pow(rnd(), 0.7) * 0.36);
    const a0 = rnd() * Math.PI * 2, len = 0.6 + rnd() * 2.2;
    const w = 2 + rnd() * 10 * (r / (S * 0.5));
    const alpha = 0.15 + rnd() * 0.55;
    const steps = 24;
    for (let k = 0; k < steps; k++) {
      const t0 = k / steps, t1 = (k + 1) / steps;
      const fade = Math.sin(t0 * Math.PI);
      g.strokeStyle = `rgba(255,255,255,${alpha * fade})`;
      g.lineWidth = w * (0.4 + fade * 0.6);
      g.beginPath();
      // radius grows along the stroke -> spiral
      g.arc(0, 0, r * (1 + t0 * 0.12), a0 + t0 * len, a0 + t1 * len);
      g.stroke();
    }
  }
  const glow = g.createRadialGradient(0, 0, S * 0.1, 0, 0, S * 0.5);
  glow.addColorStop(0, 'rgba(255,255,255,0)'); glow.addColorStop(0.6, 'rgba(255,255,255,0.12)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = glow; g.fillRect(-S / 2, -S / 2, S, S);
  return (cache[key] = new THREE.CanvasTexture(c));
}

// Soft disc with bright rim (ground nova)
export function novaTex() {
  if (cache.nova) return cache.nova;
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grd.addColorStop(0, 'rgba(255,255,255,0.95)');
  grd.addColorStop(0.25, 'rgba(255,255,255,0.45)');
  grd.addColorStop(0.62, 'rgba(255,255,255,0.22)');
  grd.addColorStop(0.86, 'rgba(255,255,255,0.75)');
  grd.addColorStop(0.92, 'rgba(255,255,255,0.35)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, S, S);
  return (cache.nova = new THREE.CanvasTexture(c));
}

// Flame tongue (vertical teardrop) for upward flame rays
export function tongueTex() {
  if (cache.tongue) return cache.tongue;
  const W = 128, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const grd = g.createLinearGradient(0, H, 0, 0);
    grd.addColorStop(0, 'rgba(255,255,255,0)'); grd.addColorStop(0.12, 'rgba(255,255,255,0.9)'); grd.addColorStop(0.5, 'rgba(255,255,255,0.5)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.beginPath();
    const w = W * (0.42 - i * 0.12);
    g.moveTo(W / 2, 0); g.quadraticCurveTo(W / 2 + w, H * 0.6, W / 2, H); g.quadraticCurveTo(W / 2 - w, H * 0.6, W / 2, 0); g.fill();
  }
  return (cache.tongue = new THREE.CanvasTexture(c));
}

// Thin concentric rings (classic cast circle at the caster's feet)
export function ringsTex(n = 2) {
  const key = 'rings' + n;
  if (cache[key]) return cache[key];
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  g.translate(S / 2, S / 2);
  g.strokeStyle = '#fff'; g.shadowColor = '#fff';
  const radii = n === 3 ? [0.97, 0.78, 0.56] : n === 2 ? [0.96, 0.7] : [0.95];
  for (const r of radii) {
    g.shadowBlur = 18; g.lineWidth = 7; g.globalAlpha = 0.55; g.beginPath(); g.arc(0, 0, r * S / 2 - 10, 0, Math.PI * 2); g.stroke();
    g.shadowBlur = 4; g.lineWidth = 3; g.globalAlpha = 1; g.beginPath(); g.arc(0, 0, r * S / 2 - 10, 0, Math.PI * 2); g.stroke();
  }
  // faint glyph ticks between the rings
  g.globalAlpha = 0.5; g.lineWidth = 2; g.shadowBlur = 3;
  for (let i = 0; i < 36; i++) { g.save(); g.rotate(i / 36 * Math.PI * 2); g.beginPath(); g.moveTo(0, -radii[0] * S / 2 + 18); g.lineTo(0, -radii[0] * S / 2 + 30); g.stroke(); g.restore(); }
  return (cache[key] = new THREE.CanvasTexture(c));
}

// filled soft disc (fire trap channel disc, life circle core)
export function discTex() {
  if (cache.disc) return cache.disc;
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.75, 'rgba(255,255,255,0.8)'); grd.addColorStop(0.9, 'rgba(255,255,255,1)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, S, S);
  return (cache.disc = new THREE.CanvasTexture(c));
}

// double ring with a band of rune glyphs between the rings (Silkroad wizard cast circle)
export function runeTex(n = 2) {
  const key = 'rune' + n;
  if (cache[key]) return cache[key];
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  g.translate(S / 2, S / 2);
  g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.shadowColor = '#fff';
  const R = S / 2 - 10;
  const radii = n === 3 ? [0.97, 0.8, 0.6] : [0.97, 0.76];
  for (const r of radii) {
    g.shadowBlur = 16; g.lineWidth = 6; g.globalAlpha = 0.5; g.beginPath(); g.arc(0, 0, r * R, 0, Math.PI * 2); g.stroke();
    g.shadowBlur = 3; g.lineWidth = 2.6; g.globalAlpha = 1; g.beginPath(); g.arc(0, 0, r * R, 0, Math.PI * 2); g.stroke();
  }
  // glyphs: small angular strokes in the band between the outer two rings
  let seed = 7 + n;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const mid = (radii[0] + radii[1]) / 2 * R, hh = (radii[0] - radii[1]) * R * 0.32;
  const N = 28;
  g.lineWidth = 2.2; g.shadowBlur = 4; g.globalAlpha = 0.95;
  for (let i = 0; i < N; i++) {
    g.save(); g.rotate(i / N * Math.PI * 2); g.translate(0, -mid);
    g.beginPath();
    const k = Math.floor(rnd() * 5);
    if (k === 0) { g.moveTo(-hh * 0.6, -hh); g.lineTo(0, hh); g.lineTo(hh * 0.6, -hh); }
    else if (k === 1) { g.moveTo(0, -hh); g.lineTo(0, hh); g.moveTo(-hh * 0.6, -hh * 0.2); g.lineTo(hh * 0.6, -hh * 0.2); }
    else if (k === 2) { g.arc(0, 0, hh * 0.65, 0.4, Math.PI * 2 - 0.4); g.moveTo(0, -hh); g.lineTo(0, hh); }
    else if (k === 3) { g.moveTo(-hh * 0.6, hh); g.lineTo(-hh * 0.6, -hh); g.lineTo(hh * 0.6, -hh * 0.3); g.lineTo(-hh * 0.6, hh * 0.2); }
    else { g.moveTo(-hh * 0.6, -hh); g.lineTo(hh * 0.6, hh); g.moveTo(hh * 0.6, -hh); g.lineTo(-hh * 0.6, hh); }
    g.stroke(); g.restore();
  }
  // inner thin spokes for the 3-ring life circle
  if (n === 3) {
    g.globalAlpha = 0.6; g.lineWidth = 1.6;
    for (let i = 0; i < 12; i++) { g.save(); g.rotate(i / 12 * Math.PI * 2); g.beginPath(); g.moveTo(0, -radii[2] * R); g.lineTo(0, -radii[1] * R); g.stroke(); g.restore(); }
  }
  return (cache[key] = new THREE.CanvasTexture(c));
}
