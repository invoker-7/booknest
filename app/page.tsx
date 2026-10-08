import { loadArticles } from "@/lib/articles";
import { loadCreators } from "@/lib/catalogServer";
import HomeView from "@/components/views/HomeView";

export const revalidate = 60;

export default async function HomePage() {
  const [{ products, creators, live }, articles] = await Promise.all([loadCreators(), loadArticles(3)]);
  return <HomeView products={products} creatorCount={creators.length} live={live} articles={articles} />;
}
