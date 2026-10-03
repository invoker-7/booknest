import { NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { normalizeEmail, normalizeOrderNo, readJsonBody } from "@/lib/api";
import { isEmail } from "@/lib/format";
import type { LookupOrder, OrderWithBook } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/orders/lookup  { orderNo, email }
 * ต้องตรงทั้งเลขคำสั่งซื้อและอีเมล จึงจะคืนรายละเอียด
 * ป้องกันไม่ให้เดาเลขคำสั่งซื้อแล้วเห็นข้อมูลของผู้อื่น
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

  const { data, error } = await supabaseAdmin()
    .from("orders")
    .select("*, book:books(*)")
    .eq("order_no", orderNo)
    .eq("customer_email", email)
    .maybeSingle<OrderWithBook>();

  // ไม่พบ หรืออีเมลไม่ตรง ตอบเหมือนกันทุกกรณี
  if (error || !data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const order: LookupOrder = {
    order_no: data.order_no,
    status: data.status,
    amount: data.amount,
    customer_name: data.customer_name,
    customer_email: data.customer_email,
    created_at: data.created_at,
    paid_at: data.paid_at,
    delivered_at: data.delivered_at,
    email_sent: data.email_sent,
    book: data.book,
  };

  return NextResponse.json({ order });
}
