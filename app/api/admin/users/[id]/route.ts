import { NextResponse } from "next/server";
import { getAdmin, isEnvAdmin } from "@/lib/auth";
import { readJsonBody } from "@/lib/api";
import { deleteUser, getUserRow, setUserRole } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Ctx {
  params: { id: string };
}

/**
 * ตรวจว่าผู้ดูแลคนนี้แก้บัญชีเป้าหมายได้ไหม
 * - แก้บัญชีตัวเองไม่ได้ (กันเผลอถอดสิทธิ์หรือลบตัวเองจนไม่เหลือผู้ดูแล)
 * - ผู้ดูแลจาก ADMIN_EMAILS แก้ได้ที่ env เท่านั้น
 */
async function guard(id: string) {
  const admin = await getAdmin();
  if (!admin) return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  if (id === admin.id) return { error: NextResponse.json({ error: "user_self" }, { status: 400 }) };

  const target = await getUserRow(id);
  if (!target) return { error: NextResponse.json({ error: "not_found" }, { status: 404 }) };
  if (isEnvAdmin(target.email)) return { error: NextResponse.json({ error: "user_locked" }, { status: 400 }) };
  return { target };
}

/** PATCH /api/admin/users/:id  { role: "admin" | "customer" } -> { id, role } */
export async function PATCH(req: Request, { params }: Ctx) {
  const { error } = await guard(params.id);
  if (error) return error;

  const body = await readJsonBody(req);
  const role = body?.role;
  if (role !== "admin" && role !== "customer") {
    return NextResponse.json({ error: "invalid_role" }, { status: 400 });
  }

  if (!(await setUserRole(params.id, role))) {
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
  return NextResponse.json({ id: params.id, role });
}

/** DELETE /api/admin/users/:id -> { ok } */
export async function DELETE(_req: Request, { params }: Ctx) {
  const { error } = await guard(params.id);
  if (error) return error;

  if (!(await deleteUser(params.id))) {
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
