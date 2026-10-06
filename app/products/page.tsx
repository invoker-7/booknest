import { loadCatalog } from "@/lib/catalogServer";
import CatalogView from "@/components/views/CatalogView";

export const revalidate = 60;
export const metadata = { title: "Products" };

// หน้านี้เป็น static (ISR): ไม่อ่าน searchParams ที่ server เพราะจะทำให้ทุกคำขอต้องรัน function
// ตัวกรองจาก URL (?q=...&cat=...) ถูกอ่านที่เบราว์เซอร์ใน CatalogView
export default async function ProductsPage() {
  const { products, live } = await loadCatalog();
  return <CatalogView products={products} live={live} />;
}
