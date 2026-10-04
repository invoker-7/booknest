import ProductsAdminView from "@/components/admin/ProductsAdminView";
import { listAllProducts } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Products" };

export default async function AdminProductsPage() {
  await requireAdmin("/admin/products");
  return <ProductsAdminView products={await listAllProducts()} />;
}
