// Silkroad-style skill tree: masteries -> rows (skill lines) -> tiers (upgraded skills), each tier has its own levels.
// Row data is filled per mastery; the builder below expands it into SKILL_INDEX.

export const TABS = [
  { id: 'weapon', name: 'Weapon', th: 'อาวุธ', subs: ['bicheon', 'heuksal', 'pacheon'] },
  { id: 'melee', name: 'Melee', th: 'ระยะประชิด', subs: ['warrior'] },
  { id: 'caster', name: 'Caster', th: 'เวทย์', subs: ['wizard'] },
];

// weapon classes (from weapons.js cls) each mastery's skills require
export const MASTERY_DEFS = {
  bicheon: { name: 'Bicheon', th: 'บีชอน', weapon: ['sword'], icon: 'mastery_bicheon', desc: 'วิชาดาบและดาบใหญ่พร้อมโล่ เน้นป้องกันและคอมโบรุนแรง' },
  heuksal: { name: 'Heuksal', th: 'ฮึกซัล', weapon: ['spear'], icon: 'mastery_heuksal', desc: 'วิชาทวนและง้าว โจมตีหมู่ ระยะไกลกว่าอาวุธสั้น' },
  pacheon: { name: 'Pacheon', th: 'พาชอน', weapon: ['bow'], icon: 'mastery_pacheon', desc: 'วิชาธนู โจมตีจากระยะไกลด้วยศรเสริมพลัง' },
  warrior: { name: 'Warrior', th: 'วอริเออร์', weapon: ['greatsword'], icon: 'mastery_warrior', desc: 'นักรบดาบสองมือและขวาน พลังทำลายสูง' },
  wizard: { name: 'Wizard', th: 'วิซาร์ด', weapon: ['staff'], icon: 'mastery_wizard', desc: 'จอมเวทย์ธาตุดิน น้ำแข็ง ไฟ สายฟ้า' },
};

export const CLS_MASTERY = { sword: 'bicheon', spear: 'heuksal', bow: 'pacheon', greatsword: 'warrior', staff: 'wizard' };

// Mastery rules (EU-style cap seen in the clips: "Mastery level total 246/250" at character Lv 125)
export const MASTERY_TOTAL_PER_LEVEL = 2;
export function masteryCap(charLevel) { return charLevel * MASTERY_TOTAL_PER_LEVEL; }
export function masteryLevelCost(lv) { return Math.round(18 * Math.pow(lv, 1.75) + 20); } // SP to go lv -> lv+1

// Rows per mastery. Each row: { icon (row category icon), kind, fx (effect handler id), tiers: [{ name, req, max, dmg, mp, cd, hits, desc }] }
// dmg = damage % of attack power at skill level 1; scales +6% per extra skill level.
export const ROWS = {
  bicheon: [],
  heuksal: [],
  pacheon: [],
  warrior: [],
  wizard: [],
};

export const SKILL_INDEX = {};

export function registerRows(mastery, rows) {
  ROWS[mastery] = rows;
  rows.forEach((row, r) => {
    row.tiers.forEach((t, c) => {
      const id = `${mastery}_${r + 1}_${c + 1}`;
      SKILL_INDEX[id] = {
        id, mastery, row: r + 1, col: c + 1, rowKind: row.kind, fx: t.fx || row.fx, icon: t.icon || row.icon,
        name: t.name, th: t.th || '', req: t.req, max: t.max ?? 10, dmg: t.dmg ?? 100, mp: t.mp ?? 20, cd: t.cd ?? 3,
        hits: t.hits ?? 1, desc: t.desc || row.desc || '', kind: t.kind || row.kind, ult: !!(t.ult || row.ult),
        buff: t.buff || row.buff || null, prev: c > 0 ? `${mastery}_${r + 1}_${c}` : null, color: row.color, tier: c + 1,
      };
    });
  });
}

// level-dependent numbers
export function skillReqMastery(s, lv) { return s.req + Math.floor((lv - 1) * 1.5); }
export function skillCost(s, lv) { return Math.round(4 * Math.pow(s.req + lv * 1.5, 1.85) + 10 * s.tier); }
export function skillMult(s, lv) { return (s.dmg / 100) * (1 + (lv - 1) * 0.06); }
export function skillMp(s, lv) { return Math.round(s.mp * (1 + (lv - 1) * 0.08)); }
