import { NextResponse } from "next/server";
import { readJsonBody } from "@/lib/api";
import { deleteRawRow, refreshStorefront, updateRawRow } from "@/lib/admin";
import { getAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fail = (message: string) =>
  NextResponse.json({ error: message }, { status: message === "not_found" ? 404 : message === "invalid_input" ? 400 : 422 });

/** PATCH /api/admin/raw  { table, key, values } -> { ok } — แก้ไขหนึ่งแถว (values = เฉพาะช่องที่เปลี่ยน, null = ล้างค่า) */
export async function PATCH(req: Request) {
  if (!(await getAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await readJsonBody(req);
  const error = await updateRawRow(body?.table, body?.key, body?.values);
  if (error) return fail(error);
  refreshStorefront();
  return NextResponse.json({ ok: true });
}

/** DELETE /api/admin/raw?table=<name>&key=<primary key> -> { ok } — ลบหนึ่งแถว */
export async function DELETE(req: Request) {
  if (!(await getAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const params = new URL(req.url).searchParams;
  const error = await deleteRawRow(params.get("table"), params.get("key"));
  if (error) return fail(error);
  refreshStorefront();
  return NextResponse.json({ ok: true });
}
