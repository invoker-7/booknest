import ProductForm from "@/components/admin/ProductForm";
import { listShops } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "New product" };

export default async function AdminNewProductPage() {
  await requireAdmin("/admin/products/new");
  return <ProductForm shops={await listShops()} />;
}
