import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { normalizeOrderNo } from "@/lib/api";
import { fulfill, loadCart } from "@/lib/fulfill";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/orders/:orderNo/confirm -> { orderNo, status, emailStatus? }
 * เจ้าของร้านยืนยันว่าได้รับเงินแล้ว (โอนผ่านพร้อมเพย์ หรือช่องทางอื่นนอกระบบ)
 * บันทึกการชำระและส่งไฟล์ให้ผู้ซื้อ เหมือนการชำระเงินที่ยืนยันอัตโนมัติ
 */
export async function POST(_req: Request, { params }: { params: { orderNo: string } }) {
  if (!(await getAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const orderNo = normalizeOrderNo(params.orderNo);
  try {
    // ทั้งคำสั่งซื้อ (ทุกชิ้นในตะกร้า) จ่ายด้วยการโอนครั้งเดียว จึงยืนยันและส่งไฟล์พร้อมกัน
    const lines = await loadCart(orderNo);
    if (lines.length === 0) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ orderNo, ...(await fulfill(lines)) });
  } catch (err) {
    console.error("confirm payment:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "confirm_failed" }, { status: 500 });
  }
}
