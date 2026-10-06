import "server-only";
import { revalidatePath } from "next/cache";
import { imageBaseUrl, supabaseAdmin } from "@/lib/supabase";
import { resetCatalogCache } from "@/lib/catalogServer";
import { categoryOf } from "@/lib/catalog";
import type {
  AdminCustomer,
  AdminOrder,
  AdminStats,
  AdminUser,
  BookRow,
  License,
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

interface OrderJoin {
  order_no: string;
  status: OrderStatus;
  amount: number;
  customer_name: string;
  customer_email: string;
  created_at: string;
  paid_at: string | null;
  book_id: string;
  book: { title_th: string } | null;
}

const ORDER_COLUMNS =
  "order_no, status, amount, customer_name, customer_email, created_at, paid_at, book_id, book:books(title_th)";

const toAdminOrder = ({ book, ...o }: OrderJoin): AdminOrder => ({ ...o, title: book?.title_th || o.book_id });

/** เปลี่ยนแปลงเป็น % เทียบช่วงก่อนหน้า — null เมื่อช่วงก่อนหน้าเป็น 0 */
const change = (cur: number, prev: number): number | null =>
  prev > 0 ? Math.round(((cur - prev) / prev) * 1000) / 10 : null;

export async function loadStats(days = 30): Promise<AdminStats> {
  const db = supabaseAdmin();
  // ยอดรวมคำนวณในฐานข้อมูล (supabase/admin.sql) + คำสั่งซื้อล่าสุด ยิงพร้อมกัน
  const [stats, recent] = await Promise.all([
    db.rpc("admin_stats", { days }).retry(false),
    db.from("orders").select(ORDER_COLUMNS).order("created_at", { ascending: false }).limit(8).retry(false).returns<OrderJoin[]>(),
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
    recent: (recent.data ?? []).map(toAdminOrder),
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

export async function listOrders(page = 1): Promise<{ orders: AdminOrder[]; total: number }> {
  const from = (Math.max(page, 1) - 1) * ORDER_PAGE_SIZE;
  const { data, error, count } = await supabaseAdmin()
    .from("orders")
    .select(ORDER_COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + ORDER_PAGE_SIZE - 1)
    .retry(false)
    .returns<OrderJoin[]>();
  if (error) throw new Error(`orders: ${error.message}`);
  return { orders: (data ?? []).map(toAdminOrder), total: count ?? 0 };
}

/** คำสั่งซื้อทั้งหมดสำหรับ export (ดึงทีละหน้าจนครบ) */
export async function allOrders(max = 50_000): Promise<AdminOrder[]> {
  const out: AdminOrder[] = [];
  for (let from = 0; from < max; from += PAGE) {
    const { data, error } = await supabaseAdmin()
      .from("orders")
      .select(ORDER_COLUMNS)
      .order("created_at", { ascending: false })
      .range(from, from + PAGE - 1)
      .returns<OrderJoin[]>();
    if (error) throw new Error(`orders: ${error.message}`);
    out.push(...(data ?? []).map(toAdminOrder));
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
