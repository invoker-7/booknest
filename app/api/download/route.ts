import { NextResponse } from "next/server";
import {
  supabaseAdmin,
  isSupabaseConfigured,
  createDownloadLink,
} from "@/lib/supabase";
import { normalizeEmail, normalizeOrderNo, readJsonBody } from "@/lib/api";
import { isEmail } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/download  { orderNo, email } -> { url, expiresInHours }
 *
 * ออกลิงก์ชั่วคราวให้เฉพาะคำสั่งซื้อที่ชำระเงินแล้วและอีเมลตรงกันเท่านั้น
 * ไฟล์อยู่ในบั๊กเก็ต private ไม่มี public URL ถาวร
 */
export async function POST(req: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 503 });
  }

  const body = await readJsonBody(req);
  if (!body) {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const orderNo = normalizeOrderNo(body.orderNo);
  const email = normalizeEmail(body.email);

  if (!orderNo || !isEmail(email)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: order, error } = await supabaseAdmin()
    .from("orders")
    .select("status, book:books(file_path)")
    .eq("order_no", orderNo)
    .eq("customer_email", email)
    .maybeSingle<{ status: OrderStatus; book: { file_path: string } }>();

  if (error || !order) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (order.status === "PENDING") {
    return NextResponse.json({ error: "not_paid" }, { status: 403 });
  }

  const { url, error: linkErr } = await createDownloadLink(order.book.file_path);
  if (!url) {
    return NextResponse.json({ error: "link_failed", detail: linkErr }, { status: 500 });
  }

  return NextResponse.json({ url, expiresInHours: 24 });
}
