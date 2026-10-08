import { notFound } from "next/navigation";
import { loadPreviews, loadProduct } from "@/lib/catalogServer";
import { relatedTo } from "@/lib/catalog";
import ProductView from "@/components/views/ProductView";

export const revalidate = 60;

// ไม่ pre-render ตอน build แต่เปิดให้ cache เป็น static หลังคำขอแรก (ISR) — ไม่ต้องรัน function ทุกครั้งที่มีคนเปิด
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: { id: string } }) {
  const { product } = await loadProduct(params.id);
  return product ? { title: product.title_en, description: product.short_en } : {};
}

export default async function ProductPage({ params }: { params: { id: string } }) {
  const [{ product, products, live }, previews] = await Promise.all([loadProduct(params.id), loadPreviews(params.id)]);
  if (!product) notFound();
  return <ProductView product={product} related={relatedTo(product, products)} live={live} previews={previews.map((p) => p.url)} />;
}
