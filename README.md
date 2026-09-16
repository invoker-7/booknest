# BookNest — E-book Shop (Vibe Coding worksheet)

เว็บขายอีบุ๊กแบบสาธิต ทำตามใบงาน **Vibe Coding: E-book Shop**
เลือกหนังสือ → สั่งซื้อ → จำลองชำระเงิน → PAID → ส่งอีเมลลิงก์ดาวน์โหลดชั่วคราว
รองรับ 2 ภาษา ไทย/อังกฤษ และเปิดผ่าน Android WebView ได้

> **DEMO ONLY** — ระบบนี้ไม่รับชำระเงินจริง ไม่เชื่อม Payment Gateway
> ไม่เก็บข้อมูลบัตร และไม่มีการเรียกเก็บเงินใด ๆ

Stack: Next.js 14 (App Router) · Supabase (Postgres + Storage) · Gmail SMTP · Vercel · MIT App Inventor

---

## 1. ติดตั้งและรันในเครื่อง

```bash
npm install
cp .env.example .env.local     # แล้วใส่ค่าจริง
npm run dev                    # http://localhost:3000
```

ถ้ายังไม่ได้ตั้งค่า Supabase เว็บจะไม่พัง แต่จะขึ้นข้อความบอกว่าให้ตั้งค่าอะไรบ้าง

---

## 2. ตั้งค่า Supabase

1. สร้างโปรเจกต์ใหม่ที่ [supabase.com](https://supabase.com)
2. ไป **SQL Editor → New query** วางทั้งไฟล์ `supabase/schema.sql` แล้วกด Run
   - สร้างตาราง `books`, `orders`, `order_counters`
   - สร้างฟังก์ชัน `next_order_no()` ที่ออกเลขแบบ `ORD-20260916-001`
   - เปิด RLS: `books` อ่านได้ทุกคน / `orders` ไม่มี policy เลย = แตะไม่ได้จากฝั่ง browser
   - ใส่ข้อมูลหนังสือตัวอย่าง 3 เล่ม
3. ไป **Storage → New bucket**
   - ชื่อ `ebooks`
   - **ปิด** Public bucket (ต้องเป็น private)
   - อัปโหลด 3 ไฟล์ ชื่อให้ตรงกับคอลัมน์ `file_path`:
     `clean-code.pdf`, `design-thinking.pdf`, `mindset-shift.pdf`
     (ใช้ PDF อะไรก็ได้สำหรับทดสอบ)
4. ไป **Project Settings → API** คัดลอกใส่ `.env.local`

```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SECRET_KEY=sb_secret_xxxx      # หรือ service_role key
SUPABASE_EBOOK_BUCKET=ebooks
```

### ความลับอยู่ฝั่งไหน

โปรเจกต์นี้ **ไม่ส่งคีย์ของ Supabase ไปที่ browser เลยแม้แต่ตัวเดียว**
การอ่าน/เขียนฐานข้อมูลเกิดขึ้นใน Server Component และ Route Handler ทั้งหมด
ไฟล์ `lib/supabase.js` ประกาศ `import "server-only"` ไว้ด้านบน
ถ้าเผลอ import เข้าไปในไฟล์ที่มี `"use client"` โปรเจกต์จะ build ไม่ผ่านทันที

---

## 3. ตั้งค่าอีเมล (Gmail SMTP)

1. เปิด Google Account → **Security** → เปิด **2-Step Verification**
2. ไปที่ **App passwords** → สร้างรหัสชื่อ `BookNest`
3. ใส่ค่าที่ได้ใน `.env.local`

```
SMTP_USER=your.gmail@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
EMAIL_FROM=BookNest <your.gmail@gmail.com>
```

`SMTP_PASS` คือ App Password 16 ตัว ไม่ใช่รหัสผ่าน Gmail ปกติ

**ถ้ายังไม่ตั้ง `SMTP_USER` หรือ `SMTP_PASS`** ระบบจะทำงานในโหมดจำลอง: บันทึกว่าส่งอีเมลสำเร็จ
และแสดงผลบนหน้าจอ ซึ่งใบงานอนุญาตไว้ว่า *"หรือแสดงการส่งอีเมลสำเร็จสำหรับการทดสอบ"*

---

## 4. Deploy ขึ้น Vercel

1. ตรวจก่อน push ว่าไม่มี `.env.local` หลุดไป (มีใน `.gitignore` แล้ว)
   ```bash
   git status --porcelain --ignored | grep env     # ต้องขึ้น !! .env.local
   ```
2. push ขึ้น GitHub
3. [vercel.com](https://vercel.com) → **Add New → Project** → import repo
   - Framework Preset ตรวจเจอ Next.js เอง ไม่ต้องแก้
4. ใส่ **Environment Variables** ให้ครบทั้ง 5 ตัว (ทั้ง Production และ Preview)
5. Deploy → ได้ production URL
6. **แก้ Environment Variables เมื่อไหร่ ต้อง Redeploy ทุกครั้ง** ค่าใหม่ถึงจะมีผล
7. เปิด production URL บนคอมและบนมือถือจริง แล้วทดสอบครบหนึ่งรอบ

---

## 5. ทำแอป Android ด้วย MIT App Inventor

เป็น WebView wrapper ที่เปิดเว็บ production ของเรา ไม่ใช่ native app เต็มรูปแบบ

### Designer

| ส่วน | ตั้งค่า |
|---|---|
| `Screen1` | `Title` = BookNest · `Sizing` = Responsive · `UsesLocation` = false |
| `WebViewer1` | `Width` = Fill parent · `Height` = Fill parent |
| | `HomeUrl` = URL จาก Vercel (ต้องเป็น https ห้ามใช้ localhost) |
| | `FollowLinks` = true · `IgnoreSslErrors` = **false** |

> ห้ามตั้ง `IgnoreSslErrors` เป็น true เพื่อข้ามปัญหาใบรับรอง
> เพราะทำให้แอปยอมรับการเชื่อมต่อที่ไม่ปลอดภัย

### Blocks — ปุ่มย้อนกลับ

```
when Screen1.BackPressed
do  if      WebViewer1.CanGoBack
    then    call WebViewer1.GoBack
    else    close application
```

### ทดสอบและ build

1. ทดสอบกับ **AI Companion** หรือมือถือจริง: เปิดเว็บ เลือกหนังสือ กดย้อนกลับ
2. **Build → Android App (.apk)**
3. เก็บไฟล์ `.aia` ไว้ด้วย สำหรับส่งงานและแก้ไขภายหลัง

### ข้อจำกัดที่ต้องรู้

WebViewer จัดการ pop-up, deep link และการดาวน์โหลดไฟล์ได้ไม่ดี
ระบบนี้จึงส่งลิงก์ดาวน์โหลด **ทางอีเมล** แทนการกดโหลดในแอป
ซึ่งเหมาะกับข้อจำกัดนี้พอดี

---

## 6. เช็คลิสต์ส่งงาน (ตรวจบน production URL)

| รายการ | ตรวจที่ไหน |
|---|---|
| ออกแบบหน้าจอระบบ | ไฟล์ออกแบบที่ทำไว้ (Figma / Canva / ฯลฯ) |
| หน้าร้านแสดงอีบุ๊ก ≥ 3 รายการ และใช้บนมือถือได้ | `/` |
| Checkout สร้างเลขคำสั่งซื้อและสถานะ PENDING | `/checkout/[id]` → `/pay/[orderNo]` |
| Mock Payment มี DEMO ONLY ชัดเจน และเปลี่ยนเป็น PAID | `/pay/[orderNo]` |
| หน้าติดตามไม่เปิดเผยข้อมูลของผู้อื่น | `/track` — ต้องใส่เลขคำสั่งซื้อ **และ** อีเมลที่ตรงกัน |
| ได้รับ/เห็นผลการส่งอีเมลหลัง PAID | `/success/[orderNo]` |
| Vercel production URL เปิดได้ และ GitHub ไม่มี secret | Vercel + `git status` |
| App Inventor เปิด production URL และปุ่มย้อนกลับถูกต้อง | ไฟล์ `.apk` |
| หลักฐานส่งงาน | URL, repo, ภาพทดสอบ, `.apk` |

### วิธีทดสอบเคสผิดพลาด (อย่าลืมทำ)

- กรอกอีเมลผิดรูปแบบที่หน้า Checkout → ต้องขึ้น error ไม่สร้างคำสั่งซื้อ
- ที่หน้า `/track` ใส่เลขคำสั่งซื้อถูกแต่อีเมลผิด → ต้องหาไม่เจอ
- เปิด `/pay/ORD-...` ของคนอื่นตรง ๆ → ต้องไม่เห็นชื่อและอีเมลของเขา

---

## 7. โครงสร้างไฟล์

```
app/
  page.js                       หน้าร้าน
  book/[id]/page.js             รายละเอียดหนังสือ
  checkout/[id]/page.js         ขั้นที่ 1 กรอกข้อมูลผู้ซื้อ
  pay/[orderNo]/page.js         ขั้นที่ 2 ยืนยัน + Mock Payment
  success/[orderNo]/page.js     ขั้นที่ 3 ผลการชำระเงิน + ผลส่งอีเมล
  track/page.js                 ติดตามคำสั่งซื้อ (ต้องใช้อีเมลยืนยัน)
  orders/page.js                รายการคำสั่งซื้อที่จำไว้ในเครื่องนี้
  about/page.js                 ขอบเขต ข้อจำกัด ภาษา ธีม
  api/
    orders/route.js                   POST สร้างคำสั่งซื้อ PENDING
    orders/[orderNo]/pay/route.js     POST จำลองชำระเงิน + ส่งอีเมล
    orders/lookup/route.js            POST ค้นหาด้วยเลข + อีเมล
    download/route.js                 POST ออกลิงก์ชั่วคราว 24 ชม.
components/                     UI ทั้งหมด (client components)
lib/
  supabase.js                   ฝั่ง server เท่านั้น
  email.js                      Gmail SMTP + โหมดจำลอง
  i18n.js                       คำแปล ไทย/อังกฤษ
  format.js                     เงิน วันที่ มาสก์อีเมล
supabase/schema.sql             SQL ทั้งหมด
```

---

## 8. สิ่งที่ตั้งใจไม่ทำ

- ไม่เชื่อม Payment Gateway จริง ไม่เก็บข้อมูลบัตร ไม่ใช้ QR ธนาคารจริง
- ไม่มีระบบผู้ดูแล ระบบคืนเงิน หรือคูปอง
- ไฟล์อยู่ในบั๊กเก็ต private + ลิงก์ชั่วคราว = จำกัดการเข้าถึง
  แต่ **ไม่ใช่ DRM** ผู้ซื้อยังส่งต่อไฟล์ได้
- AI ช่วยเร่งงานได้ แต่ไม่ได้รับรองว่าระบบปลอดภัยหรือถูกต้อง ผู้พัฒนาต้องทดสอบเอง
# booknest
