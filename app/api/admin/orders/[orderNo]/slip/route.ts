import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { normalizeOrderNo } from "@/lib/api";
import { slipViewUrl } from "@/lib/slips";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/orders/:orderNo/slip — พาเจ้าของร้านไปดูสลิปของคำสั่งซื้อนี้ผ่านลิงก์ชั่วคราว (5 นาที) */
export async function GET(_req: Request, { params }: { params: { orderNo: string } }) {
  if (!(await getAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = await slipViewUrl(normalizeOrderNo(params.orderNo));
  if (!url) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.redirect(url);
}
