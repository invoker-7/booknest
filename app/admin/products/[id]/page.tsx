import { notFound } from "next/navigation";
import ProductForm from "@/components/admin/ProductForm";
import { getProductRow, listShops } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Edit product" };

export default async function AdminEditProductPage({ params }: { params: { id: string } }) {
  await requireAdmin(`/admin/products/${params.id}`);
  const [product, shops] = await Promise.all([getProductRow(params.id), listShops()]);
  if (!product) notFound();
  return <ProductForm product={product} shops={shops} />;
}
