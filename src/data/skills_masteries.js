// Skill lines per mastery (rows of the skill window). Tier names follow the reference clips.
import { registerRows } from './skilltree.js';

const T = (name, req, extra = {}) => ({ name, req, ...extra });

registerRows('bicheon', [
  { icon: 'slash', kind: 'attack', fx: 'ss_cross', color: '#c05050', desc: 'ฟันต่อเนื่องหลายจังหวะ ปิดท้ายด้วยกางเขนแสง', tiers: [
    T('Chain Sword Attack I', 1, { dmg: 160, mp: 14, cd: 4, max: 9 }), T('Chain Sword Attack II', 10, { dmg: 210, mp: 20, cd: 4, max: 9 }),
    T('Chain Sword Attack III', 22, { dmg: 280, mp: 28, cd: 4.5, max: 9 }), T('Chain Sword Attack IV', 36, { dmg: 360, mp: 36, cd: 5, max: 9 })] },
  { icon: 'shield', kind: 'attack', fx: 'ss_bash', color: '#4060c0', desc: 'พุ่งชนด้วยโล่ ทำให้ศัตรูมึนงง', tiers: [
    T('Shield Bash I', 3, { dmg: 190, mp: 16, cd: 5, max: 9 }), T('Shield Bash II', 16, { dmg: 260, mp: 24, cd: 5, max: 9 }), T('Shield Bash III', 30, { dmg: 340, mp: 32, cd: 5, max: 9 })] },
  { icon: 'buff', kind: 'buff', fx: 'ss_aegis', color: '#c0a040', desc: 'โดมโล่ดูดซับดาเมจ', tiers: [
    T('Shield Protection I', 5, { dmg: 120, mp: 30, cd: 16, max: 7 }), T('Shield Protection II', 25, { dmg: 160, mp: 40, cd: 16, max: 7 })] },
  { icon: 'sun', kind: 'attack', fx: 'judgement', color: '#ffb020', ult: true, desc: 'ดาบยักษ์จากสรวงสวรรค์', tiers: [
    T('Heaven Blade', 40, { dmg: 900, mp: 80, cd: 28, max: 5 })] },
]);

registerRows('heuksal', [
  { icon: 'thrust', kind: 'attack', fx: 'sp_pierce', color: '#5080e0', desc: 'แทงทะลวงเป็นแนว', tiers: [
    T('Chain Spear Attack I', 1, { dmg: 170, mp: 14, cd: 4, max: 9 }), T('Chain Spear Attack II', 12, { dmg: 230, mp: 20, cd: 4, max: 9 }), T('Chain Spear Attack III', 26, { dmg: 300, mp: 28, cd: 4.5, max: 9 })] },
  { icon: 'spin', kind: 'aoe_self', fx: 'sp_twirl', color: '#8060e0', desc: 'หมุนทวนสร้างวงน้ำวน', tiers: [
    T('Flying Dragon Spin I', 4, { dmg: 70, mp: 26, cd: 8, max: 9 }), T('Flying Dragon Spin II', 20, { dmg: 95, mp: 36, cd: 8, max: 9 })] },
  { icon: 'multi', kind: 'attack', fx: 'sp_thousand', color: '#c06080', desc: 'แทงรัวเร็ว', tiers: [
    T('Ghost Spear I', 8, { dmg: 50, mp: 30, cd: 10, max: 9 }), T('Ghost Spear II', 28, { dmg: 70, mp: 40, cd: 10, max: 9 })] },
  { icon: 'dragon', kind: 'attack', fx: 'sp_dragon', color: '#ff7020', ult: true, desc: 'มังกรพันเกลียว', tiers: [T('Soaring Dragon', 40, { dmg: 850, mp: 80, cd: 28, max: 5 })] },
]);

registerRows('pacheon', [
  { icon: 'arrow', kind: 'attack', fx: 'bw_spiral', color: '#4090e0', desc: 'ศรทะลวง', tiers: [
    T('Strong Bow I', 1, { dmg: 180, mp: 14, cd: 4, max: 9 }), T('Strong Bow II', 12, { dmg: 240, mp: 20, cd: 4, max: 9 }), T('Strong Bow III', 26, { dmg: 310, mp: 28, cd: 4, max: 9 })] },
  { icon: 'rain', kind: 'attack', fx: 'bw_rain', color: '#60a0c0', desc: 'ฝนศร', tiers: [T('Arrow Rain I', 6, { dmg: 30, mp: 30, cd: 9, max: 9 }), T('Arrow Rain II', 22, { dmg: 42, mp: 40, cd: 9, max: 9 })] },
  { icon: 'burst', kind: 'attack', fx: 'bw_burst', color: '#e06030', desc: 'ศรระเบิด', tiers: [T('Explosion Bow I', 10, { dmg: 130, mp: 30, cd: 8, max: 9 }), T('Explosion Bow II', 30, { dmg: 180, mp: 40, cd: 8, max: 9 })] },
  { icon: 'star', kind: 'attack', fx: 'bw_starfall', color: '#a0c0ff', ult: true, desc: 'ลำแสงศรยักษ์', tiers: [T('Dragon Heart Bow', 40, { dmg: 800, mp: 80, cd: 28, max: 5 })] },
]);

registerRows('warrior', [
  { icon: 'quake', kind: 'attack', fx: 'gs_seismic', color: '#c08040', desc: 'คลื่นปฐพี', tiers: [T('Crush I', 1, { dmg: 200, mp: 16, cd: 5, max: 9 }), T('Crush II', 14, { dmg: 270, mp: 24, cd: 5, max: 9 })] },
  { icon: 'spin', kind: 'aoe_self', fx: 'gs_whirl', color: '#a06030', desc: 'พายุหมุน', tiers: [T('Whirlwind I', 5, { dmg: 80, mp: 28, cd: 9, max: 9 }), T('Whirlwind II', 24, { dmg: 110, mp: 38, cd: 9, max: 9 })] },
  { icon: 'leap', kind: 'attack', fx: 'gs_leap', color: '#e09040', desc: 'กระโดดทุบ', tiers: [T('Leap Smash I', 9, { dmg: 300, mp: 32, cd: 11, max: 9 }), T('Leap Smash II', 30, { dmg: 400, mp: 42, cd: 11, max: 9 })] },
  { icon: 'volcano', kind: 'attack', fx: 'gs_titan', color: '#ff5020', ult: true, desc: 'ผ่าแผ่นดิน', tiers: [T('Titan Blade', 40, { dmg: 850, mp: 80, cd: 28, max: 5 })] },
]);

registerRows('wizard', [
  { icon: 'fire', kind: 'attack', fx: 'st_fireball', color: '#e05020', desc: 'ลูกไฟ', tiers: [T('Fire Bolt I', 1, { dmg: 220, mp: 18, cd: 4, max: 9 }), T('Fire Bolt II', 12, { dmg: 290, mp: 26, cd: 4, max: 9 })] },
  { icon: 'ice', kind: 'attack', fx: 'st_ice', color: '#40a0e0', desc: 'น้ำแข็ง', tiers: [T('Ice Spike I', 5, { dmg: 150, mp: 26, cd: 8, max: 9 }), T('Ice Spike II', 22, { dmg: 210, mp: 36, cd: 8, max: 9 })] },
  { icon: 'bolt', kind: 'attack', fx: 'thunder', color: '#8070ff', desc: 'สายฟ้า', tiers: [T('Thunder I', 10, { dmg: 170, mp: 38, cd: 11, max: 9 }), T('Thunder II', 30, { dmg: 230, mp: 48, cd: 11, max: 9 })] },
  { icon: 'meteor', kind: 'attack', fx: 'st_meteor', color: '#ff40a0', ult: true, desc: 'อุกกาบาต', tiers: [T('Meteor', 40, { dmg: 900, mp: 80, cd: 28, max: 5 })] },
]);
