# ⚔️ Aura Legends — ตำนานออร่า

เกม Action MMORPG 3D บนเว็บ (Three.js) สไตล์เอเชียแฟนตาซี: ฟันมอนสเตอร์ ตีบวกอาวุธจนออร่าลุกโชน สุ่มกาชาอาวุธเทพ และล่าบอสมังกร
โมเดล 3D ทั้งหมด (ตัวละคร อาวุธ 15 ชิ้น มอนสเตอร์ ฉาก) และไอคอน สร้างด้วยสคริปต์ **Blender (Python / bpy)** ในโฟลเดอร์ [`blender/`](blender/)

## 🚀 วิธีรัน

```bash
npm install
npm run dev        # เปิด http://localhost:5173
npm run build      # build ไฟล์ไปที่ dist/ (อัปโหลดขึ้นเว็บโฮสต์ static ใดก็ได้)
```

ใส่ `?q=low` ต่อท้าย URL สำหรับเครื่องสเปกต่ำ / มือถือรุ่นเก่า

`npm run build:hosted` สร้างเวอร์ชันสำหรับโฮสต์ที่ไม่เสิร์ฟไฟล์ `.glb` (แปลงโมเดลเป็น glTF JSON แบบฝัง buffer) ลงใน `dist-hosted/`

### สร้างโมเดลใหม่ด้วย Blender

```bash
pip install bpy                    # Blender 5.x แบบ Python module
python3 blender/build_assets.py    # สร้างทุกอย่างลง public/assets/
python3 blender/build_assets.py hero dragon   # สร้างเฉพาะบางชิ้น
```

## 🎮 การควบคุม

| ปุ่ม | การกระทำ |
|---|---|
| `W A S D` | เดิน |
| คลิกซ้าย / `J` (กดค้าง) | โจมตีปกติ |
| `1` … `9` `0` | ช่องสกิลบนแถบสกิล (10 ช่อง) |
| `F1` – `F4` | เปลี่ยนหน้าแถบสกิล |
| `K` | หน้าต่างสกิล (คลิกไอคอน = ใช้สกิล, ลาก = วางบนแถบ, คลิกขวาที่ช่อง = เอาออก) |
| `Space` | หลบ |
| `Q` / `E` | ยา HP / MP |
| `H` | โหมด AUTO ต่อสู้อัตโนมัติ |
| `F` | คุยกับ NPC / ใช้ประตูวาร์ป |
| คลิกขวาลาก / ล้อเมาส์ | หมุนกล้อง / ซูม |
| `B` / `M` | กระเป๋า / วาร์ป |

มือถือ: จอยสติ๊กเสมือนด้านซ้าย แตะช่องบนแถบสกิลด้านล่าง ลากจอเพื่อหมุนกล้อง

## ⭐ ระบบสกิลแบบ Silkroad Online (ตามคลิปอ้างอิง)

- **มาสเตอรี่** อัปด้วยปุ่ม LEVEL UP ใช้ Skill point (SP) ที่ได้จากการล่ามอนสเตอร์ · มาสเตอรี่แต่ละสายสูงสุดเท่าเลเวลตัวละคร · มาสเตอรี่สายจีน (Bicheon/Heuksal/Pacheon) รวมได้ไม่เกิน 3.2 เท่าของเลเวล (Lv125 = 400) และสายยุโรป (Warrior/Wizard) ไม่เกิน 2 เท่า (Lv125 = 250) · เลเวลตัวละครสูงสุด 130
- **หน้าต่างสกิล** แท็บ Weapon (Bicheon · Heuksal · Pacheon) / Melee (Warrior) / Caster (Wizard) · แต่ละแถวคือสายสกิล ซ้ายไปขวาคือขั้นที่สูงขึ้น · ปุ่ม ADD = เรียน/อัปได้, MAX = เต็มแล้ว · ทุกเลเวลต้องใช้มาสเตอรี่ +1 และ SP ตามตาราง · ขั้นถัดไปต้องอัปขั้นก่อนหน้าก่อน
- **แถบสกิล** 10 ช่อง × 4 หน้า (F1–F4) · คูลดาวน์แสดงเป็นเลขนับถอยหลังบนพื้นน้ำเงินเข้ม กะพริบฟ้าเมื่อพร้อม · สกิลกลุ่มเดียวกันใช้คูลดาวน์ร่วม · ปุ่ม "จัดแถบ" วางสกิลตามแถบในคลิป
- **บัฟ** แสดงไอคอนข้างหลอด HP/MP พร้อม tooltip เวลาที่เหลือ

| มาสเตอรี่ | อาวุธ | สายสกิล (แถวในหน้าต่าง) |
|---|---|---|
| Wizard (EU) | คทา | Earth: Ground Charge→Ground Rave→Land Of The Contract · Earth Shock→Earth Quake→Earth Earthquake · Root→Mesh Root · Earth Barrier→Earth Fence / Cold: Ice Bolt→Frozen Spear→Cryophorus Fields · Snow Wind→Blizzard→Ice Roar · Mana Drain→Mana Drought · Invisible→Crystal Invisible / Fire: Fire Bolt→Strengthen Rocket · Meteor→Meteor Shower · Fire Blow→Salamander Blow→Hellforge · Fire Trap→Lava Trap→Baoyan Surgery · Detect→Sprawl Detect / Lightning: Lightning Bolt→Chain Lightning→Chain Lightning · Charged Wind→Charged Squall→Thunder · Lightning Shock→Lightning Impact · Teleport→Aerial Teleport / Life Control→Life Turnover |
| Heuksal | หอก/ง้าว | Spear Thrust (Wolf Bite…Asura) · Bloody Fan Storm · Sweep (Dancing Demon…Pitch Black) · Soul Spear (Move…Emptiness) · Ghost Spear (Petal…Sea God, Heuksal storm) · Chain Spear (Tiger…Heaven) · Flying Dragon (Flow…Sky) · Spear Mastery |
| Bicheon | ดาบ+โล่ | Smash · Chain · Shield · Cut Blade · Blade Force (ทำให้ล้ม) · Fallen-enemy (Flower Bloom…Mad Dragon) · Sword Dance · Bicheon Force |
| Warrior (EU) | ดาบมือเดียว+โล่ / ดาบสองมือ / ขวาน | Vital Increase · Iron/Mana Skin · Howling/Beast Shout · Link buffs · ดาบโล่ (Shield Trash…Edge Shield) · ดาบสองมือ (Triple Swing, Dare Devil…) · ขวานคู่ (Down Cross…Crutial Rush) |
| Pacheon | ธนู | Anti Devil Bow (Missile…Moon light) · Arrow Combo (2–7) · Hawk Summon (White/Black/Blue/Lightning/Ice/Fire — เหยี่ยวบินวนเหนือหัวและโฉบโจมตี) · Autumn Wind (Flame…Dragon) · Soul Arrow (เพิ่มระยะยิง) · ศรระเบิด (Berserker…Pitch Black) · Strong Bow (Spirit…Destruction, Bow Storm) · Mind Bow (Flower…Lighting) |

เอฟเฟคสกิลทำตามคลิปทีละเฟรม (วงเวทย์ตามธาตุ, ฝุ่นดิน, เสาสายฟ้า, ลำเพลิงหอก, วงแหวน Ghost Spear, คลื่นดาบ ฯลฯ) และท่าทางสร้างใหม่ใน Blender (ถือคทาชาร์จ, หมุน 360°, กระโดดฟาด, ขว้างหอก, คุกเข่ารวมพลัง ฯลฯ)

## ✨ ระบบในเกม

- **สกิลเอฟเฟคจัดเต็ม** — ทุกสกิลเปลี่ยนสีตามธาตุของอาวุธ (เพลิง/น้ำแข็ง/สายฟ้า/ศักดิ์สิทธิ์/ทมิฬ…)
  - ดาบจันทราเสี้ยว: คลื่นดาบพุ่งทะลวง (+10 ขึ้นไปยิง 3 ลูก)
  - พายุดาบหมุน: พายุทอร์นาโด 3 ชั้น + วงเวทใต้เท้า
  - อสนีบาตพิโรธ: วงเวทบนฟ้า-พื้น ฟ้าผ่าแตกกิ่งพร้อมแสงสว่างวาบ
  - **พิพากษาสวรรค์ (Ultimate)**: กล้องซีเนมาติก วงเวทยักษ์ อัญเชิญ "ร่างวิญญาณยักษ์ของอาวุธที่ถืออยู่" ตกจากฟ้า → แสงแฟลช คลื่นกระแทก เสาแสง สายฟ้า เศษหิน hit-stop
  - Post-processing: Bloom, chromatic aberration, flash, screen shake, hit-stop, weapon trail
- **ตีบวก +0 → +15** — โอกาสลดลงตามขั้น, ล้มเหลวสะสมเพิ่มเรท, หินศักดิ์สิทธิ์ (+10%), คัมภีร์ปกป้อง, ขั้นสูงมีโอกาส "แตก" กลับ +7
- **ออร่าตามขั้น** — +4 ขาว · +7 ฟ้าคราม · +10 ม่วงเวทมนตร์ · +12 เพลิงทองคำ (วงเวทใต้เท้า) · +14 อเวจีโลหิต (ออร่าทั้งตัว) · +15 เทพสวรรค์รุ้ง (สีรุ้ง + สายฟ้ารอบตัว)
- **กาชา** — N/R/SR/SSR/UR, การันตี SSR ทุก 40 ครั้ง, การันตี UR ที่ 120 ครั้ง (soft pity หลัง 90), 10 ครั้งการันตี SR+, ฉากอัญเชิญ 3D พร้อมสีหลอกตา (ฟ้า → ม่วง → ทอง → แดง) และฉากเปิดตัวอาวุธระดับสูง
- **อาวุธ 15 ชิ้น** 7 ธาตุ — ย่อยสลายอาวุธที่ไม่ใช้เป็นวัตถุดิบได้
- **โลกเปิด** เมืองซากุระ + 4 โซน (สไลม์ / หมาป่า-ก็อบลิน / โกเลม / รังมังกร), หญ้าไหวตามลม, ทะเลสาบ, ลาวา, กลีบซากุระร่วง
- **บอสมังกร** — กัด, ฟาดหาง, พ่นไฟ, ชาร์จ, ฝนอุกกาบาต, โหมดคลั่งเมื่อเลือดต่ำกว่า 50% (ทุกท่ามีวงเตือนสีแดงบนพื้น)
- เลเวล, พลังต่อสู้ (CP), เควสหลัก 8 ขั้น, ดรอปไอเทม, ยาอัตโนมัติ, มินิแมพ, เพลงและเสียงสังเคราะห์ (Web Audio) ทั้งหมด
- เซฟอัตโนมัติใน localStorage · เมนูตั้งค่ามี "โหมดทดลอง" แจกเพชร/หินสำหรับลองตีบวกและกาชา

## 📁 โครงสร้าง

```
blender/          สคริปต์ Blender สร้างโมเดล/ไอคอน/ภาพโปรโมต
public/assets/    ไฟล์ .glb / .png ที่ build แล้ว
src/core/         engine (renderer + post FX), input, audio, assets, save
src/fx/           shaders, particles, aura, weapon trail, FX manager
src/game/         player + skills, monsters + boss AI, combat, spawner
src/world/        terrain, grass, water, sky, world layout
src/scenes/       ฉากโชว์ตีบวก/กาชา
src/systems/      ตีบวก, กาชา, เควส, สเตตัส
src/ui/           HUD, panels, minimap, damage numbers
```
