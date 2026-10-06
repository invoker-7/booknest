import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { normalizeProduct, refreshStorefront, saveProducts } from "@/lib/admin";
import { parseCsv } from "@/lib/csv";
import { readXlsx } from "@/lib/sheets";
import { supabaseAdmin } from "@/lib/supabase";
import type { BookRow, ImportResult, ProductInput } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 4 * 1024 * 1024; // ต่ำกว่าเพดาน body ของ serverless function
const MAX_ROWS = 2000;

async function readRows(file: File): Promise<Record<string, unknown>[] | null> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx")) return readXlsx(await file.arrayBuffer());
  if (name.endsWith(".csv")) return parseCsv(await file.text());
  if (name.endsWith(".json")) {
    const data: unknown = JSON.parse(await file.text());
    const list = Array.isArray(data) ? data : (data as { products?: unknown })?.products;
    return Array.isArray(list) ? (list.filter((r) => r && typeof r === "object") as Record<string, unknown>[]) : null;
  }
  return null;
}

/**
 * POST /api/admin/import  (multipart: file = .csv | .xlsx | .json) -> ImportResult
 * นำเข้าสินค้า: id ที่มีอยู่แล้วถูกอัปเดต id ใหม่ถูกสร้าง แถวที่ข้อมูลไม่ผ่านถูกข้ามและรายงานกลับ
 */
export async function POST(req: Request) {
  if (!(await getAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "file_required" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "file_too_large" }, { status: 413 });

  let rows: Record<string, unknown>[] | null;
  try {
    rows = await readRows(file);
  } catch {
    rows = null;
  }
  if (!rows) return NextResponse.json({ error: "file_unreadable" }, { status: 400 });
  if (rows.length > MAX_ROWS) return NextResponse.json({ error: "too_many_rows" }, { status: 400 });

  // สินค้าที่มีอยู่แล้ว: ช่องที่ไฟล์ไม่ได้ระบุ (หรือเว้นว่าง) ให้คงค่าเดิมไว้ ไม่ถูกเขียนทับด้วยค่าตั้งต้น
  const ids = [...new Set(rows.map((r) => String(r.id ?? "").trim().toLowerCase()).filter(Boolean))];
  const { data: existing, error } = ids.length
    ? await supabaseAdmin().from("books").select("*").in("id", ids).returns<BookRow[]>()
    : { data: [] as BookRow[], error: null };
  if (error) return NextResponse.json({ error: "import_failed" }, { status: 500 });
  const current = new Map((existing ?? []).map((b) => [b.id, b]));

  const result: ImportResult = { total: rows.length, created: 0, updated: 0, errors: [] };
  const valid = new Map<string, ProductInput>();

  rows.forEach((raw, i) => {
    const row = i + 2; // แถวที่ 1 คือหัวตาราง
    const given = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== "" && v !== null && v !== undefined));
    const before = current.get(String(raw.id ?? "").trim().toLowerCase());
    const parsed = normalizeProduct({ ...before, ...given });
    if ("error" in parsed) result.errors.push({ row, message: parsed.error });
    else if (valid.has(parsed.product.id)) result.errors.push({ row, message: "id_duplicate" });
    else valid.set(parsed.product.id, parsed.product);
  });

  if (valid.size > 0) {
    const failed = await saveProducts([...valid.values()]);
    if (failed) return NextResponse.json({ error: failed }, { status: failed === "shop_not_found" ? 400 : 500 });

    result.updated = [...valid.keys()].filter((id) => current.has(id)).length;
    result.created = valid.size - result.updated;
    refreshStorefront();
  }

  return NextResponse.json(result);
}
