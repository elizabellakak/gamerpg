// Weapon mastery: levels from using a class, unlocking passives
export const MASTERY_MAX = 20;
export function masteryXpToNext(lv) { return Math.round(120 * Math.pow(lv, 1.45) + 80); }

// per-level: +3% skill damage. Nodes unlock at given mastery level.
export const MASTERY_NODES = {
  sword: [
    { lv: 1,  name: 'พื้นฐานอัศวิน', desc: 'DEF +10%', fx: { defPct: 10 } },
    { lv: 3,  name: 'โล่ป้องกัน', desc: 'โอกาสบล็อก 15% (ลดดาเมจ 70%)', fx: { block: 15 } },
    { lv: 6,  name: 'ศรัทธาแห่งแสง', desc: 'HP สูงสุด +15%', fx: { hpPct: 15 } },
    { lv: 10, name: 'ปลุกพลังโล่', desc: 'โล่พิฆาตสร้างคลื่นแสงรอบตัว + บล็อก +10%', fx: { block: 10, awaken: 'ss_bash' } },
    { lv: 14, name: 'อัศวินศักดิ์สิทธิ์', desc: 'ATK +12%', fx: { atkPct: 12 } },
    { lv: 20, name: 'ผู้พิทักษ์นิรันดร์', desc: 'คูลดาวน์สกิล -15%', fx: { cdr: 15 } },
  ],
  greatsword: [
    { lv: 1,  name: 'พละกำลัง', desc: 'ATK +8%', fx: { atkPct: 8 } },
    { lv: 3,  name: 'ดูดเลือด', desc: 'ฟื้น HP 2% ของดาเมจที่ทำได้', fx: { lifesteal: 2 } },
    { lv: 6,  name: 'คลั่งสงคราม', desc: 'ความแรงคริติคอล +30%', fx: { cdmg: 30 } },
    { lv: 10, name: 'ปลุกพลังปฐพี', desc: 'คลื่นปฐพีแยกปล่อย 3 แนว', fx: { awaken: 'gs_seismic' } },
    { lv: 14, name: 'ร่างยักษ์', desc: 'HP สูงสุด +15% ATK +8%', fx: { hpPct: 15, atkPct: 8 } },
    { lv: 20, name: 'เทพสงคราม', desc: 'ดาเมจท่าไม้ตาย +40%', fx: { ultPct: 40 } },
  ],
  spear: [
    { lv: 1,  name: 'ระยะทวน', desc: 'ระยะโจมตีปกติ +15%', fx: { reach: 15 } },
    { lv: 3,  name: 'เจาะเกราะ', desc: 'ไม่สนใจ DEF ศัตรู 25%', fx: { pen: 25 } },
    { lv: 6,  name: 'จังหวะมังกร', desc: 'ความเร็วโจมตี +12%', fx: { spdPct: 12 } },
    { lv: 10, name: 'ปลุกพลังมังกร', desc: 'แทงทะลวงมังกรปล่อยมังกรลมคู่', fx: { awaken: 'sp_pierce' } },
    { lv: 14, name: 'สายเลือดมังกร', desc: 'โอกาสคริติคอล +10%', fx: { crit: 10 } },
    { lv: 20, name: 'จักรพรรดิทวน', desc: 'ATK +15%', fx: { atkPct: 15 } },
  ],
  bow: [
    { lv: 1,  name: 'ตาเหยี่ยว', desc: 'โอกาสคริติคอล +6%', fx: { crit: 6 } },
    { lv: 3,  name: 'ฝีเท้าพราน', desc: 'ความเร็วเคลื่อนที่ +12%', fx: { movePct: 12 } },
    { lv: 6,  name: 'ศรคู่', desc: 'การโจมตีปกติมีโอกาส 30% ยิงศรเพิ่ม 1 ดอก', fx: { multishot: 30 } },
    { lv: 10, name: 'ปลุกพลังห่าฝน', desc: 'ศรห่าฝนกว้างขึ้น 40% และนานขึ้น', fx: { awaken: 'bw_rain' } },
    { lv: 14, name: 'มือสังหาร', desc: 'ความแรงคริติคอล +40%', fx: { cdmg: 40 } },
    { lv: 20, name: 'เทพธนู', desc: 'ATK +15%', fx: { atkPct: 15 } },
  ],
  staff: [
    { lv: 1,  name: 'สมาธิ', desc: 'MP สูงสุด +25%', fx: { mpPct: 25 } },
    { lv: 3,  name: 'กระแสมานา', desc: 'ฟื้น MP เร็วขึ้น 50%', fx: { mpRegen: 50 } },
    { lv: 6,  name: 'เวทย์ขยาย', desc: 'รัศมีสกิลระเบิด +20%', fx: { aoe: 20 } },
    { lv: 10, name: 'ปลุกพลังอัคคี', desc: 'มหาอัคคีพิโรธยิง 3 ลูก', fx: { awaken: 'st_fireball' } },
    { lv: 14, name: 'จอมปราชญ์', desc: 'ATK +12% ใช้ MP -15%', fx: { atkPct: 12, mpCost: 15 } },
    { lv: 20, name: 'มหาเวทย์นิรันดร์', desc: 'คูลดาวน์สกิล -20%', fx: { cdr: 20 } },
  ],
};

export function masteryEffects(state, cls) {
  const m = (state.mastery && state.mastery[cls]) || { lv: 1, xp: 0 };
  const out = { skillPct: (m.lv - 1) * 3, awaken: new Set() };
  for (const n of MASTERY_NODES[cls] || []) {
    if (m.lv < n.lv) continue;
    for (const [k, v] of Object.entries(n.fx)) {
      if (k === 'awaken') out.awaken.add(v);
      else out[k] = (out[k] || 0) + v;
    }
  }
  return out;
}
