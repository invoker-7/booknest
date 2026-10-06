import { NextResponse } from "next/server";
import { getSessionUser, setSignedInHint } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/auth/me -> { user } (null เมื่อไม่ได้ล็อกอิน) */
export async function GET() {
  const user = await getSessionUser();
  if (!user) setSignedInHint(false); // session หมดอายุแล้ว — ครั้งหน้าไม่ต้องถามอีก
  return NextResponse.json({ user }, { headers: { "Cache-Control": "private, no-store" } });
}
