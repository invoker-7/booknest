-- =========================================================
-- VECTOR — บทความ + รีวิวสินค้า (รันต่อจาก schema.sql, marketplace.sql, admin.sql, cart.sql)
-- วิธีใช้: Supabase Dashboard > SQL Editor > วางทั้งไฟล์ > Run
-- รันซ้ำได้ ไม่ลบและไม่แก้ข้อมูลเดิม
-- =========================================================

-- ---------- 1. บทความ (เขียนและแก้ไขจากหลังบ้าน /admin/articles) ----------
create table if not exists public.articles (
  slug          text primary key,                       -- ใช้ใน URL เช่น 'choosing-a-payment-method'
  type          text not null default 'article'
                check (type in ('story', 'note', 'guide', 'article', 'update')),
  title_th      text not null,
  title_en      text not null default '',
  dek_th        text not null default '',               -- คำโปรยใต้หัวเรื่อง
  dek_en        text not null default '',
  body_th       text not null default '',               -- ข้อความธรรมดา เว้นบรรทัด = ขึ้นย่อหน้าใหม่
  body_en       text not null default '',
  author        text not null default 'VECTOR',
  product       text references public.books(id) on delete set null,   -- สินค้าที่บทความพูดถึง (ถ้ามี)
  published     boolean not null default true,
  published_at  timestamptz not null default now(),
  created_at    timestamptz not null default now()
);
create index if not exists articles_published_idx on public.articles (published, published_at desc);

alter table public.articles enable row level security;
drop policy if exists "published articles are readable by everyone" on public.articles;
create policy "published articles are readable by everyone"
  on public.articles for select using (published);
-- เขียน/แก้/ลบ ทำผ่าน server ด้วย secret key หลังตรวจสิทธิ์ admin เท่านั้น (ไม่มี policy สำหรับเขียน)

-- ---------- 2. รีวิวสินค้า (ผู้ซื้อที่จ่ายเงินแล้วเท่านั้น คนละหนึ่งรีวิวต่อสินค้า) ----------
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  book_id     text not null references public.books(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null default '',                 -- ชื่อที่แสดง ณ ตอนเขียนรีวิว
  rating      smallint not null check (rating between 1 and 5),
  body        text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (book_id, user_id)
);
create index if not exists reviews_book_idx on public.reviews (book_id, created_at desc);

alter table public.reviews enable row level security;
drop policy if exists "reviews are readable by everyone" on public.reviews;
create policy "reviews are readable by everyone"
  on public.reviews for select using (true);
-- เขียนรีวิวทำผ่าน server ซึ่งตรวจว่าเป็นผู้ซื้อจริงก่อน (ไม่มี policy สำหรับเขียน)

-- คะแนนเฉลี่ยและจำนวนรีวิวของสินค้า (books.rating, books.reviews) คำนวณจากรีวิวจริงเสมอ
create or replace function public.refresh_book_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target text := coalesce(new.book_id, old.book_id);
begin
  update books b
     set rating  = coalesce((select round(avg(r.rating)::numeric, 1) from reviews r where r.book_id = target), 0),
         reviews = (select count(*) from reviews r where r.book_id = target)
   where b.id = target;
  return null;
end;
$$;

drop trigger if exists on_review_changed on public.reviews;
create trigger on_review_changed
  after insert or update or delete on public.reviews
  for each row execute function public.refresh_book_rating();

-- สินค้าที่ยังไม่มีรีวิวจริง: ล้างคะแนนตั้งต้น (4.5) ที่ไม่ได้มาจากผู้ซื้อ
update public.books b
   set rating = 0, reviews = 0
 where not exists (select 1 from public.reviews r where r.book_id = b.id)
   and (b.rating <> 0 or b.reviews <> 0);

-- ---------- 3. บทความชุดแรก (ลบหรือแก้ได้ที่ /admin/articles) ----------
insert into public.articles (slug, type, title_th, title_en, dek_th, dek_en, body_th, body_en, author, product, published_at)
select v.slug, v.type, v.title_th, v.title_en, v.dek_th, v.dek_en, v.body_th, v.body_en, 'VECTOR Studio',
       (select id from public.books where id = v.product), v.published_at
from (values
  (
    'choosing-a-payment-method', 'guide',
    'เลือกวิธีรับชำระเงินสำหรับร้านขายของดิจิทัล',
    'Choosing a payment method for a digital store',
    'โอนแล้วแนบสลิป ตรวจสลิปอัตโนมัติ หรือ payment gateway แต่ละแบบเหมาะกับร้านขนาดไหน',
    'Transfer and slip, automatic slip checks, or a payment gateway: which fits a shop of your size.',
    $th$ร้านขายของดิจิทัลไม่มีขั้นตอนแพ็กของและไม่มีค่าส่ง สิ่งเดียวที่คั่นระหว่างลูกค้ากับไฟล์คือการยืนยันว่าจ่ายเงินแล้ว วิธีที่ร้านเลือกจึงกำหนดทั้งประสบการณ์ของลูกค้าและงานประจำวันของเจ้าของร้าน

แบบแรกคือ QR พร้อมเพย์แล้วให้ลูกค้าแนบสลิป เงินเข้าบัญชีร้านทันที ไม่มีค่าธรรมเนียม และไม่ต้องสมัครอะไรเพิ่ม ข้อเสียคือเจ้าของร้านต้องเปิดดูสลิปแล้วกดยืนยันเอง ลูกค้าที่ซื้อตอนตีสองต้องรอถึงเช้า เหมาะกับร้านที่เพิ่งเริ่มและมีคำสั่งซื้อวันละไม่กี่ใบ

แบบที่สองคือเพิ่มบริการตรวจสลิปเข้าไป ลูกค้ายังโอนและแนบสลิปเหมือนเดิม แต่ระบบส่งสลิปไปตรวจกับธนาคารให้ ถ้ายอดตรง บัญชีผู้รับถูก และสลิปยังไม่เคยใช้ ก็ส่งไฟล์ได้ทันที เงินยังเข้าบัญชีร้านโดยตรง แลกกับค่าบริการรายเดือนหรือรายสลิป

แบบที่สามคือ payment gateway ลูกค้าจ่ายด้วยบัตรหรือสแกน QR บนหน้าของผู้ให้บริการ แล้วผู้ให้บริการแจ้งร้านเองว่าได้เงินแล้ว ไม่มีสลิปและไม่มีขั้นตอนตรวจ เป็นประสบการณ์ที่ลื่นที่สุด แต่มีค่าธรรมเนียมต่อรายการ ต้องยืนยันตัวตนก่อนรับเงินจริง และเงินเข้าบัญชีช้ากว่าการโอนตรง

ร้านจำนวนมากเปิดสองทางพร้อมกัน ให้ลูกค้าที่อยากได้ของทันทีจ่ายผ่าน gateway และให้ลูกค้าที่คุ้นกับการโอนใช้ QR ของร้าน ไม่ว่าจะเลือกแบบไหน หลักที่ต้องยึดมีข้อเดียว ยอดเงินต้องอ่านจากฐานข้อมูลของร้านเสมอ อย่าเชื่อตัวเลขที่ส่งมาจากเบราว์เซอร์$th$,
    $en$A digital store has no packing and no shipping. The only thing between a customer and their file is confirming that they paid, so the payment method you choose shapes both the buying experience and your daily workload.

The first option is a PromptPay QR with a slip upload. Money lands in your account at once, there are no fees and nothing to sign up for. The cost is that you check each slip and confirm by hand, so a customer who buys at 2 a.m. waits until morning. It suits a new shop with a handful of orders a day.

The second option adds a slip verification service. Customers still transfer and upload a slip, but the system checks it with the bank. If the amount matches, the receiving account is yours and the slip has not been used before, the file is delivered immediately. Money still goes straight to you, in exchange for a monthly or per-slip fee.

The third option is a payment gateway. Customers pay by card or QR on the provider's page and the provider tells your shop when the money has arrived. There is no slip and nothing to check. It is the smoothest experience, but there is a fee per transaction, identity verification before you can take real money, and a delay before funds reach your bank.

Many shops offer two of these side by side. Whichever you choose, one rule holds: always read the amount from your own database, never from the browser.$en$,
    'promptpay-qr-toolkit', timestamptz '2026-10-06 09:00+07'
  ),
  (
    'why-plain-css', 'note',
    'เบื้องหลัง Dashboard UI Kit: ทำไมเราใช้ CSS ล้วน',
    'Behind Dashboard UI Kit: why we chose plain CSS',
    'ชุด UI ที่ไม่ต้อง build และไม่มี dependency เกิดจากข้อจำกัดที่เราตั้งให้ตัวเอง',
    'A UI kit with no build step and no dependencies came from a constraint we set ourselves.',
    $th$ตอนเริ่มทำ Dashboard UI Kit เราตั้งข้อจำกัดไว้ข้อเดียว คนที่ซื้อไปต้องเปิดไฟล์ HTML แล้วเห็นหน้าแดชบอร์ดทำงานได้ทันที โดยไม่ต้องติดตั้งอะไรเลย ข้อจำกัดนี้ตัดทางเลือกส่วนใหญ่ออกไป และกลายเป็นสิ่งที่ทำให้ชุดนี้ใช้ง่าย

ชุด UI ส่วนมากผูกกับ framework ตัวใดตัวหนึ่ง ถ้าทีมของคุณใช้ตัวอื่นก็ต้องเขียนใหม่ เราจึงทำทุก component เป็น class ของ CSS ปุ่มคือ btn การ์ดคือ card ป้ายสถานะคือ badge คัดลอก HTML ไปวางใน React, Vue หรือเทมเพลตฝั่ง server ได้เหมือนกันหมด

สีทั้งหมดเป็นตัวแปรใน root ของไฟล์เดียว โหมดมืดจึงเป็นแค่ชุดตัวแปรอีกชุดที่เปิดด้วย data-theme ไม่มี JavaScript สำหรับสลับธีม และการเปลี่ยนสีแบรนด์ทำได้ด้วยการแก้ตัวแปรไม่กี่ตัว

ส่วนที่ใช้เวลามากที่สุดคือกราฟ เราอยากให้หน้าตัวอย่างมีกราฟแท่งโดยไม่ดึงไลบรารีกราฟเข้ามา จึงทำแท่งกราฟด้วย grid และกำหนดความสูงเป็นเปอร์เซ็นต์ มันไม่แทนที่ไลบรารีจริงเมื่อข้อมูลซับซ้อน แต่พอสำหรับหน้าภาพรวม และทำให้ทั้งชุดมีขนาดไม่ถึงสิบกิโลไบต์

สิ่งที่เราตั้งใจไม่ทำคือ component ที่ต้องมีสถานะซับซ้อน เช่น ตัวเลือกวันที่หรือตารางที่ลากคอลัมน์ได้ ของพวกนั้นควรมาจากไลบรารีที่ดูแลเรื่องการเข้าถึงมาอย่างดี ชุดนี้ให้โครงหน้าและภาษาภาพ แล้วปล่อยส่วนนั้นให้เครื่องมือที่ถนัดกว่า$th$,
    $en$When we started Dashboard UI Kit we set one constraint: a buyer must be able to open an HTML file and see a working dashboard without installing anything. That ruled out most options and turned out to be what makes the kit easy to use.

Most UI kits are tied to one framework. If your team uses another, you rewrite. So every component here is a CSS class: btn, card, badge. The same HTML pastes into React, Vue or a server-rendered template.

Every colour is a variable in one file. Dark mode is simply a second set of variables switched on with data-theme, with no JavaScript, and rebranding means changing a few values.

The chart took the longest. We wanted a bar chart on the sample page without pulling in a charting library, so the bars are a grid with percentage heights. It does not replace a real library for complex data, but it is enough for an overview and keeps the whole kit under ten kilobytes.

What we deliberately left out are components with complex state, such as date pickers and draggable tables. Those belong to libraries that handle accessibility well. This kit gives you layout and a visual language and leaves the rest to better tools.$en$,
    'dashboard-ui-kit', timestamptz '2026-10-03 09:00+07'
  ),
  (
    'thirty-minutes-a-week', 'story',
    'สามสิบนาทีต่อสัปดาห์ที่ทำให้งานไม่ล้น',
    'Thirty minutes a week that keep work from piling up',
    'ทบทวนก่อนวางแผน และจำกัดงานสำคัญไว้วันละสามอย่าง',
    'Review before you plan, and cap each day at three important tasks.',
    $th$ปัญหาของคนทำงานหลายโปรเจกต์ไม่ใช่เวลาไม่พอ แต่คือไม่รู้ว่าวันนี้ควรทำอะไรก่อน รายการงานยาวขึ้นทุกวัน ทุกอย่างดูด่วนเท่ากัน สุดท้ายเราเลือกทำงานที่ง่ายที่สุดแทนงานที่สำคัญที่สุด

Weekly Review System เกิดจากการทดลองกับทีมของเราเอง กติกาข้อแรกคือทบทวนก่อนวางแผน ทุกเย็นวันศุกร์เราใช้สิบนาทีแรกดูว่าสัปดาห์นี้เกิดอะไรขึ้นจริง อะไรเสร็จ อะไรเลื่อน และเลื่อนเพราะอะไร คำตอบของคำถามสุดท้ายมักบอกว่าสัปดาห์หน้าควรเปลี่ยนอะไร

กติกาข้อที่สองคือวันละไม่เกินสามงานสำคัญ ถ้าเขียนได้ห้าอย่าง แปลว่ายังไม่ได้เลือก การบังคับให้เหลือสามทำให้ต้องตัดสินใจตั้งแต่เช้า แทนที่จะปล่อยให้อีเมลฉบับแรกของวันตัดสินให้

กติกาข้อที่สามคือเป้าหมายต้องวัดได้ แม่แบบเป้าหมายรายไตรมาสมีช่องตัวเลขตอนนี้ ตัวเลขเป้า และจุดตรวจสามครั้ง ถ้ากรอกช่องพวกนี้ไม่ได้ เป้าหมายนั้นยังไม่ชัดพอจะลงมือ

ทั้งหมดนี้เป็นไฟล์ข้อความธรรมดา เปิดใน Notion หรือ Obsidian หรือพิมพ์ออกมาเขียนด้วยมือก็ได้ เครื่องมือไม่ใช่ส่วนสำคัญ สิ่งที่ได้ผลคือการนัดกับตัวเองสามสิบนาทีทุกสัปดาห์แล้วไม่เลื่อนนัดนั้น$th$,
    $en$For people juggling several projects the problem is rarely time. It is not knowing what to do first. The list grows every day, everything looks equally urgent, and we end up doing the easiest task instead of the most important one.

Weekly Review System came out of experiments in our own team. Rule one is review before you plan. Every Friday evening we spend the first ten minutes on what actually happened: what got done, what slipped, and why it slipped. The answer to that last question usually tells you what to change next week.

Rule two is no more than three important tasks a day. If you can write five, you have not chosen yet. Forcing the list down to three makes you decide in the morning instead of letting the first email of the day decide for you.

Rule three is that goals must be measurable. The quarterly template has a box for the number now, the target, and three checkpoints. If you cannot fill those in, the goal is not clear enough to act on.

It is all plain text. Open it in Notion or Obsidian, or print it and write by hand. The tool is not the point. What works is a thirty-minute appointment with yourself every week that you do not move.$en$,
    'weekly-review-system', timestamptz '2026-09-28 09:00+07'
  )
) as v(slug, type, title_th, title_en, dek_th, dek_en, body_th, body_en, product, published_at)
on conflict (slug) do nothing;
