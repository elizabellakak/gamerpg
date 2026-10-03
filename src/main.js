import { Engine } from './core/engine.js';
import { Input } from './core/input.js';
import { assets, PROMO_URL } from './core/assets.js';
import { audio } from './core/audio.js';
import { Game } from './game/game.js';

const $ = (s) => document.querySelector(s);

async function boot() {
  $('.t-bg').style.backgroundImage = `url('${PROMO_URL}')`;
  const engine = new Engine($('#app'));
  const input = new Input(engine.renderer.domElement);
  await assets.loadAll((k) => {
    $('#ld-fill').style.width = (k * 100).toFixed(0) + '%';
    $('#ld-text').textContent = 'กำลังโหลดโลกแห่งตำนาน... ' + (k * 100).toFixed(0) + '%';
  });
  $('#ld-text').textContent = 'กำลังสร้างโลก...';
  await new Promise((r) => setTimeout(r, 30));
  const game = new Game(engine, input);
  game.init();
  window.game = game; // debug handle
  // debug: advance simulation by N seconds at 60 Hz without rendering (used by automated screenshots)
  window.__advance = (sec) => { const n = Math.round(sec * 60); for (let i = 0; i < n; i++) game.update(1 / 60, 1 / 60); };
  // warm up shaders
  engine.renderer.compile(game.world.scene, engine.camera);
  engine.start((dt, raw) => game.update(dt, raw));
  $('#loading').classList.add('hidden');
  $('#btn-start').classList.remove('hidden');
  $('#btn-start').addEventListener('click', () => {
    audio.resume();
    audio.setMuted(game.state.settings.muted);
    audio.startBgm('field');
    $('#title').classList.add('out');
    setTimeout(() => $('#title').remove(), 1200);
    game.ui.zoneBanner(game.world.zoneAt(0, 0));
    game.ui.toast('ยินดีต้อนรับสู่ Aura Legends! ไปคุยกับมิโกะเพื่อสุ่มกาชา และช่างตีเหล็กเพื่อตีบวก', 'good');
  }, { once: true });
}

boot().catch((e) => {
  console.error(e);
  $('#ld-text').textContent = 'เกิดข้อผิดพลาด: ' + e.message;
});
