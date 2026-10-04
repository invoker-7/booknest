-- =========================================================
-- VECTOR — สมาชิก + หลังบ้าน (รันต่อจาก schema.sql และ marketplace.sql)
-- วิธีใช้: Supabase Dashboard > SQL Editor > วางทั้งไฟล์ > Run
-- รันซ้ำได้ ไม่ลบข้อมูลเดิม
-- =========================================================

-- ---------- 1. โปรไฟล์สมาชิก (หนึ่งแถวต่อหนึ่งบัญชีใน auth.users) ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  name        text default '',
  role        text not null default 'customer' check (role in ('customer', 'admin')),
  created_at  timestamptz default now()
);

-- ไม่มี policy = anon/authenticated อ่านหรือแก้ไม่ได้ (รวมถึงแก้ role ตัวเอง)
-- server อ่านด้วย secret key หลังตรวจ session แล้วเท่านั้น
alter table public.profiles enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- บัญชีที่สมัครไว้ก่อนรันไฟล์นี้
insert into public.profiles (id, email, name)
select id, coalesce(email, ''), coalesce(raw_user_meta_data ->> 'name', raw_user_meta_data ->> 'full_name', '')
from auth.users
on conflict (id) do nothing;

-- ---------- 2. ผูกคำสั่งซื้อกับบัญชี (ซื้อแบบไม่ล็อกอินได้เหมือนเดิม = null) ----------
alter table public.orders add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists orders_user_idx on public.orders (user_id);
create index if not exists orders_created_idx on public.orders (created_at desc);

-- ---------- 3. ข้อมูลสินค้าที่หลังบ้านแก้ไขได้ ----------
alter table public.books add column if not exists version  text default '1.0';
alter table public.books add column if not exists license  text;   -- personal | commercial | mit
alter table public.books add column if not exists platform text;   -- notion | figma | code | pdf | adobe
alter table public.books add column if not exists format   text;   -- เช่น 'ZIP · Source code'

-- ---------- 4. บั๊กเก็ตไฟล์สินค้า (private) ----------
insert into storage.buckets (id, name, public)
values ('ebooks', 'ebooks', false)
on conflict (id) do nothing;

-- ---------- 5. สถิติหน้า Dashboard (รวมยอดในฐานข้อมูล ไม่ต้องดึงคำสั่งซื้อทั้งหมดออกมา) ----------
create or replace function public.admin_stats(days integer default 30)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with b as (
    select (now() at time zone 'Asia/Bangkok')::date as today
  ),
  paid as (
    select o.book_id, o.amount, o.customer_email,
           (o.created_at at time zone 'Asia/Bangkok')::date as day
    from orders o
    where o.status <> 'PENDING'
  ),
  cur as (
    select p.* from paid p, b where p.day > b.today - days
  ),
  prev as (
    select p.* from paid p, b where p.day <= b.today - days and p.day > b.today - days * 2
  ),
  series as (
    select d::date as day
    from b, generate_series(b.today - (days - 1), b.today, interval '1 day') as d
  ),
  per_day as (
    select day, sum(amount) as sales, count(*) as orders from cur group by day
  ),
  top as (
    select k.id, k.title_th as title, k.kind, count(*) as sold, sum(p.amount) as revenue
    from paid p join books k on k.id = p.book_id
    group by k.id
    order by sold desc, revenue desc
    limit 5
  )
  select jsonb_build_object(
    'sales',     (select coalesce(sum(amount), 0) from paid),
    'orders',    (select count(*) from paid),
    'customers', (select count(distinct customer_email) from paid),
    'products',  (select count(*) from books where published is not false),
    'cur',  (select jsonb_build_object('sales', coalesce(sum(amount), 0), 'orders', count(*), 'customers', count(distinct customer_email)) from cur),
    'prev', (select jsonb_build_object('sales', coalesce(sum(amount), 0), 'orders', count(*), 'customers', count(distinct customer_email)) from prev),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'day', s.day, 'sales', coalesce(x.sales, 0), 'orders', coalesce(x.orders, 0)
      ) order by s.day), '[]'::jsonb)
      from series s left join per_day x using (day)
    ),
    'top', (select coalesce(jsonb_agg(to_jsonb(top)), '[]'::jsonb) from top)
  );
$$;

-- ---------- 6. รายชื่อลูกค้า: สมาชิก + ผู้ซื้อแบบไม่ล็อกอิน พร้อมยอดซื้อ ----------
create or replace function public.admin_customers()
returns table (
  email   text,
  name    text,
  member  boolean,
  role    text,
  joined  timestamptz,
  orders  bigint,
  spent   bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with o as (
    select lower(customer_email) as email,
           max(customer_name) as name,
           count(*) filter (where status <> 'PENDING') as orders,
           coalesce(sum(amount) filter (where status <> 'PENDING'), 0) as spent,
           min(created_at) as first_order
    from orders
    group by lower(customer_email)
  )
  select coalesce(p.email, o.email),
         coalesce(nullif(p.name, ''), o.name, ''),
         p.id is not null,
         p.role,
         coalesce(p.created_at, o.first_order),
         coalesce(o.orders, 0),
         coalesce(o.spent, 0)
  from profiles p
  full outer join o on o.email = lower(p.email)
  order by 7 desc, 5 desc;
$$;

-- ฟังก์ชันหลังบ้านเรียกได้เฉพาะ server (secret key)
revoke all on function public.admin_stats(integer) from public, anon, authenticated;
revoke all on function public.admin_customers() from public, anon, authenticated;
grant execute on function public.admin_stats(integer) to service_role;
grant execute on function public.admin_customers() to service_role;

-- ---------- 7. ตั้งผู้ดูแลระบบ ----------
-- สมัครสมาชิกผ่านหน้าเว็บก่อน แล้วรันบรรทัดนี้ด้วยอีเมลของคุณ
-- (หรือใส่อีเมลใน ADMIN_EMAILS ของ .env.local ก็ได้ผลเหมือนกัน)
-- update public.profiles set role = 'admin' where email = 'you@example.com';
