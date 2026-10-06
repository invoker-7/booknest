import "server-only";
import { allOrders, listAllProducts, listCustomers } from "@/lib/admin";
import type { Row } from "@/lib/csv";

/** ชุดข้อมูลที่หลังบ้าน export ได้ และคอลัมน์ของแต่ละชุด */
export const EXPORT_TYPES = ["products", "users", "sales"] as const;
export type ExportType = (typeof EXPORT_TYPES)[number];

export const EXPORT_FORMATS = ["csv", "xlsx", "json"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

/** คอลัมน์สินค้า — ไฟล์ import ใช้ชื่อคอลัมน์ชุดเดียวกัน (export แล้วแก้ แล้ว import กลับได้) */
export const PRODUCT_COLUMNS = [
  "id", "title_th", "title_en", "short_th", "short_en", "long_th", "long_en",
  "author_th", "author_en", "kind", "price", "list_price", "version", "license",
  "file_path", "file_size", "cover", "published", "sort", "shop_id",
];

const USER_COLUMNS = ["email", "name", "member", "role", "joined", "orders", "spent"];
const SALES_COLUMNS = [
  "order_no", "created_at", "paid_at", "status", "book_id", "title", "customer_name", "customer_email", "amount",
];

export async function exportData(type: ExportType): Promise<{ columns: string[]; rows: Row[] }> {
  if (type === "products") {
    const rows = await listAllProducts();
    return { columns: PRODUCT_COLUMNS, rows: rows.map((r) => ({ ...r, shop: undefined, published: r.published !== false })) as unknown as Row[] };
  }
  if (type === "users") {
    return { columns: USER_COLUMNS, rows: (await listCustomers()) as unknown as Row[] };
  }
  return { columns: SALES_COLUMNS, rows: (await allOrders()) as unknown as Row[] };
}
