import "server-only";
import { revalidatePath } from "next/cache";
import { removeSlips, slipOrderNos } from "@/lib/slips";
import { imageBaseUrl, supabaseAdmin } from "@/lib/supabase";
import { resetCatalogCache } from "@/lib/catalogServer";
import { categoryOf } from "@/lib/catalog";
import type {
  ActivityEvent,
  AdminCustomer,
  AdminOrder,
  AdminReport,
  AdminStats,
  AdminTodo,
  AdminUser,
  BookRow,
  License,
  OrderFilter,
  OrderStatus,
  UserRole,
  ProductInput,
  ShopRef,
} from "@/lib/types";

/**
 * งานหลังบ้านทั้งหมด — ทุกฟังก์ชันใช้ secret key
 * ผู้เรียก (หน้า /admin และ /api/admin/*) ต้องตรวจสิทธิ์ admin ก่อนเสมอ
 */

const LICENSES: License[] = ["personal", "commercial", "mit"];
const PAGE = 1000; // PostgREST คืนสูงสุด 1000 แถวต่อคำขอ

export const ORDER_PAGE_SIZE = 50;

/* ---------- Dashboard ---------- */

interface Totals {
  sales: number;
  orders: number;
  customers: number;
}

interface RawStats extends Totals {
  products: number;
  cur: Totals;
  prev: Totals;
  daily: AdminStats["daily"];
  top: AdminStats["top"];
}

/** หนึ่งแถวของ view order_carts (supabase/cart.sql) = หนึ่งคำสั่งซื้อ */
interface CartRow {
  cart_no: string;
  status: OrderStatus;
  amount: number;
  customer_name: string;
  customer_email: string;
  created_at: string;
  paid_at: string | null;
}

const CART_COLUMNS = "cart_no, status, amount, customer_name, customer_email, created_at, paid_at";

/** หนึ่งแถวของตาราง orders = สินค้าหนึ่งชิ้นในคำสั่งซื้อ */
interface LineRow {
  order_no: string;
  cart_no: string | null;
  status: OrderStatus;
  amount: number;
  customer_name: string;
  customer_email: string;
  created_at: string;
  paid_at: string | null;
  book_id: string;
  book: { title_th: string } | null;
}

const LINE_COLUMNS =
  "order_no, cart_no, status, amount, customer_name, customer_email, created_at, paid_at, book_id, book:books(title_th)";

// เลขคำสั่งซื้อมีแค่ตัวอักษร ตัวเลข และขีด — กรองไว้ก่อนใส่ใน filter ของ PostgREST
const safeNos = (nos: string[]): string[] => nos.filter((no) => /^[A-Z0-9-]+$/.test(no));

/** เติมรายการสินค้าให้คำสั่งซื้อชุดนี้ (หนึ่งคำขอ ไม่ว่าจะกี่คำสั่งซื้อ) */
async function withItems(carts: CartRow[]): Promise<AdminOrder[]> {
  const nos = safeNos(carts.map((c) => c.cart_no));
  if (nos.length === 0) return [];
  const list = nos.join(",");
  const { data, error } = await supabaseAdmin()
    .from("orders")
    .select("order_no, cart_no, amount, book_id, book:books(title_th)")
    .or(`cart_no.in.(${list}),order_no.in.(${list})`)
    .order("order_no")
    .retry(false)
    .returns<Pick<LineRow, "order_no" | "cart_no" | "amount" | "book_id" | "book">[]>();
  if (error) throw new Error(`order items: ${error.message}`);

  const items = new Map<string, AdminOrder["items"]>();
  for (const line of data ?? []) {
    const key = line.cart_no || line.order_no;
    const group = items.get(key) ?? [];
    group.push({ book_id: line.book_id, title: line.book?.title_th || line.book_id, amount: line.amount });
    items.set(key, group);
  }
  return carts.map(({ cart_no, ...cart }) => ({ ...cart, order_no: cart_no, items: items.get(cart_no) ?? [] }));
}

/** เปลี่ยนแปลงเป็น % เทียบช่วงก่อนหน้า — null เมื่อช่วงก่อนหน้าเป็น 0 */
const change = (cur: number, prev: number): number | null =>
  prev > 0 ? Math.round(((cur - prev) / prev) * 1000) / 10 : null;

export async function loadStats(days = 30): Promise<AdminStats> {
  const db = supabaseAdmin();
  // ยอดรวมคำนวณในฐานข้อมูล (supabase/admin.sql) + คำสั่งซื้อล่าสุด ยิงพร้อมกัน
  const [stats, recent] = await Promise.all([
    db.rpc("admin_stats", { days }).retry(false),
    db.from("order_carts").select(CART_COLUMNS).order("created_at", { ascending: false }).limit(8).retry(false).returns<CartRow[]>(),
  ]);
  if (stats.error) throw new Error(`admin_stats: ${stats.error.message}`);
  if (recent.error) throw new Error(`recent orders: ${recent.error.message}`);

  const raw = stats.data as RawStats;
  return {
    generatedAt: new Date().toISOString(),
    sales: raw.sales,
    orders: raw.orders,
    customers: raw.customers,
    products: raw.products,
    salesChange: change(raw.cur.sales, raw.prev.sales),
    ordersChange: change(raw.cur.orders, raw.prev.orders),
    customersChange: change(raw.cur.customers, raw.prev.customers),
    daily: raw.daily,
    top: raw.top,
    recent: await withItems(recent.data ?? []),
  };
}

/* ---------- รายงาน ---------- */

export const REPORT_PERIODS = [7, 30, 90] as const;
export type ReportPeriod = (typeof REPORT_PERIODS)[number];
const ACTIVITY_LIMIT = 40;

interface ActivityOrder {
  cart_no: string;
  amount: number;
  customer_email: string;
  created_at: string;
  paid_at: string | null;
  delivered_at: string | null;
  email_failed: boolean | null;
}

/**
 * บันทึกกิจกรรมล่าสุด — ไม่มีตาราง log แยก
 * ประกอบจากเวลาที่ระบบบันทึกไว้อยู่แล้ว: สร้าง/ชำระ/จัดส่งคำสั่งซื้อ อีเมลที่ส่งไม่ถึง และสมาชิกใหม่
 */
function toActivity(orders: ActivityOrder[], members: { email: string; created_at: string | null }[]): ActivityEvent[] {
  const events: ActivityEvent[] = [];
  for (const o of orders) {
    const base = { ref: o.cart_no, who: o.customer_email, amount: o.amount };
    events.push({ ...base, at: o.created_at, kind: "order_created" });
    if (o.paid_at) events.push({ ...base, at: o.paid_at, kind: "order_paid" });
    if (o.delivered_at) events.push({ ...base, at: o.delivered_at, kind: "order_delivered" });
    else if (o.paid_at && o.email_failed) events.push({ ...base, at: o.paid_at, kind: "email_failed" });
  }
  for (const m of members) {
    if (m.created_at) events.push({ at: m.created_at, kind: "member_joined", ref: null, who: m.email, amount: null });
  }
  return events.sort((a, b) => b.at.localeCompare(a.at)).slice(0, ACTIVITY_LIMIT);
}

export async function loadReport(days: ReportPeriod): Promise<AdminReport> {
  const db = supabaseAdmin();
  const [stats, orders, members] = await Promise.all([
    db.rpc("admin_stats", { days }).retry(false),
    db
      .from("order_carts")
      .select("cart_no, amount, customer_email, created_at, paid_at, delivered_at, email_failed")
      .order("created_at", { ascending: false })
      .limit(ACTIVITY_LIMIT)
      .retry(false)
      .returns<ActivityOrder[]>(),
    db
      .from("profiles")
      .select("email, created_at")
      .order("created_at", { ascending: false })
      .limit(ACTIVITY_LIMIT)
      .retry(false)
      .returns<{ email: string; created_at: string | null }[]>(),
  ]);
  if (stats.error) throw new Error(`admin_stats: ${stats.error.message}`);
  if (orders.error) throw new Error(`report orders: ${orders.error.message}`);
  if (members.error) throw new Error(`report members: ${members.error.message}`);

  const raw = stats.data as RawStats;
  return {
    days,
    sales: raw.cur.sales,
    orders: raw.cur.orders,
    customers: raw.cur.customers,
    salesChange: change(raw.cur.sales, raw.prev.sales),
    ordersChange: change(raw.cur.orders, raw.prev.orders),
    customersChange: change(raw.cur.customers, raw.prev.customers),
    daily: raw.daily,
    top: raw.top,
    activity: toActivity(orders.data ?? [], members.data ?? []),
  };
}

/* ---------- รายการ ---------- */

/** สินค้าทั้งหมด รวมที่ซ่อนจากหน้าร้าน */
export async function listAllProducts(): Promise<BookRow[]> {
  const { data, error } = await supabaseAdmin()
    .from("books")
    .select("*")
    .order("sort", { ascending: true })
    .order("created_at", { ascending: true })
    .retry(false)
    .returns<BookRow[]>();
  if (error) throw new Error(`products: ${error.message}`);
  return data ?? [];
}

export async function getProductRow(id: string): Promise<BookRow | null> {
  const { data, error } = await supabaseAdmin().from("books").select("*").eq("id", id).retry(false).maybeSingle<BookRow>();
  if (error) throw new Error(`product: ${error.message}`);
  return data;
}

export async function listShops(): Promise<ShopRef[]> {
  const { data } = await supabaseAdmin().from("shops").select("id, name").order("name").retry(false).returns<ShopRef[]>();
  return data ?? [];
}

/** ร้าน/ครีเอเตอร์หนึ่งรายในหลังบ้าน พร้อมจำนวนสินค้า */
export interface AdminShop {
  id: string;
  name: string;
  bio_th: string;
  bio_en: string;
  products: number;
}

/** ร้านทั้งหมดพร้อมจำนวนสินค้าของแต่ละร้าน */
export async function listShopsFull(): Promise<AdminShop[]> {
  const db = supabaseAdmin();
  const [shops, books] = await Promise.all([
    db.from("shops").select("id, name, bio_th, bio_en").order("name").retry(false).returns<Omit<AdminShop, "products">[]>(),
    db.from("books").select("shop_id").not("shop_id", "is", null).retry(false).returns<{ shop_id: string }[]>(),
  ]);
  if (shops.error) throw new Error(`shops: ${shops.error.message}`);
  const counts = new Map<string, number>();
  for (const b of books.data ?? []) counts.set(b.shop_id, (counts.get(b.shop_id) ?? 0) + 1);
  return (shops.data ?? []).map((shop) => ({ ...shop, bio_th: shop.bio_th || "", bio_en: shop.bio_en || "", products: counts.get(shop.id) ?? 0 }));
}

export type ShopErrorCode = "name_required" | "id_required";

/** ตรวจและจัดรูปข้อมูลร้านจากฟอร์มหลังบ้าน */
export function normalizeShop(raw: Record<string, unknown>): { shop: Omit<AdminShop, "products"> } | { error: ShopErrorCode } {
  const name = String(raw.name ?? "").trim().slice(0, 120);
  if (!name) return { error: "name_required" };
  const id = slugify(String(raw.id ?? "").trim() || name);
  if (!id) return { error: "id_required" };
  return {
    shop: { id, name, bio_th: String(raw.bio_th ?? "").trim().slice(0, 600), bio_en: String(raw.bio_en ?? "").trim().slice(0, 600) },
  };
}

export async function saveShop(shop: Omit<AdminShop, "products">): Promise<boolean> {
  const { error } = await supabaseAdmin().from("shops").upsert(shop, { onConflict: "id" });
  if (error) console.error("saveShop:", error.message);
  return !error;
}

/** ลบร้าน — ร้านที่ยังมีสินค้าลบไม่ได้ (ต้องย้ายหรือลบสินค้าก่อน) */
export async function removeShop(id: string): Promise<"deleted" | "has_products" | "not_found" | "failed"> {
  const db = supabaseAdmin();
  const { count } = await db.from("books").select("id", { count: "exact", head: true }).eq("shop_id", id);
  if ((count ?? 0) > 0) return "has_products";
  const { data, error } = await db.from("shops").delete().eq("id", id).select("id");
  if (error) return "failed";
  return data?.length ? "deleted" : "not_found";
}

/** งานที่รอผู้ดูแลจัดการ (สองคำขอ: รายชื่อคำสั่งซื้อที่มีสลิป + นับสถานะ) */
export async function loadTodo(): Promise<AdminTodo> {
  const db = supabaseAdmin();
  const withSlip = await slipOrderNos();
  const count = (query: PromiseLike<{ count: number | null; error: { message: string } | null }>) =>
    Promise.resolve(query).then(({ count: n, error }) => {
      if (error) throw new Error(`todo: ${error.message}`);
      return n ?? 0;
    });
  // นับเป็นคำสั่งซื้อ (ตะกร้า) — สลิปเก็บในโฟลเดอร์ชื่อเลขคำสั่งซื้อ ซึ่งคือแถวแรกของตะกร้า
  const head = () => db.from("order_carts").select("cart_no", { count: "exact", head: true });

  const [review, pending, undelivered] = await Promise.all([
    withSlip.length ? count(head().eq("status", "PENDING").in("cart_no", withSlip)) : 0,
    count(head().eq("status", "PENDING")),
    count(head().eq("status", "PAID")),
  ]);
  return { review, unpaid: pending - review, undelivered };
}

/** คำค้นจากช่องค้นหา -> ตัดอักขระที่มีความหมายใน filter ของ PostgREST ออก (กันแทรกเงื่อนไขเอง) */
const searchTerm = (value: string): string => value.replace(/[,()%*\\"']/g, " ").trim().slice(0, 80);

export async function listOrders(page = 1, filter: OrderFilter = "all", search = ""): Promise<{ orders: AdminOrder[]; total: number }> {
  const from = (Math.max(page, 1) - 1) * ORDER_PAGE_SIZE;
  // รายชื่อคำสั่งซื้อที่มีสลิป: คำขอเดียว ใช้ทั้งกรองและติดป้ายในตาราง
  const withSlip = new Set(await slipOrderNos());
  let query = supabaseAdmin().from("order_carts").select(CART_COLUMNS, { count: "exact" });

  if (filter === "undelivered") query = query.eq("status", "PAID");
  if (filter === "review" || filter === "unpaid") {
    query = query.eq("status", "PENDING");
    const slipNos = safeNos([...withSlip]);
    if (filter === "review") {
      if (slipNos.length === 0) return { orders: [], total: 0 };
      query = query.in("cart_no", slipNos);
    } else if (slipNos.length) {
      query = query.not("cart_no", "in", `(${slipNos.join(",")})`);
    }
  }

  const term = searchTerm(search);
  if (term) query = query.or(`cart_no.ilike.%${term}%,customer_email.ilike.%${term}%,customer_name.ilike.%${term}%`);

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + ORDER_PAGE_SIZE - 1)
    .retry(false)
    .returns<CartRow[]>();
  if (error) throw new Error(`orders: ${error.message}`);
  const orders = await withItems(data ?? []);
  return { orders: orders.map((o) => ({ ...o, slip: o.status === "PENDING" && withSlip.has(o.order_no) })), total: count ?? 0 };
}

/** ลบคำสั่งซื้อถาวรทั้งใบ (ทุกชิ้นในตะกร้า) พร้อมสลิปที่แนบไว้ */
export async function removeOrder(cartNo: string): Promise<"deleted" | "not_found" | "failed"> {
  const [no] = safeNos([cartNo]);
  if (!no) return "not_found";
  const { data, error } = await supabaseAdmin()
    .from("orders")
    .delete()
    .or(`cart_no.eq.${no},order_no.eq.${no}`)
    .select("order_no")
    .returns<{ order_no: string }[]>();
  if (error) {
    console.error("removeOrder:", error.message);
    return "failed";
  }
  if (!data?.length) return "not_found";
  await Promise.all(data.map((line) => removeSlips(line.order_no)));
  return "deleted";
}

/** หนึ่งบรรทัดของรายงานยอดขาย = สินค้าหนึ่งชิ้นที่ขายได้ (order_no คือเลขคำสั่งซื้อของตะกร้า) */
export interface SalesLine {
  order_no: string;
  created_at: string;
  paid_at: string | null;
  status: OrderStatus;
  book_id: string;
  title: string;
  customer_name: string;
  customer_email: string;
  amount: number;
}

/** ยอดขายทั้งหมดสำหรับ export ทีละชิ้นสินค้า (ดึงทีละหน้าจนครบ) */
export async function allOrders(max = 50_000): Promise<SalesLine[]> {
  const out: SalesLine[] = [];
  for (let from = 0; from < max; from += PAGE) {
    const { data, error } = await supabaseAdmin()
      .from("orders")
      .select(LINE_COLUMNS)
      .order("created_at", { ascending: false })
      .order("order_no")
      .range(from, from + PAGE - 1)
      .returns<LineRow[]>();
    if (error) throw new Error(`orders: ${error.message}`);
    out.push(
      ...(data ?? []).map(({ book, cart_no, ...line }) => ({
        ...line,
        order_no: cart_no || line.order_no,
        title: book?.title_th || line.book_id,
      }))
    );
    if (!data || data.length < PAGE) break;
  }
  return out;
}

export async function listCustomers(): Promise<AdminCustomer[]> {
  const { data, error } = await supabaseAdmin().rpc("admin_customers").retry(false);
  if (error) throw new Error(`customers: ${error.message}`);
  return (data ?? []) as AdminCustomer[];
}

/* ---------- ผู้ใช้ (สมาชิก) ---------- */

type UserRow = Omit<AdminUser, "locked" | "joined"> & { created_at: string | null };

const toAdminUser = (row: UserRow, isLocked: (email: string) => boolean): AdminUser => ({
  id: row.id,
  email: row.email,
  name: row.name || "",
  role: isLocked(row.email) ? "admin" : row.role,
  joined: row.created_at,
  locked: isLocked(row.email),
});

/** สมาชิกทั้งหมด ใหม่สุดก่อน — isLocked บอกว่าอีเมลไหนเป็นผู้ดูแลจาก env */
export async function listUsers(isLocked: (email: string) => boolean): Promise<AdminUser[]> {
  const { data, error } = await supabaseAdmin()
    .from("profiles")
    .select("id, email, name, role, created_at")
    .order("created_at", { ascending: false })
    .retry(false)
    .returns<UserRow[]>();
  if (error) throw new Error(`users: ${error.message}`);
  return (data ?? []).map((row) => toAdminUser(row, isLocked));
}

export async function getUserRow(id: string): Promise<{ id: string; email: string; role: UserRole } | null> {
  const { data } = await supabaseAdmin()
    .from("profiles")
    .select("id, email, role")
    .eq("id", id)
    .retry(false)
    .maybeSingle<{ id: string; email: string; role: UserRole }>();
  return data ?? null;
}

/** เปลี่ยนสิทธิ์ของสมาชิก — คืน false เมื่อบันทึกไม่สำเร็จ */
export async function setUserRole(id: string, role: UserRole): Promise<boolean> {
  const { error } = await supabaseAdmin().from("profiles").update({ role }).eq("id", id);
  if (error) console.error("setUserRole:", error.message);
  return !error;
}

/** ลบบัญชี (โปรไฟล์และรหัส OTP ถูกลบตาม, คำสั่งซื้อเดิมยังอยู่แต่ไม่ผูกกับบัญชี) */
export async function deleteUser(id: string): Promise<boolean> {
  const { error } = await supabaseAdmin().auth.admin.deleteUser(id);
  if (error) console.error("deleteUser:", error.message);
  return !error;
}

/* ---------- ข้อมูลดิบ (อ่านอย่างเดียว) ---------- */

/** ตารางที่หน้า "ข้อมูลดิบ" เปิดดูได้ — ไม่รวม login_otps (รหัสยืนยัน) และตารางของ Supabase Auth */
export const RAW_TABLES = ["books", "orders", "profiles", "shops", "articles", "reviews", "article_comments", "order_counters"] as const;
export type RawTable = (typeof RAW_TABLES)[number];
export const RAW_PAGE_SIZE = 50;

// เรียงใหม่สุดก่อนเมื่อมีคอลัมน์เวลา ไม่งั้นเรียงตามคีย์หลัก ให้ลำดับคงที่ระหว่างหน้า
const RAW_ORDER: Record<RawTable, { column: string; ascending: boolean }> = {
  books: { column: "sort", ascending: true },
  orders: { column: "created_at", ascending: false },
  profiles: { column: "created_at", ascending: false },
  shops: { column: "id", ascending: true },
  articles: { column: "published_at", ascending: false },
  reviews: { column: "created_at", ascending: false },
  article_comments: { column: "created_at", ascending: false },
  order_counters: { column: "day", ascending: false },
};

/** คีย์หลักของแต่ละตาราง — ใช้ระบุแถวตอนแก้ไขและลบจากหน้าข้อมูลดิบ (แก้ค่าคีย์หลักเองไม่ได้) */
export const RAW_KEYS: Record<RawTable, string> = {
  books: "id",
  orders: "id",
  profiles: "id",
  shops: "id",
  articles: "slug",
  reviews: "id",
  article_comments: "id",
  order_counters: "day",
};

export interface RawTableData {
  columns: string[];
  rows: Record<string, unknown>[];
  total: number;
  failed: boolean;
}

/** อ่านหนึ่งหน้าของตาราง ทุกคอลัมน์ตามที่เก็บจริง */
export async function readRawTable(table: RawTable, page: number): Promise<RawTableData> {
  const start = (page - 1) * RAW_PAGE_SIZE;
  const { column, ascending } = RAW_ORDER[table];
  const { data, count, error } = await supabaseAdmin()
    .from(table)
    .select("*", { count: "exact" })
    .order(column, { ascending })
    .range(start, start + RAW_PAGE_SIZE - 1)
    .retry(false)
    .returns<Record<string, unknown>[]>();

  // เลขหน้าเกินจำนวนแถว (PGRST103) = หน้าว่าง ไม่ใช่ข้อผิดพลาด
  if (error?.code === "PGRST103") return { columns: [], rows: [], total: 0, failed: false };
  if (error) {
    console.error(`readRawTable ${table}:`, error.message);
    return { columns: [], rows: [], total: 0, failed: true };
  }
  const rows = data ?? [];
  return { columns: rows[0] ? Object.keys(rows[0]) : [], rows, total: count ?? rows.length, failed: false };
}

const isRawTable = (name: unknown): name is RawTable => RAW_TABLES.includes(name as RawTable);

/** แปลงค่าที่พิมพ์มาเป็นชนิดเดียวกับค่าเดิมของช่องนั้น — โยน Error เมื่อแปลงไม่ได้ */
function coerceRaw(column: string, input: unknown, current: unknown): unknown {
  if (input === null) return null;
  const value = String(input);
  if (typeof current === "number") {
    const n = Number(value);
    if (value.trim() === "" || !Number.isFinite(n)) throw new Error(`${column}: ต้องเป็นตัวเลข`);
    return n;
  }
  if (typeof current === "boolean") {
    if (value !== "true" && value !== "false") throw new Error(`${column}: ต้องเป็น true หรือ false`);
    return value === "true";
  }
  if (current !== null && typeof current === "object") {
    try {
      return JSON.parse(value);
    } catch {
      throw new Error(`${column}: ต้องเป็น JSON ที่ถูกต้อง`);
    }
  }
  // ค่าเดิมเป็นข้อความหรือ null: ส่งเป็นข้อความ ฐานข้อมูลแปลงตามชนิดของคอลัมน์เอง
  return value;
}

/**
 * แก้ไขหนึ่งแถวจากหน้าข้อมูลดิบ — values มีเฉพาะช่องที่เปลี่ยน (null = ล้างค่า)
 * แก้ได้เฉพาะคอลัมน์ที่มีอยู่จริงของแถวนั้น และแก้คีย์หลักไม่ได้ กติกาของฐานข้อมูล (check, foreign key) ยังบังคับตามปกติ
 * คืนข้อความผิดพลาด หรือ null เมื่อสำเร็จ (ผู้เรียกต้องตรวจสิทธิ์ admin ก่อน)
 */
export async function updateRawRow(table: unknown, key: unknown, values: unknown): Promise<string | null> {
  if (!isRawTable(table) || typeof key !== "string" || !key || !values || typeof values !== "object") return "invalid_input";
  const pk = RAW_KEYS[table];
  const db = supabaseAdmin();
  const { data: row, error: readError } = await db.from(table).select("*").eq(pk, key).retry(false).maybeSingle<Record<string, unknown>>();
  if (readError) return readError.message;
  if (!row) return "not_found";

  const patch: Record<string, unknown> = {};
  try {
    for (const [column, input] of Object.entries(values as Record<string, unknown>)) {
      if (column === pk || !(column in row)) continue;
      patch[column] = coerceRaw(column, input, row[column]);
    }
  } catch (err) {
    return err instanceof Error ? err.message : "invalid_input";
  }
  if (Object.keys(patch).length === 0) return null;

  const { error } = await db.from(table).update(patch).eq(pk, key);
  if (error) console.error(`updateRawRow ${table}:`, error.message);
  return error ? error.message : null;
}

/** ลบหนึ่งแถวจากหน้าข้อมูลดิบ — คืนข้อความผิดพลาด หรือ null เมื่อสำเร็จ (ผู้เรียกต้องตรวจสิทธิ์ admin ก่อน) */
export async function deleteRawRow(table: unknown, key: unknown): Promise<string | null> {
  if (!isRawTable(table) || typeof key !== "string" || !key) return "invalid_input";
  const { data, error } = await supabaseAdmin().from(table).delete().eq(RAW_KEYS[table], key).select(RAW_KEYS[table]);
  if (error) {
    console.error(`deleteRawRow ${table}:`, error.message);
    return error.message;
  }
  return data?.length ? null : "not_found";
}

/* ---------- ตรวจข้อมูลสินค้า (ใช้ทั้งฟอร์มและ import) ---------- */

export type ProductErrorCode =
  | "id_invalid"
  | "title_required"
  | "price_invalid"
  | "list_price_invalid"
  | "kind_invalid"
  | "license_invalid"
  | "file_required";

const str = (v: unknown, max = 4000) => (v === null || v === undefined ? "" : String(v).trim().slice(0, max));

const int = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/[, ]/g, ""));
  return Number.isFinite(n) ? Math.round(n) : NaN;
};

const bool = (v: unknown, fallback: boolean): boolean => {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").trim().toLowerCase();
  if (["true", "1", "yes", "y"].includes(s)) return true;
  if (["false", "0", "no", "n"].includes(s)) return false;
  return fallback;
};

/** ชื่อสินค้า -> slug สำหรับ id */
export const slugify = (value: string): string =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

/**
 * ทำข้อมูลสินค้าให้อยู่ในรูปที่บันทึกได้ — ช่องที่เว้นว่างใช้ค่าจากอีกภาษาหรือค่าตั้งต้น
 * คืน error code เมื่อข้อมูลไม่ผ่าน
 */
export function normalizeProduct(raw: Record<string, unknown>): { product: ProductInput } | { error: ProductErrorCode } {
  const title_th = str(raw.title_th, 200) || str(raw.title_en, 200);
  const title_en = str(raw.title_en, 200) || title_th;
  if (!title_th) return { error: "title_required" };

  const id = str(raw.id, 60).toLowerCase() || slugify(title_en);
  if (!/^[a-z0-9][a-z0-9-]{1,59}$/.test(id)) return { error: "id_invalid" };

  const price = int(raw.price);
  if (!Number.isFinite(price) || price < 0 || price > 1_000_000) return { error: "price_invalid" };

  const listRaw = str(raw.list_price);
  const list_price = listRaw ? int(listRaw) : price;
  if (!Number.isFinite(list_price) || list_price < price || list_price > 1_000_000) return { error: "list_price_invalid" };

  const kindRaw = str(raw.kind || raw.category, 40).toLowerCase() || "guide";
  const kind = categoryOf({ kind: kindRaw });
  // categoryOf คืน "guide" เมื่อไม่รู้จัก — ค่าที่ไม่ตรงกับหมวดใดเลยถือว่าผิด
  if (kind !== kindRaw && !(kindRaw === "preset" && kind === "asset")) return { error: "kind_invalid" };

  const licenseRaw = str(raw.license, 20).toLowerCase();
  if (licenseRaw && !LICENSES.includes(licenseRaw as License)) return { error: "license_invalid" };

  const file_path = str(raw.file_path, 300);
  if (!file_path) return { error: "file_required" };

  // รับเฉพาะรูปที่อัปโหลดเข้า bucket ของร้าน ไม่รับ URL จากที่อื่น
  const coverRaw = str(raw.cover, 500);
  const cover = coverRaw.startsWith(imageBaseUrl()) ? coverRaw : null;

  const short_th = str(raw.short_th, 300) || str(raw.short_en, 300) || title_th;
  const long_th = str(raw.long_th) || str(raw.long_en) || short_th;
  const author_th = str(raw.author_th || raw.author, 120) || str(raw.author_en, 120) || "VECTOR";
  const sort = int(raw.sort);

  return {
    product: {
      id,
      title_th,
      title_en,
      short_th,
      short_en: str(raw.short_en, 300) || short_th,
      long_th,
      long_en: str(raw.long_en) || long_th,
      author_th,
      author_en: str(raw.author_en, 120) || author_th,
      price,
      list_price,
      kind,
      version: str(raw.version, 20) || "1.0",
      license: (licenseRaw as License) || null,
      file_path,
      file_size: str(raw.file_size, 20) || "—",
      cover,
      published: bool(raw.published, true),
      sort: Number.isFinite(sort) && sort >= 0 ? sort : 0,
      shop_id: str(raw.shop_id, 60) || null,
    },
  };
}

/* ---------- เขียนข้อมูล ---------- */

/** หน้าร้านเป็น static (revalidate 60 วินาที) — แก้สินค้าแล้วให้เห็นผลทันที */
export function refreshStorefront(): void {
  resetCatalogCache();
  revalidatePath("/", "layout");
}

export async function saveProducts(products: ProductInput[]): Promise<string | null> {
  if (products.length === 0) return null;
  const { error } = await supabaseAdmin().from("books").upsert(products, { onConflict: "id" });
  if (error) console.error("saveProducts:", error.message);
  return error ? (error.code === "23503" ? "shop_not_found" : "save_failed") : null;
}

/**
 * ลบสินค้า — ถ้ามีคำสั่งซื้ออ้างถึงอยู่จะซ่อนจากหน้าร้านแทน
 * (ผู้ซื้อเดิมยังต้องดาวน์โหลดไฟล์ได้)
 */
export async function removeProduct(id: string): Promise<"deleted" | "hidden" | "not_found" | "failed"> {
  const db = supabaseAdmin();
  const { data: row } = await db.from("books").select("id, file_path").eq("id", id).maybeSingle<{ id: string; file_path: string }>();
  if (!row) return "not_found";

  const { count, error: countErr } = await db.from("orders").select("id", { count: "exact", head: true }).eq("book_id", id);
  if (countErr) return "failed";

  if ((count ?? 0) > 0) {
    const { error } = await db.from("books").update({ published: false }).eq("id", id);
    return error ? "failed" : "hidden";
  }
  const { error } = await db.from("books").delete().eq("id", id);
  return error ? "failed" : "deleted";
}
