import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hasOtpCookie, isOtpVerified, readPendingLogin } from "@/lib/otp";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";
import type { SessionUser, UserRole } from "@/lib/types";

/**
 * การยืนยันตัวตนทั้งหมดทำที่ฝั่ง server
 * - เข้าสู่ระบบได้สองทาง: Google หรือกรอกอีเมล — ทั้งสองทางต้องผ่านรหัส OTP ทางอีเมล (lib/otp.ts) จึงนับว่าล็อกอิน
 * - session เก็บใน cookie แบบ httpOnly (เบราว์เซอร์ไม่ต้องโหลด Supabase SDK และ JavaScript อ่าน token ไม่ได้)
 * - ใช้ anon key สำหรับ session ของผู้ใช้ ส่วน secret key ใช้เฉพาะงานที่ตรวจสิทธิ์แล้ว
 */

const url = process.env.SUPABASE_URL;
const anon = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

export const isAuthConfigured = Boolean(isSupabaseConfigured && anon);
export const isGoogleEnabled = isAuthConfigured && process.env.AUTH_GOOGLE_ENABLED === "true";

const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

/** อีเมลผู้ดูแลจาก env — ใช้ส่งแจ้งเตือนของร้าน (เช่น มีสลิปรอตรวจ) */
export const adminEmails = (): string[] => [...ADMIN_EMAILS];

/** ผู้ดูแลที่กำหนดใน env — เป็น admin เสมอ ไม่ขึ้นกับ role ในฐานข้อมูล */
export const isEnvAdmin = (email: string): boolean => ADMIN_EMAILS.has(email.trim().toLowerCase());

/** client ที่ผูกกับ cookie ของ request นี้ — ใช้ได้ใน route handler, middleware ไม่ได้ใช้ตัวนี้ */
export function supabaseSession(): SupabaseClient {
  if (!url || !anon) throw new Error("ยังไม่ได้ตั้งค่า SUPABASE_URL และ SUPABASE_PUBLISHABLE_KEY");
  const store = cookies();
  return createServerClient(url, anon, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) {
            store.set(name, value, { ...options, httpOnly: true, sameSite: "lax" });
          }
        } catch {
          // server component เขียน cookie ไม่ได้ — middleware เป็นคนต่ออายุ session ให้หน้าเหล่านั้น
        }
      },
    },
  });
}

/**
 * cookie บอกใบ้ว่าล็อกอินอยู่ (ไม่ใช่ token, JavaScript อ่านได้)
 * หน้าร้านใช้ตัดสินว่าจะถาม /api/auth/me หรือไม่ — ผู้ที่ไม่ได้ล็อกอินจึงไม่มี request เพิ่มเลย
 */
export const SIGNED_IN_HINT = "vx_signedin";

export function setSignedInHint(on: boolean): void {
  const store = cookies();
  if (on) store.set(SIGNED_IN_HINT, "1", { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  else store.delete(SIGNED_IN_HINT);
}

/** มี cookie session ไหม — ผู้ที่ไม่ได้ล็อกอินไม่ต้องเสียเวลายิงไปถาม Supabase Auth */
const hasSessionCookie = () => cookies().getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));

export interface SessionIdentity {
  id: string;
  email: string;
  name: string;
}

/** ตรวจ token กับ Supabase Auth — ยังไม่ดูว่าผ่าน OTP หรือยัง */
async function readIdentity(): Promise<SessionIdentity | null> {
  if (!isAuthConfigured || !hasSessionCookie()) return null;
  try {
    const { data, error } = await supabaseSession().auth.getUser();
    const user = data?.user;
    if (error || !user?.email) return null;
    const meta = user.user_metadata as { name?: string; full_name?: string } | undefined;
    return { id: user.id, email: user.email.toLowerCase(), name: meta?.name || meta?.full_name || "" };
  } catch (error) {
    console.error("readIdentity:", error instanceof Error ? error.message : error);
    return null;
  }
}

export interface PendingLogin {
  user: SessionIdentity;
  /** google = มี session จาก Google แล้ว, email = ยังไม่มี session จนกว่าจะกรอกรหัสถูก */
  via: "google" | "email";
}

/** กำลังรอกรอก OTP (หลัง Google หรือหลังกรอกอีเมล) — ใช้เฉพาะหน้าและ API ของขั้นกรอกรหัส */
export async function getPendingLogin(): Promise<PendingLogin | null> {
  const viaGoogle = await readIdentity();
  if (viaGoogle) return isOtpVerified(viaGoogle.id) ? null : { user: viaGoogle, via: "google" };

  const userId = readPendingLogin();
  if (!userId) return null;
  const { data: row } = await supabaseAdmin()
    .from("profiles")
    .select("id, email, name")
    .eq("id", userId)
    .retry(false)
    .maybeSingle<SessionIdentity>();
  return row?.email ? { user: { id: row.id, email: row.email.toLowerCase(), name: row.name || "" }, via: "email" } : null;
}

export async function getPendingIdentity(): Promise<SessionIdentity | null> {
  return (await getPendingLogin())?.user ?? null;
}

/**
 * บัญชีของอีเมลนี้ — ยังไม่มีก็สร้างให้ (เข้าสู่ระบบด้วยอีเมลครั้งแรก = สมัครสมาชิก)
 * การเป็นเจ้าของอีเมลพิสูจน์ด้วย OTP ในขั้นถัดไป บัญชีที่สร้างไว้เฉย ๆ จึงยังเข้าไม่ได้
 */
export async function findOrCreateEmailUser(email: string): Promise<SessionIdentity | null> {
  const db = supabaseAdmin();
  const find = async () => {
    const { data } = await db.from("profiles").select("id, email, name").eq("email", email).limit(1).retry(false);
    const row = (data as SessionIdentity[] | null)?.[0];
    return row ? { id: row.id, email, name: row.name || "" } : null;
  };

  const existing = await find();
  if (existing) return existing;

  const name = email.split("@")[0] ?? "";
  const { data, error } = await db.auth.admin.createUser({ email, email_confirm: true, user_metadata: { name } });
  if (data?.user) return { id: data.user.id, email, name };
  // มีคนสร้างบัญชีนี้ไปพร้อมกันพอดี: อ่านอีกครั้ง
  console.error("findOrCreateEmailUser:", error?.message);
  return find();
}

/**
 * ออก session ของ Supabase ให้บัญชีที่เพิ่งยืนยันอีเมลด้วย OTP ของเราเอง (เรียกหลังตรวจรหัสผ่านแล้วเท่านั้น)
 * ขอ token แบบ magic link จาก Admin API แล้วแลกเป็น session ทันทีที่ server — ไม่มีอีเมลจาก Supabase ถูกส่ง
 */
export async function createEmailSession(email: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin().auth.admin.generateLink({ type: "magiclink", email });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) {
    console.error("createEmailSession link:", error?.message);
    return false;
  }
  const { error: verifyError } = await supabaseSession().auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
  if (verifyError) console.error("createEmailSession verify:", verifyError.message);
  return !verifyError;
}

/** ผู้ที่ล็อกอินครบสองขั้นแล้ว — คืนเฉพาะ id + อีเมล (เร็วกว่า getSessionUser หนึ่ง query) */
export async function getSessionIdentity(): Promise<SessionIdentity | null> {
  if (!hasOtpCookie()) return null; // ยังไม่ผ่าน OTP ไม่ต้องเสียเวลายิงไปถาม Supabase Auth
  const user = await readIdentity();
  return user && isOtpVerified(user.id) ? user : null;
}

/** ผู้ใช้ของ request นี้พร้อมสิทธิ์ — null เมื่อไม่ได้ล็อกอิน */
export async function getSessionUser(): Promise<SessionUser | null> {
  const user = await getSessionIdentity();
  if (!user) return null;
  try {
    const { email } = user;
    const { data: profile } = await supabaseAdmin()
      .from("profiles")
      .select("name, role")
      .eq("id", user.id)
      .retry(false)
      .maybeSingle<{ name: string | null; role: UserRole }>();

    return {
      id: user.id,
      email,
      name: profile?.name || user.name,
      isAdmin: profile?.role === "admin" || isEnvAdmin(email),
    };
  } catch (error) {
    console.error("getSessionUser:", error instanceof Error ? error.message : error);
    return null;
  }
}

/** ใช้ต้น route handler ของหลังบ้าน: คืนผู้ใช้เมื่อเป็น admin ไม่เช่นนั้นคืน null */
export async function getAdmin(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  return user?.isAdmin ? user : null;
}

/** ใช้ต้นทุกหน้าใน /admin ก่อนอ่านข้อมูล: ไม่ใช่ admin จะถูกพาออกไป */
export async function requireAdmin(next = "/admin"): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (!user.isAdmin) redirect("/account");
  return user;
}

/**
 * ตรวจสิทธิ์ admin ไปพร้อมกับโหลดข้อมูลของหน้า (ไม่ต้องรอตรวจสิทธิ์เสร็จก่อนค่อยเริ่ม query)
 * ข้อมูลถูกคืนก็ต่อเมื่อผ่านการตรวจสิทธิ์แล้วเท่านั้น — ไม่ใช่ admin จะถูกพาออกไปก่อนถึงบรรทัด return
 */
export async function withAdmin<T>(next: string, load: () => Promise<T>): Promise<{ admin: SessionUser; data: T }> {
  const pending = load();
  pending.catch(() => {}); // ถ้าถูกพาออกไปก่อน ความผิดพลาดของ query ที่ไม่มีใครรอไม่ต้องขึ้นเป็น unhandled rejection
  const admin = await requireAdmin(next);
  return { admin, data: await pending };
}

/** ปลายทางหลังล็อกอิน — รับเฉพาะ path ภายในเว็บ กัน open redirect */
export function safeNext(value: unknown, fallback = "/account"): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : fallback;
}
