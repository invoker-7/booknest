import { notFound } from "next/navigation";
import ArticleForm from "@/components/admin/ArticleForm";
import { listAllProducts } from "@/lib/admin";
import { getArticleRow } from "@/lib/articles";
import { withAdmin } from "@/lib/auth";

export const metadata = { title: "Edit article" };

export default async function AdminEditArticlePage({ params }: { params: { slug: string } }) {
  const slug = decodeURIComponent(params.slug);
  const { data: [article, products] } = await withAdmin(`/admin/articles/${slug}`, () =>
    Promise.all([getArticleRow(slug), listAllProducts()])
  );
  if (!article) notFound();
  return <ArticleForm article={article} products={products.map((p) => ({ id: p.id, title: p.title_th }))} />;
}
