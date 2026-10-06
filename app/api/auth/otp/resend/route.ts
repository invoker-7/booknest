import { NextResponse } from "next/server";
import { getPendingIdentity } from "@/lib/auth";
import { issueOtp, OTP_RESEND_SECONDS } from "@/lib/otp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/auth/otp/resend -> { ok, retryIn } — ส่งรหัสใหม่ (รหัสเดิมใช้ไม่ได้อีก) */
export async function POST() {
  const user = await getPendingIdentity();
  if (!user) return NextResponse.json({ error: "otp_no_session" }, { status: 401 });

  const sent = await issueOtp(user);
  if (sent.ok) return NextResponse.json({ ok: true, retryIn: OTP_RESEND_SECONDS });
  if (sent.error === "otp_cooldown") {
    return NextResponse.json({ error: sent.error, retryIn: sent.retryIn }, { status: 429 });
  }
  return NextResponse.json({ error: sent.error }, { status: 502 });
}
