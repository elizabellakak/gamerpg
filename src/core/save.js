const KEY = 'aura-legends-save-v1';

export function newState() {
  return {
    version: 1,
    level: 1,
    xp: 0,
    gold: 15000,
    gems: 4800,
    items: { stone: 40, stone_blessed: 3, scroll_protect: 2, potion_hp: 10, potion_mp: 6, ticket: 10 },
    weapons: [{ uid: 1, id: 'iron_sword', plus: 0, fails: 0, isNew: false }],
    nextUid: 2,
    equipped: 1,
    pity: { ssr: 0, ur: 0, total: 0 },
    quest: { index: 0, progress: 0 },
    kills: {},
    settings: { muted: false, autoPotion: true, quality: null },
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return newState();
    const s = JSON.parse(raw);
    return Object.assign(newState(), s);
  } catch (e) {
    return newState();
  }
}

export function saveState(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* storage unavailable */ }
}

export function resetState() {
  try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
}
