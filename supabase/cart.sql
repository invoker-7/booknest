-- =========================================================
-- VECTOR — หนึ่งตะกร้า = หนึ่งคำสั่งซื้อ (รันต่อจาก schema.sql, marketplace.sql, admin.sql)
-- วิธีใช้: Supabase Dashboard > SQL Editor > วางทั้งไฟล์ > Run
-- รันซ้ำได้ ไม่ลบและไม่แก้ข้อมูลเดิม
-- =========================================================
-- ตาราง orders เก็บหนึ่งแถวต่อสินค้าหนึ่งชิ้น (ไฟล์ สถานะจัดส่ง และสิทธิ์ดาวน์โหลดเป็นของแต่ละชิ้น)
-- cart_no ผูกแถวที่ซื้อพร้อมกันเข้าเป็นคำสั่งซื้อเดียว: เลขที่ลูกค้าและร้านเห็น ยอดรวมเดียว สลิปใบเดียว
--   แถวแรกของตะกร้า  order_no = cart_no           (ORD-20261008-003)
--   แถวถัดไป          order_no = cart_no || '-2'… (ORD-20261008-003-2)
-- คำสั่งซื้อเก่า cart_no เป็น null = ตะกร้าที่มีชิ้นเดียว ใช้ order_no เป็นเลขคำสั่งซื้อ

alter table public.orders add column if not exists cart_no text;
create index if not exists orders_cart_no_idx on public.orders (cart_no);

-- ---------- มุมมองระดับคำสั่งซื้อ (หนึ่งแถวต่อหนึ่งตะกร้า) สำหรับหลังบ้าน ----------
-- security_invoker: ใช้สิทธิ์ของผู้เรียก จึงอยู่ใต้ RLS ของ orders (anon/authenticated อ่านไม่ได้เหมือนเดิม)
create or replace view public.order_carts
with (security_invoker = true)
as
select
  coalesce(o.cart_no, o.order_no)                    as cart_no,
  min(o.created_at)                                  as created_at,
  max(o.paid_at)                                     as paid_at,
  -- จัดส่งครบทุกชิ้นแล้วเท่านั้นจึงถือว่าจัดส่งแล้ว
  case when bool_and(o.delivered_at is not null) then max(o.delivered_at) end as delivered_at,
  sum(o.amount)::integer                             as amount,
  count(*)::integer                                  as items,
  min(o.customer_name)                               as customer_name,
  min(o.customer_email)                              as customer_email,
  case
    when bool_or(o.status = 'PENDING')              then 'PENDING'
    when bool_or(o.status in ('PAID', 'PROCESSING')) then 'PAID'
    else 'COMPLETED'
  end                                                as status,
  bool_or(o.email_sent is false and o.email_note is not null) as email_failed
from public.orders o
group by coalesce(o.cart_no, o.order_no);

revoke all on public.order_carts from public, anon, authenticated;
grant select on public.order_carts to service_role;

-- ---------- สถิติ: "จำนวนคำสั่งซื้อ" นับเป็นตะกร้า ไม่ใช่จำนวนชิ้น ----------
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
           coalesce(o.cart_no, o.order_no) as cart_no,
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
    select day, sum(amount) as sales, count(distinct cart_no) as orders from cur group by day
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
    'orders',    (select count(distinct cart_no) from paid),
    'customers', (select count(distinct customer_email) from paid),
    'products',  (select count(*) from books where published is not false),
    'cur',  (select jsonb_build_object('sales', coalesce(sum(amount), 0), 'orders', count(distinct cart_no), 'customers', count(distinct customer_email)) from cur),
    'prev', (select jsonb_build_object('sales', coalesce(sum(amount), 0), 'orders', count(distinct cart_no), 'customers', count(distinct customer_email)) from prev),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'day', s.day, 'sales', coalesce(x.sales, 0), 'orders', coalesce(x.orders, 0)
      ) order by s.day), '[]'::jsonb)
      from series s left join per_day x using (day)
    ),
    'top', (select coalesce(jsonb_agg(to_jsonb(top)), '[]'::jsonb) from top)
  );
$$;

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
           count(distinct coalesce(cart_no, order_no)) filter (where status <> 'PENDING') as orders,
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

revoke all on function public.admin_stats(integer) from public, anon, authenticated;
revoke all on function public.admin_customers() from public, anon, authenticated;
grant execute on function public.admin_stats(integer) to service_role;
grant execute on function public.admin_customers() to service_role;
