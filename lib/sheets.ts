import "server-only";
import type { Cell, Row } from "@/lib/csv";

/**
 * อ่าน/เขียนไฟล์ Excel (.xlsx)
 * exceljs มีขนาดใหญ่ จึง import ตอนใช้งานจริงเท่านั้น และไม่มีทางไปอยู่ใน bundle ของเบราว์เซอร์
 */

export async function toXlsx(sheet: string, columns: string[], rows: Row[]): Promise<ArrayBuffer> {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheet);
  ws.columns = columns.map((key) => ({ header: key, key, width: Math.max(12, key.length + 4) }));
  ws.getRow(1).font = { bold: true };
  for (const row of rows) ws.addRow(columns.map((c) => row[c] ?? ""));
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}

function text(value: unknown): Cell {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    // rich text / สูตร / ลิงก์
    const v = value as { text?: unknown; result?: unknown; richText?: { text: string }[] };
    if (v.richText) return v.richText.map((r) => r.text).join("");
    return text(v.result ?? v.text ?? "");
  }
  return value as Cell;
}

/** อ่านชีตแรกเป็นแถวข้อมูล โดยใช้แถวแรกเป็นชื่อคอลัมน์ */
export async function readXlsx(data: ArrayBuffer): Promise<Record<string, unknown>[]> {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(data);
  const ws = wb.worksheets[0];
  if (!ws) return [];

  const keys: string[] = [];
  ws.getRow(1).eachCell((cell, col) => { keys[col] = String(text(cell.value)).trim(); });

  const rows: Record<string, unknown>[] = [];
  ws.eachRow((row, n) => {
    if (n === 1) return;
    const out: Record<string, unknown> = {};
    let any = false;
    row.eachCell((cell, col) => {
      const key = keys[col];
      if (!key) return;
      out[key] = text(cell.value);
      if (out[key] !== "") any = true;
    });
    if (any) rows.push(out);
  });
  return rows;
}
