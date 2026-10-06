import "server-only";
import { randomBytes } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { MAX_IMAGE_BYTES } from "@/lib/format";

/**
 * สลิปโอนเงินที่ผู้ซื้อแนบมา — เก็บใน bucket แบบ private แยกโฟลเดอร์ตามเลขคำสั่งซื้อ
 * (payment-slips/<เลขคำสั่งซื้อ>/slip-xxxx.jpg) จึงไม่ต้องเพิ่มคอลัมน์ในฐานข้อมูล
 * "มีสลิปหรือยัง" = โฟลเดอร์ของคำสั่งซื้อนั้นมีไฟล์อยู่ไหม
 */
const SLIP_BUCKET = "payment-slips";
const SLIP_MIME = ["image/jpeg", "image/png", "image/webp"];

// bucket ถูกสร้างให้เองครั้งแรกที่มีการแนบสลิป (ไม่ต้องรัน SQL เพิ่ม)
let ready = false;
async function ensureBucket(): Promise<void> {
  if (ready) return;
  const { error } = await supabaseAdmin().storage.createBucket(SLIP_BUCKET, {
    public: false,
    fileSizeLimit: MAX_IMAGE_BYTES,
    allowedMimeTypes: SLIP_MIME,
  });
  if (error && !/already exists/i.test(error.message)) throw new Error(error.message);
  ready = true;
}

/** ที่อยู่ของสลิปล่าสุดของคำสั่งซื้อนี้ — null เมื่อยังไม่ได้แนบ */
export async function findSlip(orderNo: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin()
    .storage.from(SLIP_BUCKET)
    .list(orderNo, { limit: 1, sortBy: { column: "created_at", order: "desc" } });
  // ยังไม่เคยมีใครแนบสลิปเลย bucket จึงยังไม่ถูกสร้าง = ไม่มีสลิป
  if (error || !data?.[0]) return null;
  return `${orderNo}/${data[0].name}`;
}

/**
 * เลขคำสั่งซื้อทั้งหมดที่เคยมีสลิป ใหม่สุดก่อน (หนึ่งคำขอ — ชื่อโฟลเดอร์คือเลขคำสั่งซื้อ ซึ่งขึ้นต้นด้วยวันที่)
 * ใช้นับงานรอตรวจของหลังบ้านโดยไม่ต้องถามทีละคำสั่งซื้อ
 */
export async function slipOrderNos(limit = 500): Promise<string[]> {
  const { data, error } = await supabaseAdmin()
    .storage.from(SLIP_BUCKET)
    .list("", { limit, sortBy: { column: "name", order: "desc" } });
  if (error || !data) return []; // ยังไม่เคยมีใครแนบสลิป
  return data.map((entry) => entry.name);
}

/** true = คำสั่งซื้อนี้มีสลิปใบเดียวและเพิ่งแนบ (ไม่เกิน 5 นาที) — ใช้ตัดสินว่าจะแจ้งร้านทางอีเมลหรือไม่ */
export async function isFirstFreshSlip(orderNo: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin().storage.from(SLIP_BUCKET).list(orderNo, { limit: 2 });
  if (error || data?.length !== 1) return false;
  const created = Date.parse(data[0].created_at ?? "");
  return Number.isFinite(created) && Date.now() - created < 5 * 60_000;
}

/** เลขคำสั่งซื้อที่แนบสลิปแล้ว จากชุดที่ถาม (ถามพร้อมกัน — ใช้กับคำสั่งซื้อที่ยังไม่จ่ายเท่านั้น จึงมีไม่กี่รายการ) */
export async function ordersWithSlip(orderNos: string[]): Promise<Set<string>> {
  const found = await Promise.all(orderNos.map(async (no) => ((await findSlip(no)) ? no : null)));
  return new Set(found.filter((no): no is string => Boolean(no)));
}

/**
 * URL อัปโหลดครั้งเดียวสำหรับสลิปของแต่ละคำสั่งซื้อ (เบราว์เซอร์ส่งไฟล์ตรงไปที่ Storage)
 * ตะกร้าหลายชิ้นจ่ายด้วยสลิปใบเดียว จึงเก็บสำเนาไว้กับทุกคำสั่งซื้อ ร้านเปิดดูได้จากรายการไหนก็ได้
 */
export async function createSlipUploads(orderNos: string[], ext: string): Promise<{ orderNo: string; url: string }[]> {
  await ensureBucket();
  const name = `slip-${Date.now()}-${randomBytes(3).toString("hex")}.${ext}`;
  return Promise.all(
    orderNos.map(async (orderNo) => {
      const { data, error } = await supabaseAdmin().storage.from(SLIP_BUCKET).createSignedUploadUrl(`${orderNo}/${name}`);
      if (error || !data) throw new Error(error?.message || "no upload url");
      return { orderNo, url: data.signedUrl };
    })
  );
}

/** ลิงก์ชั่วคราว (5 นาที) สำหรับให้เจ้าของร้านเปิดดูสลิป */
export async function slipViewUrl(orderNo: string): Promise<string | null> {
  const path = await findSlip(orderNo);
  if (!path) return null;
  const { data, error } = await supabaseAdmin().storage.from(SLIP_BUCKET).createSignedUrl(path, 300);
  return error || !data ? null : data.signedUrl;
}
