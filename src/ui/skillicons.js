// Procedurally painted skill icons (square, glowing, bevelled frame) in the style of classic MMO skill icons.
const cache = new Map();

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.min(255, Math.max(0, Math.round(r * k))); g = Math.min(255, Math.max(0, Math.round(g * k))); b = Math.min(255, Math.max(0, Math.round(b * k)));
  return `rgb(${r},${g},${b})`;
}

const DRAW = {
  thrust(g, c) { g.rotate(-Math.PI / 4); g.fillRect(-2, -26, 4, 46); g.beginPath(); g.moveTo(0, -30); g.lineTo(7, -18); g.lineTo(-7, -18); g.fill();
    g.lineWidth = 2.5; for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(0, -8 + i * 9, 9 - i * 1.5, 3, 0, 0, Math.PI * 2); g.stroke(); } },
  spin(g) { g.lineWidth = 4; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(0, 0, 8 + i * 7, i, i + 4.2); g.stroke(); } },
  multi(g) { g.rotate(-Math.PI / 5); for (let i = -2; i <= 2; i++) { g.fillRect(i * 7 - 1.5, -22 + Math.abs(i) * 4, 3, 34); g.beginPath(); g.moveTo(i * 7, -28 + Math.abs(i) * 4); g.lineTo(i * 7 + 4, -20 + Math.abs(i) * 4); g.lineTo(i * 7 - 4, -20 + Math.abs(i) * 4); g.fill(); } },
  dragon(g) { g.lineWidth = 6; g.beginPath(); g.moveTo(-18, 18); g.bezierCurveTo(-30, -10, 20, 10, 8, -18); g.stroke(); g.beginPath(); g.arc(8, -20, 6, 0, Math.PI * 2); g.fill(); },
  slash(g) { g.beginPath(); g.arc(-6, 6, 26, -1.4, 0.2); g.arc(-10, 10, 20, 0.2, -1.4, true); g.fill(); },
  shield(g) { g.beginPath(); g.moveTo(0, -24); g.lineTo(18, -16); g.lineTo(16, 6); g.quadraticCurveTo(10, 18, 0, 24); g.quadraticCurveTo(-10, 18, -16, 6); g.lineTo(-18, -16); g.closePath(); g.fill(); },
  buff(g) { for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-14 + i * 14, 10); g.lineTo(-14 + i * 14, -6); g.lineTo(-20 + i * 14, -6); g.lineTo(-14 + i * 14, -18); g.lineTo(-8 + i * 14, -6); g.lineTo(-14 + i * 14, -6); g.fill(); g.fillRect(-16 + i * 14, -6, 4, 20); } },
  sun(g) { for (let i = 0; i < 12; i++) { g.save(); g.rotate(i * Math.PI / 6); g.beginPath(); g.moveTo(-3, -10); g.lineTo(0, -28); g.lineTo(3, -10); g.fill(); g.restore(); } g.beginPath(); g.arc(0, 0, 10, 0, Math.PI * 2); g.fill(); },
  arrow(g) { g.rotate(Math.PI / 4); g.fillRect(-2, -20, 4, 40); g.beginPath(); g.moveTo(0, -28); g.lineTo(8, -16); g.lineTo(-8, -16); g.fill(); g.fillRect(-8, 14, 16, 3); },
  rain(g) { for (let i = 0; i < 5; i++) { const x = -18 + i * 9, y = -14 + (i % 2) * 8; g.fillRect(x - 1, y - 12, 2, 20); g.beginPath(); g.moveTo(x, y + 14); g.lineTo(x + 4, y + 6); g.lineTo(x - 4, y + 6); g.fill(); } },
  burst(g) { g.beginPath(); for (let i = 0; i < 16; i++) { const r = i % 2 ? 10 : 26, a = i * Math.PI / 8; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); },
  star(g) { g.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 9 : 22, a = i * Math.PI / 5 - Math.PI / 2; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); g.fillRect(-28, 18, 30, 3); },
  quake(g) { g.lineWidth = 4; g.beginPath(); g.moveTo(-24, 14); g.lineTo(-10, 0); g.lineTo(-2, 12); g.lineTo(8, -4); g.lineTo(14, 6); g.lineTo(24, -14); g.stroke(); g.fillRect(-26, 16, 52, 6); },
  leap(g) { g.lineWidth = 4; g.beginPath(); g.arc(0, 8, 20, Math.PI, 0); g.stroke(); g.beginPath(); g.moveTo(20, 18); g.lineTo(26, 6); g.lineTo(14, 6); g.fill(); g.fillRect(-26, 20, 52, 4); },
  volcano(g) { g.beginPath(); g.moveTo(-26, 22); g.lineTo(-6, -6); g.lineTo(6, -6); g.lineTo(26, 22); g.fill(); for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(i * 6, -8); g.quadraticCurveTo(i * 14, -20, i * 4, -28); g.quadraticCurveTo(i * 2, -18, i * 6, -8); g.fill(); } },
  fire(g) { g.beginPath(); g.moveTo(0, 24); g.bezierCurveTo(-22, 16, -14, -6, -4, -26); g.bezierCurveTo(-2, -10, 8, -14, 6, -24); g.bezierCurveTo(20, -8, 20, 16, 0, 24); g.fill(); },
  ice(g) { g.lineWidth = 3.5; for (let i = 0; i < 6; i++) { g.save(); g.rotate(i * Math.PI / 3); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -24); g.moveTo(0, -14); g.lineTo(6, -20); g.moveTo(0, -14); g.lineTo(-6, -20); g.stroke(); g.restore(); } },
  bolt(g) { g.beginPath(); g.moveTo(6, -28); g.lineTo(-12, 2); g.lineTo(-1, 2); g.lineTo(-8, 28); g.lineTo(14, -6); g.lineTo(3, -6); g.closePath(); g.fill(); },
  meteor(g) { g.beginPath(); g.arc(8, 8, 12, 0, Math.PI * 2); g.fill(); g.lineWidth = 5; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-2 + i * 6, -2 - i * 2); g.lineTo(-24 + i * 6, -24 - i * 2); g.stroke(); } },
  blade(g) { g.rotate(-Math.PI / 4); g.beginPath(); g.moveTo(0, -30); g.lineTo(5, -22); g.lineTo(4, 14); g.lineTo(-4, 14); g.lineTo(-5, -22); g.fill(); g.fillRect(-12, 14, 24, 4); g.fillRect(-2, 18, 4, 10); },
  wave(g) { g.lineWidth = 5; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-24, -10 + i * 10); g.bezierCurveTo(-8, -20 + i * 10, 8, 0 + i * 10, 24, -10 + i * 10); g.stroke(); } },
  imbue(g) { g.rotate(-Math.PI / 4); g.fillRect(-3, -26, 6, 44); g.lineWidth = 3; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(0, -16 + i * 10, 9, 0, Math.PI * 2); g.stroke(); } },
  passive(g) { g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 18, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(0, -12); g.lineTo(10, 8); g.lineTo(-10, 8); g.closePath(); g.fill(); },
  heal(g) { g.fillRect(-5, -20, 10, 40); g.fillRect(-20, -5, 40, 10); },
  teleport(g) { g.lineWidth = 3; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(0, 0, 6 + i * 6, i * 0.8, i * 0.8 + 4); g.stroke(); } g.beginPath(); g.arc(0, 0, 4, 0, Math.PI * 2); g.fill(); },
  // wizard set
  dust(g) { for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; g.beginPath(); g.arc(Math.cos(a) * 17, Math.sin(a) * 9 + 6, 7, 0, Math.PI * 2); g.fill(); } g.globalAlpha = 0.6; g.beginPath(); g.arc(0, 6, 8, 0, Math.PI * 2); g.fill(); },
  spikes(g) { for (let i = -2; i <= 2; i++) { const h = 30 - Math.abs(i) * 7; g.beginPath(); g.moveTo(i * 10 - 6, 20); g.lineTo(i * 10 + (i % 2) * 2, 20 - h); g.lineTo(i * 10 + 6, 20); g.fill(); } g.fillRect(-28, 20, 56, 5); },
  root(g) { g.lineWidth = 3.5; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(-16 + i * 8, 24); g.bezierCurveTo(-26 + i * 12, 4, -6 + i * 4, -6, -12 + i * 6, -24); g.stroke(); } g.fillRect(-24, 20, 48, 5); },
  drain(g) { g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 20, 0.3, Math.PI * 2 - 0.3); g.stroke(); for (let i = 0; i < 6; i++) { g.save(); g.rotate(i * Math.PI / 3); g.beginPath(); g.arc(0, -11, 3, 0, Math.PI * 2); g.fill(); g.restore(); } },
  stealth(g) { g.globalAlpha = 0.5; g.beginPath(); g.arc(0, -12, 8, 0, Math.PI * 2); g.fill(); g.beginPath(); g.moveTo(-14, 26); g.quadraticCurveTo(-14, -2, 0, -2); g.quadraticCurveTo(14, -2, 14, 26); g.fill(); g.globalAlpha = 1; g.lineWidth = 2; g.setLineDash([4, 4]); g.beginPath(); g.arc(0, -12, 11, 0, Math.PI * 2); g.stroke(); g.setLineDash([]); },
  eye(g) { g.lineWidth = 3.5; g.beginPath(); g.moveTo(-26, 0); g.quadraticCurveTo(0, -24, 26, 0); g.quadraticCurveTo(0, 24, -26, 0); g.stroke(); g.beginPath(); g.arc(0, 0, 8, 0, Math.PI * 2); g.fill(); },
  trap(g) { g.lineWidth = 3; g.beginPath(); g.ellipse(0, 14, 22, 8, 0, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(0, 14); g.bezierCurveTo(-12, 8, -8, -6, -2, -20); g.bezierCurveTo(0, -8, 6, -10, 5, -18); g.bezierCurveTo(14, -6, 12, 8, 0, 14); g.fill(); },
  stream(g) { g.rotate(-Math.PI / 6); g.beginPath(); g.moveTo(-26, 0); g.lineTo(18, -16); g.quadraticCurveTo(30, 0, 18, 16); g.closePath(); g.fill(); g.fillStyle = 'rgba(255,200,80,0.8)'; g.beginPath(); g.moveTo(-20, 0); g.lineTo(14, -8); g.quadraticCurveTo(20, 0, 14, 8); g.closePath(); g.fill(); },
  chain(g) { g.lineWidth = 3; g.beginPath(); g.moveTo(-24, -20); g.lineTo(-8, -4); g.lineTo(-14, 0); g.lineTo(4, 10); g.lineTo(-2, 14); g.lineTo(24, 24); g.stroke(); g.beginPath(); g.moveTo(4, 10); g.lineTo(22, -8); g.lineTo(16, -10); g.lineTo(26, -24); g.stroke(); },
  cloud(g) { for (const [x, y, r] of [[-12, 2, 10], [0, -6, 13], [13, 2, 10], [0, 6, 10]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); } g.lineWidth = 3; g.beginPath(); g.moveTo(-4, 14); g.lineTo(-10, 26); g.lineTo(-2, 24); g.lineTo(-6, 32); g.stroke(); },
  life(g) { g.beginPath(); g.moveTo(0, 22); g.bezierCurveTo(-30, 2, -16, -24, 0, -10); g.bezierCurveTo(16, -24, 30, 2, 0, 22); g.fill(); g.lineWidth = 2.5; g.strokeStyle = 'rgba(120,0,0,0.8)'; g.beginPath(); g.moveTo(-14, 0); g.lineTo(-5, 0); g.lineTo(-1, -8); g.lineTo(3, 8); g.lineTo(7, 0); g.lineTo(14, 0); g.stroke(); },
  rocket(g) { g.rotate(Math.PI / 4); g.beginPath(); g.moveTo(0, -28); g.lineTo(6, -14); g.lineTo(5, 10); g.lineTo(-5, 10); g.lineTo(-6, -14); g.closePath(); g.fill(); g.globalAlpha = 0.75; g.beginPath(); g.moveTo(-6, 12); g.quadraticCurveTo(0, 34, 6, 12); g.fill(); },
  crescent(g) { g.beginPath(); g.arc(0, 0, 24, -2.2, 1.0); g.arc(-6, -4, 20, 1.0, -2.2, true); g.fill(); },
  comet(g) { for (let i = 0; i < 3; i++) { g.save(); g.translate(-10 + i * 10, -8 + i * 8); g.beginPath(); g.arc(0, 0, 4, 0, Math.PI * 2); g.fill(); g.globalAlpha = 0.6; g.beginPath(); g.moveTo(-3, -3); g.lineTo(-14, -14); g.lineTo(3, -1); g.fill(); g.restore(); } },
  geyser(g) { g.beginPath(); g.moveTo(-8, 24); g.lineTo(-4, -18); g.lineTo(0, -28); g.lineTo(4, -18); g.lineTo(8, 24); g.fill(); g.lineWidth = 3; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 10, 22); g.quadraticCurveTo(s * 22, 0, s * 14, -14); g.stroke(); } },
  ring(g) { g.lineWidth = 3; g.beginPath(); g.ellipse(0, 8, 24, 10, 0, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.ellipse(0, 8, 14, 6, 0, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(0, 8); g.lineTo(-4, -24); g.lineTo(4, -24); g.closePath(); g.fill(); },
};

export function skillIcon(id, type, color = '#5080e0', tier = 1) {
  const key = id + type + color;
  if (cache.has(key)) return cache.get(key);
  const S = 64, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  // painted background
  const bg = g.createRadialGradient(S * 0.42, S * 0.38, 2, S / 2, S / 2, S * 0.75);
  bg.addColorStop(0, shade(color, 1.6)); bg.addColorStop(0.45, shade(color, 0.85)); bg.addColorStop(1, shade(color, 0.18));
  g.fillStyle = bg; g.fillRect(0, 0, S, S);
  // streaks for texture
  g.globalAlpha = 0.18; g.strokeStyle = '#fff';
  for (let i = 0; i < 6; i++) { g.lineWidth = 1 + (i % 3); g.beginPath(); g.arc(S * 0.2, S * 1.1, 30 + i * 9, -1.4, -0.4); g.stroke(); }
  g.globalAlpha = 1;
  // symbol
  g.save(); g.translate(S / 2, S / 2);
  g.shadowColor = shade(color, 2); g.shadowBlur = 10;
  g.fillStyle = 'rgba(255,250,235,0.95)'; g.strokeStyle = 'rgba(255,250,235,0.95)';
  (DRAW[type] || DRAW.passive)(g, color);
  g.restore();
  // higher tiers get a golden corner gem
  if (tier >= 3) { g.fillStyle = tier >= 5 ? '#ff6af0' : '#ffd25a'; g.beginPath(); g.moveTo(S - 2, 2); g.lineTo(S - 14, 2); g.lineTo(S - 2, 14); g.fill(); }
  // bevel frame
  g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.moveTo(1, S - 1); g.lineTo(1, 1); g.lineTo(S - 1, 1); g.stroke();
  g.strokeStyle = 'rgba(0,0,0,0.7)'; g.beginPath(); g.moveTo(S - 1, 1); g.lineTo(S - 1, S - 1); g.lineTo(1, S - 1); g.stroke();
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}
