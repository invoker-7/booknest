import { ArchiveView } from "@/components/views/ArchiveView";
import { loadArticles } from "@/lib/articles";

export const revalidate = 60;
export const metadata = { title: "Archive" };

export default async function ArchivePage() {
  return <ArchiveView articles={await loadArticles()} />;
}
