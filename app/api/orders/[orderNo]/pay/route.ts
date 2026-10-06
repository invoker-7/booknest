import { NextResponse } from "next/server";
import { fulfillOrder, loadOrders } from "@/lib/fulfill";
import { isMockPayment } from "@/lib/payments";
import { isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/orders/:orderNo/pay
 * การชำระเงินแบบจำลอง: ถือว่าจ่ายแล้วทันที ไม่มีการรับเงินจริง
 * ใช้ได้เฉพาะตอนทดสอบในเครื่องที่ยังไม่ได้ตั้งพร้อมเพย์ — ตั้งแล้ว หรือรันบน production route นี้ปิด
 * ไม่เช่นนั้นใครก็ข้ามการจ่ายเงินได้ด้วยการเรียก route นี้ตรง ๆ
 */
export async function POST(_req: Request, { params }: { params: { orderNo: string } }) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 503 });
  }
  if (!isMockPayment) {
    return NextResponse.json({ error: "payment_required" }, { status: 409 });
  }

  const orderNo = String(params.orderNo || "").trim();
  try {
    const [order] = await loadOrders([orderNo]);
    if (!order) return NextResponse.json({ error: "order_not_found" }, { status: 404 });

    const result = await fulfillOrder(order);
    return NextResponse.json({ orderNo, ...result });
  } catch (err) {
    console.error("pay:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "pay_failed" }, { status: 500 });
  }
}
