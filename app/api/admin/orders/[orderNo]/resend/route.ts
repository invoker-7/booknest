import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { normalizeOrderNo } from "@/lib/api";
import { loadOrders, redeliverOrder } from "@/lib/fulfill";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/orders/:orderNo/resend -> { orderNo, status, emailStatus }
 * ส่งอีเมลลิงก์ดาวน์โหลดอีกครั้ง สำหรับคำสั่งซื้อที่จ่ายแล้วแต่อีเมลรอบแรกส่งไม่ถึง
 */
export async function POST(_req: Request, { params }: { params: { orderNo: string } }) {
  if (!(await getAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const orderNo = normalizeOrderNo(params.orderNo);
  try {
    const [order] = await loadOrders([orderNo]);
    if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (order.status === "PENDING") return NextResponse.json({ error: "not_paid" }, { status: 409 });

    const result = await redeliverOrder(order);
    if (result.emailStatus === "failed") return NextResponse.json({ error: "email_failed", ...result }, { status: 502 });
    return NextResponse.json({ orderNo, ...result });
  } catch (err) {
    console.error("resend:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "resend_failed" }, { status: 500 });
  }
}
