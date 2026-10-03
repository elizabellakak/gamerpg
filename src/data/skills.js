// Skill kits per weapon class (mastery). Keys 1-3 = skills, 4 = ultimate.
// attacks: basic combo. type: melee | thrust | arrow | bolt
export const KITS = {
  sword: {
    anims: { idle: 'SS_Idle', run: 'SS_Run' },
    dash: 'dash',
    attacks: [
      { anim: 'Attack1', dur: 0.46, hit: 0.17, mult: 1.0, range: 3.2, angle: Math.PI * 0.9, type: 'melee', slash: { flip: false, tilt: -0.25, angle: Math.PI * 1.15 }, sfx: 'swing', push: 2.5 },
      { anim: 'Attack2', dur: 0.46, hit: 0.16, mult: 1.1, range: 3.2, angle: Math.PI * 0.9, type: 'melee', slash: { flip: true, tilt: 0.3, angle: Math.PI * 1.15 }, sfx: 'swing', push: 2.5 },
      { anim: 'Attack3', dur: 0.68, hit: 0.3, mult: 1.9, range: 3.6, angle: Math.PI * 0.7, type: 'melee', slash: { flip: false, tilt: Math.PI / 2 - 0.15, angle: Math.PI * 0.95, radius: 3.0 }, sfx: 'swingHeavy', push: 4, heavy: true },
    ],
    skills: [
      { id: 'ss_bash',    key: '1', name: 'โล่พิฆาตสะท้านฟ้า', desc: 'พุ่งชนด้วยโล่ ทำให้ศัตรูมึนงง 1.5 วินาที', mp: 16, cd: 5, mult: 2.0, icon: '🛡️' },
      { id: 'ss_cross',   key: '2', name: 'กางเขนศักดิ์สิทธิ์', desc: 'ฟันต่อเนื่อง 3 ครั้ง ปิดท้ายด้วยกางเขนแสงระเบิด', mp: 28, cd: 8, mult: 1.1, icon: '✝️' },
      { id: 'ss_aegis',   key: '3', name: 'ปราการแสงนิรันดร์', desc: 'สร้างโดมโล่ดูดซับดาเมจ 35% HP นาน 6 วินาที และสะท้อนคลื่นแสง', mp: 36, cd: 16, mult: 1.2, icon: '🔰' },
      { id: 'judgement',  key: '4', name: 'พิพากษาสวรรค์', desc: 'ท่าไม้ตาย! อัญเชิญดาบยักษ์จากสรวงสวรรค์ทำลายล้าง', mp: 80, cd: 28, mult: 9, icon: '☀️', ult: true },
    ],
  },
  greatsword: {
    anims: { idle: 'GS_Idle', run: 'GS_Run' },
    dash: 'dash',
    attacks: [
      { anim: 'GS_Attack1', fb: 'Attack1', dur: 0.62, hit: 0.28, mult: 1.35, range: 3.9, angle: Math.PI * 1.1, type: 'melee', slash: { flip: false, tilt: -0.45, angle: Math.PI * 1.3, radius: 3.4, width: 1.9 }, sfx: 'swingHeavy', push: 3, heavy: true },
      { anim: 'GS_Attack2', fb: 'Attack2', dur: 0.62, hit: 0.28, mult: 1.45, range: 3.9, angle: Math.PI * 1.1, type: 'melee', slash: { flip: true, tilt: 0.45, angle: Math.PI * 1.3, radius: 3.4, width: 1.9 }, sfx: 'swingHeavy', push: 3, heavy: true },
      { anim: 'GS_Attack3', fb: 'Attack3', dur: 0.85, hit: 0.48, mult: 2.7, range: 4.2, angle: Math.PI * 0.7, type: 'melee', slash: { flip: false, tilt: Math.PI / 2 - 0.1, angle: Math.PI, radius: 3.6, width: 2 }, sfx: 'swingHeavy', push: 4, heavy: true, quake: true },
    ],
    skills: [
      { id: 'gs_seismic', key: '1', name: 'คลื่นปฐพีแยก', desc: 'ทุบพื้นส่งแนวหินแหลมปะทุพุ่งไปข้างหน้า 14 เมตร', mp: 20, cd: 5, mult: 2.3, icon: '⛰️' },
      { id: 'gs_whirl',   key: '2', name: 'พายุหมุนเลือดคลั่ง', desc: 'หมุนดาบใหญ่ต่อเนื่อง ดูดศัตรูเข้าหาและฟันรอบตัว', mp: 30, cd: 9, mult: 0.85, icon: '🌀' },
      { id: 'gs_leap',    key: '3', name: 'กระโจนทลายภูผา', desc: 'กระโดดฟาดลงจุดเป้าหมาย สร้างหลุมระเบิดและเหวี่ยงศัตรูลอย', mp: 34, cd: 11, mult: 3.2, icon: '☄️' },
      { id: 'gs_titan',   key: '4', name: 'ฟันทลายสวรรค์', desc: 'ท่าไม้ตาย! ร่างวิญญาณดาบยักษ์ฟาดผ่าแผ่นดินเป็นเหวลาวา', mp: 80, cd: 28, mult: 8.5, icon: '🌋', ult: true },
    ],
  },
  spear: {
    anims: { idle: 'SP_Idle', run: 'SP_Run' },
    dash: 'dash',
    attacks: [
      { anim: 'SP_Attack1', fb: 'Attack1', dur: 0.42, hit: 0.17, mult: 1.0, range: 4.8, angle: Math.PI * 0.3, type: 'thrust', sfx: 'swing', push: 3 },
      { anim: 'SP_Attack2', fb: 'Attack2', dur: 0.5, hit: 0.22, mult: 1.15, range: 4.4, angle: Math.PI * 1.3, type: 'melee', slash: { flip: true, tilt: 0.1, angle: Math.PI * 1.4, radius: 4.0, width: 1.2 }, sfx: 'swing', push: 2 },
      { anim: 'SP_Attack3', fb: 'Attack3', dur: 0.7, hit: 0.42, mult: 2.1, range: 6.0, angle: Math.PI * 0.3, type: 'thrust', sfx: 'swingHeavy', push: 5, heavy: true },
    ],
    skills: [
      { id: 'sp_pierce',  key: '1', name: 'แทงทะลวงมังกร', desc: 'พุ่งแทงเป็นเกลียวสว่านทะลุศัตรูทั้งแนว 9 เมตร', mp: 18, cd: 4.5, mult: 2.4, icon: '🌪️' },
      { id: 'sp_twirl',   key: '2', name: 'วงล้อง้าวพายุ', desc: 'หมุนง้าวสร้างวงใบมีดรอบตัว ดึงศัตรูเข้ามาบดขยี้', mp: 28, cd: 8, mult: 0.8, icon: '💫' },
      { id: 'sp_thousand',key: '3', name: 'พันหอกสะท้านฟ้า', desc: 'แทงรัวเร็วดั่งพันหอก ปล่อยหอกวิญญาณพุ่งเป็นรูปพัด', mp: 34, cd: 10, mult: 0.55, icon: '⚡' },
      { id: 'sp_dragon',  key: '4', name: 'มังกรเหินฟ้าพิฆาต', desc: 'ท่าไม้ตาย! ปลุกวิญญาณมังกรพันเกลียวพุ่งขึ้นฟ้าแล้วดิ่งถล่ม', mp: 80, cd: 28, mult: 8.5, icon: '🐉', ult: true },
    ],
  },
  bow: {
    anims: { idle: 'BW_Idle', run: 'BW_Run' },
    dash: 'backflip',
    ranged: true,
    attacks: [
      { anim: 'BW_Shoot', fb: 'Attack1', dur: 0.5, hit: 0.3, mult: 1.05, range: 26, type: 'arrow', sfx: 'swing', push: 0 },
      { anim: 'BW_Shoot', fb: 'Attack2', dur: 0.5, hit: 0.3, mult: 1.1, range: 26, type: 'arrow', sfx: 'swing', push: 0 },
      { anim: 'BW_Shoot', fb: 'Attack3', dur: 0.6, hit: 0.36, mult: 0.9, range: 26, type: 'arrow', count: 3, sfx: 'swingHeavy', push: 0, heavy: true },
    ],
    skills: [
      { id: 'bw_spiral',  key: '1', name: 'ศรเกลียววายุ', desc: 'ยิงศรหมุนเกลียวลมทะลวงทั้งแนว 30 เมตร', mp: 16, cd: 4, mult: 2.4, icon: '🌀' },
      { id: 'bw_rain',    key: '2', name: 'ศรห่าฝนพันดอก', desc: 'ยิงขึ้นฟ้า ศรนับร้อยตกถล่มพื้นที่เป้าหมาย', mp: 32, cd: 9, mult: 0.35, icon: '🌧️' },
      { id: 'bw_burst',   key: '3', name: 'ศรระเบิดแยกร่าง', desc: 'ยิงศรระเบิด 5 ดอกเป็นรูปพัด ระเบิดเมื่อโดนเป้า', mp: 30, cd: 8, mult: 1.4, icon: '💥' },
      { id: 'bw_starfall',key: '4', name: 'ศรเทพพิฆาตดารา', desc: 'ท่าไม้ตาย! รวมพลังดาราเป็นลำแสงศรยักษ์ทะลวงทุกสิ่ง', mp: 80, cd: 28, mult: 8, icon: '🌠', ult: true },
    ],
  },
  staff: {
    anims: { idle: 'ST_Idle', run: 'ST_Run' },
    dash: 'blink',
    ranged: true,
    attacks: [
      { anim: 'ST_Attack1', fb: 'Attack1', dur: 0.45, hit: 0.2, mult: 1.05, range: 22, type: 'bolt', sfx: 'swing', push: 0 },
      { anim: 'ST_Attack2', fb: 'Attack2', dur: 0.45, hit: 0.2, mult: 1.1, range: 22, type: 'bolt', sfx: 'swing', push: 0 },
      { anim: 'ST_Attack3', fb: 'Attack3', dur: 0.65, hit: 0.38, mult: 1.8, range: 22, type: 'bolt', big: true, sfx: 'swingHeavy', push: 0, heavy: true },
    ],
    skills: [
      { id: 'st_fireball',key: '1', name: 'มหาอัคคีพิโรธ', desc: 'ลูกบอลธาตุยักษ์ ระเบิดเป็นวงกว้างเมื่อกระทบ', mp: 20, cd: 4, mult: 2.6, icon: '🔥' },
      { id: 'st_ice',     key: '2', name: 'โซ่น้ำแข็งนิรันดร์', desc: 'แท่งน้ำแข็งปะทุจากพื้นเป็นแนว ทำให้ศัตรูช้าลง', mp: 28, cd: 8, mult: 1.6, icon: '❄️' },
      { id: 'thunder',    key: '3', name: 'อสนีบาตพิโรธ', desc: 'เรียกสายฟ้าฟาดลงบริเวณกว้าง', mp: 40, cd: 11, mult: 1.8, icon: '⚡' },
      { id: 'st_meteor',  key: '4', name: 'อุกกาบาตวันสิ้นโลก', desc: 'ท่าไม้ตาย! เปิดประตูมิติเรียกอุกกาบาตยักษ์และฝนดาวตกถล่ม', mp: 80, cd: 28, mult: 9, icon: '☄️', ult: true },
    ],
  },
};

export const ALL_SKILLS = Object.values(KITS).flatMap((k) => k.skills);
