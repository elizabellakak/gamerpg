// Weapon & item definitions
export const RARITY = {
  N:   { key: 'N',   name: 'Normal',     th: 'ธรรมดา',  color: '#b8c2cc', glow: 0x9aa7b4, order: 0 },
  R:   { key: 'R',   name: 'Rare',       th: 'หายาก',   color: '#4aa8ff', glow: 0x3d8bff, order: 1 },
  SR:  { key: 'SR',  name: 'Super Rare', th: 'ล้ำค่า',   color: '#c46bff', glow: 0xb04dff, order: 2 },
  SSR: { key: 'SSR', name: 'Legendary',  th: 'ตำนาน',   color: '#ffc93c', glow: 0xffb300, order: 3 },
  UR:  { key: 'UR',  name: 'Mythic',     th: 'เทพนิยาย', color: '#ff4d6d', glow: 0xff3355, order: 4 },
};

export const ELEMENT = {
  physical:  { th: 'กายภาพ', color: 0xdfe8ff, color2: 0x8fb4ff, icon: '⚔️' },
  nature:    { th: 'พฤกษา',  color: 0x7dff9a, color2: 0x2bd96b, icon: '🍃' },
  fire:      { th: 'เพลิง',   color: 0xff7a1f, color2: 0xffd04a, icon: '🔥' },
  ice:       { th: 'น้ำแข็ง', color: 0x6fe7ff, color2: 0xc8f7ff, icon: '❄️' },
  lightning: { th: 'สายฟ้า', color: 0x9b7bff, color2: 0x5fd0ff, icon: '⚡' },
  holy:      { th: 'ศักดิ์สิทธิ์', color: 0xffd86b, color2: 0xfff6c8, icon: '✨' },
  dark:      { th: 'ทมิฬ',   color: 0xd0247a, color2: 0x8a2bff, icon: '🌑' },
};

// atk: base attack, crit: crit chance %, cdmg: crit dmg bonus %, spd: attack speed mult
export const WEAPONS = [
  { id: 'iron_sword',            name: 'ดาบเหล็กกล้า',           en: 'Iron Sword',            rarity: 'N',   element: 'physical',  type: 'sword',     atk: 22,  crit: 3,  cdmg: 0,   spd: 1.05 },
  { id: 'bronze_axe',            name: 'ขวานทองสัมฤทธิ์',        en: 'Bronze Axe',            rarity: 'N',   element: 'physical',  type: 'axe',       atk: 26,  crit: 2,  cdmg: 10,  spd: 0.95 },
  { id: 'oak_staff',             name: 'คทาไม้โอ๊ค',              en: 'Oak Staff',             rarity: 'N',   element: 'nature',    type: 'staff',     atk: 20,  crit: 5,  cdmg: 0,   spd: 1.0 },
  { id: 'knight_blade',          name: 'ดาบอัศวินนภา',           en: 'Knight Blade',          rarity: 'R',   element: 'physical',  type: 'sword',     atk: 48,  crit: 6,  cdmg: 10,  spd: 1.05 },
  { id: 'steel_halberd',         name: 'ง้าวเหล็กพิฆาต',          en: 'Steel Halberd',         rarity: 'R',   element: 'physical',  type: 'polearm',   atk: 55,  crit: 4,  cdmg: 15,  spd: 0.95 },
  { id: 'sapphire_rod',          name: 'คทาไพลินวารี',            en: 'Sapphire Rod',          rarity: 'R',   element: 'ice',       type: 'staff',     atk: 46,  crit: 8,  cdmg: 10,  spd: 1.0 },
  { id: 'flame_saber',           name: 'กระบี่อัคคีโลกันตร์',     en: 'Flame Saber',           rarity: 'SR',  element: 'fire',      type: 'sword',     atk: 92,  crit: 10, cdmg: 25,  spd: 1.1 },
  { id: 'frost_glaive',          name: 'ง้าวหิมะนิรันดร์',        en: 'Frost Glaive',          rarity: 'SR',  element: 'ice',       type: 'polearm',   atk: 98,  crit: 8,  cdmg: 30,  spd: 1.0 },
  { id: 'storm_scythe',          name: 'เคียวพายุอสนี',           en: 'Storm Scythe',          rarity: 'SR',  element: 'lightning', type: 'scythe',    atk: 95,  crit: 12, cdmg: 20,  spd: 1.05 },
  { id: 'dragonfang_greatsword', name: 'มหาดาบเขี้ยวมังกร',      en: 'Dragonfang Greatsword', rarity: 'SSR', element: 'fire',      type: 'greatsword',atk: 175, crit: 12, cdmg: 50,  spd: 0.95 },
  { id: 'moonlight_katana',      name: 'คาตานะแสงจันทร์',        en: 'Moonlight Katana',      rarity: 'SSR', element: 'ice',       type: 'katana',    atk: 160, crit: 20, cdmg: 45,  spd: 1.2 },
  { id: 'thunder_god_spear',     name: 'หอกเทพสายฟ้า',          en: 'Thunder God Spear',     rarity: 'SSR', element: 'lightning', type: 'polearm',   atk: 168, crit: 15, cdmg: 50,  spd: 1.05 },
  { id: 'celestial_excalibur',   name: 'เอ็กซ์คาลิเบอร์สวรรค์',  en: 'Celestial Excalibur',   rarity: 'UR',  element: 'holy',      type: 'sword',     atk: 300, crit: 22, cdmg: 80,  spd: 1.15 },
  { id: 'abyss_reaper',          name: 'เคียวยมทูตห้วงนรก',       en: 'Abyss Reaper',          rarity: 'UR',  element: 'dark',      type: 'scythe',    atk: 320, crit: 18, cdmg: 100, spd: 1.0 },
  { id: 'phoenix_wing',          name: 'ดาบปีกหงส์เพลิง',         en: 'Phoenix Wing',          rarity: 'UR',  element: 'fire',      type: 'sword',     atk: 305, crit: 25, cdmg: 85,  spd: 1.15 },
];
export const WEAPON_BY_ID = Object.fromEntries(WEAPONS.map((w) => [w.id, w]));

export const ITEMS = {
  stone:          { name: 'หินตีบวก',            desc: 'ใช้ในการตีบวกอาวุธ',                           icon: 'stone' },
  stone_blessed:  { name: 'หินตีบวกศักดิ์สิทธิ์', desc: 'เพิ่มโอกาสสำเร็จ +10% เมื่อใช้ร่วมกับการตีบวก', icon: 'stone_blessed' },
  scroll_protect: { name: 'คัมภีร์ปกป้อง',        desc: 'ป้องกันระดับลดลงและอาวุธแตกเมื่อตีบวกล้มเหลว',  icon: 'scroll_protect' },
  potion_hp:      { name: 'ยาฟื้นพลังชีวิต',     desc: 'ฟื้นฟู HP 40% (กด Q)',                        icon: 'potion_hp' },
  potion_mp:      { name: 'ยาฟื้นมานา',          desc: 'ฟื้นฟู MP 50% (กด E)',                        icon: 'potion_mp' },
  ticket:         { name: 'ตั๋วอัญเชิญ',          desc: 'ใช้สุ่มกาชาแทนเพชร 1 ครั้ง',                    icon: 'ticket' },
};

// weapon atk -> stats with enhancement
export function enhanceMult(level) {
  let m = 1 + level * 0.075;
  if (level >= 7) m += (level - 6) * 0.05;
  if (level >= 10) m += Math.pow(level - 9, 2) * 0.035;
  return m;
}

export function weaponStats(inst) {
  const def = WEAPON_BY_ID[inst.id];
  const lv = inst.plus || 0;
  return {
    atk: Math.round(def.atk * enhanceMult(lv)),
    crit: def.crit + Math.floor(lv / 3) * 1,
    cdmg: def.cdmg + (lv >= 10 ? (lv - 9) * 8 : 0),
    spd: def.spd,
  };
}
