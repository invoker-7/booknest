import { NextResponse } from "next/server";
import { isGoogleEnabled, safeNext, setSignedInHint, supabaseSession } from "@/lib/auth";
import { clearPendingLogin } from "@/lib/otp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /auth/callback?code=...&next=/path
 * ปลายทางของ Google OAuth — แลก code เป็น session แล้วพากลับไปหน้าที่ตั้งใจจะไป
 * เข้าด้วย Google (SSO) ถือว่าล็อกอินทันที: Google ยืนยันตัวตนให้แล้ว ไม่ต้องกรอกรหัสทางอีเมลซ้ำ
 */
export async function GET(req: Request) {
  const { origin, searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (isGoogleEnabled && code) {
    const { data, error } = await supabaseSession().auth.exchangeCodeForSession(code);
    if (!error && data?.user) {
      clearPendingLogin(); // เผื่อค้างจากการเริ่มเข้าสู่ระบบด้วยอีเมลไว้ก่อนหน้า
      setSignedInHint(true);
      return NextResponse.redirect(new URL(safeNext(searchParams.get("next")), origin));
    }
    if (error) console.error("auth callback:", error.message);
  }
  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
