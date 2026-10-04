import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { loadStats } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/stats -> AdminStats (หน้า Dashboard เรียกซ้ำเป็นระยะ) */
export async function GET() {
  if (!(await getAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  try {
    return NextResponse.json(await loadStats(), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }
}
