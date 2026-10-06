import { notFound } from "next/navigation";
import ProductForm from "@/components/admin/ProductForm";
import { getProductRow, listShops } from "@/lib/admin";
import { withAdmin } from "@/lib/auth";

export const metadata = { title: "Edit product" };

export default async function AdminEditProductPage({ params }: { params: { id: string } }) {
  const { data: [product, shops] } = await withAdmin(`/admin/products/${params.id}`, () =>
    Promise.all([getProductRow(params.id), listShops()])
  );
  if (!product) notFound();
  return <ProductForm product={product} shops={shops} />;
}
