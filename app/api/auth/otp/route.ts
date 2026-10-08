import { NextResponse } from "next/server";
import { createEmailSession, getPendingIdentity, setSignedInHint } from "@/lib/auth";
import { readJsonBody } from "@/lib/api";
import { clearPendingLogin, OTP_LENGTH, verifyOtp, type OtpError } from "@/lib/otp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUS: Record<OtpError, number> = { otp_invalid: 400, otp_expired: 410, otp_locked: 429 };

/** POST /api/auth/otp  { code } -> { ok } — ขั้นกรอกรหัสของการเข้าสู่ระบบด้วยอีเมล: ผ่านแล้วจึงออก session ให้ */
export async function POST(req: Request) {
  const user = await getPendingIdentity();
  if (!user) return NextResponse.json({ error: "otp_no_session" }, { status: 401 });

  const body = await readJsonBody(req);
  const code = String(body?.code ?? "").replace(/\s/g, "");
  if (!new RegExp(`^\\d{${OTP_LENGTH}}$`).test(code)) {
    return NextResponse.json({ error: "otp_invalid" }, { status: 400 });
  }

  try {
    const error = await verifyOtp(user.id, code);
    if (error) return NextResponse.json({ error }, { status: STATUS[error] });

    // เพิ่งพิสูจน์ว่าเป็นเจ้าของอีเมลจริง จึงออก session ให้ตอนนี้
    if (!(await createEmailSession(user.email))) return NextResponse.json({ error: "otp_failed" }, { status: 500 });
    clearPendingLogin();
  } catch (err) {
    console.error("otp verify:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "otp_failed" }, { status: 500 });
  }

  setSignedInHint(true);
  return NextResponse.json({ ok: true });
}
