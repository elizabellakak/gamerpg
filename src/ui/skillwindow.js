// Silkroad-style skill window (tabs, mastery header with LEVEL UP, rows of skill icons with level + ADD/MAX)
// and the bottom hotbar (10 slots x 4 pages, F1-F4) with drag & drop placement.
import { TABS, MASTERY_DEFS, ROWS, SKILL_INDEX, FAMILY, masteryCap, skillReqMastery, skillCost, skillMult, skillMp, HOTBAR_PRESETS } from '../data/skilltree.js';
import '../data/skills_masteries.js';
import { masteryTotal, masteryUpInfo, levelUpMastery, skillUpInfo, levelUpSkill, HOTBAR_SLOTS, prevNeed, skillRuntime } from '../systems/skills.js';
import { skillIcon } from './skillicons.js';
import { iconUrl } from '../core/assets.js';
import { ITEMS } from '../data/weapons.js';
import { audio } from '../core/audio.js';

const fmt = (n) => Math.floor(n).toLocaleString();
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
const ROMAN = ['I', 'II', 'III', 'IV'];

export function iconFor(id) {
  const sk = SKILL_INDEX[id];
  return skillIcon(id, sk.icon, sk.color, sk.tier);
}

export class SkillWindow {
  constructor(ui) {
    this.ui = ui;
    this.game = ui.game;
    this.tab = 'weapon';
    this.sub = 'bicheon';
    this.el = null;
    this.drag = null;
  }
  get s() { return this.game.state; }

  // ---------------- window ----------------
  toggle() { this.el ? this.close() : this.open(); }
  open() {
    if (this.el) return;
    // open on the mastery of the equipped weapon
    const mid = this.game.stats.mid;
    if (mid) { this.sub = mid; this.tab = TABS.find((t) => t.subs.includes(mid)).id; }
    const el = document.createElement('div');
    el.id = 'skillwin';
    el.className = 'srow';
    document.getElementById('ui').appendChild(el);
    this.el = el;
    audio.play('open');
    this.render();
  }
  close() { if (!this.el) return; this.el.remove(); this.el = null; this.hideTip(); audio.play('click'); }

  render() {
    if (!this.el) return;
    const s = this.s, m = this.sub, md = MASTERY_DEFS[m];
    const tab = TABS.find((t) => t.id === this.tab);
    const mlv = s.mlv[m] || 0;
    const up = masteryUpInfo(s, m);
    const rows = ROWS[m] || [];
    const colOf = (r, c) => SKILL_INDEX[`${m}_${r + 1}_${c + 1}`].col;
    const cols = Math.max(5, ...rows.map((row, r) => Math.max(...row.tiers.map((_, c) => colOf(r, c))) + 1));
    this.el.innerHTML = `
      <div class="sw-title"><span>สกิล · Skill</span><button class="sw-x">✕</button></div>
      <div class="sw-tabs">${TABS.map((t) => `<button class="sw-tab ${t.id === this.tab ? 'on' : ''}" data-tab="${t.id}">${t.name}</button>`).join('')}</div>
      <div class="sw-subs">${tab.subs.map((id) => `<button class="sw-sub ${id === m ? 'on' : ''}" data-sub="${id}">${MASTERY_DEFS[id].name}</button>`).join('')}</div>
      <div class="sw-head">
        <div class="sw-mic" style="background-image:url(${skillIcon('m_' + m, { bicheon: 'blade', heuksal: 'thrust', pacheon: 'arrow', warrior: 'quake', wizard: 'fire' }[m], { bicheon: '#a04040', heuksal: '#4060c0', pacheon: '#408040', warrior: '#a07030', wizard: '#7040b0' }[m])})"></div>
        <div class="sw-mname">${md.name} Mastery <small>${md.th}</small></div>
        <div class="sw-mlv">Lv ${mlv}</div>
        <button class="sw-preset" title="วางสกิลที่เรียนแล้วลงแถบสกิล F1/F2 ตามคลิปต้นฉบับ">จัดแถบ</button>
        <button class="sw-lvup ${up.ok ? '' : 'dis'}" title="${up.ok ? 'ใช้ ' + fmt(up.cost) + ' SP' : up.reason}">LEVEL UP</button>
      </div>
      <div class="sw-grid">${rows.map((row, r) => `
        <div class="sw-row">
          <div class="sw-rowicon" title="${row.desc}" style="background-image:url(${skillIcon('row_' + m + r, row.icon, '#806020')})"></div>
          ${Array.from({ length: cols }, (_, cc) => {
            const c = row.tiers.findIndex((_, i) => colOf(r, i) === cc);
            if (c < 0) return '<div class="sw-cell empty"><div class="sw-ic lock"></div><div class="sw-btn none"></div></div>';
            const id = `${m}_${r + 1}_${c + 1}`;
            const lv = s.slv[id] || 0;
            const info = skillUpInfo(s, id);
            const btn = info.max ? '<div class="sw-btn max">MAX</div>' : `<div class="sw-btn add ${info.ok ? '' : 'dis'}" data-add="${id}">ADD</div>`;
            return `<div class="sw-cell"><div class="sw-ic ${lv ? '' : 'unl'}" data-skill="${id}" style="background-image:url(${iconFor(id)})">${lv ? `<b>${lv}</b>` : ''}</div>${btn}</div>`;
          }).join('')}
        </div>`).join('')}
      </div>
      <div class="sw-foot"><span>Skill point <b>${fmt(s.sp)}</b></span><span>Mastery level total <b>${masteryTotal(s, FAMILY[m])}/${masteryCap(s.level, FAMILY[m])}</b></span></div>
      <div class="sw-hint">ลากไอคอนสกิลไปวางที่แถบสกิลด้านล่าง · คลิกขวาที่ช่องเพื่อเอาออก · F1–F4 เปลี่ยนหน้า</div>`;
    this.el.querySelector('.sw-x').onclick = () => this.close();
    this.el.querySelectorAll('[data-tab]').forEach((b) => b.onclick = () => { this.tab = b.dataset.tab; this.sub = TABS.find((t) => t.id === this.tab).subs[0]; audio.play('click'); this.render(); });
    this.el.querySelectorAll('[data-sub]').forEach((b) => b.onclick = () => { this.sub = b.dataset.sub; audio.play('click'); this.render(); });
    this.el.querySelector('.sw-preset').onclick = () => {
      const pre = HOTBAR_PRESETS[m] || [];
      const byFx = {};
      for (const sk of Object.values(SKILL_INDEX)) if (sk.mastery === m) byFx[sk.fx] = sk.id;
      let n = 0;
      pre.forEach((pageList, pi) => {
        if (!pageList.length) return;
        const page = this.s.hotbar.pages[pi];
        pageList.forEach((fx, i) => {
          if (fx === 'hp' || fx === 'mp') { page[i] = { type: 'item', id: fx === 'hp' ? 'potion_hp' : 'potion_mp' }; return; }
          const id = byFx[fx];
          page[i] = id && (this.s.slv[id] || 0) > 0 ? { type: 'skill', id } : null;
          if (page[i]) n++;
        });
      });
      audio.play('click');
      this.ui.toast(n ? `วางสกิล ${n} ช่องบนแถบ F1/F2 แล้ว` : 'ยังไม่ได้เรียนสกิลของสายนี้', n ? 'good' : 'warn');
      this.game.save(); this.ui.renderHotbar();
    };
    this.el.querySelector('.sw-lvup').onclick = () => {
      const r = levelUpMastery(this.s, m);
      if (!r.ok) { audio.play('fail'); this.ui.toast(r.reason, 'warn'); return; }
      audio.play('levelup');
      this.ui.toast(`${md.name} Mastery Lv ${r.newLv}`, 'good');
      this.game.recalcStats(); this.game.save(); this.render();
    };
    this.el.querySelectorAll('[data-add]').forEach((b) => b.onclick = () => {
      const id = b.dataset.add;
      const r = levelUpSkill(this.s, id);
      if (!r.ok) { audio.play('fail'); this.ui.toast(r.reason || 'เรียนไม่ได้', 'warn'); return; }
      audio.play(r.next === 1 ? 'success' : 'pickup');
      if (r.next === 1) this.ui.toast(`เรียนสกิล ${SKILL_INDEX[id].name} แล้ว`, 'good');
      this.game.recalcStats(); this.game.save(); this.render(); this.ui.renderHotbar();
    });
    this.el.querySelectorAll('.sw-ic[data-skill]').forEach((ic) => {
      ic.onpointerenter = () => this.showTip(ic.dataset.skill, ic);
      ic.onpointerleave = () => this.hideTip();
      ic.onpointerdown = (e) => {
        const id = ic.dataset.skill;
        if (!((this.s.slv[id] || 0) > 0)) return;
        e.preventDefault();
        const p0 = [e.clientX, e.clientY];
        const onMove = (ev) => { if (Math.hypot(ev.clientX - p0[0], ev.clientY - p0[1]) > 8) { off(); this.startDrag(ev, { type: 'skill', id }, null); } };
        const onUp = () => { off(); this.cast(id); };
        const off = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
        window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
      };
    });
  }

  showTip(id, anchor) {
    const s = this.s, sk = SKILL_INDEX[id];
    const lv = s.slv[id] || 0, show = Math.max(1, lv);
    const info = skillUpInfo(s, id);
    let tip = document.getElementById('sw-tip');
    if (!tip) { tip = document.createElement('div'); tip.id = 'sw-tip'; document.getElementById('ui').appendChild(tip); }
    const kindTh = { attack: 'สกิลโจมตี', aoe_self: 'สกิลโจมตีรอบตัว', buff: 'สกิลบัฟ', passive: 'สกิลติดตัว (Passive)', imbue: 'สกิลเสริมพลังอาวุธ', debuff: 'สกิลสถานะผิดปกติ', trap: 'สกิลวางกับดัก', util: 'สกิลสนับสนุน' }[sk.kind] || 'สกิล';
    tip.innerHTML = `
      <div class="tt-name">${sk.name}${lv ? ` <span>Lv ${lv}</span>` : ''}</div>
      ${sk.th ? `<div class="tt-th">${sk.th}</div>` : ''}
      <div class="tt-kind">${kindTh} · ${MASTERY_DEFS[sk.mastery].name}${sk.element ? ' · ' + sk.element : ''}</div>
      <div class="tt-desc">${sk.desc}</div>
      ${sk.kind !== 'passive' ? `${sk.dmg > 0 ? `<div class="tt-row">พลังโจมตี <b>${Math.round(skillMult(sk, show) * 100)}%</b>${sk.hits > 1 ? ` · ${sk.hits} ครั้ง` : ''}</div>` : ''}
      <div class="tt-row">MP <b>${skillMp(sk, show)}</b> · คูลดาวน์ <b>${sk.cd}s</b></div>` : ''}
      ${info.max ? '<div class="tt-ok">เลเวลสูงสุดแล้ว (MAX)</div>' : `
      <div class="tt-next">เลเวลถัดไป: Lv ${info.next}</div>
      <div class="tt-row ${s.mlv[sk.mastery] >= info.req ? '' : 'bad'}">ต้องการมาสเตอรี่ ${MASTERY_DEFS[sk.mastery].name} Lv ${info.req}</div>
      <div class="tt-row ${s.sp >= info.cost ? '' : 'bad'}">Skill point needed <b>${fmt(info.cost)}</b></div>
      ${sk.prev && !lv && (s.slv[sk.prev] || 0) < prevNeed(sk) ? `<div class="tt-row bad">Required skill: ${SKILL_INDEX[sk.prev].name} Lv ${prevNeed(sk)}</div>` : ''}`}
      ${lv ? '<div class="tt-hint">ลากไปวางบนแถบสกิล</div>' : ''}`;
    const r = anchor.getBoundingClientRect();
    tip.style.display = 'block';
    const w = tip.offsetWidth, h = tip.offsetHeight;
    let x = r.left - w - 10; if (x < 8) x = r.right + 10;
    let y = Math.min(window.innerHeight - h - 8, Math.max(8, r.top - 10));
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  hideTip() { const t = document.getElementById('sw-tip'); if (t) t.style.display = 'none'; }

  // cast straight from the window (Silkroad players mostly click skills here)
  cast(id) {
    const pl = this.game.player;
    if (pl.state !== 'move' && !(pl.state === 'attack')) return;
    pl.tryCast(skillRuntime(this.s, id));
  }

  // grey + countdown on window icons while a skill (or its group) cools down
  tick() {
    if (!this.el) return;
    const pl = this.game.player;
    this.el.querySelectorAll('.sw-ic[data-skill]').forEach((ic) => {
      const cd = pl.cooldowns[ic.dataset.skill] || 0;
      const on = cd > 0;
      if (on !== ic.classList.contains('cool')) { if (!on) { ic.classList.remove('ready'); void ic.offsetWidth; ic.classList.add('ready'); } ic.classList.toggle('cool', on); }
    });
  }

  // ---------------- drag & drop ----------------
  startDrag(e, entry, fromSlot) {
    e.preventDefault();
    const ghost = document.createElement('div');
    ghost.className = 'hb-ghost';
    ghost.style.backgroundImage = `url(${entry.type === 'skill' ? iconFor(entry.id) : iconUrl(entry.id)})`;
    document.body.appendChild(ghost);
    const move = (ev) => { ghost.style.transform = `translate(${ev.clientX - 22}px,${ev.clientY - 22}px)`; };
    move(e);
    this.hideTip();
    const up = (ev) => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
      ghost.remove();
      const target = document.elementFromPoint(ev.clientX, ev.clientY);
      const slotEl = target && target.closest && target.closest('.hb-slot');
      const hb = this.s.hotbar, page = hb.pages[hb.page];
      if (slotEl) {
        const i = +slotEl.dataset.slot;
        if (fromSlot != null) { const tmp = page[i]; page[i] = page[fromSlot]; page[fromSlot] = tmp; }
        else {
          // a skill appears once per page
          const dup = page.findIndex((x) => x && x.type === entry.type && x.id === entry.id);
          if (dup >= 0) page[dup] = null;
          page[i] = { ...entry };
        }
        audio.play('click');
      } else if (fromSlot != null && !(target && target.closest && target.closest('#hotbar'))) {
        page[fromSlot] = null; // dragged off the bar = remove
      }
      this.game.save();
      this.ui.renderHotbar();
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  }
}

// ---------------- hotbar ----------------
export function hotbarHTML() {
  return `<div id="hotbar"><div class="hb-info"><div><span>Skill point</span><b id="hb-sp">0</b></div><div><span>Level: <b id="hb-lv">1</b></span><em>EXP <b id="hb-exp">0</b> %</em></div></div><div class="hb-page"><button data-pg="-1">▲</button><b id="hb-pg">F1</b><button data-pg="1">▼</button></div>
    <div class="hb-slots">${KEYS.map((k, i) => `<div class="hb-slot" data-slot="${i}"><div class="hb-ic"></div><div class="hb-cd"></div><b class="hb-t"></b><i class="hb-n"></i><kbd>${k}</kbd></div>`).join('')}</div></div>`;
}

export function bindHotbar(ui) {
  const g = ui.game, root = document.getElementById('hotbar');
  ui.hbSlots = [...root.querySelectorAll('.hb-slot')].map((el) => ({ el, ic: el.querySelector('.hb-ic'), cd: el.querySelector('.hb-cd'), t: el.querySelector('.hb-t'), n: el.querySelector('.hb-n'), last: '' }));
  root.querySelectorAll('[data-pg]').forEach((b) => b.onclick = () => ui.hotbarPage(+b.dataset.pg));
  ui.hbSlots.forEach((it, i) => {
    it.el.addEventListener('contextmenu', (e) => { e.preventDefault(); const hb = g.state.hotbar; hb.pages[hb.page][i] = null; ui.renderHotbar(); g.save(); });
    let downT = 0, downPos = null;
    it.el.addEventListener('pointerdown', (e) => {
      if (e.button === 2) return;
      const hb = g.state.hotbar, entry = hb.pages[hb.page][i];
      downT = performance.now(); downPos = [e.clientX, e.clientY];
      if (!entry) return;
      // short tap = use, drag = move
      const onMove = (ev) => {
        if (Math.hypot(ev.clientX - downPos[0], ev.clientY - downPos[1]) > 12) {
          window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp);
          ui.skillWin.startDrag(ev, entry, i);
        }
      };
      const onUp = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); g.input.press('slot_' + i); };
      window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
    });
  });
}

export function renderHotbar(ui) {
  const g = ui.game, hb = g.state.hotbar;
  document.getElementById('hb-pg').textContent = 'F' + (hb.page + 1);
  ui.hbSlots.forEach((it, i) => {
    const e = hb.pages[hb.page][i];
    it.entry = e;
    it.el.classList.toggle('filled', !!e);
    if (!e) { it.ic.style.backgroundImage = ''; it.n.textContent = ''; it.el.title = ''; return; }
    if (e.type === 'skill') { it.ic.style.backgroundImage = `url(${iconFor(e.id)})`; it.el.title = SKILL_INDEX[e.id].name; it.n.textContent = ''; }
    else { it.ic.style.backgroundImage = `url(${iconUrl(e.id)})`; it.el.title = ITEMS[e.id]?.name || e.id; }
  });
}

export function updateHotbar(ui) {
  const g = ui.game, pl = g.player;
  for (const it of ui.hbSlots || []) {
    const e = it.entry;
    if (!e) { if (it.last) { it.cd.style.background = 'transparent'; it.t.textContent = ''; it.last = ''; } continue; }
    if (e.type === 'item') { const n = String(g.state.items[e.id] || 0); if (it.n.textContent !== n) it.n.textContent = n; continue; }
    const sk = SKILL_INDEX[e.id];
    const cd = pl.cooldowns[e.id] || 0;
    const max = sk.cd * (1 - (pl.mastery.cdr || 0) / 100);
    it.cd.style.background = cd > 0 ? 'rgba(12, 22, 64, 0.82)' : 'transparent';
    const txt = cd > 0 ? String(Math.ceil(cd - 0.05)) : '';
    if (txt !== it.last) {
      if (it.last && !txt) { it.el.classList.remove('ready'); void it.el.offsetWidth; it.el.classList.add('ready'); }
      it.t.textContent = txt; it.last = txt;
    }
    const usable = (g.state.slv[e.id] || 0) > 0 && pl.weaponDef && sk && pl.cls && (sk.kind === 'passive' || (pl.mp >= skillMp(sk, g.state.slv[e.id] || 1)));
    it.el.classList.toggle('dim', !usable || !(SKILL_INDEX[e.id] && pl.cls && (sk.weapon || MASTERY_DEFS[sk.mastery].weapon).includes(pl.cls)));
  }
}
