import { NextResponse } from "next/server";
import { isGoogleEnabled, safeNext, setSignedInHint, supabaseSession } from "@/lib/auth";
import { clearOtpVerified, issueOtp } from "@/lib/otp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /auth/callback?code=...&next=/path
 * ปลายทางของ Google OAuth — แลก code เป็น session แล้วส่งรหัส OTP ไปที่อีเมลของบัญชี
 * ยังไม่นับว่าล็อกอินจนกว่าจะกรอกรหัสที่หน้า /login
 */
export async function GET(req: Request) {
  const { origin, searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (isGoogleEnabled && code) {
    const { data, error } = await supabaseSession().auth.exchangeCodeForSession(code);
    const user = data?.user;
    if (!error && user?.email) {
      // เข้าสู่ระบบใหม่ทุกครั้งต้องกรอกรหัสใหม่ แม้เครื่องนี้เคยผ่านมาแล้ว
      clearOtpVerified();
      setSignedInHint(false);

      const meta = user.user_metadata as { name?: string; full_name?: string } | undefined;
      const sent = await issueOtp({
        id: user.id,
        email: user.email.toLowerCase(),
        name: meta?.name || meta?.full_name || "",
      });

      const to = new URL("/login", origin);
      to.searchParams.set("next", safeNext(searchParams.get("next")));
      // otp_cooldown = เพิ่งส่งรหัสไปไม่ถึงนาที รหัสนั้นยังใช้ได้อยู่
      if (!sent.ok && sent.error === "otp_send_failed") to.searchParams.set("error", "otp_send");
      return NextResponse.redirect(to);
    }
    if (error) console.error("auth callback:", error.message);
  }
  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
