import { WEAPON_BY_ID, RARITY, ELEMENT, ITEMS, weaponStats } from '../data/weapons.js';
import { KITS } from '../data/skills.js';
import { MASTERY_NODES, MASTERY_MAX, masteryXpToNext } from '../data/mastery.js';
import { CLASSES } from '../data/weapons.js';
import { ZONES } from '../data/monsters.js';
import { QUESTS } from '../data/quests.js';
import { GACHA } from '../data/gacha.js';
import { auraTier, AURA_TIERS, MAX_PLUS } from '../data/enhance.js';
import { iconUrl, PROMO_URL } from '../core/assets.js';
import { audio } from '../core/audio.js';
import { resetState } from '../core/save.js';
import {
  equippedWeapon, xpToNext, enhanceInfo, doEnhance, canPull, doPull, dismantle,
  currentQuest, claimQuest, questEvent, playerStats,
} from '../systems/progress.js';
import { Minimap } from './minimap.js';

const $ = (sel, root = document) => root.querySelector(sel);
const _cache = new Map();
// cached lookup for static HUD nodes updated every frame
const $c = (sel) => { let e = _cache.get(sel); if (!e || !e.isConnected) { e = document.querySelector(sel); _cache.set(sel, e); } return e; };
const h = (tag, cls = '', html = '') => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; };
const fmt = (n) => Math.floor(n).toLocaleString();
const ICON_FALLBACK = { stone: '💠', stone_blessed: '🌟', scroll_protect: '📜', gem: '💎', gold: '🪙', potion_hp: '❤️', potion_mp: '💙', ticket: '🎫' };

export function iconImg(id, cls = '') {
  const fb = ICON_FALLBACK[id] || '⚔️';
  return `<img class="ico ${cls}" src="${iconUrl(id)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'ico-fb ${cls}',textContent:'${fb}'}))">`;
}
const hex = (c) => '#' + c.toString(16).padStart(6, '0');

export class UI {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('ui');
    this.panel = null;
    this.selectedUid = null;
    this.enhOpts = { blessed: false, protect: false };
    this.busy = false;
  }

  get s() { return this.game.state; }

  build() {
    const r = this.root;
    r.innerHTML = `
      <div id="hud-tl" class="glass">
        <div class="portrait"><div class="portrait-in">⚔️</div><div class="lv" id="h-lv">1</div></div>
        <div class="bars">
          <div class="name">ผู้กล้าแห่งออร่า <span class="cp" id="h-cp">CP 0</span></div>
          <div class="bar hp"><div class="fill" id="h-hp"></div><div class="lag" id="h-hp-lag"></div><span id="h-hp-t"></span></div>
          <div class="bar mp"><div class="fill" id="h-mp"></div><span id="h-mp-t"></span></div>
        </div>
      </div>
      <div id="hud-tr">
        <div class="cur glass"><span>🪙 <b id="h-gold">0</b></span><span class="gem" data-open="gacha">💎 <b id="h-gems">0</b> <i>+</i></span></div>
        <div class="mm-wrap glass"><canvas id="minimap" width="170" height="170"></canvas><div class="mm-zone" id="mm-zone">-</div></div>
      </div>
      <div id="menu">
        <button data-open="inventory" title="กระเป๋า (B)"><span>🎒</span><em>กระเป๋า</em><i class="dot" id="dot-inv"></i></button>
        <button data-open="enhance" title="ตีบวก"><span>⚒️</span><em>ตีบวก</em></button>
        <button data-open="gacha" class="hot" title="กาชา"><span>✨</span><em>กาชา</em></button>
        <button data-open="mastery" title="มาสเตอรี่ (K)"><span>⭐</span><em>มาสเตอรี่</em></button>
        <button data-open="quest" title="เควส"><span>📜</span><em>เควส</em><i class="dot" id="dot-quest"></i></button>
        <button data-open="warp" title="วาร์ป (M)"><span>🌀</span><em>วาร์ป</em></button>
        <button data-open="settings" title="ตั้งค่า"><span>⚙️</span><em>ตั้งค่า</em></button>
      </div>
      <div id="quest-track" class="glass"></div>
      <div id="loot-log"></div>
      <div id="toasts"></div>
      <div id="interact" class="hidden"></div>
      <div id="zone-banner" class="hidden"></div>
      <div id="big-banner" class="hidden"></div>
      <div id="cp-pop" class="hidden"></div>
      <div id="boss-bar" class="hidden"><div class="bb-name" id="bb-name"></div><div class="bb-bar"><div class="bb-lag" id="bb-lag"></div><div class="bb-fill" id="bb-fill"></div><span id="bb-pct"></span></div></div>
      <div id="skills">
        <div class="pots">
          <button class="pot" id="pot-hp" title="Q">${iconImg('potion_hp')}<b id="pot-hp-n">0</b><kbd>Q</kbd></button>
          <button class="pot" id="pot-mp" title="E">${iconImg('potion_mp')}<b id="pot-mp-n">0</b><kbd>E</kbd></button>
        </div>
        <button id="btn-auto" class="auto">AUTO<kbd>H</kbd></button>
        <div class="sk-ring">
          ${[0, 1, 2, 3].map((i) => `<button class="sk sk${i} ${i === 3 ? 'ult' : ''}" data-skill="${i}"><span class="sk-i"></span><div class="cd"></div><b class="cdt"></b><kbd>${i + 1}</kbd><small></small></button>`).join('')}
          <button class="sk dash" id="btn-dash" title="หลบ (Space)"><span class="sk-i">💨</span><div class="cd"></div><kbd>␣</kbd></button>
          <button class="atk" id="btn-atk" title="โจมตี (คลิก/J)"><span>⚔️</span></button>
        </div>
      </div>
      <div id="xpbar"><div id="xp-fill"></div><span id="xp-t"></span></div>
      <div id="joy" class="hidden"><div id="joy-knob"></div></div>
      <div id="hurt"></div>
      <div id="panel-wrap" class="hidden"></div>
      <div id="death" class="hidden"><div class="death-box"><h1>คุณพ่ายแพ้...</h1><p>จงลุกขึ้นอีกครั้ง ผู้กล้า</p><button class="btn gold" id="btn-respawn">ฟื้นคืนชีพที่เมือง</button></div></div>
      <div id="skill-flash" class="hidden"></div>
    `;
    this.minimap = new Minimap($('#minimap'), this.game);
    this.skBtns = [0, 1, 2, 3].map((i) => { const b = r.querySelector(`[data-skill="${i}"]`); return { i, b, icon: b.querySelector('.sk-i'), mp: b.querySelector('small'), cd: b.querySelector('.cd'), cdt: b.querySelector('.cdt'), last: '' }; });
    r.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => { audio.play('click'); this.openPanel(b.dataset.open); }));
    $('#btn-auto').addEventListener('click', () => this.toggleAuto());
    $('#pot-hp').addEventListener('click', () => this.game.usePotion('hp'));
    $('#pot-mp').addEventListener('click', () => this.game.usePotion('mp'));
    $('#btn-respawn').addEventListener('click', () => { $('#death').classList.add('hidden'); this.game.respawn(); });
    $('#quest-track').addEventListener('click', () => this.onQuestClick());
    $('#interact').addEventListener('click', () => this.game.interact());
    const inp = this.game.input;
    const bindHold = (el, key) => {
      const on = (e) => { e.preventDefault(); inp.hold(key, true); el.classList.add('down'); };
      const off = (e) => { e.preventDefault(); inp.hold(key, false); el.classList.remove('down'); };
      el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointerleave', off); el.addEventListener('pointercancel', off);
    };
    bindHold($('#btn-atk'), 'attack');
    $('#btn-dash').addEventListener('pointerdown', (e) => { e.preventDefault(); inp.press('dash'); });
    r.querySelectorAll('[data-skill]').forEach((b) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); inp.press('skill_' + b.dataset.skill); }));
    if (inp.touch) this.setupJoystick();
    document.body.classList.toggle('touch', inp.touch);
    this.hpLag = 1; this.bossLag = 1;
  }

  setupJoystick() {
    const joy = $('#joy'), knob = $('#joy-knob');
    joy.classList.remove('hidden');
    let id = null, cx = 0, cy = 0;
    const R = 55;
    joy.addEventListener('pointerdown', (e) => {
      id = e.pointerId; const r = joy.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2;
      joy.setPointerCapture(id); move(e);
    });
    const move = (e) => {
      if (e.pointerId !== id) return;
      let dx = e.clientX - cx, dy = e.clientY - cy;
      const l = Math.hypot(dx, dy); if (l > R) { dx *= R / l; dy *= R / l; }
      knob.style.transform = `translate(${dx}px,${dy}px)`;
      this.game.input.joy.x = dx / R; this.game.input.joy.y = -dy / R;
    };
    joy.addEventListener('pointermove', move);
    const end = (e) => { if (e.pointerId !== id) return; id = null; knob.style.transform = ''; this.game.input.joy.x = 0; this.game.input.joy.y = 0; };
    joy.addEventListener('pointerup', end); joy.addEventListener('pointercancel', end);
  }

  refreshSkills() {
    const pl = this.game.player;
    if (!pl || !this.skBtns) return;
    const kit = pl.kit;
    for (const it of this.skBtns) {
      const s = kit.skills[it.i];
      it.icon.textContent = s.icon;
      it.mp.textContent = pl.mpCost(s);
      it.b.title = `${s.name} (${s.key}) — ${s.desc}`;
    }
    const cls = CLASSES[pl.cls];
    const port = document.querySelector('.portrait-in');
    if (port) port.textContent = cls.icon;
  }

  masteryUp(cls, lv) {
    const node = (MASTERY_NODES[cls] || []).find((n) => n.lv === lv);
    const e = document.querySelector('#big-banner');
    e.className = 'levelup';
    e.innerHTML = `<small>MASTERY UP</small><b>${CLASSES[cls].icon} ${CLASSES[cls].name} Lv.${lv}</b>`;
    void e.offsetWidth; e.classList.add('show');
    clearTimeout(this._bb); this._bb = setTimeout(() => e.classList.add('hidden'), 2600);
    if (node) this.toast(`🔓 ปลดล็อกพาสซีฟ: ${node.name} — ${node.desc}`, 'legend');
  }

  // ---------------- HUD refresh ----------------
  refreshAll() {
    if (!$('#h-lv')) return;
    const s = this.s, st = this.game.stats;
    $('#h-lv').textContent = s.level;
    $('#h-cp').textContent = 'CP ' + fmt(st.cp);
    $('#h-gold').textContent = fmt(s.gold);
    $('#h-gems').textContent = fmt(s.gems);
    $('#pot-hp-n').textContent = s.items.potion_hp || 0;
    $('#pot-mp-n').textContent = s.items.potion_mp || 0;
    $('#dot-inv').classList.toggle('on', s.weapons.some((w) => w.isNew));
    this.refreshQuest();
  }

  refreshQuest() {
    const q = currentQuest(this.s);
    const el = $('#quest-track');
    if (!el) return;
    if (!q) { el.innerHTML = `<div class="qt-h">📜 เควสหลัก</div><div class="qt-t">ทำเควสครบทั้งหมดแล้ว! 🎉</div>`; return; }
    const prog = Math.min(this.s.quest.progress, q.count);
    const done = prog >= q.count;
    el.classList.toggle('ready', done);
    $('#dot-quest').classList.toggle('on', done);
    el.innerHTML = `<div class="qt-h">📜 เควสหลัก <span>${this.s.quest.index + 1}/${QUESTS.length}</span></div>
      <div class="qt-t">${q.title}</div><div class="qt-d">${q.desc}</div>
      <div class="qt-p"><div style="width:${(prog / q.count) * 100}%"></div><span>${prog}/${q.count}</span></div>
      ${done ? '<div class="qt-claim">✨ แตะเพื่อรับรางวัล!</div>' : ''}`;
  }

  questReady() { audio.play('success'); this.toast('เควสสำเร็จ! แตะที่เควสเพื่อรับรางวัล', 'good'); }

  onQuestClick() {
    const reward = claimQuest(this.s);
    if (!reward) { this.openPanel('quest'); return; }
    audio.play('levelup');
    this.toast('ได้รับรางวัลเควส: ' + this.rewardText(reward), 'good');
    this.game.recalcStats();
    this.game.save();
  }

  rewardText(rw) {
    return Object.entries(rw).map(([k, v]) => (k === 'gem' ? `💎${fmt(v)}` : k === 'gold' ? `🪙${fmt(v)}` : `${ITEMS[k]?.name || k} x${v}`)).join(', ');
  }

  update(dt) {
    const g = this.game, pl = g.player, st = g.stats;
    if (!pl) return;
    const hpK = pl.hp / st.maxHp, mpK = pl.mp / st.maxMp;
    this.hpLag += (hpK - this.hpLag) * Math.min(1, dt * (hpK < this.hpLag ? 2.5 : 20));
    $c('#h-hp').style.width = hpK * 100 + '%';
    $c('#h-hp-lag').style.width = this.hpLag * 100 + '%';
    $c('#h-hp-t').textContent = `${fmt(pl.hp)} / ${fmt(st.maxHp)}`;
    $c('#h-mp').style.width = mpK * 100 + '%';
    $c('#h-mp-t').textContent = `${fmt(pl.mp)} / ${fmt(st.maxMp)}`;
    const need = xpToNext(this.s.level);
    $c('#xp-fill').style.width = (this.s.xp / need) * 100 + '%';
    $c('#xp-t').textContent = `EXP ${(this.s.xp / need * 100).toFixed(1)}%`;
    // skills cooldowns
    const kit = pl.kit;
    for (const it of this.skBtns) {
      const s = kit.skills[it.i], b = it.b;
      const cd = pl.cooldowns[s.id];
      const maxCd = s.cd * (1 - (pl.mastery.cdr || 0) / 100);
      it.cd.style.background = cd > 0 ? `conic-gradient(rgba(0,0,0,.72) ${(cd / maxCd) * 360}deg, transparent 0)` : 'transparent';
      const txt = cd > 0 ? String(cd < 1 ? cd.toFixed(1) : Math.ceil(cd)) : '';
      if (txt !== it.last) { it.cdt.textContent = txt; it.last = txt; }
      const cost = pl.mpCost(s);
      b.classList.toggle('nomp', pl.mp < cost);
      b.classList.toggle('ready', cd <= 0 && pl.mp >= cost);
    }
    const db = $c('#btn-dash .cd');
    db.style.background = pl.dashCd > 0 ? `conic-gradient(rgba(0,0,0,.7) ${(pl.dashCd / 0.9) * 360}deg, transparent 0)` : 'transparent';
    // boss bar
    if (g.bossActive) {
      const b = g.bossActive, k = Math.max(0, b.hp / b.maxHp);
      this.bossLag += (k - this.bossLag) * Math.min(1, dt * 2);
      $c('#bb-fill').style.width = k * 100 + '%';
      $c('#bb-lag').style.width = this.bossLag * 100 + '%';
      $c('#bb-pct').textContent = (k * 100).toFixed(1) + '%  ' + fmt(b.hp) + ' / ' + fmt(b.maxHp);
    }
    this.minimapT = (this.minimapT || 0) - dt;
    if (this.minimapT <= 0 && g.mode === 'world') { this.minimapT = 0.1; this.minimap.draw(); const z = g.world.zoneAt(pl.position.x, pl.position.z); $c('#mm-zone').textContent = z ? z.name : 'ทุ่งกว้าง'; }
    if (this.panel === 'enhance' && !this.busy) { /* static */ }
  }

  // ---------------- feedback ----------------
  toast(text, type = '') {
    const t = h('div', 'toast ' + type, text);
    $('#toasts').appendChild(t);
    setTimeout(() => t.classList.add('out'), 2600);
    setTimeout(() => t.remove(), 3100);
  }

  lootLog(gold, drops, xp) {
    const log = $('#loot-log');
    const add = (html) => {
      const e = h('div', 'loot', html);
      log.appendChild(e);
      while (log.children.length > 7) log.firstChild.remove();
      setTimeout(() => e.classList.add('out'), 3500);
      setTimeout(() => e.remove(), 4000);
    };
    add(`<span class="xp">+${fmt(xp)} EXP</span> <span class="g">🪙 +${fmt(gold)}</span>`);
    for (const [id, q] of drops) add(`${iconImg(id, 'sm')} <span class="${id === 'gem' ? 'gm' : 'it'}">${id === 'gem' ? 'เพชร' : ITEMS[id].name} x${q}</span>`);
  }

  hurtFlash() { const e = $('#hurt'); e.classList.remove('on'); void e.offsetWidth; e.classList.add('on'); }

  zoneBanner(z) {
    const e = $('#zone-banner');
    const lv = z.safe ? 'เขตปลอดภัย' : `Lv.${z.level[0]}${z.level[1] !== z.level[0] ? '-' + z.level[1] : ''}`;
    e.innerHTML = `<small>${z.safe ? '🏯' : z.boss ? '🐉' : '⚔️'} ${lv}</small><b>${z.name}</b>`;
    e.classList.remove('hidden', 'show'); void e.offsetWidth; e.classList.add('show');
    clearTimeout(this._zb); this._zb = setTimeout(() => e.classList.add('hidden'), 3200);
  }

  bossBanner(text, danger = false, victory = false) {
    const e = $('#big-banner');
    e.className = danger ? 'danger' : victory ? 'victory' : '';
    e.innerHTML = `<b>${text}</b>`;
    void e.offsetWidth; e.classList.add('show');
    clearTimeout(this._bb); this._bb = setTimeout(() => e.classList.add('hidden'), 3000);
  }

  levelUp(lv) {
    const e = $('#big-banner');
    e.className = 'levelup';
    e.innerHTML = `<small>LEVEL UP</small><b>Lv.${lv}</b>`;
    void e.offsetWidth; e.classList.add('show');
    clearTimeout(this._bb); this._bb = setTimeout(() => e.classList.add('hidden'), 2600);
  }

  cpChange(a, b) {
    const e = $('#cp-pop');
    const up = b > a;
    e.className = up ? 'up' : 'down';
    e.innerHTML = `<small>พลังต่อสู้</small><b>${fmt(b)}</b><i>${up ? '▲' : '▼'} ${fmt(Math.abs(b - a))}</i>`;
    void e.offsetWidth; e.classList.add('show');
    clearTimeout(this._cp); this._cp = setTimeout(() => e.classList.add('hidden'), 2200);
  }

  skillFlash(s) {
    if (!s.ult) return;
    const e = $('#skill-flash');
    e.innerHTML = `<div class="sf-line"></div><b>${s.name}</b><small>ULTIMATE SKILL</small>`;
    e.className = ''; void e.offsetWidth; e.classList.add('show');
    clearTimeout(this._sf); this._sf = setTimeout(() => e.classList.add('hidden'), 1800);
  }

  setInteract(it) {
    const e = $('#interact');
    if (!it || this.panel) { e.classList.add('hidden'); return; }
    e.classList.remove('hidden');
    const html = `<kbd>F</kbd> ${it.label}${it.name ? ` <small>— ${it.name}</small>` : ''}`;
    if (e._html !== html) { e.innerHTML = html; e._html = html; }
  }

  toggleAuto() {
    const pl = this.game.player;
    pl.autoMode = !pl.autoMode;
    $('#btn-auto').classList.toggle('on', pl.autoMode);
    this.toast(pl.autoMode ? '⚡ เปิดโหมดต่อสู้อัตโนมัติ' : 'ปิดโหมดต่อสู้อัตโนมัติ');
  }

  showBossBar(m) { $('#boss-bar').classList.remove('hidden'); $('#bb-name').innerHTML = `🐉 ${m.tpl.name} <small>Lv.${m.level}</small>`; this.bossLag = m.hp / m.maxHp; }
  hideBossBar() { $('#boss-bar').classList.add('hidden'); }
  showDeath() { setTimeout(() => $('#death').classList.remove('hidden'), 1200); }

  // ---------------- panels ----------------
  openPanel(name) {
    if (this.busy) return;
    if (this.game.player && this.game.player.dead) return;
    const wrap = $('#panel-wrap');
    if (this.panel === name) { this.closePanels(); return; }
    if (this.panel) this.closePanels(true);
    this.panel = name;
    audio.play('open');
    wrap.className = 'pw-' + name;
    wrap.innerHTML = '';
    const showcase = name === 'enhance' || name === 'gacha';
    if (showcase) { this.game.enterShowcase(name); document.body.classList.add('showcase'); }
    this['panel_' + name](wrap);
  }

  closePanels(silent = false) {
    if (!this.panel || this.busy) return;
    const was = this.panel;
    this.panel = null;
    const wrap = $('#panel-wrap');
    wrap.className = 'hidden'; wrap.innerHTML = '';
    if (was === 'enhance' || was === 'gacha') { this.game.exitShowcase(); document.body.classList.remove('showcase'); }
    if (!silent) audio.play('click');
    this.game.save();
    this.refreshAll();
  }

  panelShell(wrap, title, cls = '') {
    const p = h('div', 'panel glass ' + cls);
    p.innerHTML = `<div class="p-head"><h2>${title}</h2><button class="p-close">✕</button></div><div class="p-body"></div>`;
    p.querySelector('.p-close').addEventListener('click', () => this.closePanels());
    wrap.appendChild(p);
    return p.querySelector('.p-body');
  }

  weaponCard(w, { small = false } = {}) {
    const d = WEAPON_BY_ID[w.id], r = RARITY[d.rarity];
    const t = auraTier(w.plus);
    const eq = w.uid === this.s.equipped;
    const c = h('div', `wcard r-${d.rarity} ${small ? 'small' : ''} ${w.plus >= 4 ? 'aura' : ''} ${w.plus >= 15 ? 'rainbow' : ''}`);
    c.style.setProperty('--aura', t.intensity > 0 ? hex(t.color) : 'transparent');
    c.innerHTML = `${iconImg(d.id)}<span class="rar">${d.rarity}</span>${w.plus ? `<span class="plus">+${w.plus}</span>` : ''}${eq ? '<span class="eq">E</span>' : ''}${w.isNew ? '<span class="new">NEW</span>' : ''}`;
    c.title = d.name;
    return c;
  }

  // ----- inventory -----
  panel_inventory(wrap) {
    const body = this.panelShell(wrap, '🎒 กระเป๋า', 'p-inv');
    body.innerHTML = `<div class="tabs"><button class="tab on" data-t="w">⚔️ อาวุธ</button><button class="tab" data-t="i">📦 ไอเทม</button><div class="sp"></div><span class="muted">${this.s.weapons.length} ชิ้น</span></div><div class="inv-grid"></div><div class="inv-detail"></div>`;
    const grid = $('.inv-grid', body), det = $('.inv-detail', body);
    const showWeapons = () => {
      grid.innerHTML = '';
      const list = [...this.s.weapons].sort((a, b) => (b.uid === this.s.equipped) - (a.uid === this.s.equipped) || RARITY[WEAPON_BY_ID[b.id].rarity].order - RARITY[WEAPON_BY_ID[a.id].rarity].order || b.plus - a.plus);
      if (!this.selectedUid || !this.s.weapons.find((w) => w.uid === this.selectedUid)) this.selectedUid = this.s.equipped;
      for (const w of list) {
        const c = this.weaponCard(w);
        if (w.uid === this.selectedUid) c.classList.add('sel');
        c.addEventListener('click', () => { this.selectedUid = w.uid; w.isNew = false; audio.play('click'); showWeapons(); });
        grid.appendChild(c);
      }
      this.weaponDetail(det, this.s.weapons.find((w) => w.uid === this.selectedUid), showWeapons);
      this.refreshAll();
    };
    const showItems = () => {
      grid.innerHTML = ''; det.innerHTML = '';
      const entries = [['gem', this.s.gems], ['gold', this.s.gold], ...Object.entries(this.s.items)];
      for (const [id, n] of entries) {
        const c = h('div', 'icard');
        c.innerHTML = `${iconImg(id)}<b>${fmt(n)}</b>`;
        c.addEventListener('click', () => {
          det.innerHTML = `<div class="det-item">${iconImg(id, 'big')}<h3>${id === 'gem' ? 'เพชร' : id === 'gold' ? 'ทอง' : ITEMS[id].name}</h3><p>${id === 'gem' ? 'สกุลเงินพรีเมียม ใช้สุ่มกาชา' : id === 'gold' ? 'ใช้ในการตีบวกอาวุธ' : ITEMS[id].desc}</p><p class="muted">จำนวน: ${fmt(n)}</p></div>`;
        });
        grid.appendChild(c);
      }
    };
    body.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => {
      body.querySelectorAll('.tab').forEach((x) => x.classList.remove('on')); t.classList.add('on');
      t.dataset.t === 'w' ? showWeapons() : showItems();
    }));
    showWeapons();
  }

  weaponDetail(det, w, refresh) {
    if (!w) { det.innerHTML = ''; return; }
    const d = WEAPON_BY_ID[w.id], r = RARITY[d.rarity], el = ELEMENT[d.element];
    const ws = weaponStats(w), t = auraTier(w.plus);
    const eq = w.uid === this.s.equipped;
    det.innerHTML = `
      <div class="det-top r-${d.rarity}">
        <div class="det-icon ${w.plus >= 4 ? 'aura' : ''} ${w.plus >= 15 ? 'rainbow' : ''}" style="--aura:${t.intensity > 0 ? hex(t.color) : 'transparent'}">${iconImg(d.id, 'big')}</div>
        <div><div class="rar-tag" style="color:${r.color}">${d.rarity} · ${r.th}</div><h3>${d.name}${w.plus ? ` <span class="plus-t">+${w.plus}</span>` : ''}</h3><div class="muted">${d.en}</div>
        <div class="el" style="color:${hex(el.color)}">${el.icon} ธาตุ${el.th} · <span style="color:#e8dcc0">${CLASSES[d.cls].icon} ${CLASSES[d.cls].name}</span></div></div>
      </div>
      <div class="stats">
        <div><span>พลังโจมตี</span><b>${fmt(ws.atk)}</b></div>
        <div><span>โอกาสคริติคอล</span><b>${ws.crit}%</b></div>
        <div><span>ความแรงคริติคอล</span><b>+${ws.cdmg}%</b></div>
        <div><span>ความเร็วโจมตี</span><b>x${ws.spd.toFixed(2)}</b></div>
        <div class="full"><span>ออร่า</span><b style="color:${t.intensity ? hex(t.color === 0xffffff ? 0xff9cf0 : t.color) : '#888'}">${t.name}</b></div>
      </div>
      <div class="det-btns">
        <button class="btn ${eq ? 'dis' : 'gold'}" id="d-eq">${eq ? '✔ สวมใส่อยู่' : 'สวมใส่'}</button>
        <button class="btn blue" id="d-enh">⚒️ ตีบวก</button>
        <button class="btn red ${eq ? 'dis' : ''}" id="d-dis">ย่อยสลาย</button>
      </div>`;
    $('#d-eq', det).addEventListener('click', () => { if (eq) return; this.game.equip(w.uid); refresh(); });
    $('#d-enh', det).addEventListener('click', () => { this.selectedUid = w.uid; this.closePanels(true); this.openPanel('enhance'); });
    $('#d-dis', det).addEventListener('click', () => {
      if (eq) return;
      if (RARITY[d.rarity].order >= 2 && !confirm(`ย่อยสลาย ${d.name} +${w.plus}?`)) return;
      const gain = dismantle(this.s, w.uid);
      if (gain) { audio.play('crash'); this.toast('ได้รับ: ' + this.rewardText(gain), 'good'); this.selectedUid = this.s.equipped; refresh(); this.game.save(); }
    });
  }

  // ----- enhance -----
  panel_enhance(wrap) {
    const p = h('div', 'enh-ui');
    p.innerHTML = `
      <div class="enh-title"><h2>⚒️ เตาหลอมแห่งตำนาน</h2><button class="p-close">✕</button></div>
      <div class="enh-list glass"></div>
      <div class="enh-side glass"></div>
      <div class="enh-result hidden"></div>
      <div class="aura-legend glass"></div>`;
    wrap.appendChild(p);
    $('.p-close', p).addEventListener('click', () => this.closePanels());
    if (!this.selectedUid || !this.s.weapons.find((w) => w.uid === this.selectedUid)) this.selectedUid = this.s.equipped;
    $('.aura-legend', p).innerHTML = '<div class="al-h">ระดับออร่า</div>' + AURA_TIERS.slice(1).map((t) => `<div class="al"><i style="background:${t.rainbow ? 'linear-gradient(90deg,#f55,#fd5,#5f8,#5cf,#a6f)' : hex(t.color)}"></i><b>+${t.min}</b> ${t.name}</div>`).join('');
    this.renderEnhance(p);
  }

  renderEnhance(p) {
    const list = $('.enh-list', p), side = $('.enh-side', p);
    const w = this.s.weapons.find((x) => x.uid === this.selectedUid);
    list.innerHTML = '';
    const sorted = [...this.s.weapons].sort((a, b) => (b.uid === this.s.equipped) - (a.uid === this.s.equipped) || RARITY[WEAPON_BY_ID[b.id].rarity].order - RARITY[WEAPON_BY_ID[a.id].rarity].order || b.plus - a.plus);
    for (const x of sorted) {
      const c = this.weaponCard(x, { small: true });
      if (x.uid === this.selectedUid) c.classList.add('sel');
      c.addEventListener('click', () => { if (this.busy) return; this.selectedUid = x.uid; audio.play('click'); this.game.showcase.setWeapon(x); this.renderEnhance(p); });
      list.appendChild(c);
    }
    if (!this.game.showcase.weapon || this.game.showcase.inst !== w) this.game.showcase.setWeapon(w);
    const d = WEAPON_BY_ID[w.id];
    const info = enhanceInfo(this.s, w, this.enhOpts);
    const cur = weaponStats(w);
    const next = info.max ? cur : weaponStats({ ...w, plus: w.plus + 1 });
    const t = auraTier(w.plus), tn = auraTier(Math.min(MAX_PLUS, w.plus + 1));
    const failTxt = { keep: 'ล้มเหลว: ระดับคงเดิม', down: 'ล้มเหลว: ระดับ -1', crash: 'ล้มเหลว: ระดับ -1 หรือ <b class="red">แตก → +7 (25%)</b>' };
    const rateCls = info.rate >= 70 ? 'hi' : info.rate >= 30 ? 'mid' : 'lo';
    side.innerHTML = info.max ? `<div class="enh-max"><h3>${d.name}</h3><div class="big-plus rainbow-t">+${MAX_PLUS}</div><p>ถึงระดับสูงสุดแล้ว! ✨</p></div>` : `
      <div class="enh-name" style="color:${RARITY[d.rarity].color}">${d.name}</div>
      <div class="enh-lv"><span class="lv-a">+${w.plus}</span><span class="arr">➜</span><span class="lv-b">+${info.target}</span></div>
      <div class="enh-stat"><span>พลังโจมตี</span><b>${fmt(cur.atk)}</b><span class="arr">➜</span><b class="up">${fmt(next.atk)}</b></div>
      ${tn !== t ? `<div class="enh-unlock" style="--c:${hex(tn.color === 0xffffff ? 0xff9cf0 : tn.color)}">🔓 ปลดล็อก: ${tn.name}</div>` : ''}
      <div class="enh-rate ${rateCls}"><small>โอกาสสำเร็จ</small><b>${info.rate.toFixed(1)}%</b>${info.failBonus ? `<i>(+${info.failBonus.toFixed(1)}% จากล้มเหลวสะสม)</i>` : ''}</div>
      <div class="enh-fail">${failTxt[info.fail]}</div>
      <div class="enh-cost">
        <div class="${this.s.items.stone >= info.stones ? '' : 'lack'}">${iconImg('stone', 'sm')} หินตีบวก <b>${this.s.items.stone || 0}/${info.stones}</b></div>
        <div class="${this.s.gold >= info.gold ? '' : 'lack'}">${iconImg('gold', 'sm')} ทอง <b>${fmt(info.gold)}</b></div>
      </div>
      <label class="chk ${this.s.items.stone_blessed ? '' : 'dis'}"><input type="checkbox" id="o-bless" ${this.enhOpts.blessed ? 'checked' : ''}> ${iconImg('stone_blessed', 'sm')} หินศักดิ์สิทธิ์ +10% <b>(${this.s.items.stone_blessed || 0})</b></label>
      <label class="chk ${this.s.items.scroll_protect && info.fail !== 'keep' ? '' : 'dis'}"><input type="checkbox" id="o-prot" ${this.enhOpts.protect ? 'checked' : ''}> ${iconImg('scroll_protect', 'sm')} คัมภีร์ปกป้อง <b>(${this.s.items.scroll_protect || 0})</b></label>
      <button class="btn enh-go ${info.ok ? '' : 'dis'}" id="enh-go">⚒️ ตีบวก!</button>
      ${w.uid !== this.s.equipped ? '<button class="btn small" id="enh-eq">สวมใส่อาวุธนี้</button>' : ''}`;
    const bless = $('#o-bless', side), prot = $('#o-prot', side);
    if (bless) bless.addEventListener('change', () => { this.enhOpts.blessed = bless.checked && this.s.items.stone_blessed > 0; this.renderEnhance(p); });
    if (prot) prot.addEventListener('change', () => { this.enhOpts.protect = prot.checked && this.s.items.scroll_protect > 0; this.renderEnhance(p); });
    const go = $('#enh-go', side);
    if (go) go.addEventListener('click', () => this.doEnhance(p, w));
    const eqb = $('#enh-eq', side);
    if (eqb) eqb.addEventListener('click', () => { this.s.equipped = w.uid; audio.play('success'); this.renderEnhance(p); });
  }

  async doEnhance(p, w) {
    if (this.busy) return;
    if (this.enhOpts.blessed && !this.s.items.stone_blessed) this.enhOpts.blessed = false;
    if (this.enhOpts.protect && !this.s.items.scroll_protect) this.enhOpts.protect = false;
    const info = enhanceInfo(this.s, w, this.enhOpts);
    if (!info.ok) { audio.play('fail'); this.toast('วัตถุดิบไม่พอ!', 'warn'); return; }
    const res = doEnhance(this.s, w, this.enhOpts);
    if (!res) return;
    this.busy = true;
    p.classList.add('busy');
    const el = ELEMENT[WEAPON_BY_ID[w.id].element];
    await this.game.showcase.playEnhance(res, el.color);
    const r = $('.enh-result', p);
    const map = {
      success: [`สำเร็จ!`, `+${res.from} ➜ +${res.to}`, 'ok'],
      keep: ['ล้มเหลว', `ระดับคงเดิม +${res.to}`, 'fail'],
      down: ['ล้มเหลว', `ระดับลดลง +${res.from} ➜ +${res.to}`, 'fail'],
      crash: ['อาวุธแตก!!', `+${res.from} ➜ +${res.to}`, 'crash'],
      protected: ['ล้มเหลว', 'คัมภีร์ปกป้องทำงาน! ระดับไม่ลดลง', 'prot'],
    }[res.result];
    r.className = 'enh-result ' + map[2];
    r.innerHTML = `<b>${map[0]}</b><small>${map[1]}</small>${res.result === 'success' && auraTier(res.to) !== auraTier(res.from) ? `<i>✨ ${auraTier(res.to).name} ✨</i>` : ''}`;
    setTimeout(() => r.classList.add('hidden'), 1800);
    if (res.result === 'success') {
      if (questEvent(this.s, 'enhance', { plus: res.to })) this.questReady();
      if (res.to >= 10) this.toast(`🔥 ${WEAPON_BY_ID[w.id].name} +${res.to} สำเร็จ!`, 'legend');
    }
    this.busy = false;
    p.classList.remove('busy');
    this.game.recalcStats();
    this.renderEnhance(p);
    this.game.save();
  }

  // ----- gacha -----
  panel_gacha(wrap) {
    const p = h('div', 'gacha-ui');
    p.innerHTML = `
      <div class="g-banner">
        <div class="g-art" style="background-image:url('${PROMO_URL}')"></div>
        <div class="g-info">
          <div class="g-tag">LIMITED</div>
          <h2>${GACHA.bannerName}</h2>
          <p>เพิ่มเรท! <b class="ur">${WEAPON_BY_ID[GACHA.rateUp].name}</b> (UR)</p>
          <div class="g-pity">การันตี SSR+: <b>${GACHA.pitySSR - this.s.pity.ssr}</b> ครั้ง · การันตี UR: <b>${GACHA.pityUR - this.s.pity.ur}</b> ครั้ง</div>
          <button class="link" id="g-rates">📊 อัตราการออก</button>
        </div>
      </div>
      <button class="p-close g-close">✕</button>
      <div class="g-bal glass">💎 <b>${fmt(this.s.gems)}</b> · 🎫 <b>${this.s.items.ticket || 0}</b></div>
      <div class="g-btns">
        <button class="btn gbtn" id="g-1"><b>อัญเชิญ 1 ครั้ง</b><small>${(this.s.items.ticket || 0) >= 1 ? '🎫 x1' : '💎 ' + GACHA.costSingle}</small></button>
        <button class="btn gbtn gold" id="g-10"><b>อัญเชิญ 10 ครั้ง</b><small>${(this.s.items.ticket || 0) >= 10 ? '🎫 x10' : '💎 ' + fmt(GACHA.costTen)}</small><i>การันตี SR+</i></button>
      </div>
      <div class="g-results hidden"></div>
      <div class="g-reveal hidden"></div>`;
    wrap.appendChild(p);
    $('.g-close', p).addEventListener('click', () => this.closePanels());
    $('#g-1', p).addEventListener('click', () => this.pull(p, 1));
    $('#g-10', p).addEventListener('click', () => this.pull(p, 10));
    $('#g-rates', p).addEventListener('click', () => {
      alert(`อัตราการออก\nUR (เทพนิยาย): ${GACHA.rates.UR}%\nSSR (ตำนาน): ${GACHA.rates.SSR}%\nSR (ล้ำค่า): ${GACHA.rates.SR}%\nR (หายาก): ${GACHA.rates.R}%\nN (ธรรมดา): ${GACHA.rates.N}%\n\n• การันตี SSR ขึ้นไปทุก ${GACHA.pitySSR} ครั้ง\n• การันตี UR ที่ ${GACHA.pityUR} ครั้ง (เรทเพิ่มขึ้นหลัง 90 ครั้ง)\n• สุ่ม 10 ครั้ง การันตี SR ขึ้นไป 1 ชิ้น\n• UR ที่ออก 50% เป็น ${WEAPON_BY_ID[GACHA.rateUp].name}`);
    });
  }

  async pull(p, n) {
    if (this.busy) return;
    const pay = canPull(this.s, n);
    if (!pay) { audio.play('fail'); this.toast('เพชรไม่พอ! ล่ามอนสเตอร์หรือทำเควสเพื่อรับเพชร', 'warn'); return; }
    const results = doPull(this.s, n);
    this.game.save();
    if (questEvent(this.s, 'gacha', { n })) this.questReady();
    this.busy = true;
    p.classList.add('summoning');
    const res = await this.game.showcase.playSummon(results);
    if (res.showcase) {
      const best = res.showcase, d = WEAPON_BY_ID[best.weapon], r = RARITY[best.rarity];
      const rv = $('.g-reveal', p);
      rv.className = 'g-reveal r-' + best.rarity;
      rv.innerHTML = `<div class="rv-rar" style="color:${r.color}">${best.rarity}</div><div class="rv-th">${r.th}</div><h1>${d.name}</h1><div class="rv-en">${d.en}</div><div class="rv-tap">แตะเพื่อดำเนินการต่อ</div>`;
      await new Promise((ok) => { const f = () => { rv.removeEventListener('click', f); ok(); }; setTimeout(() => rv.addEventListener('click', f), 600); setTimeout(f, 6000); });
      rv.className = 'g-reveal hidden';
    }
    this.game.showcase.setWeapon(null);
    this.game.showcase.clearOrbs();
    this.game.showcase.camPos.set(0, 3.0, 11); this.game.showcase.camTarget.set(0, 2.2, 0);
    const box = $('.g-results', p);
    box.className = 'g-results';
    box.innerHTML = `<div class="gr-grid"></div><div class="gr-btns"><button class="btn" id="gr-ok">ตกลง</button><button class="btn gold" id="gr-again">อัญเชิญอีก ${n} ครั้ง</button></div>`;
    const grid = $('.gr-grid', box);
    results.forEach((r, i) => {
      const card = h('div', `gcard r-${r.rarity}`);
      let inner;
      if (r.weapon) inner = `${iconImg(r.weapon)}<div class="gc-name">${WEAPON_BY_ID[r.weapon].name}</div>`;
      else if (r.item) inner = `${iconImg(r.item)}<div class="gc-name">${ITEMS[r.item].name} x${r.qty}</div>`;
      else inner = `${iconImg('gold')}<div class="gc-name">ทอง x${fmt(r.gold)}</div>`;
      card.innerHTML = `<div class="gc-in"><div class="gc-back"></div><div class="gc-front">${inner}<span class="rar">${r.rarity}</span></div></div>`;
      grid.appendChild(card);
      setTimeout(() => { card.classList.add('flip'); audio.play('reveal', { pitch: 0.8 + RARITY[r.rarity].order * 0.2 }); }, 150 + i * 120);
    });
    $('#gr-ok', box).addEventListener('click', () => { box.className = 'g-results hidden'; p.classList.remove('summoning'); this.closePanels(true); this.openPanel('gacha'); });
    $('#gr-again', box).addEventListener('click', () => { box.className = 'g-results hidden'; this.busy = false; this.pull(p, n); });
    this.busy = false;
    this.refreshAll();
  }

  // ----- mastery -----
  panel_mastery(wrap) {
    const body = this.panelShell(wrap, '⭐ มาสเตอรี่อาวุธ', 'p-mastery');
    const cur = this.game.player.cls;
    let sel = this.masteryTab || cur;
    const render = () => {
      const m = this.s.mastery[sel] || { lv: 1, xp: 0 };
      const kit = KITS[sel], c = CLASSES[sel];
      const need = masteryXpToNext(m.lv);
      const owned = this.s.weapons.filter((w) => WEAPON_BY_ID[w.id].cls === sel).sort((a, b) => RARITY[WEAPON_BY_ID[b.id].rarity].order - RARITY[WEAPON_BY_ID[a.id].rarity].order || b.plus - a.plus);
      body.innerHTML = `
        <div class="ms-tabs">${Object.entries(CLASSES).map(([k, v]) => `<button class="ms-tab ${k === sel ? 'on' : ''} ${k === cur ? 'cur' : ''}" data-c="${k}"><span>${v.icon}</span><b>${v.name}</b><small>Lv.${(this.s.mastery[k] || { lv: 1 }).lv}</small></button>`).join('')}</div>
        <div class="ms-head"><div class="ms-ic">${c.icon}</div><div class="ms-info"><h3>${c.name} <small>${c.en}</small></h3><p>${c.desc}</p>
          <div class="ms-bar"><div style="width:${m.lv >= MASTERY_MAX ? 100 : (m.xp / need) * 100}%"></div><span>มาสเตอรี่ Lv.${m.lv}/${MASTERY_MAX} ${m.lv >= MASTERY_MAX ? '(MAX)' : `· ${fmt(m.xp)}/${fmt(need)}`}</span></div>
          <div class="muted">ดาเมจสกิล +${(m.lv - 1) * 3}% · ได้ค่ามาสเตอรี่จากการล่ามอนสเตอร์ด้วยอาวุธสายนี้</div></div>
          ${sel !== cur ? (owned.length ? `<button class="btn gold" id="ms-eq">สวมใส่ ${WEAPON_BY_ID[owned[0].id].name}</button>` : '<span class="muted">ยังไม่มีอาวุธสายนี้</span>') : '<span class="ms-using">✔ กำลังใช้</span>'}
        </div>
        <h4 class="ms-h">สกิล</h4>
        <div class="ms-skills">${kit.skills.map((s, i) => `<div class="ms-sk ${s.ult ? 'ult' : ''}"><div class="ms-ski">${s.icon}<kbd>${i + 1}</kbd></div><div><b>${s.name}</b>${s.ult ? ' <span class="ult-t">ULTIMATE</span>' : ''}<p>${s.desc}</p><small>MP ${s.mp} · คูลดาวน์ ${s.cd}s · พลัง ${Math.round(s.mult * 100)}%</small></div></div>`).join('')}</div>
        <h4 class="ms-h">พาสซีฟ</h4>
        <div class="ms-nodes">${MASTERY_NODES[sel].map((n) => `<div class="ms-node ${m.lv >= n.lv ? 'on' : ''}"><i>Lv.${n.lv}</i><b>${n.name}</b><p>${n.desc}</p></div>`).join('')}</div>`;
      body.querySelectorAll('.ms-tab').forEach((b) => b.addEventListener('click', () => { sel = this.masteryTab = b.dataset.c; audio.play('click'); render(); }));
      const eq = body.querySelector('#ms-eq');
      if (eq) eq.addEventListener('click', () => { this.game.equip(owned[0].uid); this.masteryTab = sel; this.closePanels(true); this.openPanel('mastery'); });
    };
    render();
  }

  // ----- quest -----
  panel_quest(wrap) {
    const body = this.panelShell(wrap, '📜 เควส', 'p-quest');
    body.innerHTML = QUESTS.map((q, i) => {
      const st = i < this.s.quest.index ? 'done' : i === this.s.quest.index ? 'cur' : 'lock';
      const prog = i === this.s.quest.index ? Math.min(this.s.quest.progress, q.count) : st === 'done' ? q.count : 0;
      return `<div class="q ${st}"><div class="q-h"><b>${i + 1}. ${q.title}</b><span>${st === 'done' ? '✔ สำเร็จ' : st === 'cur' ? `${prog}/${q.count}` : '🔒'}</span></div><p>${q.desc}</p><div class="q-rw">รางวัล: ${this.rewardText(q.reward)}</div>${st === 'cur' && prog >= q.count ? '<button class="btn gold q-claim">รับรางวัล</button>' : ''}</div>`;
    }).join('');
    const c = $('.q-claim', body);
    if (c) c.addEventListener('click', () => { this.onQuestClick(); this.closePanels(true); this.openPanel('quest'); });
  }

  // ----- warp -----
  panel_warp(wrap) {
    const body = this.panelShell(wrap, '🌀 วาร์ป', 'p-warp');
    const icons = { town: '🏯', meadow: '🌼', forest: '🌲', ruins: '🏛️', lair: '🐉' };
    body.innerHTML = ZONES.map((z) => `<button class="warp-z ${z.boss ? 'boss' : ''}" data-z="${z.id}"><span>${icons[z.id]}</span><div><b>${z.name}</b><small>${z.safe ? 'เขตปลอดภัย · ตีบวก · กาชา' : `แนะนำ Lv.${z.level[0]}${z.level[1] !== z.level[0] ? '-' + z.level[1] : '+'}`}</small></div></button>`).join('');
    body.querySelectorAll('.warp-z').forEach((b) => b.addEventListener('click', () => { this.closePanels(true); this.game.warpTo(b.dataset.z); }));
  }

  // ----- settings -----
  panel_settings(wrap) {
    const body = this.panelShell(wrap, '⚙️ ตั้งค่า', 'p-set');
    const st = this.s.settings;
    body.innerHTML = `
      <label class="chk"><input type="checkbox" id="s-mute" ${st.muted ? 'checked' : ''}> ปิดเสียง</label>
      <label class="chk"><input type="checkbox" id="s-pot" ${st.autoPotion ? 'checked' : ''}> ใช้ยาอัตโนมัติเมื่อ HP < 30%</label>
      <label class="chk"><input type="checkbox" id="s-boss" ${this.game.allowAutoBoss ? 'checked' : ''}> โหมด AUTO โจมตีบอสด้วย</label>
      <div class="help">
        <h4>🎮 การควบคุม</h4>
        <p><kbd>W A S D</kbd> เดิน · <kbd>คลิกซ้าย</kbd>/<kbd>J</kbd> โจมตี (กดต่อเนื่องเป็นคอมโบ) · <kbd>Space</kbd> หลบ</p>
        <p><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd><kbd>4</kbd> สกิล · <kbd>Q</kbd>/<kbd>E</kbd> ยา HP/MP · <kbd>H</kbd> AUTO · <kbd>F</kbd> คุยกับ NPC</p>
        <p><kbd>คลิกขวาลาก</kbd> หมุนกล้อง · <kbd>ล้อเมาส์</kbd> ซูม · <kbd>B</kbd> กระเป๋า · <kbd>M</kbd> วาร์ป · <kbd>K</kbd> มาสเตอรี่</p>
        <p>สลับอาวุธเพื่อเปลี่ยนสายอาชีพ: 🛡️ดาบโล่ · 🪓ดาบใหญ่ · 🔱หอก · 🏹ธนู · 🔮วิสาด — แต่ละสายมีสกิลและพาสซีฟของตัวเอง</p>
      </div>
      <div class="set-btns">
        <button class="btn blue" id="s-test">🎁 โหมดทดลอง (+เพชร/หิน)</button>
        <button class="btn red" id="s-reset">ล้างเซฟเริ่มใหม่</button>
      </div>`;
    $('#s-mute', body).addEventListener('change', (e) => { st.muted = e.target.checked; audio.setMuted(st.muted); });
    $('#s-pot', body).addEventListener('change', (e) => { st.autoPotion = e.target.checked; });
    $('#s-boss', body).addEventListener('change', (e) => { this.game.allowAutoBoss = e.target.checked; });
    $('#s-test', body).addEventListener('click', () => {
      const s = this.s;
      for (const k of Object.keys(s.mastery)) s.mastery[k].lv = Math.max(s.mastery[k].lv, 10);
      s.gems += 16000; s.gold += 500000; s.items.stone = (s.items.stone || 0) + 300; s.items.stone_blessed = (s.items.stone_blessed || 0) + 20; s.items.scroll_protect = (s.items.scroll_protect || 0) + 20; s.items.ticket = (s.items.ticket || 0) + 10;
      audio.play('bigSuccess');
      this.toast('ได้รับ 💎16,000 · 🪙500,000 · หิน 300 · หินศักดิ์สิทธิ์ 20 · คัมภีร์ 20 · ตั๋ว 10 · มาสเตอรี่ทุกสาย Lv.10', 'legend');
      this.game.recalcStats(); this.game.player.equip(equippedWeapon(this.s)); this.refreshSkills();
      this.refreshAll(); this.game.save();
    });
    $('#s-reset', body).addEventListener('click', () => { if (confirm('ล้างข้อมูลทั้งหมดและเริ่มใหม่?')) { resetState(); window.onbeforeunload = null; this.game.save = () => {}; location.reload(); } });
  }
}
