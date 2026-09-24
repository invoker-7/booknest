import "server-only";
import { createClient } from "@supabase/supabase-js";

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

/** ยังไม่ได้ตั้งค่า env? หน้าเว็บจะขึ้นคำแนะนำแทนการพัง */
export const isSupabaseConfigured = Boolean(url && secret);

let cached = null;

async function fetchWithTimeout(input, init = {}) {
  const controller = new AbortController();
  let timeoutId;
  const timeout = new Promise((_, reject) => {
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

export function supabaseAdmin() {
  if (!isSupabaseConfigured) {
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

/** ดึงรายการสินค้าดิจิทัลทั้งหมดสำหรับหน้าร้าน (เก็บในตาราง books) */
export async function getBooks() {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabaseAdmin()
      .from("books")
      .select("*")
      .order("sort", { ascending: true });
    if (error) {
      console.error("getBooks:", error.message);
      return [];
    }
    return data ?? [];
  } catch (error) {
    console.error("getBooks: Supabase is unreachable:", error.message);
    return [];
  }
}

/** ดึงสินค้าดิจิทัลชิ้นเดียว */
export async function getBook(id) {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabaseAdmin()
      .from("books")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      console.error("getBook:", error.message);
      return null;
    }
    return data;
  } catch (error) {
    console.error("getBook: Supabase is unreachable:", error.message);
    return null;
  }
}

/** ดึงคำสั่งซื้อพร้อมข้อมูลสินค้า */
export async function getOrder(orderNo) {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabaseAdmin()
      .from("orders")
      .select("*, book:books(*)")
      .eq("order_no", orderNo)
      .maybeSingle();
    if (error) {
      console.error("getOrder:", error.message);
      return null;
    }
    return data;
  } catch (error) {
    console.error("getOrder: Supabase is unreachable:", error.message);
    return null;
  }
}

/** สร้างลิงก์ดาวน์โหลดชั่วคราวจากบั๊กเก็ต private (ค่าเริ่มต้น 24 ชม.) */
export async function createDownloadLink(filePath, seconds = 60 * 60 * 24) {
  const { data, error } = await supabaseAdmin()
    .storage.from(EBOOK_BUCKET)
    .createSignedUrl(filePath, seconds);
  if (error) {
    console.error("createSignedUrl:", error.message);
    return { url: null, error: error.message };
  }
  return { url: data.signedUrl, error: null };
}
