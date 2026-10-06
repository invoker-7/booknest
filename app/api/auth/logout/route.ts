import { NextResponse } from "next/server";
import { isAuthConfigured, setSignedInHint, supabaseSession } from "@/lib/auth";
import { clearOtpVerified } from "@/lib/otp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/auth/logout — ยกเลิก session ของอุปกรณ์นี้และลบ cookie */
export async function POST() {
  if (isAuthConfigured) {
    const { error } = await supabaseSession().auth.signOut({ scope: "local" });
    if (error) console.error("logout:", error.message);
  }
  clearOtpVerified();
  setSignedInHint(false);
  return NextResponse.json({ ok: true });
}
