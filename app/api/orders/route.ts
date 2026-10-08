import { NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { normalizeEmail, readJsonBody } from "@/lib/api";
import { isEmail } from "@/lib/format";
import { getSessionIdentity } from "@/lib/auth";
import { MAX_CHECKOUT_ORDERS } from "@/lib/payments";
import type { BookRow } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/orders  { bookIds: string[], name } -> { orderNo, orders: [{ orderNo, bookId }] }
 * สร้างคำสั่งซื้อหนึ่งใบสำหรับทั้งตะกร้า: เลขคำสั่งซื้อเดียว แถวละหนึ่งสินค้า (ดู supabase/cart.sql)
 * รับ { bookId } แบบเดิมด้วย (ตะกร้าที่มีชิ้นเดียว)
 */
export async function POST(req: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 503 });
  }

  const body = await readJsonBody(req);
  if (!body) {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const wanted: unknown[] = Array.isArray(body.bookIds) ? body.bookIds : [body.bookId];
  const bookIds = [...new Set(wanted.map((id) => String(id || "").trim()).filter(Boolean))];
  const name = String(body.name || "").trim();
  // ซื้อได้เฉพาะสมาชิก: คำสั่งซื้อผูกกับบัญชี และใช้อีเมลของบัญชีเสมอ (ไฟล์ส่งไปที่อีเมลนี้)
  const user = await getSessionIdentity();
  if (!user) return NextResponse.json({ error: "login_required" }, { status: 401 });
  const email = user.email || normalizeEmail(body.email);

  if (bookIds.length === 0 || bookIds.length > MAX_CHECKOUT_ORDERS || !name || !isEmail(email)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const db = supabaseAdmin();

  // ราคาต้องอ่านจากฐานข้อมูลเสมอ ห้ามเชื่อราคาที่ส่งมาจาก browser — และขายเฉพาะสินค้าที่ยังวางขายอยู่
  const { data: books, error: bookErr } = await db
    .from("books")
    .select("id, price, published")
    .in("id", bookIds)
    .returns<Pick<BookRow, "id" | "price" | "published">[]>();

  const onSale = (books ?? []).filter((b) => b.published !== false);
  if (bookErr || onSale.length !== bookIds.length) {
    return NextResponse.json({ error: "book_not_found" }, { status: 404 });
  }

  const { data: cartNo, error: rpcErr } = await db.rpc("next_order_no").returns<string>();
  if (rpcErr || !cartNo) {
    console.error("next_order_no:", rpcErr?.message);
    return NextResponse.json({ error: "order_no_failed" }, { status: 500 });
  }

  // เรียงตามที่ตะกร้าส่งมา แถวแรกใช้เลขคำสั่งซื้อเลย แถวถัดไปต่อท้าย -2, -3 …
  const lines = bookIds.map((id, i) => ({
    order_no: i === 0 ? cartNo : `${cartNo}-${i + 1}`,
    cart_no: cartNo,
    book_id: id,
    customer_name: name,
    customer_email: email,
    amount: onSale.find((b) => b.id === id)!.price,
    status: "PENDING",
    user_id: user.id,
  }));

  // insert ครั้งเดียว: ได้ครบทั้งตะกร้าหรือไม่ได้เลย
  const { error: insErr } = await db.from("orders").insert(lines);
  if (insErr) {
    console.error("insert order:", insErr.message);
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }

  return NextResponse.json(
    { orderNo: cartNo, status: "PENDING", orders: lines.map((l) => ({ orderNo: l.order_no, bookId: l.book_id })) },
    { status: 201 }
  );
}
