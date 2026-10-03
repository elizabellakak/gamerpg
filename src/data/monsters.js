// Monster templates. Stats scale with level.
export const MONSTERS = {
  slime:  { name: 'สไลม์เจลลี่',   model: 'slime',  scale: 1.0, radius: 0.6, hp: 120,  atk: 14,  def: 2,  speed: 2.4, range: 1.4, aggro: 8,  atkCd: 1.8, xp: 18,  gold: [8, 20],   height: 1.0 },
  wolf:   { name: 'หมาป่าเงา',     model: 'wolf',   scale: 1.0, radius: 0.8, hp: 300,  atk: 30,  def: 6,  speed: 5.0, range: 1.8, aggro: 12, atkCd: 1.4, xp: 45,  gold: [20, 45],  height: 1.3 },
  goblin: { name: 'ก็อบลินโจร',    model: 'goblin', scale: 1.0, radius: 0.6, hp: 420,  atk: 40,  def: 10, speed: 3.6, range: 1.7, aggro: 11, atkCd: 1.6, xp: 70,  gold: [35, 70],  height: 1.5 },
  golem:  { name: 'โกเลมศิลาเวท',  model: 'golem',  scale: 1.0, radius: 1.4, hp: 900,  atk: 80,  def: 30, speed: 2.2, range: 2.8, aggro: 12, atkCd: 2.6, xp: 260, gold: [120, 220], height: 3.0 },
  dragon: { name: 'มังกรเพลิงโลกันตร์', model: 'dragon', scale: 1.0, radius: 3.2, hp: 9000, atk: 120, def: 60, speed: 4.0, range: 5.5, aggro: 30, atkCd: 2.2, xp: 8000, gold: [8000, 12000], height: 4.5, boss: true },
};

export function scaledStats(tpl, level) {
  const L = level - 1;
  return {
    maxHp: Math.round(tpl.hp * (1 + L * 0.2)),
    atk: Math.round(tpl.atk * (1 + L * 0.14)),
    def: Math.round(tpl.def * (1 + L * 0.05)),
    xp: Math.round(tpl.xp * (1 + L * 0.25)),
  };
}

// Zones: center (x,z), spawn radius, monsters list [id, weight], level range
export const ZONES = [
  { id: 'town',   name: 'เมืองซากุระ',       x: 0,    z: 0,    r: 34, safe: true, level: [1, 1] },
  { id: 'meadow', name: 'ทุ่งหญ้าสไลม์',      x: 0,    z: -95,  r: 42, level: [1, 6],   mobs: [['slime', 1]], count: 18 },
  { id: 'forest', name: 'ป่าหมาป่าเงา',      x: 100,  z: 10,   r: 45, level: [6, 12],  mobs: [['wolf', 3], ['goblin', 2]], count: 18 },
  { id: 'ruins',  name: 'ซากวิหารศิลา',      x: 10,   z: 110,  r: 45, level: [12, 20], mobs: [['golem', 2], ['goblin', 3]], count: 14 },
  { id: 'lair',   name: 'รังมังกรโลกันตร์',  x: -120, z: 15,   r: 40, level: [28, 28], mobs: [['dragon', 1]], count: 1, boss: true },
];

export const LOOT = {
  slime:  [['stone', 0.35, 1, 2], ['potion_hp', 0.08, 1, 1], ['gem', 0.06, 10, 20]],
  wolf:   [['stone', 0.45, 1, 3], ['potion_hp', 0.1, 1, 1], ['potion_mp', 0.08, 1, 1], ['gem', 0.08, 15, 30]],
  goblin: [['stone', 0.5, 2, 4], ['stone_blessed', 0.03, 1, 1], ['gem', 0.1, 20, 40]],
  golem:  [['stone', 0.9, 4, 8], ['stone_blessed', 0.12, 1, 1], ['scroll_protect', 0.04, 1, 1], ['gem', 0.25, 40, 80]],
  dragon: [['stone', 1, 60, 100], ['stone_blessed', 1, 5, 10], ['scroll_protect', 1, 2, 4], ['gem', 1, 1600, 2400], ['ticket', 1, 3, 5]],
};
