import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { sendOtpEmail } from "@/lib/email";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * ขั้นที่สองของการเข้าสู่ระบบ: หลัง Google ยืนยันตัวตนแล้ว ต้องกรอกรหัส 6 หลักที่ส่งไปยังอีเมลของบัญชี
 * - รหัสเก็บในตาราง login_otps แบบ hash (หนึ่งแถวต่อหนึ่งบัญชี) พร้อมตัวนับจำนวนครั้งที่กรอกผิด
 * - ผ่านแล้วตั้ง cookie แบบ httpOnly ที่เซ็นด้วย HMAC ผูกกับ user id — ตรวจได้โดยไม่ต้อง query ฐานข้อมูล
 */

export const OTP_LENGTH = 6;
export const OTP_TTL_MINUTES = 10;
export const OTP_RESEND_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;

const VERIFIED_COOKIE = "vx_otp";
const VERIFIED_SECONDS = 60 * 60 * 24 * 30;

export type OtpError = "otp_invalid" | "otp_expired" | "otp_locked";
export type OtpSendResult =
  | { ok: true; retryIn: number }
  | { ok: false; error: "otp_cooldown"; retryIn: number }
  | { ok: false; error: "otp_send_failed" };

interface OtpRow {
  code_hash: string;
  expires_at: string;
  sent_at: string;
  attempts: number;
}

// ไม่ต้องมี env เพิ่ม: กุญแจเซ็นแตกมาจาก secret key ที่อยู่บน server อยู่แล้ว
let key: Buffer | null = null;
function signingKey(): Buffer {
  if (!key) {
    const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!secret) throw new Error("ยังไม่ได้ตั้งค่า SUPABASE_SECRET_KEY");
    key = createHmac("sha256", secret).update("vector-login-otp").digest();
  }
  return key;
}

const sign = (value: string): string => createHmac("sha256", signingKey()).update(value).digest("base64url");

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/* ---------- cookie "ผ่าน OTP แล้ว" ---------- */

export const hasOtpCookie = (): boolean => Boolean(cookies().get(VERIFIED_COOKIE)?.value);

/** cookie ยังไม่หมดอายุและเซ็นไว้ให้ผู้ใช้คนนี้จริง */
export function isOtpVerified(userId: string): boolean {
  const [exp, sig] = (cookies().get(VERIFIED_COOKIE)?.value || "").split(".");
  if (!exp || !sig || !(Number(exp) > Date.now())) return false;
  try {
    return safeEqual(sig, sign(`${userId}:${exp}`));
  } catch {
    return false;
  }
}

export function markOtpVerified(userId: string): void {
  const exp = String(Date.now() + VERIFIED_SECONDS * 1000);
  cookies().set(VERIFIED_COOKIE, `${exp}.${sign(`${userId}:${exp}`)}`, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: VERIFIED_SECONDS,
  });
}

export function clearOtpVerified(): void {
  cookies().delete(VERIFIED_COOKIE);
}

/* ---------- cookie "กำลังเข้าสู่ระบบด้วยอีเมล" ---------- */

const PENDING_COOKIE = "vx_pending";
const PENDING_SECONDS = 60 * 15;

/**
 * เข้าสู่ระบบด้วยอีเมล: ระหว่างรอกรอกรหัสยังไม่มี session ของ Supabase
 * cookie นี้บอกแค่ว่าเบราว์เซอร์นี้กำลังยืนยันบัญชีไหน (เซ็นไว้ แก้เป็นบัญชีอื่นไม่ได้) — ไม่ได้ให้สิทธิ์อะไร
 */
export function setPendingLogin(userId: string): void {
  const exp = String(Date.now() + PENDING_SECONDS * 1000);
  cookies().set(PENDING_COOKIE, `${userId}.${exp}.${sign(`pending:${userId}:${exp}`)}`, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: PENDING_SECONDS,
  });
}

/** user id ที่กำลังรอกรอกรหัส — null เมื่อไม่มี หมดอายุ หรือถูกแก้ */
export function readPendingLogin(): string | null {
  const [userId, exp, sig] = (cookies().get(PENDING_COOKIE)?.value || "").split(".");
  if (!userId || !exp || !sig || !(Number(exp) > Date.now())) return null;
  try {
    return safeEqual(sig, sign(`pending:${userId}:${exp}`)) ? userId : null;
  } catch {
    return null;
  }
}

export function clearPendingLogin(): void {
  cookies().delete(PENDING_COOKIE);
}

/* ---------- ออกรหัส / ตรวจรหัส ---------- */

/** เข้าสู่ระบบรอบใหม่: ทิ้งรหัสเดิม ให้หน้ากรอกรหัสขอรหัสใหม่เอง */
export async function discardOtp(userId: string): Promise<void> {
  const { error } = await supabaseAdmin().from("login_otps").delete().eq("user_id", userId);
  if (error) console.error("discardOtp:", error.message);
}

/**
 * สร้างรหัสใหม่แล้วส่งอีเมล — ขอซ้ำได้ทุก OTP_RESEND_SECONDS วินาที
 * reuse = true (หน้ากรอกรหัสเรียกเองตอนเปิด): ถ้ายังมีรหัสที่ใช้ได้อยู่จะไม่ส่งซ้ำ เปิดหน้าใหม่กี่ครั้งก็ได้อีเมลฉบับเดียว
 */
export async function issueOtp(
  user: { id: string; email: string; name: string },
  { reuse = false }: { reuse?: boolean } = {}
): Promise<OtpSendResult> {
  const db = supabaseAdmin();
  try {
    const { data: last } = await db
      .from("login_otps")
      .select("sent_at, expires_at, attempts")
      .eq("user_id", user.id)
      .maybeSingle<Pick<OtpRow, "sent_at" | "expires_at" | "attempts">>();

    if (last) {
      const wait = OTP_RESEND_SECONDS - Math.floor((Date.now() - Date.parse(last.sent_at)) / 1000);
      const usable = Date.parse(last.expires_at) > Date.now() && last.attempts < OTP_MAX_ATTEMPTS;
      if (reuse && usable) return { ok: true, retryIn: Math.max(wait, 0) };
      if (wait > 0) return { ok: false, error: "otp_cooldown", retryIn: wait };
    }

    const code = String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
    const { error } = await db.from("login_otps").upsert({
      user_id: user.id,
      code_hash: sign(`${user.id}:${code}`),
      expires_at: new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString(),
      sent_at: new Date().toISOString(),
      attempts: 0,
    });
    if (error) throw new Error(error.message);

    const mail = await sendOtpEmail({ to: user.email, name: user.name, code, minutes: OTP_TTL_MINUTES });
    if (mail.status === "sent") return { ok: true, retryIn: OTP_RESEND_SECONDS };

    // ยังไม่ได้ตั้ง SMTP: ตอนพัฒนาให้ดูรหัสจาก log ของ server ได้ ส่วน production ถือว่าส่งไม่สำเร็จ
    if (mail.status === "mock" && process.env.NODE_ENV !== "production") {
      console.info(`[otp] ${user.email} -> ${code} (SMTP not set, code shown here for local testing)`);
      return { ok: true, retryIn: OTP_RESEND_SECONDS };
    }

    // ส่งไม่ถึง: ลบรหัสทิ้งเพื่อให้กดขอใหม่ได้ทันที
    await db.from("login_otps").delete().eq("user_id", user.id);
    return { ok: false, error: "otp_send_failed" };
  } catch (error) {
    console.error("issueOtp:", error instanceof Error ? error.message : error);
    return { ok: false, error: "otp_send_failed" };
  }
}

/** ตรวจรหัส — คืน null เมื่อถูกต้อง (รหัสใช้ได้ครั้งเดียว) */
export async function verifyOtp(userId: string, code: string): Promise<OtpError | null> {
  const db = supabaseAdmin();
  const { data: row } = await db
    .from("login_otps")
    .select("code_hash, expires_at, sent_at, attempts")
    .eq("user_id", userId)
    .maybeSingle<OtpRow>();

  if (!row || Date.parse(row.expires_at) <= Date.now()) return "otp_expired";
  if (row.attempts >= OTP_MAX_ATTEMPTS) return "otp_locked";

  // นับครั้งก่อนเทียบรหัสเสมอ และนับได้ทีละ request — ยิงพร้อมกันหลายตัวก็เดาเกินโควตาไม่ได้
  const { data: counted } = await db
    .from("login_otps")
    .update({ attempts: row.attempts + 1 })
    .eq("user_id", userId)
    .eq("attempts", row.attempts)
    .select("attempts");
  if (!counted?.length) return "otp_invalid";

  if (!safeEqual(row.code_hash, sign(`${userId}:${code}`))) {
    return row.attempts + 1 >= OTP_MAX_ATTEMPTS ? "otp_locked" : "otp_invalid";
  }

  await db.from("login_otps").delete().eq("user_id", userId);
  return null;
}
