import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { BookRow, OrderWithBook, ShopRow } from "@/lib/types";

/**
 * ไฟล์นี้ถูก import ได้เฉพาะฝั่ง server เท่านั้น (บังคับด้วย "server-only")
 * ถ้าเผลอ import ในคอมโพเนนต์ที่มี "use client" โปรเจกต์จะ build ไม่ผ่านทันที
 * — เป็นการกันไม่ให้ secret key หลุดไปอยู่ใน bundle ของ browser
 */

const url = process.env.SUPABASE_URL;
const secret =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_TIMEOUT_MS = 2500;

export const EBOOK_BUCKET = process.env.SUPABASE_EBOOK_BUCKET || "ebooks";

/** bucket สาธารณะสำหรับรูปสินค้า (ไฟล์สินค้าที่ขายอยู่ใน EBOOK_BUCKET แบบ private คนละที่กัน) */
export const IMAGE_BUCKET = "product-images";

/** ต้น URL ของรูปสินค้า — ใช้ตรวจว่า cover ที่ส่งมาเป็นรูปจาก bucket ของร้านจริง */
export const imageBaseUrl = (): string => `${url}/storage/v1/object/public/${IMAGE_BUCKET}/`;

/** ยังไม่ได้ตั้งค่า env? หน้าเว็บจะขึ้นคำแนะนำแทนการพัง */
export const isSupabaseConfigured = Boolean(url && secret);

let cached: SupabaseClient | null = null;

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error(`Supabase request timed out after ${SUPABASE_TIMEOUT_MS}ms`));
    }, SUPABASE_TIMEOUT_MS);
  });

  try {
    return await Promise.race([
      fetch(input, { ...init, signal: controller.signal }),
      timeout,
    ]);
  } catch (error) {
    controller.abort();
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function supabaseAdmin(): SupabaseClient {
  if (!url || !secret) {
    throw new Error(
      "ยังไม่ได้ตั้งค่า SUPABASE_URL และ SUPABASE_SECRET_KEY"
    );
  }
  if (!cached) {
    cached = createClient(url, secret, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: fetchWithTimeout },
    });
  }
  return cached;
}

const WITH_SHOP = "*, shop:shops(id, name)";

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * select สินค้าพร้อมชื่อร้าน ถ้ายังไม่ได้รัน supabase/marketplace.sql
 * (ยังไม่มีตาราง shops) จะ fallback ไป select แบบเดิม
 *
 * ปิด retry อัตโนมัติของ supabase-js: ค่าเริ่มต้นจะลองใหม่ 3 ครั้งแบบหน่วงเวลา (รวม ~7 วินาที)
 * ซึ่งทำให้ทุกหน้าค้างเมื่อฐานข้อมูลต่อไม่ได้ หน้าร้านควรล้มเร็วแล้วแสดงผลสำรองแทน
 */
async function selectBooks(filter: { id?: string; shopId?: string } = {}) {
  const run = (columns: string) => {
    let q = supabaseAdmin().from("books").select(columns).order("sort", { ascending: true });
    if (filter.id) q = q.eq("id", filter.id);
    if (filter.shopId) q = q.eq("shop_id", filter.shopId);
    return q.retry(false).returns<BookRow[]>();
  };
  const res = await run(WITH_SHOP);
  // fallback เฉพาะเมื่อฐานข้อมูลตอบกลับมาว่า query ผิด (มี error code จาก PostgREST)
  // ถ้าเป็นปัญหาเครือข่าย (ไม่มี code) การยิงซ้ำมีแต่ทำให้หน้าเว็บรอนานขึ้น
  return res.error?.code ? run("*") : res;
}

/** ดึงรายการสินค้าดิจิทัลที่เปิดขายสำหรับหน้าร้าน (เก็บในตาราง books) */
export async function getBooks({ shopId }: { shopId?: string } = {}): Promise<BookRow[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await selectBooks({ shopId });
    if (error) {
      console.error("getBooks:", error.message);
      return [];
    }
    return (data ?? []).filter((b) => b.published !== false);
  } catch (error) {
    console.error("getBooks: Supabase is unreachable:", message(error));
    return [];
  }
}

/** ดึงสินค้าดิจิทัลชิ้นเดียว */
export async function getBook(id: string): Promise<BookRow | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await selectBooks({ id });
    if (error) {
      console.error("getBook:", error.message);
      return null;
    }
    return data?.[0] ?? null;
  } catch (error) {
    console.error("getBook: Supabase is unreachable:", message(error));
    return null;
  }
}

/** ดึงข้อมูลร้านค้า */
export async function getShop(id: string): Promise<ShopRow | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabaseAdmin()
      .from("shops")
      .select("*")
      .eq("id", id)
      .retry(false)
      .maybeSingle<ShopRow>();
    if (error) {
      console.error("getShop:", error.message);
      return null;
    }
    return data;
  } catch (error) {
    console.error("getShop: Supabase is unreachable:", message(error));
    return null;
  }
}

/** ดึงคำสั่งซื้อพร้อมข้อมูลสินค้า */
export async function getOrder(orderNo: string): Promise<OrderWithBook | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabaseAdmin()
      .from("orders")
      .select("*, book:books(*)")
      .eq("order_no", orderNo)
      .retry(false)
      .maybeSingle<OrderWithBook>();
    if (error) {
      console.error("getOrder:", error.message);
      return null;
    }
    return data;
  } catch (error) {
    console.error("getOrder: Supabase is unreachable:", message(error));
    return null;
  }
}

/** สร้างลิงก์ดาวน์โหลดชั่วคราวจากบั๊กเก็ต private (ค่าเริ่มต้น 24 ชม.) */
export async function createDownloadLink(
  filePath: string,
  seconds = 60 * 60 * 24
): Promise<{ url: string | null; error: string | null }> {
  const { data, error } = await supabaseAdmin()
    .storage.from(EBOOK_BUCKET)
    .createSignedUrl(filePath, seconds);
  if (error) {
    console.error("createSignedUrl:", error.message);
    return { url: null, error: error.message };
  }
  return { url: data.signedUrl, error: null };
}
