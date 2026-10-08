import ArticleForm from "@/components/admin/ArticleForm";
import { listAllProducts } from "@/lib/admin";
import { withAdmin } from "@/lib/auth";

export const metadata = { title: "New article" };

export default async function AdminNewArticlePage() {
  const { data: products } = await withAdmin("/admin/articles/new", () => listAllProducts());
  return <ArticleForm article={null} products={products.map((p) => ({ id: p.id, title: p.title_th }))} />;
}
