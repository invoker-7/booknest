import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * ไฟล์นี้ถูก import ได้เฉพาะฝั่ง server เท่านั้น (บังคับด้วย "server-only")
 * ถ้าเผลอ import ในคอมโพเนนต์ที่มี "use client" โปรเจกต์จะ build ไม่ผ่านทันที
 * — เป็นการกันไม่ให้ secret key หลุดไปอยู่ใน bundle ของ browser
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

export const EBOOK_BUCKET = process.env.SUPABASE_EBOOK_BUCKET || "ebooks";

/** ยังไม่ได้ตั้งค่า env? หน้าเว็บจะขึ้นคำแนะนำแทนการพัง */
export const isSupabaseConfigured = Boolean(url && secret);

let cached = null;

export function supabaseAdmin() {
  if (!isSupabaseConfigured) {
    throw new Error(
      "ยังไม่ได้ตั้งค่า NEXT_PUBLIC_SUPABASE_URL และ SUPABASE_SECRET_KEY"
    );
  }
  if (!cached) {
    cached = createClient(url, secret, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}

/** ดึงรายการหนังสือทั้งหมดสำหรับหน้าร้าน */
export async function getBooks() {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabaseAdmin()
    .from("books")
    .select("*")
    .order("sort", { ascending: true });
  if (error) {
    console.error("getBooks:", error.message);
    return [];
  }
  return data ?? [];
}

/** ดึงหนังสือเล่มเดียว */
export async function getBook(id) {
  if (!isSupabaseConfigured) return null;
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
}

/** ดึงคำสั่งซื้อพร้อมข้อมูลหนังสือ */
export async function getOrder(orderNo) {
  if (!isSupabaseConfigured) return null;
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
