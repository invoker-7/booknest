import { NextResponse } from "next/server";
import { normalizeOrderNo } from "@/lib/api";
import { isPromptPayEnabled, promptPayMasked, promptPayQr } from "@/lib/promptpay";
import { MAX_CHECKOUT_ORDERS } from "@/lib/payments";
import { ordersWithSlip } from "@/lib/slips";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";
import type { OrderStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// สถานะคำสั่งซื้อต้องสดเสมอ ห้ามให้ Next เก็บผล fetch ของ Supabase ไว้ใน data cache
export const fetchCache = "force-no-store";

/**
 * GET /api/checkout/promptpay?orders=ORD-1,ORD-2[&qr=1]
 *   -> { orders: [{ orderNo, status, slip }], amount, account, qr? }
 * หน้า /pay-qr ใช้ทั้งขอ QR (qr=1) และถามซ้ำว่าร้านยืนยันรับเงินแล้วหรือยัง
 * เปิดได้ด้วยเลขคำสั่งซื้ออย่างเดียว จึงคืนแค่สถานะกับยอดรวม ไม่มีชื่อหรืออีเมลผู้ซื้อ
 */
export async function GET(req: Request) {
  if (!isSupabaseConfigured || !isPromptPayEnabled) {
    return NextResponse.json({ error: "promptpay_disabled" }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const orderNos = [...new Set((searchParams.get("orders") || "").split(",").map(normalizeOrderNo).filter(Boolean))];
  if (orderNos.length === 0 || orderNos.length > MAX_CHECKOUT_ORDERS) {
    return NextResponse.json({ error: "invalid_orders" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin()
    .from("orders")
    .select("order_no, status, amount")
    .in("order_no", orderNos)
    .retry(false)
    .returns<{ order_no: string; status: OrderStatus; amount: number }[]>();
  if (error) return NextResponse.json({ error: "load_failed" }, { status: 500 });
  if ((data ?? []).length !== orderNos.length) return NextResponse.json({ error: "order_not_found" }, { status: 404 });

  // ยอดใน QR = เฉพาะคำสั่งซื้อที่ยังไม่ได้จ่าย
  const amount = data.filter((o) => o.status === "PENDING").reduce((sum, o) => sum + o.amount, 0);
  const wantQr = searchParams.get("qr") === "1" && amount > 0;
  const slips = await ordersWithSlip(data.filter((o) => o.status === "PENDING").map((o) => o.order_no));

  return NextResponse.json(
    {
      orders: orderNos.map((no) => ({ orderNo: no, status: data.find((o) => o.order_no === no)?.status, slip: slips.has(no) })),
      amount,
      account: promptPayMasked(),
      ...(wantQr ? { qr: await promptPayQr(amount) } : {}),
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
