import { notFound } from "next/navigation";
import PreviewManager from "@/components/admin/PreviewManager";
import ProductForm from "@/components/admin/ProductForm";
import { getProductRow, listShops } from "@/lib/admin";
import { withAdmin } from "@/lib/auth";
import { loadPreviews } from "@/lib/catalogServer";

export const metadata = { title: "Edit product" };

export default async function AdminEditProductPage({ params }: { params: { id: string } }) {
  const { data: [product, shops, previews] } = await withAdmin(`/admin/products/${params.id}`, () =>
    Promise.all([getProductRow(params.id), listShops(), loadPreviews(params.id)])
  );
  if (!product) notFound();
  return (
    <>
      <ProductForm product={product} shops={shops} />
      <PreviewManager productId={product.id} previews={previews} />
    </>
  );
}
