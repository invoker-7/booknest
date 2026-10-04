import { NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { normalizeEmail, readJsonBody } from "@/lib/api";
import { isEmail } from "@/lib/format";
import { getSessionIdentity } from "@/lib/auth";
import type { BookRow } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/orders  { bookId, name, email } -> { orderNo } */
export async function POST(req: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 503 });
  }

  const body = await readJsonBody(req);
  if (!body) {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const bookId = String(body.bookId || "").trim();
  const name = String(body.name || "").trim();
  // ล็อกอินอยู่: ผูกคำสั่งซื้อกับบัญชี และใช้อีเมลของบัญชีเสมอ (ไฟล์ส่งไปที่อีเมลนี้)
  const user = await getSessionIdentity();
  const email = user?.email || normalizeEmail(body.email);

  if (!bookId || !name || !isEmail(email)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const db = supabaseAdmin();

  // ราคาต้องอ่านจากฐานข้อมูลเสมอ ห้ามเชื่อราคาที่ส่งมาจาก browser
  const { data: book, error: bookErr } = await db
    .from("books")
    .select("id, price")
    .eq("id", bookId)
    .maybeSingle<Pick<BookRow, "id" | "price">>();

  if (bookErr || !book) {
    return NextResponse.json({ error: "book_not_found" }, { status: 404 });
  }

  const { data: orderNo, error: rpcErr } = await db.rpc("next_order_no").returns<string>();
  if (rpcErr || !orderNo) {
    console.error("next_order_no:", rpcErr?.message);
    return NextResponse.json({ error: "order_no_failed" }, { status: 500 });
  }

  const { error: insErr } = await db.from("orders").insert({
    order_no: orderNo,
    book_id: book.id,
    customer_name: name,
    customer_email: email,
    amount: book.price,
    status: "PENDING",
    ...(user ? { user_id: user.id } : {}),
  });

  if (insErr) {
    console.error("insert order:", insErr.message);
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }

  return NextResponse.json({ orderNo, status: "PENDING" }, { status: 201 });
}
