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
  warrior: { name: 'Warrior', th: 'วอริเออร์', weapon: ['greatsword', 'sword'], icon: 'mastery_warrior', desc: 'นักรบดาบสองมือและขวาน พลังทำลายสูง' },
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
        buff: t.buff || row.buff || null, prev: t.prevIdx != null ? (t.prevIdx >= 0 ? `${mastery}_${r + 1}_${t.prevIdx + 1}` : null) : c > 0 ? `${mastery}_${r + 1}_${c}` : null, color: t.color || row.color, tier: t.tierNo || c + 1,
        col: t.col ?? c, step: t.step ?? (t.span != null && (t.max ?? 10) > 1 ? t.span / ((t.max ?? 10) - 1) : 1.5),
        element: t.element || row.element || null, prevLv: t.prevLv ?? null,
        weapon: t.weapon || row.weapon || null, cdGroup: t.cdGroup || null, hpCost: t.hpCost || 0,
      };
    });
  });
}

// level-dependent numbers
export function skillReqMastery(s, lv) { return s.req + Math.floor((lv - 1) * (s.step ?? 1.5) + 1e-6); }
// SP per level, keyed by the mastery level that level requires. Anchors read from the clip's learn dialogs
// (Tiger 89 @26, Nachal 412 @47, Pluto 1607 @65, Phoenix 5931 @109, 15878 @116, 26072 @123); log-linear between.
const SP_CURVE = [[1, 12], [26, 89], [34, 280], [47, 412], [65, 1607], [71, 2600], [90, 4200], [109, 5931], [116, 15878], [123, 26072], [130, 38000]];
export function spForMastery(req) {
  if (req <= SP_CURVE[0][0]) return SP_CURVE[0][1];
  for (let i = 1; i < SP_CURVE.length; i++) {
    const [x1, y1] = SP_CURVE[i];
    if (req <= x1) { const [x0, y0] = SP_CURVE[i - 1]; const k = (req - x0) / (x1 - x0); return Math.round(Math.exp(Math.log(y0) + (Math.log(y1) - Math.log(y0)) * k)); }
  }
  return SP_CURVE[SP_CURVE.length - 1][1];
}
export function skillCost(s, lv) { return spForMastery(skillReqMastery(s, lv)); }
export function skillMult(s, lv) { return (s.dmg / 100) * (1 + (lv - 1) * 0.06); }
export function skillMp(s, lv) { return Math.round(s.mp * (1 + (lv - 1) * 0.08)); }

// Hotbar layouts seen in the reference clips (page F1 / F2), by effect id. 'hp'/'mp' = potions.
export const HOTBAR_PRESETS = {
  warrior: [['wr_down_cross', 'wr_crutial_rush', 'wr_deadly_counter', 'wr_sudden_twist', 'wr_crisis_rush', 'wr_double_twist', 'wr_dual_counter', 'wr_beast_shout', 'hp', 'wr_axis_quiver'],
    ['wr_vital_increase', 'wr_iron_skin', 'wr_mana_skin', 'wr_howling_shout', 'wr_shield_trash', 'wr_shield_crush', 'wr_cunning_stab', 'wr_daring_berserker', 'hp', 'mp']],
  bicheon: [['bc_mountain_shield', 'bc_cut_emperor', 'bc_destruction_smash', 'bc_chain_heavenly', 'bc_chain_thousand_army', 'bc_cut_soul', 'bc_cut_evil', 'bc_force_sky', 'hp', 'mp'],
    ['bc_force_blood', 'bc_force_soul', 'bc_force_ocean', 'bc_mad_dragon', 'bc_heavenly_blade', 'bc_dance_heaven', 'bc_dance_chaotic', 'bc_chain_lightning', 'hp', 'mp']],
  heuksal: [['hk_asura', 'hk_pitch_black', 'hk_soul_emptiness', 'hk_ghost_sea_god', 'hk_chain_heaven', 'hk_fd_sky', 'hk_chain_phoenix', 'hk_storm1', 'hp', 'mp'],
    ['hk_celestial_cloud', 'hk_death_bringer', 'hk_soul_destruction', 'hk_ghost_emperor', 'hk_chain_dragon', 'hk_fd_flash', 'hk_heuksal_storm', 'hk_windless', 'hp', 'mp']],
  wizard: [['wz_fire_bolt', 'wz_lightning_bolt', 'wz_ice_bolt', 'wz_earth_shock', 'wz_charged_wind', 'wz_snow_wind', 'wz_meteor', 'wz_teleport', 'hp', 'mp'],
    ['wz_strengthen_rocket', 'wz_thunder', 'wz_ice_roar', 'wz_earth_earthquake', 'wz_hellforge', 'wz_meteor_shower', 'wz_land_contract', 'wz_life_turnover', 'hp', 'mp']],
  pacheon: [[], []],
};
