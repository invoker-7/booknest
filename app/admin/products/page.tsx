import ProductsAdminView from "@/components/admin/ProductsAdminView";
import { listAllProducts } from "@/lib/admin";
import { withAdmin } from "@/lib/auth";

export const metadata = { title: "Products" };

export default async function AdminProductsPage() {
  const { data } = await withAdmin("/admin/products", listAllProducts);
  return <ProductsAdminView products={data} />;
}
