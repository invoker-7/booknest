-- =========================================================
-- VECTOR — ความคิดเห็นใต้บทความ (รันต่อจาก content.sql)
-- วิธีใช้: Supabase Dashboard > SQL Editor > วางทั้งไฟล์ > Run
-- รันซ้ำได้ ไม่ลบและไม่แก้ข้อมูลเดิม
-- =========================================================

create table if not exists public.article_comments (
  id          uuid primary key default gen_random_uuid(),
  article     text not null references public.articles(slug) on delete cascade on update cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null default '',                 -- ชื่อที่แสดง ณ ตอนเขียน
  body        text not null check (char_length(body) between 1 and 1000),
  created_at  timestamptz not null default now()
);
create index if not exists article_comments_article_idx on public.article_comments (article, created_at desc);
create index if not exists article_comments_user_idx on public.article_comments (user_id, created_at desc);

alter table public.article_comments enable row level security;
drop policy if exists "comments are readable by everyone" on public.article_comments;
create policy "comments are readable by everyone"
  on public.article_comments for select using (true);
-- เขียน/ลบ ทำผ่าน server ด้วย secret key หลังตรวจว่าล็อกอินแล้ว (ไม่มี policy สำหรับเขียน)
