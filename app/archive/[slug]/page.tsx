import { notFound } from "next/navigation";
import { ARCHIVE } from "@/lib/archive";
import { loadCatalog } from "@/lib/catalogServer";
import { ArticleView } from "@/components/views/ArchiveView";

export const revalidate = 60;

export function generateMetadata({ params }: { params: { slug: string } }) {
  const a = ARCHIVE.find((x) => x.slug === params.slug);
  return a ? { title: a.title_en, description: a.dek_en } : {};
}

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const article = ARCHIVE.find((x) => x.slug === params.slug);
  if (!article) notFound();
  const { products } = await loadCatalog();
  const product = article.product ? products.find((p) => p.id === article.product) || null : null;
  return <ArticleView article={article} product={product} />;
}
