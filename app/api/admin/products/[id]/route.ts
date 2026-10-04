import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { readJsonBody } from "@/lib/api";
import { getProductRow, normalizeProduct, refreshStorefront, removeProduct, saveProducts } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Ctx {
  params: { id: string };
}

/** PATCH /api/admin/products/:id  ProductInput -> { id } (id เปลี่ยนไม่ได้ เพราะคำสั่งซื้ออ้างถึง) */
export async function PATCH(req: Request, { params }: Ctx) {
  if (!(await getAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await readJsonBody(req);
  if (!body) return NextResponse.json({ error: "bad_json" }, { status: 400 });

  if (!(await getProductRow(params.id))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const result = normalizeProduct({ ...body, id: params.id });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

  const failed = await saveProducts([result.product]);
  if (failed) return NextResponse.json({ error: failed }, { status: 500 });

  refreshStorefront();
  return NextResponse.json({ id: params.id });
}

/** DELETE /api/admin/products/:id -> { result: "deleted" | "hidden" } */
export async function DELETE(_req: Request, { params }: Ctx) {
  if (!(await getAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const result = await removeProduct(params.id);
  if (result === "not_found") return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (result === "failed") return NextResponse.json({ error: "delete_failed" }, { status: 500 });

  refreshStorefront();
  return NextResponse.json({ result });
}
