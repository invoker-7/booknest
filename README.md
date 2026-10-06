# VECTOR

> **Digital resources for people who build.**

VECTOR เป็นร้านขายสินค้าดิจิทัลแบบสาธิต (DEMO ONLY) ขายของอย่างระบบ Notion, UI kit, เครื่องมือนักพัฒนา เทมเพลต และคู่มือเชิงเทคนิค ระบบทำงานครบตั้งแต่เลือกสินค้า ใส่ตะกร้า จำลองการชำระเงิน ไปจนถึงส่งลิงก์ดาวน์โหลดทางอีเมล

โปรเจกต์นี้ต่อยอดมาจาก BookNest / Digital Finder ใช้ฐานข้อมูลชุดเดิม หน้าเว็บออกแบบใหม่ทั้งหมดในแนว editorial เชิงวิศวกรรม รองรับทั้ง desktop และมือถือ

> ⚠️ การชำระเงินเป็นการจำลองทั้งหมด ใช้รับเงินจริงไม่ได้

---

## ฟีเจอร์

- **หน้าแรก / แคตตาล็อก:** ค้นหา กรองตามประเภท แพลตฟอร์ม ราคา คะแนน เรียงลำดับ และสลับมุมมองตาราง/รายการ (บนมือถือตัวกรองเป็น bottom sheet)
- **หน้าสินค้า:** จัดแบบเอกสารสเปก (รูปแบบไฟล์ เวอร์ชัน ไลเซนส์ การจัดส่ง) พร้อมสิ่งที่ได้รับ รีวิว และ FAQ
- **ตะกร้า + Checkout:** ซื้อหลายชิ้นได้ด้วยการกดชำระครั้งเดียว ระบบสร้างคำสั่งซื้อ `ORD-YYYYMMDD-001` หนึ่งรายการต่อสินค้าหนึ่งชิ้น แล้วรวมเป็นใบเสร็จเดียว
- **จำลองการชำระเงิน:** เปลี่ยนสถานะ `PENDING → PAID → COMPLETED`
- **ส่งไฟล์:** สร้าง signed URL จาก bucket แบบ private (มีอายุ 24 ชม.) แล้วส่งทางอีเมลผ่าน Gmail SMTP
- **คลังของฉัน:** สินค้าที่ซื้อแล้ว ดาวน์โหลดซ้ำ ชำระคำสั่งซื้อที่ค้าง และค้นหาคำสั่งซื้อเดิมด้วยเลขคำสั่งซื้อคู่กับอีเมล
- **สมาชิก:** เข้าสู่ระบบด้วย Google เท่านั้น (Supabase Auth) แล้วยืนยันอีเมลอีกชั้นด้วยรหัส OTP 6 หลักทุกครั้งที่เข้าสู่ระบบ (อายุ 10 นาที, ผิดได้ 5 ครั้ง, ขอใหม่ได้ทุก 60 วินาที) ไม่มีรหัสผ่านให้จำ บัญชีถูกสร้างตอนเข้าสู่ระบบครั้งแรก คำสั่งซื้อที่ทำตอนล็อกอินผูกกับบัญชี ดูประวัติและดาวน์โหลดได้จากทุกอุปกรณ์ที่ `/account`
- **หลังบ้าน (`/admin`, เฉพาะผู้ดูแล):**
  - Dashboard: ยอดขาย คำสั่งซื้อ ลูกค้า สินค้า กราฟยอดขาย 30 วัน สินค้าขายดี อัปเดตเองทุก 15 วินาที
  - จัดการสินค้า: เพิ่ม แก้ไข ลบ/ซ่อน หมวดหมู่ อัปโหลดไฟล์ตรงเข้า Storage แบบ private และอัปโหลดรูปสินค้า (JPG/PNG/WebP ไม่เกิน 5 MB เก็บใน bucket สาธารณะ `product-images` ที่ระบบสร้างให้เอง)
  - จัดการผู้ใช้ (`/admin/users`): ดูสมาชิก เปลี่ยนสิทธิ์ สมาชิก ↔ ผู้ดูแล และลบบัญชี
  - รายงาน (`/admin/reports`): สรุปยอดช่วง 7 / 30 / 90 วันเทียบช่วงก่อนหน้า ยอดขายรายวัน สินค้าขายดี และบันทึกกิจกรรมล่าสุด (สั่งซื้อ ชำระเงิน ส่งไฟล์ อีเมลส่งไม่ถึง สมาชิกใหม่)
  - ข้อมูลดิบ (`/admin/raw`): ดูทุกคอลัมน์ของตาราง `books`, `orders`, `profiles`, `shops`, `order_counters` แบบอ่านอย่างเดียว ไม่ต้องเข้า Supabase
  - รายการคำสั่งซื้อและลูกค้า
  - Import / Export: ส่งออกสินค้า ผู้ใช้ ยอดขาย เป็น CSV, Excel, JSON และนำเข้าสินค้าจากไฟล์ (ลากวางได้)
- **ครีเอเตอร์ / คลังบทความ / ใบเสร็จ**
- **รองรับ 2 ภาษา:** ไทยและอังกฤษ สลับได้ทุกหน้า

ซื้อแบบไม่สมัครสมาชิกได้เหมือนเดิม: ตะกร้า รายการที่บันทึก และคำสั่งซื้อแบบ guest เก็บใน `localStorage` ของเบราว์เซอร์ ส่วนข้อมูลจริงอยู่ในตาราง `orders` และการดาวน์โหลดต้องยืนยันด้วยอีเมลเสมอ

### ความเร็ว

- หน้าร้านยังเป็น static (ISR 60 วินาที) — ไม่อ่าน cookie ตอน render สถานะสมาชิกถามจาก `/api/auth/me` หลังหน้าแสดงผล และถามเฉพาะเมื่อมี cookie บอกว่าล็อกอินอยู่ ผู้ใช้ทั่วไปจึงไม่มี request เพิ่ม
- ไม่มี Supabase SDK ใน bundle ของเบราว์เซอร์ (auth ทำที่ server ทั้งหมด, session อยู่ใน cookie แบบ httpOnly)
- middleware ทำงานเฉพาะ `/admin` · ไลบรารี Excel โหลดเฉพาะตอน import/export ฝั่ง server
- รูปสินค้าแสดงผ่าน `next/image` (ย่อขนาดตามจอและแปลงเป็น WebP/AVIF ให้เอง) สินค้าที่ไม่มีรูปใช้ภาพ SVG ในหน้า ไม่มี request เพิ่ม
- อีเมลรหัส OTP ถูกส่งตอนหน้ากรอกรหัสเปิด ไม่ใช่ตอน redirect กลับจาก Google ผู้ใช้จึงไม่ต้องรอ SMTP ก่อนเห็นหน้าจอ
- สถิติ Dashboard รวมยอดในฐานข้อมูล (`admin_stats`) ไม่ดึงคำสั่งซื้อทั้งหมดออกมานับ
- ไฟล์สินค้าอัปโหลดจากเบราว์เซอร์ตรงไป Storage ผ่าน signed URL ไม่ผ่าน serverless function

## แอป Desktop และ Mobile

ทั้งสองแอปเป็นตัวห่อที่เปิดเว็บร้านที่ deploy แล้ว จึงได้ฟีเจอร์เท่าเว็บและไม่ต้องดูแลโค้ดร้านซ้ำ

- **Desktop (Electron, MIT):** อยู่ในโฟลเดอร์ [desktop/](desktop/) ตั้งที่อยู่เว็บใน `desktop/config.json`

  ```bash
  cd desktop
  npm install
  npm start        # เปิดแอป
  npm run dist     # สร้างตัวติดตั้งของระบบปฏิบัติการที่กำลังใช้ (ผลอยู่ใน desktop/dist)
  ```

  ลิงก์นอกร้านเปิดในเบราว์เซอร์ของเครื่อง และมีหน้าแจ้งเมื่อเชื่อมต่อร้านไม่ได้
- **Mobile (MIT App Inventor):** โปรเจกต์ Android ที่มี `WebViewer` หนึ่งตัว ตั้ง `HomeUrl` เป็นที่อยู่เว็บ และใช้ `Screen1.BackPressed` เพื่อย้อนหน้า

## Tech stack

| ส่วน | ใช้อะไร |
| --- | --- |
| Web | Next.js 14 (App Router), React 18, TypeScript (strict) |
| Package manager | pnpm |
| Database / Storage / Auth | Supabase (PostgreSQL + Storage + Auth) |
| Email | Nodemailer + Gmail SMTP |
| Deploy | Vercel |

## โครงสร้างโปรเจกต์

```
app/                    หน้าเว็บ (App Router) + API routes
  api/orders/           สร้าง / ค้นหา / จ่ายเงินคำสั่งซื้อ
  api/download/         ออกลิงก์ดาวน์โหลด
  api/auth/             Google OAuth / ตรวจและส่งรหัส OTP / ออกจากระบบ
  api/account/          ประวัติคำสั่งซื้อของบัญชี
  api/admin/            สถิติ, สินค้า, อัปโหลด, import, export (ตรวจสิทธิ์ admin ทุก route)
  admin/                หน้าหลังบ้าน
middleware.ts           ต่ออายุ session ให้ /admin
components/admin/       UI ของหลังบ้าน
components/             Shell (header, footer, tab bar), ui (ปุ่ม การ์ด ฯลฯ), Plate (ภาพสินค้าแบบ SVG)
components/views/       UI ของแต่ละหน้า (client components)
lib/types.ts            type กลางของทั้งโปรเจกต์
lib/supabase.ts         Supabase client ฝั่ง server เท่านั้น (บังคับด้วย "server-only")
lib/catalog.ts          metadata ของสินค้า ตัวกรอง การเรียง และแคตตาล็อกตัวอย่าง
lib/catalogServer.ts    โหลดแคตตาล็อกสำหรับหน้าเว็บ (สินค้าจริง หรือ ตัวอย่างเมื่อฐานข้อมูลว่าง)
lib/apiClient.ts        ตัวเรียก API จากเบราว์เซอร์
lib/purchase.ts         ขั้นตอนการสั่งซื้อทั้งตะกร้า
lib/localOrders.ts      คำสั่งซื้อและใบเสร็จที่จำไว้ในเบราว์เซอร์
lib/email.ts            ส่งอีเมลลิงก์ดาวน์โหลด และอีเมลรหัส OTP
lib/auth.ts             session จาก cookie, ตรวจสิทธิ์ admin (server เท่านั้น)
lib/otp.ts              รหัส OTP ทางอีเมล: ออกรหัส ตรวจรหัส และ cookie ที่บอกว่าผ่านแล้ว
lib/admin.ts            ข้อมูลหลังบ้าน + ตรวจข้อมูลสินค้า (ใช้ทั้งฟอร์มและ import)
lib/csv.ts, sheets.ts   อ่าน/เขียน CSV และ Excel
lib/i18n.ts             ข้อความทั้งหมดของเว็บ ภาษา th / en (key มี type ตรวจตอน build)
lib/archive.ts          บทความในหน้า Archive
supabase/*.sql          ตาราง, function และ RLS
```

> หมายเหตุ: ในโค้ดและฐานข้อมูลยังใช้ชื่อเดิมจาก BookNest เช่น ตาราง `books`, bucket `ebooks`, ฟังก์ชัน `getBooks()` เพราะการเปลี่ยนชื่อต้องทำ migration ที่ Supabase ด้วย
>
> ถ้าฐานข้อมูลยังไม่มีสินค้าหรือเชื่อมต่อไม่ได้ หน้าร้านจะแสดง **แคตตาล็อกตัวอย่าง** พร้อมแถบแจ้งเตือน และปิดการสั่งซื้อไว้ เมื่อฐานข้อมูลมีสินค้า ระบบจะใช้สินค้าจริงแทนอัตโนมัติ

## เริ่มต้นใช้งาน

1. **สร้างโปรเจกต์ Supabase**
   - ไปที่ SQL Editor แล้วรันตามลำดับ: [supabase/schema.sql](supabase/schema.sql) → [supabase/marketplace.sql](supabase/marketplace.sql) → [supabase/admin.sql](supabase/admin.sql)
   - `admin.sql` สร้าง bucket `ebooks` แบบ **private** ให้แล้ว ไฟล์สินค้าอัปโหลดผ่านหน้า `/admin/products`
   - Authentication → URL Configuration: ใส่ Site URL ของเว็บ และเพิ่ม `https://<โดเมน>/auth/callback` (กับ `http://localhost:3000/auth/callback`) ใน Redirect URLs
   - Authentication → Providers → Google: ใส่ Client ID / Secret จาก Google Cloud Console แล้วตั้ง `AUTH_GOOGLE_ENABLED=true` (จำเป็น — เป็นทางเข้าสู่ระบบทางเดียว)
   - Authentication → Providers → Email: ปิดได้เลย เว็บไม่ใช้อีเมล + รหัสผ่านแล้ว
2. **ตั้งค่า env:** คัดลอก `.env.example` เป็น `.env.local` แล้วใส่ค่าจริง

   | ตัวแปร | มาจากไหน |
   | --- | --- |
   | `SUPABASE_URL` | Project Settings → API |
   | `SUPABASE_SECRET_KEY` | Project Settings → API (secret / service_role) **ใช้ฝั่ง server เท่านั้น** |
   | `SUPABASE_PUBLISHABLE_KEY` | Project Settings → API Keys → Publishable key (ชื่อเดิม anon key) ใช้ที่ server สำหรับ session ของสมาชิก |
   | `ADMIN_EMAILS` | อีเมลผู้ดูแล คั่นด้วย `,` (หรือรัน `update profiles set role = 'admin'` ท้ายไฟล์ `admin.sql`) |
   | `AUTH_GOOGLE_ENABLED` | `true` เมื่อเปิด Google provider ใน Supabase แล้ว — ถ้าไม่ตั้ง จะเข้าสู่ระบบไม่ได้ |
   | `SUPABASE_EBOOK_BUCKET` | ชื่อ bucket (ค่าเริ่มต้น `ebooks`) |
   | `SMTP_USER` / `SMTP_PASS` | Gmail + App Password (ต้องเปิด 2-Step Verification ก่อน) ใส่เครื่องหมายคำพูดครอบถ้ารหัสมีช่องว่าง ใช้ส่งทั้งลิงก์ดาวน์โหลดและรหัส OTP — ถ้าเว้นว่างตอน `pnpm dev` รหัส OTP จะแสดงใน log ของ server แทน ส่วน production จะเข้าสู่ระบบไม่ได้ |
   | `EMAIL_FROM` | เช่น `"VECTOR <your.gmail@gmail.com>"` |

3. **รัน** (ต้องมี Node 20+ และ pnpm — เปิดใช้ด้วย `corepack enable`)

   ```bash
   pnpm install
   pnpm dev         # http://localhost:3000
   ```

   | คำสั่ง | ทำอะไร |
   | --- | --- |
   | `pnpm dev` | รันโหมดพัฒนา |
   | `pnpm build` | build สำหรับ production (ตรวจ type และ lint ด้วย) |
   | `pnpm start` | รันผล build |
   | `pnpm typecheck` | ตรวจ type อย่างเดียว |
   | `pnpm lint` | ตรวจ ESLint |

4. **ตั้งผู้ดูแล:** เข้าสู่ระบบที่ `/login` ด้วยบัญชี Google ที่อีเมลตรงกับ `ADMIN_EMAILS` แล้วเข้า `/admin`

5. **(ทางเลือก) Supabase แบบ local:** ต้องมี Docker

   ```bash
   npx supabase start    # ได้ API ที่ http://127.0.0.1:54321 และ DB ที่พอร์ต 54322
   for f in schema marketplace admin; do psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f supabase/$f.sql; done
   ```

   แล้วใส่ URL / anon key / service_role key ที่คำสั่งพิมพ์ออกมาใน `.env.development.local` (มีผลเฉพาะ `pnpm dev`)

6. **Deploy บน Vercel:** ใส่ env ชุดเดียวกันใน Project Settings → Environment Variables (Vercel ใช้ pnpm อัตโนมัติเมื่อเห็น `pnpm-lock.yaml`)

## แก้ปัญหาที่เจอบ่อย

**`getBooks: TypeError: fetch failed` เว็บโหลดช้าและไม่มีสินค้าขึ้น**
เซิร์ฟเวอร์ต่อ Supabase ไม่ได้ ให้ตรวจตามนี้

```bash
nslookup <project-ref>.supabase.co
```

- **ได้ `NXDOMAIN`:** โปรเจกต์ถูก pause หรือถูกลบ หรือ URL พิมพ์ผิด ให้เข้า Supabase Dashboard แล้วกด Restore หรือสร้างโปรเจกต์ใหม่ จากนั้นอัปเดต `SUPABASE_URL` / `SUPABASE_SECRET_KEY` และรีสตาร์ท `pnpm dev`
- โปรเจกต์ Free Tier จะถูก pause อัตโนมัติถ้าไม่มีคนใช้งานประมาณ 1 สัปดาห์
- ใน `lib/supabase.ts` ตั้ง timeout ไว้ 2.5 วินาที ถ้าต่อ Supabase ไม่ได้ หน้าเว็บจะแสดงรายการว่างแทนการค้าง

---

## แนวทางการออกแบบ (Design Guidelines)

### หลักคิด

"Precision without complexity" — หน้าตาแบบเอกสารวิศวกรรม: สงบ แม่นยำ อ่านง่าย ไม่ใช่ sci-fi

- ให้ข้อมูลนำ: ทุกสินค้าบอกรูปแบบไฟล์ เวอร์ชัน ไลเซนส์ และการจัดส่งในตำแหน่งเดียวกันเสมอ
- ใช้เส้นบางและช่องว่างจัดกลุ่ม ไม่ใช้การ์ดถ้าไม่จำเป็น
- สีเน้นใช้น้อยที่สุด ถ้าทุกอย่างเด่น จะไม่มีอะไรเด่น

### Layout ตามขนาดจอ

| ขนาดจอ | Layout |
| --- | --- |
| มากกว่า 1120px | header เต็ม เนื้อหากว้างสุด 1320px แคตตาล็อกมี sidebar ตัวกรอง |
| 861–1120px | ซ่อนป้ายข้อความของปุ่มใน header กริดสินค้าเหลือ 2 คอลัมน์ |
| ไม่เกิน 860px | ออกแบบใหม่สำหรับมือถือ: เมนูเต็มจอ แท็บบาร์ล่างจอ ตัวกรองเป็น bottom sheet ปุ่มหลักติดล่างจอ ตารางคลังเปลี่ยนเป็นรายการ |

### สี

token ทั้งหมดอยู่ใน `:root` ของ [app/globals.css](app/globals.css)

| Token | ค่า | ใช้กับ |
| --- | --- | --- |
| `--bg` | `#F4F3EF` | พื้นหลังหลัก |
| `--surface` | `#FFFFFF` | แผงข้อมูล ช่องกรอก |
| `--ink` / `--ink-2` | `#17191C` / `#3A3E44` | ข้อความหลัก / รอง |
| `--muted` | `#5C6066` | ป้ายกำกับ ข้อมูลประกอบ |
| `--line` | `#D9D9D5` | เส้นแบ่ง |
| `--blue` | `#1F3A68` | ปุ่มหลัก ลิงก์ สถานะปัจจุบัน |
| `--navy` | `#13243F` | hero, footer, แถบบนสุด |
| `--red` | `#B3261E` | ข้อผิดพลาด ส่วนลด |
| `--amber` | `#7A5200` | คำเตือน สถานะรอ |

### ตัวอักษร

- IBM Plex Sans + IBM Plex Sans Thai สำหรับข้อความ, IBM Plex Mono สำหรับ metadata (รหัสสินค้า เวอร์ชัน วันที่ สถานะ)
- โหลดผ่าน `next/font` ใน [app/layout.tsx](app/layout.tsx) จึงเสิร์ฟจากโดเมนเดียวกัน ไม่มี request ไปภายนอกตอนใช้งาน
- ตัวอักษรพื้นฐาน 16px, line-height 1.6 หัวข้อภาษาไทยใช้ line-height มากกว่าภาษาอังกฤษ
- ป้ายสั้นแบบ `PRODUCT / 001` ใช้ mono ตัวพิมพ์ใหญ่ และใช้เท่าที่ช่วยให้อ่านข้อมูลง่ายขึ้น

### รูปทรง

- มุมเหลี่ยม ไม่มีเงา ใช้เส้น 1px เป็นตัวแบ่ง
- ภาพสินค้า ([components/Plate.tsx](components/Plate.tsx)) เป็นแบบร่างเชิงเทคนิคที่วาดด้วย SVG ตามหมวดหมู่สินค้า ไม่ต้องใช้ไฟล์รูป

### ข้อความและภาษา

- ข้อความทุกคำที่ผู้ใช้เห็นต้องอยู่ใน [lib/i18n.ts](lib/i18n.ts) และมีครบทั้ง `th` และ `en` (ถ้า key ขาดในภาษาอังกฤษ หรือเรียก key ที่ไม่มี จะ build ไม่ผ่าน)
- เรียกของที่ขายว่า "สินค้าดิจิทัล" หรือ "digital product"
- ข้อความแจ้ง error ต้องบอกว่าผู้ใช้ควรทำอะไรต่อ ไม่แสดง stack trace หรือข้อความจากระบบให้ผู้ใช้เห็น

### การเข้าถึง (Accessibility)

- contrast ของข้อความผ่าน WCAG AA ขอบช่องกรอกมี contrast อย่างน้อย 3:1
- ทุกองค์ประกอบมี focus ring ที่มองเห็นได้เมื่อใช้คีย์บอร์ด และมีลิงก์ "ข้ามไปยังเนื้อหา"
- เป้าสัมผัสอย่างน้อย 44px บนมือถือ
- สถานะไม่พึ่งสีอย่างเดียว มีข้อความหรือไอคอนกำกับเสมอ
- เคารพ `prefers-reduced-motion`

## ข้อจำกัด

- การชำระเงินเป็นการจำลองทั้งหมด (ยังไม่ได้ต่อ Stripe)
- Google login ต้องตั้งค่า OAuth client ใน Supabase ก่อน — โค้ดพร้อมแล้วแต่ยังไม่ได้ทดสอบกับ Google จริง
- ยังไม่มีหน้าแก้โปรไฟล์ ระบบคืนเงิน หรือคูปอง
- คำสั่งซื้อแบบ guest ไม่ถูกผูกเข้าบัญชีอัตโนมัติจากอีเมล (ต้องค้นด้วยเลขคำสั่งซื้อ + อีเมลในคลังของฉัน)
- Import รองรับเฉพาะสินค้า (ผู้ใช้และยอดขายส่งออกได้อย่างเดียว) และจัดการร้านค้า (shops) ยังต้องทำผ่าน SQL
- Dashboard อัปเดตด้วยการถามซ้ำทุก 15 วินาที ไม่ใช่ Supabase Realtime
- Gmail SMTP ส่งอีเมลได้จำกัดต่อวัน เหมาะกับการสาธิตเท่านั้น
