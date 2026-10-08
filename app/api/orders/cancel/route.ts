import { NextResponse } from "next/server";
import { readJsonBody } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { cancelCart } from "@/lib/cancel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/orders/cancel  { orderNo } -> { orderNos }
 * ผู้ซื้อยกเลิกคำสั่งซื้อของตัวเองที่ยังไม่ได้ชำระ (ทั้งตะกร้า) — orderNos คือแถวที่ถูกยกเลิก
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "login_required" }, { status: 401 });

  const body = await readJsonBody(req);
  const result = await cancelCart(String(body?.orderNo || ""), user);
  if ("error" in result) {
    const status = { not_found: 404, not_cancellable: 409, failed: 500 }[result.error];
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json(result);
}
