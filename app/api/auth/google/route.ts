import { NextResponse } from "next/server";
import { isGoogleEnabled, safeNext, supabaseSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/auth/google?next=/path — เริ่ม OAuth (PKCE) แล้วพาไปหน้ายินยอมของ Google */
export async function GET(req: Request) {
  const { origin, searchParams } = new URL(req.url);
  const next = safeNext(searchParams.get("next"));
  const fail = `${origin}/login?error=oauth`;

  if (!isGoogleEnabled) return NextResponse.redirect(fail);

  const { data, error } = await supabaseSession().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });

  if (error || !data.url) {
    console.error("google oauth:", error?.message);
    return NextResponse.redirect(fail);
  }
  return NextResponse.redirect(data.url);
}
