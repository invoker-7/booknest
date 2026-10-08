import { notFound } from "next/navigation";
import { loadArticle } from "@/lib/articles";
import { loadCatalog } from "@/lib/catalogServer";
import { ArticleView } from "@/components/views/ArchiveView";

export const revalidate = 60;

// ไม่ pre-render ตอน build แต่เปิดให้ cache เป็น static หลังคำขอแรก (ISR) — ไม่ต้องรัน function ทุกครั้งที่มีคนเปิด
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const a = await loadArticle(decodeURIComponent(params.slug));
  return a ? { title: a.title_en, description: a.dek_en } : {};
}

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const article = await loadArticle(decodeURIComponent(params.slug));
  if (!article) notFound();
  const { products } = await loadCatalog();
  const product = article.product ? products.find((p) => p.id === article.product) || null : null;
  return <ArticleView article={article} product={product} />;
}
