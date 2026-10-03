// Enhancement table: index = target level
// rate = base success %, gold cost, stones, fail: 'keep' | 'down' | 'crash'
export const MAX_PLUS = 15;
export const ENHANCE_TABLE = [
  null,
  { rate: 100, gold: 200,    stones: 1,  fail: 'keep' },  // +1
  { rate: 100, gold: 400,    stones: 1,  fail: 'keep' },  // +2
  { rate: 95,  gold: 700,    stones: 2,  fail: 'keep' },  // +3
  { rate: 90,  gold: 1100,   stones: 2,  fail: 'keep' },  // +4
  { rate: 80,  gold: 1600,   stones: 3,  fail: 'keep' },  // +5
  { rate: 70,  gold: 2400,   stones: 3,  fail: 'keep' },  // +6
  { rate: 60,  gold: 3500,   stones: 4,  fail: 'down' },  // +7
  { rate: 50,  gold: 5000,   stones: 5,  fail: 'down' },  // +8
  { rate: 42,  gold: 7000,   stones: 6,  fail: 'down' },  // +9
  { rate: 34,  gold: 10000,  stones: 7,  fail: 'down' },  // +10
  { rate: 27,  gold: 14000,  stones: 8,  fail: 'crash' }, // +11
  { rate: 20,  gold: 19000,  stones: 10, fail: 'crash' }, // +12
  { rate: 14,  gold: 26000,  stones: 12, fail: 'crash' }, // +13
  { rate: 9,   gold: 35000,  stones: 14, fail: 'crash' }, // +14
  { rate: 5,   gold: 50000,  stones: 18, fail: 'crash' }, // +15
];
export const CRASH_TO = 7;          // crash resets to +7
export const CRASH_CHANCE = 0.25;   // on 'crash' fail: 25% crash, else -1
export const FAILSTACK_BONUS = 1.5; // +1.5% per consecutive fail (per weapon)
export const BLESSED_BONUS = 10;

// Aura tiers keyed by minimum plus level
export const AURA_TIERS = [
  { min: 0,  name: '—',                      color: 0x000000, color2: 0x000000, intensity: 0 },
  { min: 4,  name: 'แสงเหล็กกล้า',            color: 0xdfefff, color2: 0xffffff, intensity: 0.5, particles: 0 },
  { min: 7,  name: 'ออร่าฟ้าคราม',            color: 0x3aa0ff, color2: 0x9fe0ff, intensity: 0.9, particles: 1 },
  { min: 10, name: 'ออร่าม่วงเวทมนตร์',        color: 0xa040ff, color2: 0xff7bff, intensity: 1.3, particles: 2 },
  { min: 12, name: 'ออร่าเพลิงทองคำ',         color: 0xffb020, color2: 0xfff07a, intensity: 1.7, particles: 3, ground: true },
  { min: 14, name: 'ออร่าอเวจีโลหิต',          color: 0xff2a3a, color2: 0xff9a2a, intensity: 2.1, particles: 4, ground: true },
  { min: 15, name: 'ออร่าเทพสวรรค์รุ้ง',        color: 0xffffff, color2: 0xffffff, intensity: 2.6, particles: 5, ground: true, rainbow: true, lightning: true },
];
export function auraTier(plus) {
  let t = AURA_TIERS[0];
  for (const a of AURA_TIERS) if (plus >= a.min) t = a;
  return t;
}
