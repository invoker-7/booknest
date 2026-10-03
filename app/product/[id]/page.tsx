import { notFound } from "next/navigation";
import { loadProduct } from "@/lib/catalogServer";
import { relatedTo } from "@/lib/catalog";
import ProductView from "@/components/views/ProductView";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: { id: string } }) {
  const { product } = await loadProduct(params.id);
  return product ? { title: product.title_en, description: product.short_en } : {};
}

export default async function ProductPage({ params }: { params: { id: string } }) {
  const { product, products, live } = await loadProduct(params.id);
  if (!product) notFound();
  return <ProductView product={product} related={relatedTo(product, products)} live={live} />;
}
