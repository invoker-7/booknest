import ProductForm from "@/components/admin/ProductForm";
import { listShops } from "@/lib/admin";
import { withAdmin } from "@/lib/auth";

export const metadata = { title: "New product" };

export default async function AdminNewProductPage() {
  const { data } = await withAdmin("/admin/products/new", listShops);
  return <ProductForm shops={data} />;
}
