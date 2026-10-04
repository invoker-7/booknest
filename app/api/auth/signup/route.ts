import { NextResponse } from "next/server";
import { isAuthConfigured, setSignedInHint, supabaseSession } from "@/lib/auth";
import { normalizeEmail, readJsonBody } from "@/lib/api";
import { isEmail, MIN_PASSWORD } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/auth/signup  { name, email, password } -> { ok, confirm } */
export async function POST(req: Request) {
  if (!isAuthConfigured) {
    return NextResponse.json({ error: "auth_not_configured" }, { status: 503 });
  }

  const body = await readJsonBody(req);
  if (!body) return NextResponse.json({ error: "bad_json" }, { status: 400 });

  const name = String(body.name || "").trim().slice(0, 120);
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");

  if (!name || !isEmail(email) || password.length < MIN_PASSWORD || password.length > 72) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const { data, error } = await supabaseSession().auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo: `${new URL(req.url).origin}/auth/callback`,
    },
  });

  if (error) {
    const taken = error.code === "user_already_exists" || /already registered/i.test(error.message);
    const weak = error.code === "weak_password";
    if (!taken && !weak) console.error("signup:", error.message);
    return NextResponse.json(
      { error: taken ? "email_taken" : weak ? "weak_password" : "signup_failed" },
      { status: taken ? 409 : weak ? 400 : 500 }
    );
  }

  // เปิดยืนยันอีเมลไว้: Supabase ยังไม่ออก session จนกว่าจะกดลิงก์ในอีเมล
  // (อีเมลที่มีบัญชีอยู่แล้วก็ได้คำตอบแบบเดียวกัน เพื่อไม่ให้เดาได้ว่าใครเป็นสมาชิก)
  if (data.session) setSignedInHint(true);
  return NextResponse.json({ ok: true, confirm: !data.session }, { status: 201 });
}
