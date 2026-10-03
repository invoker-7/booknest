import "server-only";

/** อ่าน JSON body ของ request — คืน null ถ้าไม่ใช่ JSON object ที่ถูกต้อง */
export async function readJsonBody(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await req.json();
    return body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** ทำเลขคำสั่งซื้อให้อยู่ในรูปเดียวกัน: ตัดช่องว่าง ตัวพิมพ์ใหญ่ ไม่มี # นำหน้า */
export const normalizeOrderNo = (value: unknown): string =>
  String(value || "").trim().toUpperCase().replace(/^#/, "");

export const normalizeEmail = (value: unknown): string =>
  String(value || "").trim().toLowerCase();
