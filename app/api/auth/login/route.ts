import { NextResponse } from "next/server";
import { isAuthConfigured, setSignedInHint, supabaseSession } from "@/lib/auth";
import { normalizeEmail, readJsonBody } from "@/lib/api";
import { isEmail } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/auth/login  { email, password } -> { ok } และตั้ง cookie session */
export async function POST(req: Request) {
  if (!isAuthConfigured) {
    return NextResponse.json({ error: "auth_not_configured" }, { status: 503 });
  }

  const body = await readJsonBody(req);
  if (!body) return NextResponse.json({ error: "bad_json" }, { status: 400 });

  const email = normalizeEmail(body.email);
  const password = String(body.password || "");
  if (!isEmail(email) || !password) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const { error } = await supabaseSession().auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "email_not_confirmed") {
      return NextResponse.json({ error: "email_not_confirmed" }, { status: 403 });
    }
    // อีเมลไม่มีในระบบ หรือรหัสผ่านผิด ตอบเหมือนกันทุกกรณี
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  setSignedInHint(true);
  return NextResponse.json({ ok: true });
}
