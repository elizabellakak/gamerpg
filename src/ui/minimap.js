import { ZONES } from '../data/monsters.js';
import { LAKE } from '../world/terrain.js';

export class Minimap {
  constructor(canvas, game) {
    this.c = canvas; this.g = canvas.getContext('2d'); this.game = game;
    this.range = 70;
  }
  draw() {
    const g = this.g, W = this.c.width, H = this.c.height, game = this.game, p = game.player.position;
    const s = W / (this.range * 2);
    const yaw = game.cam.yaw;
    g.clearRect(0, 0, W, H);
    g.save();
    g.beginPath(); g.arc(W / 2, H / 2, W / 2 - 2, 0, Math.PI * 2); g.clip();
    g.fillStyle = 'rgba(20,32,24,0.85)'; g.fillRect(0, 0, W, H);
    g.translate(W / 2, H / 2);
    g.rotate(yaw);
    const tx = (x) => (x - p.x) * s, tz = (z) => (z - p.z) * s;
    // zones
    for (const z of ZONES) {
      g.beginPath(); g.arc(tx(z.x), tz(z.z), z.r * s, 0, Math.PI * 2);
      g.fillStyle = z.safe ? 'rgba(255,220,150,0.18)' : z.boss ? 'rgba(255,60,30,0.22)' : 'rgba(120,200,120,0.12)';
      g.fill();
    }
    // lake
    g.beginPath(); g.arc(tx(LAKE.x), tz(LAKE.z), LAKE.r * s, 0, Math.PI * 2); g.fillStyle = 'rgba(60,150,220,0.6)'; g.fill();
    // paths (to zones)
    g.strokeStyle = 'rgba(220,190,140,0.45)'; g.lineWidth = 3;
    for (const z of ZONES) { if (z.safe) continue; g.beginPath(); g.moveTo(tx(0), tz(0)); g.lineTo(tx(z.x), tz(z.z)); g.stroke(); }
    // NPCs
    for (const it of game.world.interactables) {
      g.fillStyle = it.kind === 'gacha' ? '#ff8ad8' : it.kind === 'enhance' ? '#ffb347' : '#9b8bff';
      g.beginPath(); g.arc(tx(it.pos.x), tz(it.pos.z), 4, 0, Math.PI * 2); g.fill();
    }
    // monsters
    for (const m of game.combat.monsters) {
      if (m.dead) continue;
      const x = tx(m.position.x), y = tz(m.position.z);
      if (Math.abs(x) > W || Math.abs(y) > H) continue;
      g.fillStyle = m.tpl.boss ? '#ff3020' : '#ff5a5a';
      g.beginPath(); g.arc(x, y, m.tpl.boss ? 6 : 2.4, 0, Math.PI * 2); g.fill();
    }
    g.restore();
    // player arrow (always up = camera forward)
    g.save(); g.translate(W / 2, H / 2);
    g.rotate(-(game.player.yaw - yaw) + Math.PI);
    g.fillStyle = '#fff'; g.strokeStyle = '#2a7bff'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, -8); g.lineTo(6, 6); g.lineTo(0, 3); g.lineTo(-6, 6); g.closePath(); g.fill(); g.stroke();
    g.restore();
    g.strokeStyle = 'rgba(255,215,140,0.8)'; g.lineWidth = 3; g.beginPath(); g.arc(W / 2, H / 2, W / 2 - 2, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#ffd88a'; g.font = 'bold 12px sans-serif'; g.textAlign = 'center';
    // north marker
    const nx = W / 2 + Math.sin(yaw) * (W / 2 - 12), ny = H / 2 - Math.cos(yaw) * (H / 2 - 12);
    g.fillText('N', nx, ny + 4);
  }
}
