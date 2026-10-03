import * as THREE from 'three';

function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function tex(c, { repeat = false } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.anisotropy = 4;
  return t;
}

let _cache = {};

export function softDot() {
  if (_cache.dot) return _cache.dot;
  const [c, g] = canvas(64);
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(255,255,255,0.75)');
  grd.addColorStop(0.6, 'rgba(255,255,255,0.15)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  return (_cache.dot = tex(c));
}

export function sparkTex() {
  if (_cache.spark) return _cache.spark;
  const [c, g] = canvas(64);
  g.translate(32, 32);
  const grd = g.createRadialGradient(0, 0, 0, 0, 0, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.15, 'rgba(255,255,255,0.6)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.beginPath(); g.arc(0, 0, 10, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.9)';
  for (let i = 0; i < 4; i++) {
    g.rotate(Math.PI / 4 * (i === 0 ? 0 : 2));
    g.beginPath(); g.moveTo(-32, 0); g.lineTo(0, -2.2); g.lineTo(32, 0); g.lineTo(0, 2.2); g.closePath(); g.fill();
  }
  return (_cache.spark = tex(c));
}

// Procedural magic circle with glyph rings
export function magicCircleTex(seed = 1, style = 0) {
  const key = 'mc' + seed + '_' + style;
  if (_cache[key]) return _cache[key];
  const S = 1024;
  const [c, g] = canvas(S);
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  g.translate(S / 2, S / 2);
  g.strokeStyle = 'white'; g.fillStyle = 'white';
  g.shadowColor = 'white'; g.shadowBlur = 2;
  const ring = (r, w) => { g.lineWidth = w; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); };
  const R = S / 2 - 12;
  ring(R, 6); ring(R - 18, 2); ring(R - 70, 4); ring(R - 84, 1.5);
  // glyph band
  const glyphRing = (r, n, h) => {
    for (let i = 0; i < n; i++) {
      g.save(); g.rotate((i / n) * Math.PI * 2); g.translate(0, -r);
      g.lineWidth = 2.5; g.beginPath();
      const strokes = 2 + Math.floor(rnd() * 3);
      for (let k = 0; k < strokes; k++) {
        const x1 = (rnd() - 0.5) * h * 0.7, y1 = (rnd() - 0.5) * h;
        const x2 = (rnd() - 0.5) * h * 0.7, y2 = (rnd() - 0.5) * h;
        if (rnd() < 0.3) { g.moveTo(x1 + 4, y1); g.arc(x1, y1, 4, 0, Math.PI * 2); } else { g.moveTo(x1, y1); g.lineTo(x2, y2); }
      }
      g.stroke(); g.restore();
    }
  };
  glyphRing(R - 44, 48, 30);
  // polygram
  const star = (r, n, step) => {
    g.lineWidth = 3; g.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = (i * step / n) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      i === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.stroke();
  };
  if (style === 0) { star(R - 90, 6, 2); star(R - 90, 6, 1); }
  else if (style === 1) { star(R - 90, 5, 2); }
  else { star(R - 90, 8, 3); star(R - 90, 8, 1); }
  ring(R * 0.5, 3); ring(R * 0.5 - 12, 1.5);
  glyphRing(R * 0.5 - 30, 24, 22);
  ring(R * 0.28, 3);
  // small orbit circles
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.save(); g.translate(Math.cos(a) * (R - 90), Math.sin(a) * (R - 90));
    ring(22, 2.5); ring(12, 1.5); g.restore();
  }
  // tick marks
  for (let i = 0; i < 120; i++) {
    g.save(); g.rotate((i / 120) * Math.PI * 2);
    g.lineWidth = i % 5 === 0 ? 3 : 1;
    g.beginPath(); g.moveTo(0, -R + 20); g.lineTo(0, -R + (i % 5 === 0 ? 36 : 28)); g.stroke();
    g.restore();
  }
  // center glyph
  star(R * 0.26, 4, 1); star(R * 0.26, 3, 1);
  return (_cache[key] = tex(c));
}

export function runeRingTex() {
  if (_cache.runeRing) return _cache.runeRing;
  const [c, g] = canvas(1024, 64);
  g.fillStyle = 'rgba(0,0,0,0)'; g.fillRect(0, 0, 1024, 64);
  g.strokeStyle = 'white'; g.lineWidth = 3; g.shadowColor = 'white'; g.shadowBlur = 6;
  let s = 7;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 32; i++) {
    const cx = i * 32 + 16;
    g.beginPath();
    for (let k = 0; k < 3; k++) { g.moveTo(cx + (rnd() - 0.5) * 18, 12 + rnd() * 40); g.lineTo(cx + (rnd() - 0.5) * 18, 12 + rnd() * 40); }
    g.stroke();
  }
  g.fillStyle = 'white'; g.fillRect(0, 2, 1024, 2); g.fillRect(0, 60, 1024, 2);
  const t = tex(c, { repeat: true });
  return (_cache.runeRing = t);
}

// tileable value noise
export function noiseTex() {
  if (_cache.noise) return _cache.noise;
  const S = 256;
  const [c, g] = canvas(S);
  const img = g.createImageData(S, S);
  const grid = (n) => { const a = []; for (let i = 0; i < n * n; i++) a.push(Math.random()); return a; };
  const octs = [[4, 0.5], [8, 0.25], [16, 0.15], [32, 0.1]].map(([n, w]) => ({ n, w, a: grid(n) }));
  const smooth = (t) => t * t * (3 - 2 * t);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let v = 0;
    for (const o of octs) {
      const fx = (x / S) * o.n, fy = (y / S) * o.n;
      const x0 = Math.floor(fx), y0 = Math.floor(fy);
      const tx = smooth(fx - x0), ty = smooth(fy - y0);
      const at = (i, j) => o.a[((j % o.n) * o.n) + (i % o.n)];
      const a = at(x0, y0), b = at(x0 + 1, y0), cc = at(x0, y0 + 1), d = at(x0 + 1, y0 + 1);
      v += (a + (b - a) * tx + (cc - a) * ty + (a - b - cc + d) * tx * ty) * o.w;
    }
    const i = (y * S + x) * 4;
    const b = Math.max(0, Math.min(255, v * 255));
    img.data[i] = img.data[i + 1] = img.data[i + 2] = b; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return (_cache.noise = t);
}
