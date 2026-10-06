import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { EXPORT_FORMATS, EXPORT_TYPES, exportData, type ExportFormat, type ExportType } from "@/lib/exportData";
import { toXlsx } from "@/lib/sheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME: Record<ExportFormat, string> = {
  csv: "text/csv; charset=utf-8",
  json: "application/json; charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

/** GET /api/admin/export?type=products|users|sales&format=csv|xlsx|json -> ไฟล์ดาวน์โหลด */
export async function GET(req: Request) {
  if (!(await getAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") as ExportType;
  const format = (searchParams.get("format") || "csv") as ExportFormat;
  if (!EXPORT_TYPES.includes(type) || !EXPORT_FORMATS.includes(format)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  try {
    const { columns, rows } = await exportData(type);
    const picked = rows.map((row) => Object.fromEntries(columns.map((c) => [c, row[c] ?? ""])));
    const body =
      format === "csv" ? toCsv(columns, picked)
      : format === "json" ? JSON.stringify(picked, null, 2)
      : await toXlsx(type, columns, picked);

    const day = new Date().toISOString().slice(0, 10);
    return new Response(body, {
      headers: {
        "Content-Type": MIME[format],
        "Content-Disposition": `attachment; filename="vector-${type}-${day}.${format}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("export:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "export_failed" }, { status: 500 });
  }
}
