import { NextResponse } from "next/server";
import { normalizeOrderNo, readJsonBody } from "@/lib/api";
import { fulfillOrders, loadOrders } from "@/lib/fulfill";
import { MAX_CHECKOUT_ORDERS, payOptions } from "@/lib/payments";
import { isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/checkout  { orderNos: string[] }
 *   -> { mode: "promptpay", orderNos } | { mode: "free" } | { mode: "mock" }
 * เริ่มการชำระเงินของคำสั่งซื้อที่ค้างอยู่ (ทั้งตะกร้าจ่ายครั้งเดียว)
 */
export async function POST(req: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 503 });
  }

  const { method } = payOptions;
  if (!method) return NextResponse.json({ error: "payment_not_configured" }, { status: 503 });
  // ทดสอบในเครื่องโดยยังไม่ได้ตั้งพร้อมเพย์: ให้หน้าเว็บใช้การชำระเงินแบบจำลอง
  if (method === "mock") return NextResponse.json({ mode: "mock" });

  const body = await readJsonBody(req);
  const orderNos = Array.isArray(body?.orderNos) ? [...new Set(body.orderNos.map(normalizeOrderNo).filter(Boolean))] : [];
  if (orderNos.length === 0 || orderNos.length > MAX_CHECKOUT_ORDERS) {
    return NextResponse.json({ error: "invalid_orders" }, { status: 400 });
  }

  try {
    const orders = await loadOrders(orderNos);
    const open = orders.filter((o) => o.status === "PENDING");
    if (orders.length !== orderNos.length) return NextResponse.json({ error: "order_not_found" }, { status: 404 });
    if (open.length === 0) return NextResponse.json({ error: "already_paid" }, { status: 409 });

    // สินค้าแจกฟรี: ไม่มีอะไรให้จ่าย จัดส่งเลย
    if (open.every((o) => o.amount === 0)) {
      await fulfillOrders(open.map((o) => o.order_no));
      return NextResponse.json({ mode: "free" });
    }

    // หน้า /pay-qr แสดง QR พร้อมเพย์และรอร้านยืนยันรับเงิน
    return NextResponse.json({ mode: "promptpay", orderNos: open.map((o) => o.order_no) });
  } catch (err) {
    console.error("checkout:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "checkout_failed" }, { status: 502 });
  }
}
