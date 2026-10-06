import { loadCatalog } from "@/lib/catalogServer";
import CatalogView from "@/components/views/CatalogView";

export const revalidate = 60;
export const metadata = { title: "Products" };

interface ProductsPageProps {
  searchParams?: { q?: string | string[]; cat?: string | string[] };
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

// อ่านตัวกรองจาก URL ที่ฝั่ง server เพื่อให้ HTML แรกมีรายการสินค้าครบ ไม่ต้องรอ JavaScript
export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const { products, live } = await loadCatalog();
  return (
    <CatalogView
      products={products}
      live={live}
      initialQuery={first(searchParams?.q)}
      initialCategory={first(searchParams?.cat)}
    />
  );
}
