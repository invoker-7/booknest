import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { normalizeOrderNo } from "@/lib/api";
import { removeOrder } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DELETE /api/admin/orders/:orderNo -> { result: "deleted" }
 * ลบคำสั่งซื้อถาวรพร้อมสลิปที่แนบไว้ — ผู้ซื้อจะดาวน์โหลดจากคำสั่งซื้อนี้ไม่ได้อีก และยอดขายจะไม่นับรายการนี้
 */
export async function DELETE(_req: Request, { params }: { params: { orderNo: string } }) {
  if (!(await getAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const result = await removeOrder(normalizeOrderNo(params.orderNo));
  if (result === "not_found") return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (result === "failed") return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  return NextResponse.json({ result });
}
