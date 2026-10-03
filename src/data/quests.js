export const QUESTS = [
  { id: 'q1', title: 'ปราบสไลม์', desc: 'กำจัดสไลม์เจลลี่ 8 ตัวที่ทุ่งหญ้าทางเหนือ', type: 'kill', target: 'slime', count: 8, reward: { gem: 300, gold: 2000, stone: 10 } },
  { id: 'q2', title: 'พลังแห่งการตีบวก', desc: 'ตีบวกอาวุธให้ถึง +5 ที่ช่างตีเหล็ก', type: 'enhance', count: 5, reward: { gem: 300, stone_blessed: 2 } },
  { id: 'q3', title: 'อัญเชิญเทพศาสตรา', desc: 'สุ่มกาชา 10 ครั้ง', type: 'gacha', count: 10, reward: { gem: 500, ticket: 2 } },
  { id: 'q4', title: 'ล่าหมาป่าเงา', desc: 'กำจัดหมาป่าเงา 10 ตัวในป่าทางตะวันออก', type: 'kill', target: 'wolf', count: 10, reward: { gem: 500, gold: 8000, scroll_protect: 1 } },
  { id: 'q5', title: 'ทำลายก็อบลิน', desc: 'กำจัดก็อบลินโจร 12 ตัว', type: 'kill', target: 'goblin', count: 12, reward: { gem: 600, stone: 30 } },
  { id: 'q6', title: 'ผู้พิทักษ์ศิลา', desc: 'ทำลายโกเลมศิลาเวท 6 ตัวที่ซากวิหารทางใต้', type: 'kill', target: 'golem', count: 6, reward: { gem: 800, stone_blessed: 5, ticket: 3 } },
  { id: 'q7', title: 'ออร่าแห่งตำนาน', desc: 'ตีบวกอาวุธให้ถึง +10', type: 'enhance', count: 10, reward: { gem: 1000, scroll_protect: 3 } },
  { id: 'q8', title: 'สยบมังกรโลกันตร์', desc: 'ปราบมังกรเพลิงโลกันตร์ที่รังทางตะวันตก', type: 'kill', target: 'dragon', count: 1, reward: { gem: 3000, ticket: 10 } },
];
