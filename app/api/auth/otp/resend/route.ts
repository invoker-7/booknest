import { NextResponse } from "next/server";
import { getPendingIdentity } from "@/lib/auth";
import { readJsonBody } from "@/lib/api";
import { issueOtp } from "@/lib/otp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/auth/otp/resend  { auto? } -> { ok, retryIn }
 * auto = true: หน้ากรอกรหัสเรียกตอนเปิด — ส่งเฉพาะเมื่อยังไม่มีรหัสที่ใช้ได้
 * ไม่ระบุ: ผู้ใช้กดขอรหัสใหม่ (รหัสเดิมใช้ไม่ได้อีก)
 */
export async function POST(req: Request) {
  const user = await getPendingIdentity();
  if (!user) return NextResponse.json({ error: "otp_no_session" }, { status: 401 });

  const body = await readJsonBody(req);
  const sent = await issueOtp(user, { reuse: body?.auto === true });
  if (sent.ok) return NextResponse.json({ ok: true, retryIn: sent.retryIn });
  if (sent.error === "otp_cooldown") {
    return NextResponse.json({ error: sent.error, retryIn: sent.retryIn }, { status: 429 });
  }
  return NextResponse.json({ error: sent.error }, { status: 502 });
}
