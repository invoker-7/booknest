import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { readJsonBody } from "@/lib/api";
import { previewFolder } from "@/lib/catalogServer";
import { refreshStorefront } from "@/lib/admin";
import { IMAGE_BUCKET, supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** DELETE /api/admin/products/:id/previews  { name } -> { ok } — ลบภาพตัวอย่างเนื้อหาหนึ่งภาพของสินค้า */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  if (!(await getAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await readJsonBody(req);
  const name = String(body?.name || "");
  // ชื่อไฟล์ในโฟลเดอร์ของสินค้านี้เท่านั้น — ไม่รับ path ที่พาออกไปนอกโฟลเดอร์
  if (!/^[a-z0-9-]+$/.test(params.id) || !/^[A-Za-z0-9._-]+$/.test(name) || name.includes("..")) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const { error } = await supabaseAdmin().storage.from(IMAGE_BUCKET).remove([`${previewFolder(params.id)}/${name}`]);
  if (error) {
    console.error("remove preview:", error.message);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  refreshStorefront();
  return NextResponse.json({ ok: true });
}
