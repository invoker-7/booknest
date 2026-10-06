import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { loadTodo } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** GET /api/admin/todo -> AdminTodo — งานที่รอผู้ดูแลจัดการ (หลังบ้านถามซ้ำเป็นระยะเพื่อแสดงตัวเลขแจ้งเตือน) */
export async function GET() {
  if (!(await getAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  try {
    return NextResponse.json(await loadTodo(), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }
}
