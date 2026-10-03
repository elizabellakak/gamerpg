import { WEAPON_BY_ID, weaponStats, RARITY } from '../data/weapons.js';
import { ENHANCE_TABLE, MAX_PLUS, CRASH_TO, CRASH_CHANCE, FAILSTACK_BONUS, BLESSED_BONUS } from '../data/enhance.js';
import { GACHA, GACHA_FILLERS, DISMANTLE } from '../data/gacha.js';
import { WEAPONS } from '../data/weapons.js';
import { QUESTS } from '../data/quests.js';
import { CLS_MASTERY } from '../data/skilltree.js';
import { passiveEffects, ensureSkillState } from './skills.js';

export const MAX_LEVEL = 130;

// timed buffs (Life Control, Earth Barrier...) on top of the base stats
export function applyBuffMods(s, mods) {
  if (!mods) return s;
  const me = s.mastery;
  if (mods.skillPct) me.skillPct = (me.skillPct || 0) + mods.skillPct;
  if (mods.absorb) me.absorb = (me.absorb || 0) + mods.absorb;
  if (mods.block) me.block = (me.block || 0) + mods.block;
  if (mods.atkPct) s.atk = Math.round(s.atk * (1 + mods.atkPct / 100));
  if (mods.defPct) s.def = Math.round(s.def * (1 + mods.defPct / 100));
  if (mods.hpPct) s.maxHp = Math.max(1, Math.round(s.maxHp * (1 + mods.hpPct / 100)));
  return s;
}

export function xpToNext(level) { return Math.round(60 * Math.pow(level, 1.5) + 60); }

export function equippedWeapon(state) {
  return state.weapons.find((w) => w.uid === state.equipped) || state.weapons[0];
}

export function weaponClass(state) {
  const w = equippedWeapon(state);
  return w ? WEAPON_BY_ID[w.id].cls : 'sword';
}

export function playerStats(state) {
  const lv = state.level;
  const w = equippedWeapon(state);
  const ws = w ? weaponStats(w) : { atk: 0, crit: 0, cdmg: 0, spd: 1 };
  const cls = weaponClass(state);
  ensureSkillState(state);
  const mid = CLS_MASTERY[cls];
  // mastery level of the equipped weapon's mastery adds skill damage; learned passives add the rest
  const me = { skillPct: (state.mlv[mid] || 0) * 1.0, awaken: new Set(), ...passiveEffects(state) };
  const s = {
    maxHp: 520 + (lv - 1) * 68,
    maxMp: 200 + (lv - 1) * 9,
    atk: 28 + (lv - 1) * 7 + ws.atk,
    def: 12 + (lv - 1) * 3.2,
    crit: 8 + ws.crit + (me.crit || 0),
    cdmg: 150 + ws.cdmg + (me.cdmg || 0),
    spd: ws.spd * (1 + (me.spdPct || 0) / 100),
  };
  s.maxHp = Math.round(s.maxHp * (1 + (me.hpPct || 0) / 100));
  s.maxMp = Math.round(s.maxMp * (1 + (me.mpPct || 0) / 100));
  s.atk = Math.round(s.atk * (1 + (me.atkPct || 0) / 100));
  s.def = Math.round(s.def * (1 + (me.defPct || 0) / 100));
  s.cls = cls;
  s.mastery = me;
  s.mid = mid;
  s.cp = Math.round(s.atk * 9 + s.maxHp * 0.6 + s.def * 6 + s.crit * 40 + s.cdmg * 6 + me.skillPct * 60);
  return s;
}

export function addItem(state, id, qty) {
  if (id === 'gem') { state.gems += qty; return; }
  if (id === 'gold') { state.gold += qty; return; }
  state.items[id] = (state.items[id] || 0) + qty;
}

export function addWeapon(state, id) {
  const w = { uid: state.nextUid++, id, plus: 0, fails: 0, isNew: true };
  state.weapons.push(w);
  return w;
}

// ---------- Enhancement ----------
export function enhanceInfo(state, w, { blessed = false, protect = false } = {}) {
  if (w.plus >= MAX_PLUS) return { max: true };
  const target = w.plus + 1;
  const row = ENHANCE_TABLE[target];
  const rarityCost = [1, 1.3, 1.7, 2.2, 3][RARITY[WEAPON_BY_ID[w.id].rarity].order];
  const gold = Math.round(row.gold * rarityCost / 10) * 10;
  const stones = row.stones;
  let rate = row.rate + (w.fails || 0) * FAILSTACK_BONUS;
  if (blessed) rate += BLESSED_BONUS;
  rate = Math.min(100, rate);
  const canBless = (state.items.stone_blessed || 0) > 0;
  const canProtect = (state.items.scroll_protect || 0) > 0;
  const ok = state.gold >= gold && (state.items.stone || 0) >= stones && (!blessed || canBless) && (!protect || canProtect);
  return { target, rate, gold, stones, fail: row.fail, ok, failBonus: (w.fails || 0) * FAILSTACK_BONUS };
}

// returns {result: 'success'|'keep'|'down'|'crash', from, to}
export function doEnhance(state, w, opts) {
  const info = enhanceInfo(state, w, opts);
  if (!info.ok || info.max) return null;
  state.gold -= info.gold;
  state.items.stone -= info.stones;
  if (opts.blessed) state.items.stone_blessed--;
  const from = w.plus;
  const roll = Math.random() * 100;
  if (roll < info.rate) {
    w.plus++; w.fails = 0;
    return { result: 'success', from, to: w.plus, rate: info.rate };
  }
  w.fails = (w.fails || 0) + 1;
  if (opts.protect && info.fail !== 'keep') {
    state.items.scroll_protect--;
    return { result: 'protected', from, to: w.plus, rate: info.rate };
  }
  if (info.fail === 'keep') return { result: 'keep', from, to: w.plus, rate: info.rate };
  if (info.fail === 'crash' && Math.random() < CRASH_CHANCE) {
    w.plus = Math.min(w.plus, CRASH_TO);
    return { result: 'crash', from, to: w.plus, rate: info.rate };
  }
  w.plus = Math.max(0, w.plus - 1);
  return { result: 'down', from, to: w.plus, rate: info.rate };
}

// ---------- Gacha ----------
function rollRarity(state, forceMin = null) {
  const p = state.pity;
  if (p.ur + 1 >= GACHA.pityUR) return 'UR';
  if (p.ssr + 1 >= GACHA.pitySSR) return Math.random() < GACHA.rates.UR / (GACHA.rates.UR + GACHA.rates.SSR) ? 'UR' : 'SSR';
  // soft pity: UR rate ramps after 90
  const urRate = GACHA.rates.UR + Math.max(0, p.ur - 90) * 2.5;
  let r = Math.random() * 100;
  let rar;
  if (r < urRate) rar = 'UR';
  else if ((r -= urRate) < GACHA.rates.SSR) rar = 'SSR';
  else if ((r -= GACHA.rates.SSR) < GACHA.rates.SR) rar = 'SR';
  else if ((r -= GACHA.rates.SR) < GACHA.rates.R) rar = 'R';
  else rar = 'N';
  if (forceMin === 'SR' && RARITY[rar].order < 2) rar = 'SR';
  return rar;
}

function pickFromRarity(rar) {
  const pool = WEAPONS.filter((w) => w.rarity === rar);
  if (rar === 'UR' && Math.random() < 0.5) return { weapon: GACHA.rateUp };
  const fillers = GACHA_FILLERS[rar];
  if (fillers && Math.random() < (rar === 'N' ? 0.45 : rar === 'R' ? 0.3 : 0.2)) {
    return { ...fillers[Math.floor(Math.random() * fillers.length)] };
  }
  return { weapon: pool[Math.floor(Math.random() * pool.length)].id };
}

export function canPull(state, n) {
  const tickets = state.items.ticket || 0;
  if (tickets >= n) return 'ticket';
  if (state.gems >= (n === 10 ? GACHA.costTen : GACHA.costSingle * n)) return 'gem';
  return null;
}

export function doPull(state, n) {
  const pay = canPull(state, n);
  if (!pay) return null;
  if (pay === 'ticket') state.items.ticket -= n;
  else state.gems -= n === 10 ? GACHA.costTen : GACHA.costSingle * n;
  const results = [];
  let hasSRplus = false;
  for (let i = 0; i < n; i++) {
    const force = n === 10 && i === n - 1 && !hasSRplus ? 'SR' : null;
    const rar = rollRarity(state, force);
    state.pity.total++;
    state.pity.ssr++; state.pity.ur++;
    if (rar === 'SSR' || rar === 'UR') state.pity.ssr = 0;
    if (rar === 'UR') state.pity.ur = 0;
    if (RARITY[rar].order >= 2) hasSRplus = true;
    const pick = pickFromRarity(rar);
    const res = { rarity: rar, ...pick };
    if (pick.weapon) res.inst = addWeapon(state, pick.weapon);
    else if (pick.item) addItem(state, pick.item, pick.qty);
    else if (pick.gold) addItem(state, 'gold', pick.gold);
    results.push(res);
  }
  return results;
}

export function dismantle(state, uid) {
  const idx = state.weapons.findIndex((w) => w.uid === uid);
  if (idx < 0 || uid === state.equipped) return null;
  const w = state.weapons[idx];
  const rar = WEAPON_BY_ID[w.id].rarity;
  const gain = { ...DISMANTLE[rar] };
  // refund part of enhancement
  if (w.plus > 0) gain.stone = (gain.stone || 0) + Math.round(w.plus * w.plus * 0.6);
  for (const k in gain) addItem(state, k, gain[k]);
  state.weapons.splice(idx, 1);
  return gain;
}

// ---------- Quests ----------
export function currentQuest(state) { return QUESTS[state.quest.index] || null; }

export function questEvent(state, type, data) {
  const q = currentQuest(state);
  if (!q || q.type !== type) return false;
  if (type === 'kill' && data.id !== q.target) return false;
  if (type === 'enhance') state.quest.progress = Math.max(state.quest.progress, data.plus);
  else state.quest.progress += data.n || 1;
  return state.quest.progress >= q.count;
}

export function claimQuest(state) {
  const q = currentQuest(state);
  if (!q || state.quest.progress < q.count) return null;
  for (const k in q.reward) addItem(state, k, q.reward[k]);
  state.quest.index++;
  state.quest.progress = 0;
  // enhance quests may already be satisfied
  const nq = currentQuest(state);
  if (nq && nq.type === 'enhance') {
    const best = Math.max(...state.weapons.map((w) => w.plus));
    state.quest.progress = Math.min(nq.count, best);
  }
  return q.reward;
}
