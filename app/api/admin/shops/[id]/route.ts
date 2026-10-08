import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { refreshStorefront, removeShop } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** DELETE /api/admin/shops/:id -> { ok } — ร้านที่ยังมีสินค้าลบไม่ได้ (409 has_products) */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!(await getAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const result = await removeShop(params.id);
  if (result === "has_products") return NextResponse.json({ error: "has_products" }, { status: 409 });
  if (result === "not_found") return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (result === "failed") return NextResponse.json({ error: "delete_failed" }, { status: 500 });

  refreshStorefront();
  return NextResponse.json({ ok: true });
}
