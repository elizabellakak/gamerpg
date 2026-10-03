export const GACHA = {
  costSingle: 160,
  costTen: 1600,
  rates: { UR: 0.8, SSR: 3.2, SR: 12, R: 34, N: 50 }, // percent
  pitySSR: 40,  // guaranteed SSR+ within 40 pulls
  pityUR: 120,  // guaranteed UR at 120 pulls
  rateUp: 'celestial_excalibur', // 50% of UR pulls
  bannerName: 'อัญเชิญเทพศาสตรา: ดาบแห่งสรวงสวรรค์',
};

// non-weapon fillers in low rarity pools
export const GACHA_FILLERS = {
  N: [
    { item: 'stone', qty: 5 },
    { item: 'potion_hp', qty: 5 },
    { item: 'potion_mp', qty: 3 },
    { gold: 3000 },
  ],
  R: [
    { item: 'stone', qty: 15 },
    { item: 'stone_blessed', qty: 1 },
    { gold: 10000 },
  ],
  SR: [
    { item: 'scroll_protect', qty: 1 },
    { item: 'stone_blessed', qty: 3 },
  ],
};

// dismantle returns
export const DISMANTLE = {
  N:   { stone: 2,  gold: 300 },
  R:   { stone: 6,  gold: 1500 },
  SR:  { stone: 15, stone_blessed: 1, gold: 5000 },
  SSR: { stone: 40, stone_blessed: 3, scroll_protect: 1, gold: 20000 },
  UR:  { stone: 100, stone_blessed: 8, scroll_protect: 3, gold: 60000 },
};
