import { NextResponse } from "next/server";
import { isGoogleEnabled, safeNext, setSignedInHint, supabaseSession } from "@/lib/auth";
import { clearOtpVerified, discardOtp } from "@/lib/otp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /auth/callback?code=...&next=/path
 * ปลายทางของ Google OAuth — แลก code เป็น session แล้วพาไปหน้ากรอกรหัส OTP ทันที
 * อีเมลรหัสถูกส่งตอนหน้านั้นเปิด (ไม่ส่งที่นี่ ผู้ใช้จะได้ไม่ต้องรอ SMTP ก่อนเห็นหน้าจอ)
 * ยังไม่นับว่าล็อกอินจนกว่าจะกรอกรหัส
 */
export async function GET(req: Request) {
  const { origin, searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (isGoogleEnabled && code) {
    const { data, error } = await supabaseSession().auth.exchangeCodeForSession(code);
    if (!error && data?.user) {
      // เข้าสู่ระบบใหม่ทุกครั้งต้องกรอกรหัสใหม่ แม้เครื่องนี้เคยผ่านมาแล้ว
      clearOtpVerified();
      setSignedInHint(false);
      await discardOtp(data.user.id);

      const to = new URL("/login", origin);
      to.searchParams.set("next", safeNext(searchParams.get("next")));
      return NextResponse.redirect(to);
    }
    if (error) console.error("auth callback:", error.message);
  }
  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
