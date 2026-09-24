# Digital Finder

> **Digital tools, better work.**

Digital Finder เป็นร้านขายสินค้าดิจิทัลแบบสาธิต (DEMO ONLY) ขายของอย่างเทมเพลต ไกด์ และไฟล์พร้อมใช้ ระบบทำงานครบตั้งแต่เลือกสินค้า สร้างคำสั่งซื้อ และจำลองการชำระเงิน ไปจนถึงส่งลิงก์ดาวน์โหลดทางอีเมล

โปรเจกต์นี้ต่อยอดมาจาก BookNest (ร้านอีบุ๊ก) ใช้ backend และฐานข้อมูลชุดเดิม แต่เปลี่ยนแบรนด์ ข้อความ และ layout ฝั่ง desktop ใหม่

> ⚠️ การชำระเงินเป็นการจำลองทั้งหมด ใช้รับเงินจริงไม่ได้

---

## ฟีเจอร์

- **หน้าร้าน:** แสดงรายการสินค้าพร้อมช่องค้นหา
- **หน้าสินค้า:** รายละเอียดสินค้า ราคา ขนาดไฟล์ และปุ่ม "ซื้อและดาวน์โหลด"
- **Checkout:** กรอกชื่อกับอีเมล แล้วระบบสร้างเลขคำสั่งซื้อรูปแบบ `ORD-YYYYMMDD-001`
- **จำลองการชำระเงิน:** เปลี่ยนสถานะ `PENDING → PAID → COMPLETED`
- **ส่งไฟล์:** สร้าง signed URL จาก bucket แบบ private (มีอายุ 24 ชม.) แล้วส่งทางอีเมลผ่าน Gmail SMTP
- **ติดตามคำสั่งซื้อ:** ค้นด้วยเลขคำสั่งซื้อคู่กับอีเมล และมีรายการคำสั่งซื้อที่จำไว้ในเบราว์เซอร์
- **รองรับ 2 ภาษา:** ไทยและอังกฤษ สลับได้ทุกหน้า

## Tech stack

| ส่วน | ใช้อะไร |
| --- | --- |
| Web | Next.js 14 (App Router), React 18 |
| Database / Storage | Supabase (PostgreSQL + Storage) |
| Email | Nodemailer + Gmail SMTP |
| Deploy | Vercel |

ทุกบริการมี Free Tier เพียงพอสำหรับ prototype

## โครงสร้างโปรเจกต์

```
app/                 หน้าเว็บ (App Router) + API routes
  api/orders/        สร้าง / ค้นหา / จ่ายเงินคำสั่งซื้อ
  api/download/      ออกลิงก์ดาวน์โหลด
components/          Shell (sidebar, topbar, tabbar), Pieces, Icons
components/views/    UI ของแต่ละหน้า (client components)
lib/supabase.js      Supabase client ฝั่ง server เท่านั้น (บังคับด้วย "server-only")
lib/email.js         ส่งอีเมลลิงก์ดาวน์โหลด
lib/i18n.js          ข้อความทั้งหมดของเว็บ ภาษา th / en
supabase/schema.sql  ตาราง, function และ RLS
```

> หมายเหตุ: ในโค้ดและฐานข้อมูลยังใช้ชื่อเดิมจาก BookNest เช่น ตาราง `books`, bucket `ebooks`, ฟังก์ชัน `getBooks()` เพราะการเปลี่ยนชื่อต้องทำ migration ที่ Supabase ด้วย ข้อความที่ผู้ใช้เห็นทั้งหมดเปลี่ยนเป็น "สินค้าดิจิทัล" แล้ว

## เริ่มต้นใช้งาน

1. **สร้างโปรเจกต์ Supabase**
   - ไปที่ SQL Editor แล้วรัน [supabase/schema.sql](supabase/schema.sql) ทั้งไฟล์
   - ไปที่ Storage แล้วสร้าง bucket ชื่อ `ebooks` ตั้งเป็น **private** จากนั้นอัปโหลดไฟล์ให้ชื่อตรงกับ `file_path` ในตาราง
2. **ตั้งค่า env:** คัดลอก `.env.example` เป็น `.env.local` แล้วใส่ค่าจริง

   | ตัวแปร | มาจากไหน |
   | --- | --- |
   | `SUPABASE_URL` | Project Settings → API |
   | `SUPABASE_SECRET_KEY` | Project Settings → API (secret / service_role) **ใช้ฝั่ง server เท่านั้น** |
   | `SUPABASE_EBOOK_BUCKET` | ชื่อ bucket (ค่าเริ่มต้น `ebooks`) |
   | `SMTP_USER` / `SMTP_PASS` | Gmail + App Password (ต้องเปิด 2-Step Verification ก่อน) ใส่เครื่องหมายคำพูดครอบถ้ารหัสมีช่องว่าง |
   | `EMAIL_FROM` | เช่น `"Digital Finder <your.gmail@gmail.com>"` |

3. **รัน**

   ```bash
   npm install
   npm run dev      # http://localhost:3000
   ```

4. **Deploy บน Vercel:** ใส่ env ชุดเดียวกันใน Project Settings → Environment Variables

## แก้ปัญหาที่เจอบ่อย

**`getBooks: TypeError: fetch failed` เว็บโหลดช้าและไม่มีสินค้าขึ้น**
เซิร์ฟเวอร์ต่อ Supabase ไม่ได้ ให้ตรวจตามนี้

```bash
nslookup <project-ref>.supabase.co
```

- **ได้ `NXDOMAIN`:** โปรเจกต์ถูก pause หรือถูกลบ หรือ URL พิมพ์ผิด ให้เข้า Supabase Dashboard แล้วกด Restore หรือสร้างโปรเจกต์ใหม่ จากนั้นอัปเดต `SUPABASE_URL` / `SUPABASE_SECRET_KEY` และรีสตาร์ท `npm run dev`
- โปรเจกต์ Free Tier จะถูก pause อัตโนมัติถ้าไม่มีคนใช้งานประมาณ 1 สัปดาห์
- ใน `lib/supabase.js` ตั้ง timeout ไว้ 2.5 วินาที ถ้าต่อ Supabase ไม่ได้ หน้าเว็บจะแสดงรายการว่างแทนการค้าง

---

## แนวทางการออกแบบ (Design Guidelines)

### หลักคิด

**Clean · Warm · Focused · Friendly**

- ผู้ใช้ควรไปถึงไฟล์ที่ซื้อให้เร็วที่สุด ทุกหน้ามีปุ่มหลัก (primary action) แค่ปุ่มเดียว
- บอกตรงๆ ว่าเป็นระบบสาธิต มีป้าย DEMO ONLY ที่เห็นได้ชัดเสมอ และไม่ทำให้ผู้ใช้เข้าใจผิดว่ามีการตัดเงินจริง
- ใช้ design system เดียวกันทุกขนาดจอ แต่ปรับ layout ตามอุปกรณ์

### Layout ตามขนาดจอ

| | Mobile (< 900px) | Web / Desktop (≥ 900px) |
| --- | --- | --- |
| Navigation | Tab bar ด้านล่าง | Sidebar ถาวรกว้าง 238px สีเขียวเข้ม `#23483f` |
| ป้าย DEMO | Ribbon ด้านบน | ย้ายไปอยู่ใน sidebar label |
| Grid สินค้า | 3 คอลัมน์ ช่องไฟ 12px | 4 คอลัมน์ ช่องไฟ 18px |
| ความกว้างเนื้อหา | เต็มจอ | สูงสุด 1180px (ทั้ง shell สูงสุด 1440px) |
| ปุ่มหลัก | Sticky ด้านล่าง เต็มความกว้าง | Sticky ชิดขวา กว้างไม่เกิน 360px |

กำหนด breakpoint ไว้ที่เดียวคือ `900px` ใน [app/globals.css](app/globals.css) อย่าเพิ่ม breakpoint ใหม่ถ้าไม่จำเป็นจริงๆ

### สี

ใช้ CSS variables ใน `:root` เสมอ **ห้าม hard-code สีใน component** ยกเว้นสีของ sidebar ที่ตั้งใจให้คงที่

| Token | Mobile | Web | ใช้กับ |
| --- | --- | --- | --- |
| `--orange` | `#E4703B` | `#ef7442` | ปุ่มหลัก, ราคา, สถานะ active |
| `--sage` | `#6E8F76` | `#477866` | สถานะสำเร็จ, accent รอง |
| `--cream` | `#FDF7F0` | `#f7faf5` | พื้นหลังเนื้อหา |
| `--surface` | `#FFFFFF` | `#ffffff` | การ์ด |
| `--ink` / `--ink-2` / `--muted` | น้ำตาลเข้ม → เทา | เขียวเข้ม → เทาเขียว | ข้อความหลัก / รอง / คำอธิบาย |
| `--line` | `#EFE3D5` | `#dfe9e1` | เส้นขอบ |
| `--danger` | `#B84A38` | | ข้อผิดพลาด |

- สีส้มเป็นสีของ "การกระทำ" ใช้กับปุ่มหรือจุดที่ต้องการให้กดเท่านั้น ไม่ใช้เป็นพื้นหลังก้อนใหญ่
- **Dark mode:** รองรับทั้งแบบตามระบบ (`prefers-color-scheme`) และบังคับด้วย `data-theme` ถ้าเพิ่ม token ใหม่ ต้องกำหนดค่าทั้งโหมดสว่างและโหมดมืดเสมอ

### ตัวอักษร

- Mobile ใช้ `Inter` + `Noto Sans Thai` ส่วน Web ใช้ `Trebuchet MS` + `Noto Sans Thai`
- ตัวอักษรพื้นฐาน 15px, line-height 1.6 (ภาษาไทยต้องการระยะบรรทัดมากกว่าภาษาอังกฤษ)
- หัวข้อใช้ weight 600–700 และ letter-spacing ติดลบเล็กน้อย (`-.025em`)
- ขนาดข้อความที่ใช้บ่อย: hero 30px, หัวข้อ section 18px, ชื่อสินค้า 13.5px, คำอธิบาย 11–13px

### รูปทรงและเงา

- Radius: `--radius-s` 10px, `--radius` 14px, `--radius-l` 20px (บน web จะลดการ์ดและปุ่มเหลือ 9px ให้ดูเป็นระเบียบ)
- เงาใช้ `--shadow` ตัวเดียว เป็นเงานุ่มและกระจายกว้าง ไม่ใช้เงาเข้ม
- ปกสินค้า (`components/Cover.js`) เป็นภาพกราฟิกที่สร้างจากโค้ด เลือกชุดปกด้วยคอลัมน์ `cover` (`clean | design | mindset`) ไม่ต้องใช้ไฟล์รูป

### ข้อความและภาษา

- ข้อความทุกคำที่ผู้ใช้เห็นต้องอยู่ใน [lib/i18n.js](lib/i18n.js) และมีครบทั้ง `th` และ `en` ห้ามเขียนข้อความลงใน component ตรงๆ
- เรียกของที่ขายว่า "สินค้าดิจิทัล" หรือ "digital product" ไม่ใช้คำว่า "หนังสือ" หรือ "อีบุ๊ก" แล้ว
- โทนภาษาสั้น เป็นมิตร และบอกขั้นต่อไปชัดเจน เช่น "ซื้อและดาวน์โหลด" หรือ "เลือกสินค้า"
- ข้อความแจ้ง error ต้องบอกว่าผู้ใช้ควรทำอะไรต่อ ไม่แสดง stack trace หรือข้อความจากระบบให้ผู้ใช้เห็น

### การเข้าถึง (Accessibility)

- พื้นที่กดต้องสูงอย่างน้อย 44px (เช่นรายการใน sidebar, tab bar และปุ่มต่างๆ)
- ใช้ `aria-current="page"` กับเมนูที่กำลังเปิดอยู่ ใส่ `aria-label` ให้ปุ่มที่มีแค่ไอคอน และใส่ `aria-hidden` ให้ SVG ที่ใช้ตกแต่ง
- ถ้าผู้ใช้ตั้ง `prefers-reduced-motion` ต้องปิด animation ทั้งหมด (มีตั้งไว้แล้วใน `globals.css`)
- ข้อความต้องมี contrast พอทั้งโหมดสว่างและโหมดมืด ถ้าเป็นข้อความสำคัญอย่าใช้ `--muted`

### Motion

- ใช้ transition สั้นๆ 0.18 วินาทีกับ hover และสถานะ active
- Splash screen ใช้ animation `rise` แบบไล่จังหวะ (0.08, 0.16, 0.26 วินาที) ใช้ที่จุดนี้จุดเดียว ไม่ใส่ animation ตกแต่งเพิ่มในหน้าอื่น

---

## ข้อจำกัด

- การชำระเงินเป็นการจำลองทั้งหมด
- ไม่มีระบบผู้ดูแล ระบบคืนเงิน หรือคูปอง
- Gmail SMTP ส่งอีเมลได้จำกัดต่อวัน เหมาะกับการสาธิตเท่านั้น
