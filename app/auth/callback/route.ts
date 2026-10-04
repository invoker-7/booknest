import { NextResponse } from "next/server";
import { isAuthConfigured, safeNext, setSignedInHint, supabaseSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /auth/callback?code=...&next=/path
 * ปลายทางของ Google OAuth และลิงก์ยืนยันอีเมล — แลก code เป็น session แล้วตั้ง cookie
 */
export async function GET(req: Request) {
  const { origin, searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (isAuthConfigured && code) {
    const { error } = await supabaseSession().auth.exchangeCodeForSession(code);
    if (!error) {
      setSignedInHint(true);
      return NextResponse.redirect(`${origin}${safeNext(searchParams.get("next"))}`);
    }
    console.error("auth callback:", error.message);
  }
  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
