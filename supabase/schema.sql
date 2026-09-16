-- =========================================================
-- BookNest — Supabase schema
-- วิธีใช้: Supabase Dashboard > SQL Editor > New query > วางทั้งไฟล์ > Run
-- =========================================================

-- ---------- 1. ตารางหนังสือ ----------
create table if not exists public.books (
  id          text primary key,              -- slug เช่น 'clean-code'
  title_th    text not null,
  title_en    text not null,
  short_th    text not null,
  short_en    text not null,
  long_th     text not null,
  long_en     text not null,
  author_th   text not null,
  author_en   text not null,
  price       integer not null,              -- บาท
  list_price  integer not null,
  rating      numeric(2,1) default 4.5,
  reviews     integer default 0,
  pages       integer default 200,
  file_size   text default '4 MB',
  cover       text default 'clean',          -- ชื่อชุดปก: clean | design | mindset
  file_path   text not null,                 -- path ในบั๊กเก็ต เช่น 'clean-code.pdf'
  sort        integer default 0,
  created_at  timestamptz default now()
);

-- ---------- 2. ตารางคำสั่งซื้อ ----------
create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  order_no        text unique not null,      -- ORD-20260916-001
  book_id         text not null references public.books(id),
  customer_name   text not null,
  customer_email  text not null,
  amount          integer not null,
  status          text not null default 'PENDING'
                  check (status in ('PENDING','PAID','PROCESSING','COMPLETED')),
  paid_at         timestamptz,
  email_sent      boolean default false,
  email_note      text,
  delivered_at    timestamptz,
  created_at      timestamptz default now()
);

create index if not exists orders_lookup_idx
  on public.orders (order_no, customer_email);

-- ---------- 3. ตัวนับเลขคำสั่งซื้อรายวัน ----------
create table if not exists public.order_counters (
  day date primary key,
  n   integer not null default 0
);

create or replace function public.next_order_no()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  d date := (now() at time zone 'Asia/Bangkok')::date;
  c integer;
begin
  insert into public.order_counters(day, n) values (d, 1)
  on conflict (day) do update set n = public.order_counters.n + 1
  returning n into c;

  return 'ORD-' || to_char(d, 'YYYYMMDD') || '-' || lpad(c::text, 3, '0');
end;
$$;

-- ---------- 4. Row Level Security ----------
-- books: ใครก็อ่านได้ (เป็นข้อมูลหน้าร้าน) แต่เขียนไม่ได้
alter table public.books enable row level security;
drop policy if exists "books are readable by everyone" on public.books;
create policy "books are readable by everyone"
  on public.books for select
  to anon, authenticated
  using (true);

-- orders: ไม่มี policy เลย = anon/authenticated อ่านหรือเขียนไม่ได้เด็ดขาด
-- มีเฉพาะ secret key (service_role) ฝั่ง server ที่ข้าม RLS ได้
alter table public.orders enable row level security;
alter table public.order_counters enable row level security;

-- ---------- 5. ข้อมูลตัวอย่าง 3 เล่ม ----------
insert into public.books
(id, title_th, title_en, short_th, short_en, long_th, long_en,
 author_th, author_en, price, list_price, rating, reviews, pages, file_size, cover, file_path, sort)
values
('clean-code',
 'Clean Code Better Software', 'Clean Code Better Software',
 'พัฒนาทักษะการเขียนโค้ดที่สะอาดและยั่งยืน',
 'Build the habit of writing code that lasts',
 'เรียนรู้หลักการเขียนโค้ดที่อ่านง่าย แก้ไขง่าย และดูแลรักษาได้ในระยะยาว พร้อมตัวอย่างการรีแฟกเตอร์จริงที่นำไปใช้กับโปรเจกต์ของคุณได้ทันที',
 'Learn the principles behind code that is easy to read, easy to change, and cheap to maintain — with real refactoring examples you can apply to your own project today.',
 'ธนกร วิริยะกุล', 'Thanakorn Wiriyakul',
 299, 399, 4.8, 124, 248, '4.2 MB', 'clean', 'clean-code.pdf', 1),

('design-thinking',
 'Design Thinking 101', 'Design Thinking 101',
 'เริ่มต้นออกแบบโดยเข้าใจผู้ใช้จริง',
 'Start designing from real user needs',
 'กระบวนการคิดเชิงออกแบบตั้งแต่การสัมภาษณ์ผู้ใช้ ตั้งโจทย์ ระดมไอเดีย จนถึงการทำต้นแบบและทดสอบ เขียนแบบเข้าใจง่ายสำหรับคนที่ไม่เคยเรียนสายออกแบบมาก่อน',
 'The full design-thinking loop — interviewing users, framing the problem, generating ideas, prototyping and testing — written plainly for people with no design background.',
 'ปิยะดา ศรีสุข', 'Piyada Srisuk',
 259, 329, 4.6, 87, 196, '6.8 MB', 'design', 'design-thinking.pdf', 2),

('mindset-shift',
 'The Mindset Shift', 'The Mindset Shift',
 'เปลี่ยนวิธีคิด เปลี่ยนผลลัพธ์ของงาน',
 'Change how you think, change what you ship',
 'รวมแนวคิดและแบบฝึกหัดสั้น ๆ ที่ช่วยให้คุณรับมือกับความล้มเหลว สร้างนิสัยใหม่ และทำงานยากให้เดินหน้าได้อย่างต่อเนื่อง',
 'Short ideas and exercises that help you handle setbacks, build new habits, and keep hard work moving forward day after day.',
 'นภัส เจริญพงศ์', 'Napat Charoenpong',
 199, 249, 4.7, 203, 164, '2.9 MB', 'mindset', 'mindset-shift.pdf', 3)
on conflict (id) do nothing;

-- =========================================================
-- 6. Storage — ต้องทำในหน้า Dashboard
-- =========================================================
-- Storage > New bucket
--   Name: ebooks
--   Public bucket: ปิด (ต้องเป็น private)
-- แล้วอัปโหลดไฟล์ 3 ไฟล์ให้ชื่อตรงกับ file_path ข้างบน:
--   clean-code.pdf / design-thinking.pdf / mindset-shift.pdf
-- (ใช้ PDF อะไรก็ได้สำหรับทดสอบ)
--
-- ไม่ต้องสร้าง storage policy เพราะ server ใช้ secret key
-- สร้าง signed URL อายุ 24 ชม. ให้เฉพาะคำสั่งซื้อที่สถานะ PAID แล้วเท่านั้น
