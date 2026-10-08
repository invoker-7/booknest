import { NextResponse } from "next/server";
import { findOrCreateEmailUser, isAuthConfigured, setSignedInHint, supabaseSession } from "@/lib/auth";
import { normalizeEmail, readJsonBody } from "@/lib/api";
import { isEmail } from "@/lib/format";
import { clearOtpVerified, issueOtp, setPendingLogin } from "@/lib/otp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/auth/email  { email } -> { ok }
 * เข้าสู่ระบบด้วยอีเมล: ส่งรหัส 6 หลักไปที่อีเมลนั้น แล้วให้หน้าเข้าสู่ระบบไปขั้นกรอกรหัส
 * อีเมลที่ยังไม่เคยใช้จะได้บัญชีใหม่ — คำตอบเหมือนกันทั้งสองกรณี จึงบอกไม่ได้ว่าอีเมลไหนมีบัญชีอยู่แล้ว
 * ยังไม่นับว่าล็อกอิน และยังไม่มี session จนกว่าจะกรอกรหัสถูก (POST /api/auth/otp)
 */
export async function POST(req: Request) {
  if (!isAuthConfigured) return NextResponse.json({ error: "auth_not_configured" }, { status: 503 });

  const body = await readJsonBody(req);
  const email = normalizeEmail(body?.email);
  if (!isEmail(email)) return NextResponse.json({ error: "invalid_email" }, { status: 400 });

  try {
    const user = await findOrCreateEmailUser(email);
    if (!user) return NextResponse.json({ error: "login_failed" }, { status: 500 });

    // เริ่มเข้าสู่ระบบรอบใหม่: ทิ้ง session เดิมของเบราว์เซอร์นี้ (เช่น ค้างจากขั้น Google ของอีกบัญชี)
    await supabaseSession().auth.signOut({ scope: "local" }).catch(() => {});
    clearOtpVerified();
    setSignedInHint(false);

    // reuse: มีรหัสที่ยังใช้ได้อยู่จะไม่ส่งซ้ำ — กดซ้ำหรือมีคนใส่อีเมลนี้รัว ๆ ก็ไม่ได้อีเมลเพิ่ม
    const sent = await issueOtp(user, { reuse: true });
    if (!sent.ok && sent.error !== "otp_cooldown") {
      return NextResponse.json({ error: sent.error }, { status: 502 });
    }

    setPendingLogin(user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("email login:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "login_failed" }, { status: 500 });
  }
}
