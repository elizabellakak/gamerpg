const KEY = 'aura-legends-save-v1';

export function newState() {
  return {
    version: 2,
    level: 1,
    xp: 0,
    gold: 15000,
    gems: 4800,
    items: { stone: 40, stone_blessed: 3, scroll_protect: 2, potion_hp: 10, potion_mp: 6, ticket: 10 },
    // one starter weapon per mastery so every class can be tried right away
    weapons: [
      { uid: 1, id: 'iron_sword', plus: 0, fails: 0, isNew: false },
      { uid: 2, id: 'bronze_axe', plus: 0, fails: 0, isNew: false },
      { uid: 3, id: 'iron_spear', plus: 0, fails: 0, isNew: false },
      { uid: 4, id: 'hunter_bow', plus: 0, fails: 0, isNew: false },
      { uid: 5, id: 'oak_staff', plus: 0, fails: 0, isNew: false },
    ],
    nextUid: 6,
    equipped: 1,
    pity: { ssr: 0, ur: 0, total: 0 },
    quest: { index: 0, progress: 0 },
    kills: {},
    mastery: { sword: { lv: 1, xp: 0 }, greatsword: { lv: 1, xp: 0 }, spear: { lv: 1, xp: 0 }, bow: { lv: 1, xp: 0 }, staff: { lv: 1, xp: 0 } },
    settings: { muted: false, autoPotion: true, quality: null },
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return newState();
    const s = JSON.parse(raw);
    const base = newState();
    const out = Object.assign(base, s);
    out.mastery = Object.assign(newState().mastery, s.mastery || {});
    if ((s.version || 1) < 2) {
      // v2 added weapon masteries: hand out the missing starter weapons
      for (const id of ['bronze_axe', 'iron_spear', 'hunter_bow', 'oak_staff']) {
        if (!out.weapons.some((w) => w.id === id)) out.weapons.push({ uid: out.nextUid++, id, plus: 0, fails: 0, isNew: true });
      }
      out.version = 2;
    }
    return out;
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
