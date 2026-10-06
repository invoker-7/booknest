/**
 * CSV แบบ RFC 4180 (ใช้ได้ทั้ง server และ client)
 * รองรับเครื่องหมายคำพูด ขึ้นบรรทัดใหม่ในช่อง และ BOM จาก Excel
 */

export type Cell = string | number | boolean | null | undefined;
export type Row = Record<string, Cell>;

function escape(value: Cell): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  // กัน CSV injection: ช่องที่ขึ้นต้นด้วย = + - @ จะถูก Excel ตีความเป็นสูตร
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** แปลงแถวข้อมูลเป็น CSV — ใส่ BOM ให้ Excel อ่านภาษาไทยถูก */
export function toCsv(columns: string[], rows: Row[]): string {
  const lines = [columns.map(escape).join(",")];
  for (const row of rows) lines.push(columns.map((c) => escape(row[c])).join(","));
  return `﻿${lines.join("\r\n")}\r\n`;
}

/** อ่าน CSV เป็นแถวข้อมูล โดยใช้บรรทัดแรกเป็นชื่อคอลัมน์ */
export function parseCsv(text: string): Record<string, string>[] {
  const src = text.replace(/^﻿/, "");
  const table: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; }
        else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      table.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length > 0) { row.push(cell); table.push(row); }

  const [head, ...body] = table;
  if (!head) return [];
  const keys = head.map((k) => k.trim());
  return body
    .filter((r) => r.some((c) => c.trim() !== ""))
    .map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])));
}
