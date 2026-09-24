-- =========================================================
-- Digital Finder — เปลี่ยนเป็นแพลตฟอร์มฝากขาย (marketplace)
-- วิธีใช้: Supabase Dashboard > SQL Editor > วางทั้งไฟล์ > Run
-- รันซ้ำได้ ไม่ลบข้อมูลคำสั่งซื้อเดิม
-- =========================================================

-- ---------- 1. ร้านค้าที่มาฝากขาย ----------
create table if not exists public.shops (
  id          text primary key,              -- slug เช่น 'pixel-studio'
  name        text not null,
  bio_th      text default '',
  bio_en      text default '',
  created_at  timestamptz default now()
);

alter table public.shops enable row level security;
drop policy if exists "shops are readable by everyone" on public.shops;
create policy "shops are readable by everyone"
  on public.shops for select to anon, authenticated using (true);

-- ---------- 2. สินค้า (ยังใช้ตาราง books เดิม) ----------
alter table public.books add column if not exists shop_id   text references public.shops(id);
alter table public.books add column if not exists kind      text default 'template';  -- template | uikit | guide | preset
alter table public.books add column if not exists published boolean default true;

-- ---------- 3. เอาสินค้าตัวอย่างเดิมออกจากหน้าร้าน ----------
-- ซ่อนแทนการลบ เพราะคำสั่งซื้อเก่ายังอ้างถึงอยู่
update public.books set published = false
  where id in ('clean-code', 'design-thinking', 'mindset-shift');

-- ---------- 4. ตัวอย่างการลงขาย (แก้ค่าแล้วเอา -- ออกเมื่อพร้อม) ----------
-- insert into public.shops (id, name, bio_th, bio_en) values
--   ('pixel-studio', 'Pixel Studio', 'ทีมออกแบบ UI จากเชียงใหม่', 'UI design team from Chiang Mai');
--
-- insert into public.books
--   (id, shop_id, kind, title_th, title_en, short_th, short_en, long_th, long_en,
--    author_th, author_en, price, list_price, pages, file_size, file_path, sort)
-- values
--   ('landing-kit', 'pixel-studio', 'uikit',
--    'Landing Page UI Kit', 'Landing Page UI Kit',
--    'ชุด UI สำหรับหน้า landing', 'UI kit for landing pages',
--    'คอมโพเนนต์กว่า 60 ชิ้น พร้อมใช้ใน Figma', '60+ ready-to-use Figma components',
--    'Pixel Studio', 'Pixel Studio', 390, 490, 1, '18 MB', 'landing-kit.zip', 1);
