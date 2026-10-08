import ArticlesAdminView from "@/components/admin/ArticlesAdminView";
import { listAllArticles } from "@/lib/articles";
import { withAdmin } from "@/lib/auth";

export const metadata = { title: "Articles" };

export default async function AdminArticlesPage() {
  // ยังไม่ได้รัน supabase/content.sql: แสดงหน้าว่างพร้อมคำแนะนำ แทนหน้า error
  const { data } = await withAdmin("/admin/articles", () =>
    listAllArticles().then((articles) => ({ articles, ready: true }), () => ({ articles: [], ready: false }))
  );
  return <ArticlesAdminView articles={data.articles} ready={data.ready} />;
}
