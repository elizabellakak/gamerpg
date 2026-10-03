// Weapon & item definitions
export const RARITY = {
  N:   { key: 'N',   name: 'Normal',     th: 'ธรรมดา',  color: '#b8c2cc', glow: 0x9aa7b4, order: 0 },
  R:   { key: 'R',   name: 'Rare',       th: 'หายาก',   color: '#4aa8ff', glow: 0x3d8bff, order: 1 },
  SR:  { key: 'SR',  name: 'Super Rare', th: 'ล้ำค่า',   color: '#c46bff', glow: 0xb04dff, order: 2 },
  SSR: { key: 'SSR', name: 'Legendary',  th: 'ตำนาน',   color: '#ffc93c', glow: 0xffb300, order: 3 },
  UR:  { key: 'UR',  name: 'Mythic',     th: 'เทพนิยาย', color: '#ff4d6d', glow: 0xff3355, order: 4 },
};

export const ELEMENT = {
  physical:  { th: 'กายภาพ', color: 0x4f8dff, color2: 0xa8d0ff, icon: '⚔️' },
  nature:    { th: 'พฤกษา',  color: 0x2bd96b, color2: 0xb8ff8a, icon: '🍃' },
  fire:      { th: 'เพลิง',   color: 0xff7a1f, color2: 0xffd04a, icon: '🔥' },
  ice:       { th: 'น้ำแข็ง', color: 0x29c8ff, color2: 0xa8f0ff, icon: '❄️' },
  lightning: { th: 'สายฟ้า', color: 0x9b7bff, color2: 0x5fd0ff, icon: '⚡' },
  holy:      { th: 'ศักดิ์สิทธิ์', color: 0xffb020, color2: 0xffe89a, icon: '✨' },
  dark:      { th: 'ทมิฬ',   color: 0xd0247a, color2: 0x8a2bff, icon: '🌑' },
};

// atk: base attack, crit: crit chance %, cdmg: crit dmg bonus %, spd: attack speed mult
// Weapon classes (masteries)
export const CLASSES = {
  sword:      { name: 'ดาบโล่',        en: 'Sword & Shield', icon: '🛡️', desc: 'อัศวินผู้พิทักษ์ ป้องกันแน่นหนา สวนกลับด้วยพลังศักดิ์สิทธิ์' },
  greatsword: { name: 'ดาบใหญ่/ขวาน',  en: 'Greatsword',     icon: '🪓', desc: 'นักรบบ้าคลั่ง ฟันหนักหน่วง ทำลายล้างเป็นวงกว้าง' },
  spear:      { name: 'หอก/ง้าว',      en: 'Spear',          icon: '🔱', desc: 'ทวนมังกร ระยะโจมตีไกล แทงทะลวงเป็นแนวยาว' },
  bow:        { name: 'ธนู',           en: 'Bow',            icon: '🏹', desc: 'พรานเงา ยิงไกล คล่องแคล่ว ฝนศรถล่มศัตรู' },
  staff:      { name: 'วิสาด',         en: 'Wizard',         icon: '🔮', desc: 'จอมเวทย์ พลังธาตุมหาศาล ร่ายเวทย์ทำลายล้างพื้นที่' },
};

export const WEAPONS = [
  { id: 'iron_sword',            name: 'ดาบเหล็กกล้า',           en: 'Iron Sword',            rarity: 'N',   element: 'physical',  type: 'sword', cls: 'sword',     atk: 22,  crit: 3,  cdmg: 0,   spd: 1.05 },
  { id: 'bronze_axe',            name: 'ขวานทองสัมฤทธิ์',        en: 'Bronze Axe',            rarity: 'N',   element: 'physical',  type: 'axe', cls: 'greatsword',       atk: 26,  crit: 2,  cdmg: 10,  spd: 0.95 },
  { id: 'oak_staff',             name: 'คทาไม้โอ๊ค',              en: 'Oak Staff',             rarity: 'N',   element: 'nature',    type: 'staff', cls: 'staff',     atk: 20,  crit: 5,  cdmg: 0,   spd: 1.0 },
  { id: 'knight_blade',          name: 'ดาบอัศวินนภา',           en: 'Knight Blade',          rarity: 'R',   element: 'physical',  type: 'sword', cls: 'sword',     atk: 48,  crit: 6,  cdmg: 10,  spd: 1.05 },
  { id: 'steel_halberd',         name: 'ง้าวเหล็กพิฆาต',          en: 'Steel Halberd',         rarity: 'R',   element: 'physical',  type: 'polearm', cls: 'spear',   atk: 55,  crit: 4,  cdmg: 15,  spd: 0.95 },
  { id: 'sapphire_rod',          name: 'คทาไพลินวารี',            en: 'Sapphire Rod',          rarity: 'R',   element: 'ice',       type: 'staff', cls: 'staff',     atk: 46,  crit: 8,  cdmg: 10,  spd: 1.0 },
  { id: 'flame_saber',           name: 'กระบี่อัคคีโลกันตร์',     en: 'Flame Saber',           rarity: 'SR',  element: 'fire',      type: 'sword', cls: 'sword',     atk: 92,  crit: 10, cdmg: 25,  spd: 1.1 },
  { id: 'frost_glaive',          name: 'ง้าวหิมะนิรันดร์',        en: 'Frost Glaive',          rarity: 'SR',  element: 'ice',       type: 'polearm', cls: 'spear',   atk: 98,  crit: 8,  cdmg: 30,  spd: 1.0 },
  { id: 'storm_scythe',          name: 'เคียวพายุอสนี',           en: 'Storm Scythe',          rarity: 'SR',  element: 'lightning', type: 'scythe', cls: 'greatsword',    atk: 95,  crit: 12, cdmg: 20,  spd: 1.05 },
  { id: 'dragonfang_greatsword', name: 'มหาดาบเขี้ยวมังกร',      en: 'Dragonfang Greatsword', rarity: 'SSR', element: 'fire',      type: 'greatsword', cls: 'greatsword',atk: 175, crit: 12, cdmg: 50,  spd: 0.95 },
  { id: 'moonlight_katana',      name: 'คาตานะแสงจันทร์',        en: 'Moonlight Katana',      rarity: 'SSR', element: 'ice',       type: 'katana', cls: 'sword',    atk: 160, crit: 20, cdmg: 45,  spd: 1.2 },
  { id: 'thunder_god_spear',     name: 'หอกเทพสายฟ้า',          en: 'Thunder God Spear',     rarity: 'SSR', element: 'lightning', type: 'polearm', cls: 'spear',   atk: 168, crit: 15, cdmg: 50,  spd: 1.05 },
  { id: 'celestial_excalibur',   name: 'เอ็กซ์คาลิเบอร์สวรรค์',  en: 'Celestial Excalibur',   rarity: 'UR',  element: 'holy',      type: 'sword', cls: 'sword',     atk: 300, crit: 22, cdmg: 80,  spd: 1.15 },
  { id: 'abyss_reaper',          name: 'เคียวยมทูตห้วงนรก',       en: 'Abyss Reaper',          rarity: 'UR',  element: 'dark',      type: 'scythe', cls: 'greatsword',    atk: 320, crit: 18, cdmg: 100, spd: 1.0 },
  { id: 'iron_spear',            name: 'หอกเหล็กทหาร',          en: 'Iron Spear',            rarity: 'N',   element: 'physical',  type: 'polearm', cls: 'spear',   atk: 24,  crit: 4,  cdmg: 5,   spd: 1.0 },
  { id: 'steel_claymore',        name: 'ดาบใหญ่เหล็กน้ำเงิน',    en: 'Steel Claymore',        rarity: 'R',   element: 'physical',  type: 'greatsword', cls: 'greatsword', atk: 56, crit: 4, cdmg: 20, spd: 0.95 },
  { id: 'hunter_bow',            name: 'ธนูนายพราน',            en: 'Hunter Bow',            rarity: 'N',   element: 'physical',  type: 'bow', cls: 'bow',  atk: 21,  crit: 6,  cdmg: 5,   spd: 1.05 },
  { id: 'elven_longbow',         name: 'ธนูยาวเอลฟ์',           en: 'Elven Longbow',         rarity: 'R',   element: 'nature',    type: 'bow', cls: 'bow',  atk: 46,  crit: 9,  cdmg: 10,  spd: 1.05 },
  { id: 'gale_bow',              name: 'ธนูวายุอสนี',           en: 'Gale Bow',              rarity: 'SR',  element: 'lightning', type: 'bow', cls: 'bow',  atk: 90,  crit: 14, cdmg: 25,  spd: 1.1 },
  { id: 'starfall_bow',          name: 'ธนูดาราจันทรา',         en: 'Starfall Bow',          rarity: 'SSR', element: 'ice',       type: 'bow', cls: 'bow',  atk: 162, crit: 20, cdmg: 50,  spd: 1.1 },
  { id: 'seraph_bow',            name: 'ธนูปีกเทวดา',           en: 'Seraph Bow',            rarity: 'UR',  element: 'holy',      type: 'bow', cls: 'bow',  atk: 298, crit: 26, cdmg: 85,  spd: 1.15 },
  { id: 'ember_staff',           name: 'คทาเพลิงอัคนี',          en: 'Ember Staff',           rarity: 'SR',  element: 'fire',      type: 'staff', cls: 'staff', atk: 94, crit: 10, cdmg: 25, spd: 1.0 },
  { id: 'astral_scepter',        name: 'คทาดาราจักร',            en: 'Astral Scepter',        rarity: 'SSR', element: 'lightning', type: 'staff', cls: 'staff', atk: 170, crit: 14, cdmg: 55, spd: 1.0 },
  { id: 'void_staff',            name: 'คทาห้วงสุญญตา',          en: 'Void Staff',            rarity: 'UR',  element: 'dark',      type: 'staff', cls: 'staff', atk: 315, crit: 18, cdmg: 95, spd: 1.0 },
  { id: 'dragon_lance',          name: 'ทวนมังกรเพลิง',          en: 'Dragon Lance',          rarity: 'UR',  element: 'fire',      type: 'polearm', cls: 'spear', atk: 310, crit: 20, cdmg: 90, spd: 1.05 },
  { id: 'phoenix_wing',          name: 'ดาบปีกหงส์เพลิง',         en: 'Phoenix Wing',          rarity: 'UR',  element: 'fire',      type: 'sword', cls: 'sword',     atk: 305, crit: 25, cdmg: 85,  spd: 1.15 },
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
