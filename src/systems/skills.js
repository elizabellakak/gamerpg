import { SKILL_INDEX, MASTERY_DEFS, FAMILY, masteryCap, masteryLevelCost, skillReqMastery, skillCost, skillMult, skillMp } from '../data/skilltree.js';

export const HOTBAR_SLOTS = 10;
export const HOTBAR_PAGES = 4;

export function ensureSkillState(s) {
  if (s.sp == null) s.sp = 1500;
  s.mlv = Object.assign({ bicheon: 0, heuksal: 0, pacheon: 0, warrior: 0, wizard: 0 }, s.mlv || {});
  s.slv = s.slv || {};
  if (!s.hotbar || !Array.isArray(s.hotbar.pages)) {
    s.hotbar = { page: 0, pages: Array.from({ length: HOTBAR_PAGES }, () => Array(HOTBAR_SLOTS).fill(null)) };
    s.hotbar.pages[0][8] = { type: 'item', id: 'potion_hp' };
    s.hotbar.pages[0][9] = { type: 'item', id: 'potion_mp' };
  }
  return s;
}

export function masteryTotal(s, family = null) { return Object.entries(s.mlv).reduce((a, [k, v]) => a + (!family || FAMILY[k] === family ? v : 0), 0); }

export function masteryUpInfo(s, m) {
  const lv = s.mlv[m] || 0;
  const cost = masteryLevelCost(lv);
  const fam = FAMILY[m];
  const cap = masteryCap(s.level, fam);
  let reason = null;
  if (lv >= s.level) reason = `ระดับมาสเตอรี่สูงสุดเท่ากับเลเวลตัวละคร (Lv ${s.level})`;
  else if (masteryTotal(s, fam) >= cap) reason = `มาสเตอรี่รวมเต็มแล้ว (${masteryTotal(s, fam)}/${cap})`;
  else if (s.sp < cost) reason = `Skill point ไม่พอ (ต้องการ ${cost.toLocaleString()})`;
  return { lv, cost, ok: !reason, reason };
}

export function levelUpMastery(s, m) {
  const info = masteryUpInfo(s, m);
  if (!info.ok) return info;
  s.sp -= info.cost;
  s.mlv[m] = info.lv + 1;
  return { ...info, ok: true, newLv: s.mlv[m] };
}

// previous skill of the line must reach this level first (Silkroad: e.g. Nachal needs Chain Spear - Tiger Lv 9)
export function prevNeed(sk) { return sk.prevLv ?? Math.min(SKILL_INDEX[sk.prev].max, 9); }

export function skillUpInfo(s, id) {
  const sk = SKILL_INDEX[id];
  const lv = s.slv[id] || 0;
  if (lv >= sk.max) return { lv, max: true, ok: false };
  const next = lv + 1;
  const req = skillReqMastery(sk, next);
  const cost = skillCost(sk, next);
  let reason = null;
  if ((s.mlv[sk.mastery] || 0) < req) reason = `ต้องการ ${MASTERY_DEFS[sk.mastery].name} มาสเตอรี่ Lv ${req}`;
  else if (sk.prev && lv === 0 && (s.slv[sk.prev] || 0) < prevNeed(sk)) reason = `ต้องการ ${SKILL_INDEX[sk.prev].name} Lv ${prevNeed(sk)}`;
  else if (s.sp < cost) reason = `Skill point ไม่พอ (ต้องการ ${cost.toLocaleString()})`;
  return { lv, next, req, cost, ok: !reason, reason };
}

export function levelUpSkill(s, id) {
  const info = skillUpInfo(s, id);
  if (!info.ok) return info;
  s.sp -= info.cost;
  s.slv[id] = info.next;
  // first time learned: drop it into the first empty hotbar slot of the current page
  if (info.next === 1 && SKILL_INDEX[id].kind !== 'passive') {
    const page = s.hotbar.pages[s.hotbar.page];
    const exists = s.hotbar.pages.some((p) => p.some((e) => e && e.type === 'skill' && e.id === id));
    const empty = page.findIndex((e, i) => !e && i < 8);
    if (!exists && empty >= 0) page[empty] = { type: 'skill', id };
  }
  return { ...info, ok: true };
}

// runtime numbers for casting
export function skillRuntime(s, id) {
  const sk = SKILL_INDEX[id];
  const lv = Math.max(1, s.slv[id] || 0);
  return { ...sk, lv, mult: skillMult(sk, lv), mp: skillMp(sk, lv), key: '' };
}

// passive/buff bonuses from learned skills (rows of kind 'passive')
export function passiveEffects(s) {
  const out = {};
  for (const [id, lv] of Object.entries(s.slv)) {
    const sk = SKILL_INDEX[id];
    if (!sk || sk.kind !== 'passive' || !sk.buff || lv <= 0) continue;
    for (const [k, v] of Object.entries(sk.buff)) out[k] = (out[k] || 0) + v * lv;
  }
  return out;
}

export function weaponFitsMastery(mastery, cls) { return MASTERY_DEFS[mastery].weapon.includes(cls); }
// per-skill weapon requirement (Warrior: one-handed rows need a sword, axe rows a two-handed weapon)
export function skillFitsWeapon(s, cls) { return (s.weapon || MASTERY_DEFS[s.mastery].weapon).includes(cls); }
