import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { readJsonBody } from "@/lib/api";
import { getProductRow, normalizeProduct, refreshStorefront, saveProducts } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/admin/products  ProductInput -> { id } (สร้างสินค้าใหม่) */
export async function POST(req: Request) {
  if (!(await getAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await readJsonBody(req);
  if (!body) return NextResponse.json({ error: "bad_json" }, { status: 400 });

  const result = normalizeProduct(body);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

  if (await getProductRow(result.product.id)) {
    return NextResponse.json({ error: "id_taken" }, { status: 409 });
  }

  const failed = await saveProducts([result.product]);
  if (failed) return NextResponse.json({ error: failed }, { status: 500 });

  refreshStorefront();
  return NextResponse.json({ id: result.product.id }, { status: 201 });
}
