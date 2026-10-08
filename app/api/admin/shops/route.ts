import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { readJsonBody } from "@/lib/api";
import { normalizeShop, refreshStorefront, saveShop } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/admin/shops  { id?, name, bio_th, bio_en } -> { id } — เพิ่มร้าน หรือแก้ร้านที่มี id นี้อยู่แล้ว */
export async function POST(req: Request) {
  if (!(await getAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const result = normalizeShop((await readJsonBody(req)) ?? {});
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  if (!(await saveShop(result.shop))) return NextResponse.json({ error: "save_failed" }, { status: 500 });

  refreshStorefront();
  return NextResponse.json({ id: result.shop.id });
}
