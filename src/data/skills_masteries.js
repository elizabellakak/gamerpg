// Skill lines per mastery (rows of the skill window). Tier names follow the reference clips.
import { registerRows } from './skilltree.js';

const T = (name, req, extra = {}) => ({ name, req, ...extra });

// Bicheon (sword/blade + shield) - the clip's skill window, rows top to bottom. Cooldown groups follow the clip
// (a skill shares its timer with the one three columns to its right).
const B = (name, req, fx, dmg, mp, cd, max, desc, extra = {}) => ({ name, req, fx, dmg, mp, cd, max, desc, step: 1, ...extra });
registerRows('bicheon', [
  { icon: 'slash', kind: 'attack', color: '#c04060', desc: 'Smash: ฟันประชิด', tiers: [
    B('Strike Smash', 1, 'bc_strike_smash', 165, 10, 3, 9, 'ฟันสับจากเหนือหัวลงเฉียง แสงเข็มสีขาวระเบิดที่เป้าหมาย', { cdGroup: 'bs_a' }),
    B('Stab Smash', 20, 'bc_stab_smash', 190, 16, 3, 9, 'พุ่งแทงลึก เส้นแดงชมพูและกรวยเพลิงส้มเหลืองตามแนวแทง', { cdGroup: 'bs_b' }),
    B('Crosswise Smash', 40, 'bc_crosswise_smash', 140, 24, 3, 9, 'ฟันแนวนอน แล้วฟันย้อนขึ้นเป็นโดมแสงฟ้า (รูปกากบาท)', { hits: 2, cdGroup: 'bs_c' }),
    B('Flying Stone Smash', 60, 'bc_flying_stone_smash', 175, 34, 3, 12, 'กระโดดหมุนฟัน วงแหวนเขียวขาวแนวตั้ง คลื่นกระแทกที่พื้น แล้วแทงพร้อมกรวยเพลิง (เลือดไหล)', { hits: 2, cdGroup: 'bs_a' }),
    B('Twin Energy Smash', 80, 'bc_twin_energy_smash', 180, 46, 3, 13, 'ฟันกวาด 3 ครั้ง ริบบิ้นฟ้าเขียว ปิดด้วยเสาเพลิงเหลือง (เลือดไหล)', { hits: 3, cdGroup: 'bs_b' }),
    B('Destruction Smash', 122, 'bc_destruction_smash', 190, 80, 7, 9, 'ริบบิ้นเขียวมิ้นต์ วงรีที่พื้นรอบเป้าหมาย ระเบิดเข็มแสงยักษ์ (หน้า 2 ม. 3 ตัว กระเด็น)', { hits: 3, cdGroup: 'bs_c' })] },
  { icon: 'multi', kind: 'attack', color: '#c07020', desc: 'Chain: คอมโบ แผ่นแสงอาทิตย์สีทองทุกจังหวะ', tiers: [
    B('Illusion Chain', 10, 'bc_chain_illusion', 100, 14, 7, 9, 'ยกดาบตั้ง ฟันเฉียงพร้อมก้าว 3 ครั้ง', { hits: 3 }),
    B('Blood Chain', 28, 'bc_chain_blood', 90, 20, 7, 9, 'ฟันสลับเฉียง/นอน 4 ครั้ง', { hits: 4 }),
    B('Billow Chain', 46, 'bc_chain_billow', 95, 28, 7.5, 9, 'กระโดดหมุนกลางอากาศเหนือเป้าหมาย ลงแล้วแทง 2 ครั้ง', { hits: 5 }),
    B('Ascension Chain', 64, 'bc_chain_ascension', 130, 38, 7.5, 9, 'ย่อตัวฟันงัดขึ้น กระโดดฟันแนวดิ่ง', { hits: 4 }),
    B('Heaven Chain', 101, 'bc_chain_heaven', 150, 56, 8, 28, 'แทง ตีลังกาถอยหลัง แล้วพุ่งกลับฟันลง', { hits: 5 }),
    B('Lightning Chain', 101, 'bc_chain_lightning', 160, 62, 8, 28, 'ฟันพุ่ง หมุนตัว วงไฟฟ้าสีฟ้า เรียกสายฟ้า ฟันปิดท้าย', { hits: 6, prevIdx: 4, prevLv: 9 }),
    B('Thousand Army Chain', 110, 'bc_chain_thousand_army', 175, 72, 8, 9, 'แทงพุ่ง ฟันต่ำ ตีลังกาหลังกลิ้งออก แล้วพุ่งกลับกวาด แสงอาทิตย์ 3 ช่วงตัว', { hits: 6, prevLv: 9 }),
    B('Heavenly Chain', 122, 'bc_chain_heavenly', 185, 90, 8, 9, 'คอมโบ 7 ครั้ง สถานะผิดปกติหลายแบบ', { hits: 7, prevLv: 9 })] },
  { icon: 'shield', kind: 'buff', color: '#c09020', desc: 'Shield: บัฟโล่ 15 วินาที (ต้องใช้โล่) ใช้คูลดาวน์ร่วมกันทั้งแถว', tiers: [
    B('Castle Shield', 5, 'bc_castle_shield', 0, 14, 52, 12, 'เพิ่มพลังป้องกัน 15 วินาที', { col: 0, cdGroup: 'bc_shield', prevIdx: -1 }),
    B('Mountain Shield', 25, 'bc_mountain_shield', 0, 20, 52, 12, 'วงแสงทองแผ่บนพื้น ร่างกายมีเปลวสีส้มทอง เพิ่มอัตราบล็อก 15 วินาที', { col: 1, cdGroup: 'bc_shield' }),
    B('Ironwall Shield', 45, 'bc_ironwall_shield', 0, 28, 52, 12, 'เพิ่มพลังป้องกันมากขึ้น 15 วินาที', { col: 2, cdGroup: 'bc_shield' }),
    B('Iron Castle Shield', 85, 'bc_iron_castle_shield', 0, 44, 52, 12, 'ป้องกันและบล็อก 15 วินาที', { col: 4, cdGroup: 'bc_shield', prevIdx: 2 }),
    B('Sun Guard Shield', 117, 'bc_sun_guard_shield', 0, 60, 52, 9, 'โล่สุริยะ ป้องกันและบล็อกสูงสุด 15 วินาที', { col: 5, cdGroup: 'bc_shield' })] },
  { icon: 'wave', kind: 'attack', color: '#d06020', desc: 'Cut Blade: ปล่อยคลื่นดาบเสี้ยวจันทร์ระยะไกล', tiers: [
    B('Soul Cut Blade', 15, 'bc_cut_soul', 210, 12, 3.5, 9, 'คลื่นเสี้ยวสีส้มพุ่งไปที่เป้าหมาย ระเบิดวงไฟส้ม', { cdGroup: 'bc_a' }),
    B('Evil Cut Blade', 35, 'bc_cut_evil', 254, 20, 3.5, 9, 'ฟันโค้งเหนือหัว โดมแสงฟ้า คลื่นเสี้ยวสีส้ม (ระยะไกลมาก)', { cdGroup: 'bc_b' }),
    B('Devil Cut Blade', 55, 'bc_cut_devil', 181, 30, 3.5, 9, 'คลื่นเสี้ยวเขียวมะนาว 2 ครั้ง ระเบิดทรงกลมสีเขียว', { hits: 2, cdGroup: 'bc_c' }),
    B('Demon Cut Blade', 75, 'bc_cut_demon', 200, 42, 4, 9, 'หมุนตัวชาร์จ แล้วปล่อยคลื่นเข็มสีเขียวเหลือง 2 ครั้ง', { hits: 2, cdGroup: 'bc_a' }),
    B('Ghost Cut Blade', 116, 'bc_cut_ghost', 185, 62, 4, 9, 'คลื่นน้ำแข็งสีฟ้า 3 ครั้ง ระเบิดทรงกลมขาวฟ้า', { hits: 3, cdGroup: 'bc_b' }),
    B('Emperor Blade', 122, 'bc_cut_emperor', 195, 80, 4, 9, 'คลื่นน้ำแข็ง 3 ครั้งพร้อมสายฟ้าสีฟ้า', { hits: 3, cdGroup: 'bc_c' })] },
  { icon: 'blade', kind: 'attack', color: '#3a80c0', desc: 'Blade Force: โจมตีหนัก ทำให้ศัตรูล้ม (Knock-down)', tiers: [
    B('Blood Blade Force', 30, 'bc_force_blood', 260, 18, 4, 18, 'ย่อตัวฟันงัดขึ้นเป็นเสี้ยวแสงฟ้าขาวยักษ์ ศัตรูล้ม 60%', { cdGroup: 'bf_a' }),
    B('Soul Blade Force', 50, 'bc_force_soul', 290, 26, 4.5, 18, 'คุกเข่ารวมพลัง แล้วปล่อยคลื่นพลังฟ้าวิ่งบนพื้น (หน้า 2 ม. 3 ตัว)', { cdGroup: 'bf_b' }),
    B('Demon Blade Force', 70, 'bc_force_demon', 330, 36, 4.5, 18, 'รวมพลัง แทงทวนยาว ลำแสงฟ้าทะลุ แล้วกระโดดฟัน'),
    B('Ocean Blade Force', 90, 'bc_force_ocean', 360, 46, 5, 18, 'โดมพลังน้ำสีฟ้าเขียว แทงลำแสง ศัตรูกระเด็นล้ม (หน้า 3 ม. 3 ตัว)', { cdGroup: 'bf_b' }),
    B('Sky Blade Force', 118, 'bc_force_sky', 240, 70, 5.5, 9, 'พ่นเปลวไฟจากดาบ แล้วฟันโดมแสงฟ้า', { hits: 2, cdGroup: 'bf_a' })] },
  { icon: 'spikes', kind: 'attack', color: '#60a060', desc: 'โจมตีศัตรูที่ล้มลงเท่านั้น (ดาเมจ +50%)', tiers: [
    B('Flower Bloom Blade', 24, 'bc_flower_bloom', 300, 14, 3, 10, 'พุ่งเข้าหา ฟันลงแทงดาบลงพื้น เสาแสงทองบนศัตรูที่ล้ม', { cdGroup: 'bd_a' }),
    B('Flower Bud Blade', 44, 'bc_flower_bud', 330, 22, 3.5, 9, 'กระโดดสูงแล้วพุ่งแทงลง', { cdGroup: 'bd_b' }),
    B('Dragon Sore Blade', 64, 'bc_dragon_sore', 200, 32, 4, 9, 'ฟันเหนือหัวลงพื้น 2 ครั้ง', { hits: 2, cdGroup: 'bd_c' }),
    B('Asura Cut Blade', 84, 'bc_asura_cut', 215, 44, 4, 9, 'ฟันฟาด 2 ครั้ง', { hits: 2, cdGroup: 'bd_a' }),
    B('Heavenly Blade', 118, 'bc_heavenly_blade', 250, 64, 5, 9, 'ฟันโค้งเหนือหัวยักษ์ 2 ครั้ง', { hits: 2, cdGroup: 'bd_b' }),
    B('Mad Dragon Blade', 122, 'bc_mad_dragon', 280, 80, 5, 9, 'กระโดดพุ่งฟัน แทงลงเกิดเสาเพลิงส้ม', { hits: 2, cdGroup: 'bd_c' })] },
  { icon: 'meteor', kind: 'attack', color: '#e05020', desc: 'Sword Dance: ขว้างดาบเพลิง', tiers: [
    B('Snake Sword Dance', 35, 'bc_dance_snake', 220, 16, 4, 18, 'ขว้างดาบเป็นเส้นตรง วงไฟส้มรอบเป้าหมาย (ทะลุ 3 ตัว)', { cdGroup: 'sd_a' }),
    B('Petal Sword Dance', 55, 'bc_dance_petal', 240, 26, 5, 18, 'ขว้างดาบโค้งเป็นดาวหาง ระเบิดวงไฟรอบเป้าหมาย (3 ตัว)', { cdGroup: 'sd_b' }),
    B('Typhoon Sword Dance', 75, 'bc_dance_typhoon', 265, 36, 4, 18, 'ขว้างดาบตรง หมอกเขียวเหลืองรอบเป้าหมาย', { cdGroup: 'sd_a' }),
    B('Chaotic Sword Dance', 111, 'bc_dance_chaotic', 285, 56, 5, 18, 'ดาบเพลิงพุ่งโค้ง หมอกเขียวเหลือง (4 ตัว)', { cdGroup: 'sd_b' }),
    B('Heaven Sword Dance', 122, 'bc_dance_heaven', 260, 80, 6, 9, 'ขว้าง 2 ครั้ง ระเบิดน้ำแข็งฟ้า วงไฟฟ้ารอบตัว', { hits: 2, cdGroup: 'sd_a' })] },
  { icon: 'imbue', kind: 'buff', color: '#5060c0', desc: 'Bicheon Force: บัฟ 120 วินาที เพิ่มพลังโจมตีแลกกับพลังป้องกัน', tiers: [
    B('Glacial Flame Bicheon Force', 20, 'bc_force_glacial', 0, 30, 30, 10, 'เพิ่มพลังโจมตี ลดพลังป้องกันโล่ 120 วินาที', { col: 0, prevIdx: -1 }),
    B('Banshee Bicheon Force', 80, 'bc_force_banshee', 0, 44, 30, 10, 'ต้องการ Glacial Flame Lv 6', { col: 2, prevIdx: 0, prevLv: 6 }),
    B('Summit & Depth Bicheon Force', 100, 'bc_force_summit', 0, 56, 30, 10, 'ต้องการ Banshee Lv 6', { col: 3, prevLv: 6 }),
    B('Celestial Ground Bicheon Force', 120, 'bc_force_celestial', 0, 70, 30, 10, 'ต้องการ Summit & Depth Lv 6', { col: 4, prevLv: 6 }),
    B('Light Bearers Bicheon Force', 120, 'bc_force_light', 0, 80, 30, 10, 'ต้องการ Celestial Ground Lv 6', { col: 5, prevLv: 6 })] },
]);

// Heuksal (spear / glaive) - the 8 skill lines exactly as in the clip's skill window (rows top to bottom,
// tiers left to right). Levels shown in the clip (mostly 9, top tiers capped by mastery 123/124) give the
// required mastery per tier; damage folds the tooltip's base damage into the % (assumed attack 2000).
const H = (name, req, fx, dmg, mp, cd, max, desc, extra = {}) => ({ name, req, fx, dmg, mp, cd, max, desc, step: 1, ...extra });
registerRows('heuksal', [
  { icon: 'thrust', kind: 'attack', color: '#3f78c8', desc: 'Spear Thrust: แทงทะลุ 2 เป้าหมาย พร้อมลำเพลิง', tiers: [
    H('Wolf Bite Spear', 1, 'hk_wolf_bite', 163, 10, 3, 9, 'จับหอกสองมือแทงทะลวงศัตรูข้างหน้า กรวยเพลิงส้มเหลืองพุ่งทะลุเป้าหมาย (ทะลุ 2 ตัว ลดดาเมจ 35%)'),
    H('Waning Moon Spear', 22, 'hk_waning_moon', 189, 16, 3, 9, 'แทงมือเดียวลึก ปลายกรวยเพลิงเป็นหนามทอง'),
    H('Yuhon Spear', 44, 'hk_yuhon', 240, 26, 3.5, 9, 'หมุนตัวรอบหนึ่งแล้วแทง ลำเพลิงแนวนอนยาว 4-5 ช่วงตัว'),
    H('Lightning Bird Spear', 66, 'hk_lightning_bird', 181, 40, 4, 9, 'ย่อตัวแทงรัว 2 ครั้ง ลำแสงเหลืองหัวลูกศร', { hits: 2 }),
    H('Celestial Cloud Spear', 88, 'hk_celestial_cloud', 182, 60, 4.5, 9, 'แทงรัว 3 ครั้ง ลำแสงทองกว้างที่สุด จอสว่างวาบ', { hits: 3 }),
    H('Asura Spear', 121, 'hk_asura', 186, 80, 5, 9, 'ควงหอก หมุนตัว แทงค้าง 3 จังหวะ ลำสายฟ้าม่วงก่อนเปลี่ยนเป็นทอง', { hits: 3 })] },
  { icon: 'spin', kind: 'buff', color: '#b02828', desc: 'Storm: บัฟป้องกันเวทย์', tiers: [
    H('Bloody Fan Storm', 5, 'hk_storm1', 0, 12, 20, 12, 'วงแสงฟ้าขาวที่พื้น เพิ่มพลังป้องกันเวทย์ 15 วินาที'),
    H('Bloody Fan Storm II', 40, 'hk_storm2', 0, 18, 22, 12, 'เพิ่มพลังป้องกัน 20 วินาที'),
    H('Bloody Fan Storm III', 75, 'hk_storm3', 0, 26, 24, 12, 'เพิ่มพลังป้องกัน 25 วินาที'),
    H('Bloody Fan Storm IV', 116, 'hk_storm4', 0, 34, 26, 12, 'เพิ่มพลังป้องกัน 30 วินาที'),
    H('Bloody Fan Storm V', 116, 'hk_storm5', 0, 40, 28, 12, 'เพิ่มพลังป้องกัน 35 วินาที'),
    H('Bloody Fan Storm VI', 118, 'hk_storm6', 0, 48, 30, 12, 'เพิ่มพลังป้องกัน 40 วินาที')] },
  { icon: 'slash', kind: 'attack', color: '#3a9a8a', desc: 'Sweep: กวาดด้านหน้า โดนหลายตัว', tiers: [
    H('Dancing Demon Spear', 9, 'hk_dancing_demon', 204, 10, 2, 9, 'กวาดหอกแนวนอน คลื่นดาบเสี้ยวจันทร์สีครีมทองพุ่งไปที่เป้าหมาย (หน้า 3 ตัว)'),
    H('Jade Breaking Spear', 30, 'hk_jade_breaking', 136, 18, 3, 9, 'กวาด 2 ครั้ง แสงทองวิ่งบนพื้นถึงเป้าหมาย', { hits: 2 }),
    H('Spirit Crash Spear', 52, 'hk_spirit_crash', 224, 28, 3.5, 9, 'หมุนกวาดวงรีสีขาวขนาดใหญ่รอบตัว ตามด้วยฟาดเหนือหัว'),
    H('Windless Spear', 74, 'hk_windless', 197, 42, 4.5, 9, 'ควงหอก หมุนตัว กวาดเสี้ยวยักษ์ 2 ครั้ง มีโอกาสทำให้ทื่อ (Dull)', { hits: 2 }),
    H('Death Bringer Spear', 117, 'hk_death_bringer', 220, 62, 5, 9, 'หมุนกวาดวงรี แล้วสับแนวตั้งเหนือหัว (Dull 12%)', { hits: 2 }),
    H('Pitch Black Spear', 121, 'hk_pitch_black', 185, 82, 5.5, 9, 'กวาดใหญ่ 3 ครั้ง รัศมี 2 ม. โดนได้ 4 ตัว', { hits: 3 })] },
  { icon: 'thrust', kind: 'attack', color: '#7a50b8', desc: 'Soul Spear: โจมตีเดี่ยว มีโอกาสทำให้มึน', tiers: [
    H('Soul Spear - Move', 12, 'hk_soul_move', 235, 12, 3, 9, 'ย่อตัวเหวี่ยงหอกไปข้างหน้า แสงระเบิดขาว (มึน 20%)'),
    H('Soul Spear - Truth', 34, 'hk_soul_truth', 213, 20, 3.5, 9, 'กระโดดฟาดลงจากเหนือหัว โค้งแสงรูปโดมเหนือเป้าหมาย (มึน 25%)'),
    H('Soul Spear - Soul', 56, 'hk_soul_soul', 202, 30, 4, 9, 'เหวี่ยงแนวนอน แล้วฟาดโดมยักษ์ลงมา (มึน 30%)', { hits: 2 }),
    H('Soul Spear - Emperor', 78, 'hk_soul_emperor', 228, 44, 4.5, 9, 'กระโดดฟาด แล้วงัดขึ้น (มึน 15%)', { hits: 2 }),
    H('Soul Spear - Destruction', 117, 'hk_soul_destruction', 209, 64, 5.5, 9, 'กวาด 2 ครั้ง ริบบิ้นพลังสีฟ้า กระโดดสูงฟาดโดมยักษ์ (มึน 10%)', { hits: 3 }),
    H('Soul Spear - Emptiness', 123, 'hk_soul_emptiness', 238, 84, 6, 8, 'ท่าเดียวกับ Destruction แต่รุนแรงกว่า', { hits: 3 })] },
  { icon: 'spin', kind: 'aoe_self', color: '#c08a20', desc: 'Ghost Spear: หมุนตัวโจมตีรอบตัว กระเด็น', tiers: [
    H('Ghost Spear - Petal', 15, 'hk_ghost_petal', 226, 14, 4, 9, 'หมุนตัว 360° วงแหวนส้มที่พื้น (รอบตัว 5 ตัว)'),
    H('Ghost Spear - Prince', 38, 'hk_ghost_prince', 265, 22, 5, 9, 'จานแสงฟ้า วงรีขาว วงม่วงน้ำเงินขยาย (กระเด็น 35%)'),
    H('Ghost Spear - Mars', 60, 'hk_ghost_mars', 311, 32, 5.5, 9, 'วงแหวนเพลิงแดงส้มหนา รัศมี 4 ม.'),
    H('Ghost Spear - Storm Cloud', 82, 'hk_ghost_storm_cloud', 341, 46, 6, 9, 'น้ำวนเกลียวสีฟ้าขาว 2.2 ช่วงตัว'),
    H('Ghost Spear - Emperor', 119, 'hk_ghost_emperor', 369, 66, 7, 9, 'ระเบิดเพลิงทองมหึมาเต็มพื้น จอเป็นสีส้ม (กระเด็น 40%)'),
    H('Ghost Spear - Sea God', 123, 'hk_ghost_sea_god', 385, 86, 7.5, 8, 'น้ำวนน้ำแข็งขาวฟ้ามหึมา จอเป็นสีฟ้า'),
    H('Heuksal storm', 125, 'hk_heuksal_storm', 436, 100, 9, 6, 'พายุฮึกซัล (ต้องการ Heuksal Lv 125) มึน / Division / Decay', { ult: true })] },
  { icon: 'multi', kind: 'attack', color: '#c04a4a', desc: 'Chain Spear: คอมโบต่อเนื่อง', tiers: [
    H('Chain Spear - Tiger', 26, 'hk_chain_tiger', 99, 16, 4, 9, 'ฟันเฉียงเหนือหัว ฟันกลับ แทง (3 ครั้ง)', { hits: 3 }),
    H('Chain Spear - Nachal', 47, 'hk_chain_nachal', 76, 26, 5, 9, 'คอมโบ 4 ครั้ง (ต้องการ Tiger Lv 9)', { hits: 4 }),
    H('Chain Spear - Shura', 47, 'hk_chain_shura', 97, 30, 5.5, 9, 'คอมโบ 5 ครั้ง ปิดท้ายกวาดด้านหน้า (ต้องการ Tiger Lv 9)', { hits: 5, prevIdx: 0 }),
    H('Chain Spear - Pluto', 65, 'hk_chain_pluto', 138, 40, 5.5, 9, 'คอมโบหนัก 4 ครั้ง (ต้องการ Nachal Lv 9)', { hits: 4, prevIdx: 1 }),
    H('Chain Spear - Dragon', 102, 'hk_chain_dragon', 171, 60, 7, 28, 'หมุนวงรีรอบตัว 6 ครั้ง รัศมี 3 ม. โดนได้ 5 ตัว', { hits: 6, prevIdx: 3 }),
    H('Chain Spear - Phoenix', 109, 'hk_chain_phoenix', 185, 76, 7, 21, 'คอมโบหมุนวนริบบิ้น 6 ครั้ง', { hits: 6, prevLv: 9 }),
    H('Chain Spear - Heaven', 121, 'hk_chain_heaven', 191, 92, 8, 9, 'คอมโบหมุนวงรียักษ์ 7 ครั้ง', { hits: 7, prevLv: 9 })] },
  { icon: 'arrow', kind: 'attack', color: '#2a8ac0', desc: 'Flying Dragon: ขว้างหอก ทะลุ 3 ตัว', tiers: [
    H('Flying Dragon - Flow', 20, 'hk_fd_flow', 210, 14, 3, 9, 'ขว้างหอกเป็นแสงทอง วงแสงส้มทองวาบที่เป้าหมาย หอกกลับเข้ามือ (ทะลุ 3 ตัว)'),
    H('Flying Dragon - Fly', 42, 'hk_fd_fly', 254, 22, 3, 9, 'ขว้างแรงขึ้น เส้นความเร็วสีทอง วงทองรอบตัว'),
    H('Flying Dragon - Bless', 64, 'hk_fd_bless', 277, 32, 3.5, 9, 'หอกพลังงานสีฟ้าขาว ระเบิดทรงกลมขาวฟ้าที่เป้าหมาย'),
    H('Flying Dragon - Flash', 114, 'hk_fd_flash', 274, 62, 5, 16, 'ขว้าง 2 ครั้ง วงแสงแนวตั้งที่มือ ระเบิดวงม่วงฟ้า', { hits: 2 }),
    H('Flying Dragon - Sky', 123, 'hk_fd_sky', 286, 84, 5.5, 7, 'ขว้าง 2 ครั้ง วงแหวนแนวตั้งคู่ ระเบิดโดมแสงขาว', { hits: 2 })] },
  { icon: 'passive', kind: 'passive', color: '#b04040', desc: 'Passive', tiers: [
    H('Spear Mastery', 1, 'hk_passive', 0, 0, 0, 12, 'สกิลติดตัว: เพิ่มพลังโจมตี 1% ต่อเลเวล', { buff: { atkPct: 1 } })] },
]);

// Pacheon (bow) - the clip's window (Pacheon Mastery Lv 120). Cooldown groups as observed: row 1 {1,4,7} {2,5}
// {3,6}; rows 2 and 4 {1,4} {2,5} {3,6}; row 6 {1,3,5} {2,4}; Strong Bow one group; Mind Bow {1,3} {2,4}.
const Pc = (name, req, fx, dmg, mp, cd, max, desc, extra = {}) => ({ name, req, fx, dmg, mp, cd, max, desc, step: 1, ...extra });
registerRows('pacheon', [
  { icon: 'arrow', kind: 'attack', color: '#3a70d0', desc: 'Anti Devil Bow: ชาร์จแสงสีฟ้านาน แล้วยิงศรขาวพร้อมลำแสงฟ้า', tiers: [
    Pc('Anti Devil Bow - Missile', 1, 'pc_adb_missile', 152, 10, 4, 9, 'ชาร์จแสงฟ้า 1.5 วินาที ยิงศรขาวลำแสงบาง', { cdGroup: 'adb_a' }),
    Pc('Anti Devil Bow - Wave', 20, 'pc_adb_wave', 207, 16, 4, 9, 'พัดแสงฟ้า ปีกแสงสีน้ำเงินม่วงด้านหลัง แสงระเบิดขาวที่เป้า', { cdGroup: 'adb_b' }),
    Pc('Anti Devil Bow - Steel', 40, 'pc_adb_steel', 265, 26, 4, 9, 'พัดแสงฟ้าขาวกว้าง 2 ช่วงตัว ลำแสงหนา', { cdGroup: 'adb_c' }),
    Pc('Anti Devil Bow - Strike', 60, 'pc_adb_strike', 280, 36, 4, 9, 'ชาร์จแสงฟ้าม่วงใหญ่กว่า ลำแสงยาว (ชื่อช่องนี้ไม่ปรากฏในคลิป)', { cdGroup: 'adb_a' }),
    Pc('Anti Devil Bow - Annihilate', 80, 'pc_adb_annihilate', 304, 48, 4, 9, 'เหมือน Steel แต่แรงกว่า ประกายแดงที่ปลายคันธนู', { cdGroup: 'adb_b' }),
    Pc('Anti Devil Bow - Demolition', 116, 'pc_adb_demolition', 324, 64, 4, 9, 'เสาแสงฟ้าสูง 3 ช่วงตัว หอกแสงแนวนอน แล้วลำแสงหนา', { cdGroup: 'adb_c' }),
    Pc('Anti Devil Bow - Moon light', 120, 'pc_adb_moonlight', 332, 72, 4, 9, 'เสาแสงฟ้า แสงออโรร่า กรวยแสงฟ้าขาวกว้าง 5 ช่วงตัว', { cdGroup: 'adb_a' })] },
  { icon: 'rain', kind: 'attack', color: '#c03060', desc: 'Arrow Combo: ยิงรัว', tiers: [
    Pc('2 Arrow Combo', 5, 'pc_combo2', 53, 8, 4, 9, 'ยิงศรสีชมพูแดง 2 ดอก', { hits: 2, cdGroup: 'ac_a' }),
    Pc('3 Arrow Combo', 25, 'pc_combo3', 57, 14, 4, 9, 'ยิงรัว 3 ดอก', { hits: 3, cdGroup: 'ac_b' }),
    Pc('4 Arrow Combo', 45, 'pc_combo4', 66, 22, 4, 9, 'ยิงลำแสงเลเซอร์สีชมพูแดง 4 ดอก', { hits: 4, cdGroup: 'ac_c' }),
    Pc('5 Arrow Combo', 65, 'pc_combo5', 75, 32, 4, 9, 'สายศรต่อเนื่องเป็นลำแสงชมพูแดง ศัตรูกระเด็น', { hits: 5, cdGroup: 'ac_a' }),
    Pc('6 Arrow Combo', 100, 'pc_combo6', 103, 48, 4, 9, 'สายศรต่อเนื่อง 6 ดอก', { hits: 6, cdGroup: 'ac_b' }),
    Pc('7 Arrow Combo', 118, 'pc_combo7', 125, 62, 4, 9, 'ลำแสงศรยาวต่อเนื่อง 7 ดอก', { hits: 7, cdGroup: 'ac_c' })] },
  { icon: 'star', kind: 'buff', color: '#808890', desc: 'Hawk: เรียกเหยี่ยวบินวนเหนือหัว (ครั้งละตัว)', tiers: [
    Pc('White Hawk Summon', 10, 'pc_hawk_white', 0, 6, 1, 12, 'เหยี่ยวขาว: เพิ่มความแม่นยำ (คริ)', { prevIdx: -1 }),
    Pc('Black Hawk Summon', 50, 'pc_hawk_black', 50, 18, 1, 12, 'เหยี่ยวดำ: บินโจมตีเป้าหมายเมื่อต่อสู้', { prevIdx: -1 }),
    Pc('Blue Hawk Summon', 94, 'pc_hawk_blue', 90, 28, 1, 12, 'เหยี่ยวฟ้า (ต้องการ White Hawk Lv 12)', { prevIdx: 0, prevLv: 12 }),
    Pc('Lightning Hawk Summon', 97, 'pc_hawk_lightning', 120, 36, 1, 12, 'เหยี่ยวสายฟ้าสีน้ำเงินเข้ม ประกายไฟฟ้าม่วง', { prevIdx: 1 }),
    Pc('Ice Hawk', 104, 'pc_hawk_ice', 140, 44, 1, 12, 'เหยี่ยวน้ำแข็ง ทำให้ช้าลง', { prevIdx: 2 }),
    Pc('Fire Hawk', 120, 'pc_hawk_fire', 160, 56, 1, 9, 'เหยี่ยวเพลิงสีส้มแดง เพิ่มความแม่นยำและโจมตีด้วยไฟ', { prevIdx: 3 })] },
  { icon: 'wave', kind: 'attack', color: '#3aa0a0', desc: 'Autumn Wind: ศรทะลุ 3 ตัว หางเกลียวลม', tiers: [
    Pc('Autumn Wind - Flame', 15, 'pc_aw_flame', 254, 12, 5, 9, 'ศรเร็ว ทะลุ 3 ตัว', { cdGroup: 'aw_a' }),
    Pc('Autumn Wind - Snake', 35, 'pc_aw_snake', 210, 20, 5, 9, 'ศรเร็ว ทะลุ 3 ตัว', { cdGroup: 'aw_b' }),
    Pc('Autumn Wind - Blood', 55, 'pc_aw_blood', 270, 30, 5, 9, 'ศรเร็ว ทะลุ 3 ตัว', { cdGroup: 'aw_c' }),
    Pc('Autumn Wind - Red', 75, 'pc_aw_red', 290, 40, 5, 9, 'หัวศรเปลวไฟเหลืองส้ม หางเกลียวลมขาวฟ้า', { cdGroup: 'aw_a' }),
    Pc('Autumn Wind - Devil', 114, 'pc_aw_devil', 318, 56, 5, 9, 'ดาวหางเหลืองขาว แล้วกลายเป็นเกลียวลมยาว', { cdGroup: 'aw_b' }),
    Pc('Autumn Wind - Dragon', 120, 'pc_aw_dragon', 332, 66, 5, 9, 'เกลียวลมหนาที่สุด ระเบิดหมอกขาวฟ้าที่เป้า', { cdGroup: 'aw_c' })] },
  { icon: 'imbue', kind: 'buff', color: '#6a50b0', desc: 'Soul Arrow: เพิ่มระยะยิง (ครั้งละอย่าง)', tiers: [
    Pc('Demon Soul Arrow', 20, 'pc_soul_demon', 0, 8, 4, 5, 'ระยะยิง +2.8 ม.', { prevIdx: -1 }),
    Pc('Bloody Soul Arrow', 40, 'pc_soul_bloody', 0, 14, 4, 5, 'ระยะยิง +3.8 ม.'),
    Pc('Dragon Soul Arrow', 60, 'pc_soul_dragon', 0, 22, 4.5, 5, 'ระยะยิง +4.8 ม.'),
    Pc('Phoenix Soul Arrow', 80, 'pc_soul_phoenix', 0, 32, 4.5, 5, 'ระยะยิง +5.9 ม.'),
    Pc('Ice Hawk Soul Arrow', 118, 'pc_soul_icehawk', 0, 44, 5, 5, 'ระยะยิง +7.0 ม. ประกายน้ำแข็งลอยขึ้น')] },
  { icon: 'burst', kind: 'attack', color: '#d06020', desc: 'ศรระเบิด: ระเบิดวงกว้างด้านหน้า 4 ตัว', tiers: [
    Pc('Berserker Arrow', 25, 'pc_berserker_arrow', 206, 14, 8, 9, 'ศรเพลิง วงระเบิดส้มที่พื้น (รัศมี 4 ม.)', { cdGroup: 'bl_a' }),
    Pc('Demon Arrow', 45, 'pc_demon_arrow', 264, 22, 8, 9, 'เลเซอร์แดง ระเบิดส้ม', { cdGroup: 'bl_b' }),
    Pc('Devil Arrow', 65, 'pc_devil_arrow', 379, 34, 8, 9, 'ลูกไฟหางควันขาว ระเบิดขาวส้มพ่นออกด้านข้าง', { cdGroup: 'bl_a' }),
    Pc('Celestial Beast Arrow', 85, 'pc_celestial_arrow', 405, 48, 8, 9, 'ศรเพลิงทอง ระเบิดเสาแสง (รัศมี 5 ม.)', { cdGroup: 'bl_b' }),
    Pc('Pitch Black Arrow', 118, 'pc_pitch_black_arrow', 432, 66, 8, 9, 'จานมืดสีม่วงที่พื้น แสงระเบิด ลูกไฟส้ม ควันม่วงพวยพุ่ง (รัศมี 6 ม.)', { cdGroup: 'bl_a' })] },
  { icon: 'sun', kind: 'attack', color: '#c0a020', desc: 'Strong Bow: แสงรัศมีขาวทอง แล้วศรสายฟ้าขาว (คูลดาวน์ร่วมทั้งแถว)', tiers: [
    Pc('Strong Bow - Spirit', 30, 'pc_sb_spirit', 358, 14, 8, 9, 'รังสีแสงขาวเหลืองแผ่รอบตัว แล้วยิงศรสายฟ้าขาว', { col: 0, cdGroup: 'sb' }),
    Pc('Strong Bow - Vision', 50, 'pc_sb_vision', 368, 24, 8, 9, 'รังสีแสงขาวเหลือง ศรสายฟ้าขาว', { col: 1, cdGroup: 'sb' }),
    Pc('Strong Bow - Will', 70, 'pc_sb_will', 418, 40, 8, 9, 'วงเสี้ยวสีเหลืองอ่อนหมุนรอบตัว', { col: 2, cdGroup: 'sb' }),
    Pc('Strong Bow - Destruction', 120, 'pc_sb_destruction', 429, 72, 8, 9, 'พายุเสี้ยวสีเหลือง ลมแรงพุ่งถึงเป้า ทำให้มึน', { col: 4, cdGroup: 'sb', prevIdx: 2 }),
    Pc('Bow Storm', 125, 'pc_bow_storm', 471, 80, 8, 6, 'พายุธนู (ต้องการ Pacheon Lv 125)', { col: 5, cdGroup: 'sb', ult: true })] },
  { icon: 'chain', kind: 'attack', color: '#d04080', desc: 'Mind Bow: ศรเลเซอร์ชมพูกระโดดหลายเป้า', tiers: [
    Pc('Mind Bow - Flower', 90, 'pc_mb_flower', 195, 14, 8, 6, 'โดน 2 เป้าหมาย', { hits: 2, cdGroup: 'mb_a' }),
    Pc('Mind Bow - Butterfly', 100, 'pc_mb_butterfly', 206, 26, 8, 6, 'โดน 3 เป้าหมาย', { hits: 3, cdGroup: 'mb_b' }),
    Pc('Mind Bow - Swift', 108, 'pc_mb_swift', 228, 44, 8, 6, 'โดน 4 เป้าหมาย (เส้นเลเซอร์รูปตัว V)', { hits: 4, cdGroup: 'mb_a' }),
    Pc('Mind Bow - Lighting', 115, 'pc_mb_lighting', 272, 70, 8, 6, 'โดน 5 เป้าหมาย', { hits: 5, cdGroup: 'mb_b' })] },
]);

// Warrior (EU) - Melee > Warrior window from the clip (10 rows x 8 columns). Cells whose names never showed in the
// clip are left empty; columns keep their positions. One-handed rows need a sword, two-handed/axe rows a
// two-handed weapon, buffs work with either.
const R = (name, req, fx, dmg, mp, cd, max, col, desc, extra = {}) => ({ name, req, fx, dmg, mp, cd, max, col, desc, step: 1, ...extra });
const ANYW = ['sword', 'greatsword'], ONEH = ['sword'], TWOH = ['greatsword'];
registerRows('warrior', [
  { icon: 'buff', kind: 'buff', color: '#b08030', weapon: ANYW, desc: 'บัฟตัวเองและเสียงตะโกน', tiers: [
    R('Vital Increase', 20, 'wr_vital_increase', 0, 40, 60, 17, 1, '900 วินาที: HP สูงสุดเพิ่ม · รับดาเมจลดลง (กายภาพและเวทย์) · ดึงความสนใจ +300%', { prevIdx: -1 }),
    R('Descry', 30, 'wr_descry', 0, 10, 20, 5, 2, 'ตรวจจับศัตรูที่ล่องหนในรัศมี 10 ม. (120 วินาที)', { prevIdx: -1, kind: 'util' }),
    R('Iron Skin', 45, 'wr_iron_skin', 0, 30, 50, 14, 4, 'โล่ทองเหนือหัว: เพิ่มพลังป้องกันกายภาพ 45 วินาที', { prevIdx: -1 }),
    R('Howling Shout', 55, 'wr_howling_shout', 0, 36, 15, 11, 5, 'ตะโกนคำราม วงคลื่นทองแผ่บนพื้น ดึงศัตรูรอบตัว 30 ม. มาที่ตัวเอง (ใช้ HP 10%)', { prevIdx: -1, kind: 'util', hpCost: 0.1 }),
    R('Mana Skin', 65, 'wr_mana_skin', 0, 30, 50, 11, 6, 'โล่สีฟ้าเหนือหัว: เพิ่มพลังป้องกันเวทย์ 45 วินาที', { prevIdx: -1 })] },
  { icon: 'shield', kind: 'buff', color: '#8a7040', weapon: ANYW, desc: 'Link buffs (เกมนี้ไม่มีปาร์ตี้ จึงใช้กับตัวเอง)', tiers: [
    R('Pain Quota', 10, 'wr_pain_quota', 0, 14, 30, 5, 0, 'แบ่งรับดาเมจ (ใช้กับตัวเอง): ลดดาเมจที่ได้รับ 300 วินาที', { prevIdx: -1 }),
    R('Physical Fence', 20, 'wr_physical_fence', 0, 18, 30, 15, 1, 'ดูดซับดาเมจกายภาพ 1800 วินาที', { prevIdx: -1 }),
    R('Magical Fence', 30, 'wr_magical_fence', 0, 20, 30, 14, 2, 'ป้องกันดาเมจเวทย์ 1800 วินาที', { prevIdx: -1 }),
    R('Protect', 40, 'wr_protect', 0, 20, 30, 14, 3, 'เพิ่มพลังป้องกัน 1800 วินาที', { prevIdx: -1 }),
    R('Physical Screen', 60, 'wr_physical_screen', 0, 10, 40, 5, 4, 'ม่านป้องกันกายภาพ 600 วินาที', { prevIdx: -1 }),
    R('Morale Screen', 70, 'wr_morale_screen', 0, 12, 40, 5, 5, 'ม่านขวัญกำลังใจ: เพิ่มพลังโจมตี 600 วินาที', { prevIdx: -1 }),
    R('Ultimate Screen', 90, 'wr_ultimate_screen', 0, 30, 60, 5, 6, 'ม่านป้องกันสูงสุด 600 วินาที', { prevIdx: -1 })] },
  { icon: 'passive', kind: 'passive', color: '#6a7a8a', weapon: ONEH, desc: 'One-handed passives', tiers: [
    R('One-Handed Arms', 1, 'wr_passive', 0, 0, 0, 30, 0, 'สกิลติดตัว: เพิ่มพลังโจมตีสกิลดาบมือเดียว', { prevIdx: -1, buff: { atkPct: 1 } }),
    R('Power Shield', 15, 'wr_passive', 0, 0, 0, 20, 1, 'สกิลติดตัว: เพิ่มพลังป้องกันเมื่อถือโล่', { prevIdx: -1, buff: { defPct: 1 } })] },
  { icon: 'shield', kind: 'attack', color: '#3a9a40', weapon: ONEH, desc: 'ดาบมือเดียว + โล่ (แสงเสี้ยวสีเขียว)', tiers: [
    R('Shield Trash', 5, 'wr_shield_trash', 154, 10, 3.5, 12, 1, 'กระแทกโล่ไปข้างหน้า ศัตรูกระเด็น 80% · ทื่อ (Dull) 40% · หน้า 2 ม. 3 ตัว', { prevIdx: -1 }),
    R('Double Stab', 15, 'wr_double_stab', 115, 12, 3.5, 12, 2, 'แทงพุ่ง 2 ครั้ง เส้นแสงเขียวเหลืองตามคมดาบ', { hits: 2, prevIdx: 0 }),
    R('Berserker', 30, 'wr_berserker', 154, 18, 4, 9, 3, 'หมุนกวาดวงเขียวรอบตัว แล้วฟันเฉียงขึ้น (ใช้ HP 10%)', { hits: 2, hpCost: 0.1, prevIdx: 1 }),
    R('Shield Crush', 50, 'wr_shield_crush', 204, 40, 4, 15, 4, 'กระแทกโล่ 2 ครั้ง ระเบิดแสงขาวฟ้ายักษ์ ศัตรูกระเด็นไกล', { hits: 2, prevIdx: 0 }),
    R('Cunning Stab', 70, 'wr_cunning_stab', 212, 44, 4, 13, 5, 'แทงรัว 4 ครั้ง', { hits: 4, prevIdx: 1 }),
    R('Daring Berserker', 90, 'wr_daring_berserker', 226, 52, 4, 11, 6, 'ย่อตัวหมุนฟัน 360° 4 ครั้ง วงเขียวรอบตัว (ใช้ HP 10%)', { hits: 4, hpCost: 0.1, prevIdx: 2 })] },
  { icon: 'passive', kind: 'passive', color: '#6a7a8a', weapon: TWOH, desc: 'Two-handed passives', tiers: [
    R('Two-Handed Arms', 1, 'wr_passive', 0, 0, 0, 30, 0, 'สกิลติดตัว: เพิ่มพลังโจมตีสกิลดาบสองมือ', { prevIdx: -1, buff: { atkPct: 1 } })] },
  { icon: 'blade', kind: 'attack', color: '#a06030', weapon: TWOH, desc: 'ดาบสองมือ', tiers: [
    R('Maddening', 30, 'wr_maddening', 160, 20, 4, 10, 2, 'ฟันกวาดแล้วสับลง', { hits: 2, prevIdx: -1 }),
    R('Charge Swing', 50, 'wr_charge_swing', 210, 26, 4, 10, 3, 'ชาร์จฟันแนวตั้งรุนแรง ศัตรูกระเด็น', { prevIdx: -1 }),
    R('Triple Swing', 70, 'wr_triple_swing', 142, 34, 4.5, 10, 5, 'ฟัน 3 จังหวะ (ต้องการ Charge Swing)', { hits: 3, prevIdx: 1 }),
    R('Dare Devil', 80, 'wr_dare_devil', 344, 46, 6, 10, 6, 'กระโดดฟันทะลุ 3 ตัว (ต้องการ Maddening) ใช้ HP 10%', { hits: 2, hpCost: 0.1, prevIdx: 0 })] },
  { icon: 'passive', kind: 'passive', color: '#6a7a8a', weapon: TWOH, desc: 'Dual-axe passives', tiers: [
    R('Dual Arms', 1, 'wr_passive', 0, 0, 0, 30, 0, 'สกิลติดตัว: เพิ่มพลังโจมตีสกิลขวานคู่', { prevIdx: -1, buff: { atkPct: 1 } })] },
  { icon: 'quake', kind: 'attack', color: '#3a70c0', weapon: TWOH, desc: 'ขวานคู่ (วงหมุนฟ้าขาว คลื่นเสี้ยวสีขาว)', tiers: [
    R('Down Cross', 1, 'wr_down_cross', 318, 10, 1, 30, 0, 'กระโดดฟาดขวานลงพื้น คลื่นเสี้ยวแนวตั้งสีขาวฟ้าระเบิดที่เป้าหมาย', { prevIdx: -1 }),
    R('Double Twist', 15, 'wr_double_twist', 123, 12, 6, 12, 1, 'ฟันเฉียงไขว้ 2 ครั้ง เลือดไหล 25% · มึน 20%', { hits: 2, cdGroup: 'twist' }),
    R('Axis Quiver', 30, 'wr_axis_quiver', 150, 26, 20, 6, 2, 'ทุบขวานลงพื้น ลำแสงส้มพุ่งเป็นพัด พื้นเรืองแสงส้ม มึน 50% 5 วินาที (หน้า 5 ม. 8 ตัว)'),
    R('Dual Counter', 45, 'wr_dual_counter', 99, 14, 3.5, 12, 3, 'ฟัน 3 จังหวะ ปิดด้วยหมุนตัวฟันขึ้น', { hits: 3 }),
    R('Crisis Rush', 60, 'wr_crisis_rush', 122, 18, 4, 9, 4, 'ตัวเรืองแสงฟ้า หมุนฟัน 2 รอบ แล้วฟันแนวตั้ง (ใช้ HP 10%)', { hits: 4, hpCost: 0.1, cdGroup: 'rush' }),
    R('Sudden Twist', 75, 'wr_sudden_twist', 202, 44, 6, 15, 5, 'หมุนต่ำ ฟันขึ้น หมุนวงล้อแนวตั้ง เลือดไหล 20%', { hits: 3, cdGroup: 'twist', prevIdx: 1 }),
    R('Deadly Counter', 90, 'wr_deadly_counter', 192, 46, 4, 13, 6, 'หมุนต่ำ หมุนเอว หมุนต่ำ ฟันเฉียงปิดท้าย', { hits: 4, prevIdx: 3 }),
    R('Crutial Rush', 100, 'wr_crutial_rush', 190, 42, 4, 11, 7, 'ตัวเรืองแสงม่วงฟ้า คอมโบ 5 ครั้งปิดด้วยแทง (ใช้ HP 10%)', { hits: 5, hpCost: 0.1, cdGroup: 'rush', prevIdx: 4 })] },
  { icon: 'star', kind: 'attack', color: '#c04020', weapon: ANYW, desc: 'สกิลขั้น Mastery 125', tiers: [
    R('Beast Shout', 125, 'wr_beast_shout', 0, 40, 15, 1, 0, 'คำรามวงคลื่นแดงเข้ม ดึงศัตรูรอบตัว 30 ม. (ใช้ HP 10%)', { prevIdx: -1, kind: 'util', hpCost: 0.1 }),
    R('Vital Increase', 125, 'wr_vital_increase2', 0, 40, 60, 1, 1, 'Vital Increase ขั้นสูง (ไม่ซ้อนกับขั้นแรก)', { prevIdx: -1, kind: 'buff' }),
    R('Destructive Dare Devil', 125, 'wr_destructive_dare_devil', 450, 100, 8, 1, 3, 'ดาบสองมือ 3 จังหวะ ทะลุ 3 ตัว (ใช้ HP 9%)', { prevIdx: -1, hits: 3, weapon: TWOH, hpCost: 0.09 }),
    R('Edge Shield', 125, 'wr_edge_shield', 212, 70, 6, 1, 4, 'ต้องใช้โล่: กระแทกโล่ 3 จังหวะ ระเบิดแสงทอง', { prevIdx: -1, hits: 3, weapon: ONEH })] },
]);

// Wizard (EU) - skill lines from the reference clip. Columns are the clip's tiers:
// Lv 1-16, Lv 20-30, Lv 60-76, Lv 80+, Lv 124+ (mastery level). Max levels follow the icon numbers seen in the clip.
const TIER = { 1: { col: 0, span: 15 }, 20: { col: 1, span: 10 }, 60: { col: 2, span: 16 }, 80: { col: 3, span: 20 }, 124: { col: 4, span: 6 } };
const Z = (name, req, fx, icon, max, dmg, mp, cd, desc, extra = {}) => ({ name, req, fx, icon, max, dmg, mp, cd, desc, col: TIER[req].col, span: TIER[req].span, tierNo: TIER[req].col + 1, ...extra });
const EARTH = { element: 'Earth', color: '#a07830' }, COLD = { element: 'Cold', color: '#3a78c0' }, FIRE = { element: 'Fire', color: '#c04a1a' }, LIGHT = { element: 'Lightning', color: '#6a4ad0' }, LIFE = { element: 'Life', color: '#b02030' };

registerRows('wizard', [
  // ---- Earth
  { ...EARTH, icon: 'dust', kind: 'aoe_self', desc: 'ระเบิดฝุ่นดินรอบตัว', tiers: [
    Z('Ground Charge', 1, 'wz_ground_charge', 'dust', 13, 200, 30, 4, 'ระเบิดพลังดินรอบตัว คลื่นฝุ่นสีครีมแผ่ออก โจมตีศัตรูที่อยู่ติดตัวทั้งหมด'),
    Z('Ground Rave', 60, 'wz_ground_rave', 'dust', 17, 380, 70, 7, 'ระเบิดดินรอบตัวสองจังหวะ จานแสงสีทอง วงฝุ่นใหญ่ และสะเก็ดทองพุ่งขึ้น'),
    Z('Land Of The Contract', 124, 'wz_land_contract', 'quake', 5, 1000, 150, 10, 'ผืนดินแห่งพันธสัญญา จานทรายแผ่กว้าง 4 ช่วงตัว ใจกลางแตกร้าว', { kind: 'attack' })] },
  { ...EARTH, icon: 'spikes', kind: 'attack', desc: 'คลื่นดินที่เป้าหมาย', tiers: [
    Z('Earth Shock', 20, 'wz_earth_shock', 'dust', 24, 300, 40, 5, 'คลื่นกระแทกฝุ่นดินระเบิดที่ตำแหน่งเป้าหมาย พร้อมวงริ้วซ้อน'),
    Z('Earth Quake', 80, 'wz_earth_quake', 'spikes', 12, 560, 90, 7, 'แผ่นดินไหว หินแหลมสีเทา 8-10 แท่งพุ่งขึ้นรอบเป้าหมาย'),
    Z('Earth Earthquake', 124, 'wz_earth_earthquake', 'spikes', 5, 950, 150, 10, 'แผ่นดินไหวขั้นสูงสุด แสงระเบิดและหินแหลมกลุ่มใหญ่ ฝุ่นตลบ')] },
  { ...EARTH, icon: 'root', kind: 'debuff', desc: 'ตรึงศัตรูกับพื้น', tiers: [
    Z('Root', 1, 'wz_root', 'root', 12, 0, 25, 10, 'ตรึงเป้าหมายไว้กับที่ (ไม่สร้างดาเมจ) บอสต้านทานได้'),
    Z('Mesh Root', 60, 'wz_mesh_root', 'root', 6, 0, 60, 15, 'คลื่นรากไม้แผ่รอบตัว ตรึงศัตรูทุกตัวในระยะ อาจขึ้น Resist')] },
  { ...EARTH, icon: 'shield', kind: 'buff', desc: 'โล่ดินดูดซับดาเมจกายภาพ', tiers: [
    Z('Earth Barrier', 20, 'wz_earth_barrier', 'shield', 5, 0, 60, 30, 'สร้างเขตพลังดินดูดซับดาเมจกายภาพ 30% (Lv3) นาน 25 วินาที'),
    Z('Earth Fence', 80, 'wz_earth_fence', 'shield', 5, 0, 90, 35, 'รั้วปฐพี หินลอยรอบตัว ดูดซับดาเมจกายภาพมากขึ้น นาน 30 วินาที')] },
  // ---- Cold
  { ...COLD, icon: 'ice', kind: 'attack', desc: 'กระสุนน้ำแข็ง', tiers: [
    Z('Ice Bolt', 1, 'wz_ice_bolt', 'ice', 10, 230, 22, 1.5, 'ยิงผลึกน้ำแข็งใส่เป้าหมาย ทำให้ช้าลง'),
    Z('Frozen Spear', 60, 'wz_frozen_spear', 'ice', 17, 560, 60, 4, 'หอกน้ำแข็งสีฟ้าอมเขียวพุ่งเป็นลำแสงไปที่เป้าหมาย'),
    Z('Cryophorus Fields', 124, 'wz_cryophorus', 'comet', 5, 1100, 140, 9, 'ยิงดาวหางน้ำแข็งสีขาวม่วง 7 ลูกต่อเนื่อง แต่ละลูกสร้างดาเมจ', { hits: 7 })] },
  { ...COLD, icon: 'cloud', kind: 'attack', desc: 'หมอกเยือกแข็งที่เป้าหมาย', tiers: [
    Z('Snow Wind', 20, 'wz_snow_wind', 'cloud', 14, 280, 42, 5, 'หมอกน้ำแข็งสีฟ้าม่วงแผ่บนพื้นรอบเป้าหมาย ทำให้ช้าลง'),
    Z('Blizzard', 80, 'wz_blizzard', 'geyser', 12, 560, 92, 7, 'เสาแสงสีขาวสูงพร้อมหมอกชมพูม่วง (วงเวทย์ Lv80 สีชมพู)'),
    Z('Ice Roar', 124, 'wz_ice_roar', 'geyser', 5, 950, 150, 10, 'ระเบิดน้ำแข็ง เกิดน้ำพุเยือกแข็งพร้อมผลึกเปลวสีฟ้า')] },
  { ...COLD, icon: 'drain', kind: 'debuff', desc: 'เผาผลาญมานา (Combustion)', tiers: [
    Z('Mana Drain', 1, 'wz_mana_drain', 'drain', 12, 60, 20, 8, 'ใส่สถานะ Combustion ให้เป้าหมาย 10 วินาที จิตใจสับสน เสียพลังต่อเนื่อง'),
    Z('Mana Drought', 60, 'wz_mana_drought', 'drain', 6, 80, 50, 12, 'จานหมุนสีเขียวน้ำทะเล ใส่ Combustion ให้ทุกตัวรอบเป้าหมาย')] },
  { ...COLD, icon: 'stealth', kind: 'util', desc: 'ล่องหน', tiers: [
    Z('Invisible', 20, 'wz_invisible', 'stealth', 11, 0, 50, 20, 'รวมความเย็นกับมานา ทำให้ล่องหน 40 วินาที ศัตรูมองไม่เห็น (เคลื่อนที่ช้าลง โจมตีแล้วปรากฏตัว)'),
    Z('Crystal Invisible', 80, 'wz_crystal_invisible', 'stealth', 6, 0, 70, 25, 'ล่องหนขั้นสูง 60 วินาที แม้อยู่ใกล้ศัตรูก็มองไม่เห็น')] },
  // ---- Fire
  { ...FIRE, icon: 'fire', kind: 'attack', desc: 'ลูกไฟ', tiers: [
    Z('Fire Bolt', 1, 'wz_fire_bolt', 'fire', 13, 250, 24, 2, 'ยิงเส้นไฟสีทองยาวใส่เป้าหมาย พร้อมแสงเสี้ยวจันทร์รอบตัว'),
    Z('Strengthen Rocket', 124, 'wz_strengthen_rocket', 'rocket', 5, 1150, 150, 9, 'ชาร์จลูกไฟเหนือคทา เปลวไฟพันรอบตัว แล้วยิงจรวดเพลิง')] },
  { ...FIRE, icon: 'meteor', kind: 'attack', desc: 'อุกกาบาต', tiers: [
    Z('Meteor', 60, 'wz_meteor', 'meteor', 17, 600, 66, 5, 'ลูกไฟตกลงมาจากเหนือเป้าหมายเป็นเสาเปลวไฟ เผาไหม้ต่อ'),
    Z('Meteor Shower', 124, 'wz_meteor_shower', 'meteor', 5, 1000, 150, 10, 'อุกกาบาตหัวขาวร้อนจัดดิ่งลงจากที่สูง ระเบิดเป็นวงกว้าง')] },
  { ...FIRE, icon: 'stream', kind: 'attack', desc: 'พ่นเปลวไฟ', tiers: [
    Z('Fire Blow', 20, 'wz_fire_blow', 'stream', 24, 420, 48, 6, 'พ่นเปลวไฟต่อเนื่องจากปลายคทาใส่เป้าหมาย 2 วินาที'),
    Z('Salamander Blow', 80, 'wz_salamander_blow', 'stream', 12, 700, 100, 10, 'ธารเพลิงยาว 5 ช่วงตัว ลุกไหม้ค้างอยู่ 4 วินาที (เดินได้ไฟยังติด)'),
    Z('Hellforge', 124, 'wz_hellforge', 'stream', 5, 1000, 160, 12, 'ลูกไฟชุดแรก ตามด้วยเปลวไฟมหึมาแกนขาวขอบชมพูม่วง 3 วินาที')] },
  { ...FIRE, icon: 'trap', kind: 'trap', desc: 'กับดักเพลิง', tiers: [
    Z('Fire Trap', 1, 'wz_fire_trap', 'trap', 14, 380, 40, 6, 'ร่ายนาน 3.3 วินาที วางกับดักไฟข้างหน้า ระเบิดเมื่อศัตรูเดินมาใกล้'),
    Z('Lava Trap', 60, 'wz_lava_trap', 'trap', 15, 650, 70, 8, 'กับดักลาวา ระเบิดแรงและกว้างขึ้น'),
    Z('Baoyan Surgery', 124, 'wz_baoyan', 'trap', 5, 1200, 140, 10, 'กับดักเพลิงขั้นสูงสุด วงแดงจางรอบถ่านไฟ')] },
  { ...FIRE, icon: 'eye', kind: 'util', desc: 'ตรวจจับ', tiers: [
    Z('Detect', 20, 'wz_detect', 'eye', 5, 0, 30, 10, 'วงแดงไล่ขึ้นตามตัว เปิดเผยศัตรูรอบตัว 10 ม. ศัตรูที่ถูกเปิดเผยรับดาเมจ +10% (15 วินาที)'),
    Z('Sprawl Detect', 80, 'wz_sprawl_detect', 'eye', 6, 0, 60, 20, 'คลื่นแสงสีแดงชมพูแผ่ 20 ม. เปิดเผยศัตรูทั้งหมด 20 วินาที')] },
  // ---- Lightning
  { ...LIGHT, icon: 'bolt', kind: 'attack', desc: 'สายฟ้า', tiers: [
    Z('Lightning Bolt', 1, 'wz_lightning_bolt', 'bolt', 13, 240, 22, 1.8, 'สายฟ้าซิกแซกสีเหลืองเขียวสองเส้นจากปลายคทาถึงเป้าหมาย'),
    Z('Chain Lightning', 60, 'wz_chain_lightning', 'chain', 17, 480, 62, 5, 'สายฟ้าโซ่ กระโดดไปโดนศัตรูตัวที่สอง', { hits: 2 }),
    Z('Chain Lightning', 124, 'wz_chain_lightning2', 'chain', 5, 800, 140, 8, 'สายฟ้าโซ่สีม่วงขั้นสูงสุด กระโดดได้ 3 ครั้ง', { hits: 4 })] },
  { ...LIGHT, icon: 'ring', kind: 'attack', desc: 'คลื่นไฟฟ้าที่เป้าหมาย', tiers: [
    Z('Charged Wind', 20, 'wz_charged_wind', 'ring', 24, 300, 44, 5, 'คลื่นไฟฟ้าสีฟ้าน้ำทะเลแผ่วง 3 ช่วงตัว 2 จังหวะที่เป้าหมาย'),
    Z('Charged Squall', 80, 'wz_charged_squall', 'ring', 12, 580, 94, 7, 'คลื่นไฟฟ้าสีขาวชมพูขนาดใหญ่ (เสาสายฟ้าสีบานเย็น)'),
    Z('Thunder', 124, 'wz_thunder', 'cloud', 5, 1000, 150, 10, 'เมฆไฟฟ้าสีขาวฟ้าขนาดยักษ์ ฟ้าแลบแตกกระจาย ทำให้มึน')] },
  { ...LIGHT, icon: 'crescent', kind: 'attack', desc: 'ช็อตไฟฟ้าระยะประชิด', tiers: [
    Z('Lightning Shock', 1, 'wz_lightning_shock', 'crescent', 12, 260, 22, 3, 'แสงไฟฟ้ารูปเสี้ยวกวาดด้านหน้า โจมตีศัตรูที่อยู่ติดตัว'),
    Z('Lightning Impact', 60, 'wz_lightning_impact', 'bolt', 17, 420, 72, 7, 'จานไฟฟ้าสีเขียวมะนาวระเบิดรอบตัว 3.5 ช่วงตัว', { kind: 'aoe_self' })] },
  { ...LIGHT, icon: 'teleport', kind: 'util', desc: 'เทเลพอร์ต', tiers: [
    Z('Teleport', 20, 'wz_teleport', 'teleport', 3, 0, 20, 3, 'วาร์ปไปข้างหน้าทันที ~4 ช่วงตัว (ตามทิศที่เดิน)'),
    Z('Aerial Teleport', 80, 'wz_aerial_teleport', 'teleport', 5, 0, 30, 4, 'วาร์ปไกลขึ้น ~6 ช่วงตัว วงลมสีทองขาว')] },
  // ---- Life
  { ...LIFE, icon: 'life', kind: 'buff', desc: 'แลกพลังชีวิตเป็นพลังเวทย์', tiers: [
    Z('Life Control', 20, 'wz_life_control', 'life', 8, 0, 80, 60, 'ใช้พลังชีวิตหมุนเวียนมานา 15 นาที: ดาเมจเวทย์ +25% (Lv8) · พลังโจมตี +3% · HP สูงสุด -50%'),
    Z('Life Turnover', 80, 'wz_life_turnover', 'life', 10, 0, 120, 60, 'ถ่ายเทพลังชีวิตสู่ธาตุ 15 นาที: ดาเมจเวทย์ +40% (Lv10) · พลังโจมตี +20% · HP สูงสุด -50%')] },
]);
