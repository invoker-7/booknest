import { loadCatalog } from "@/lib/catalogServer";
import LibraryView from "@/components/views/LibraryView";

export const revalidate = 60;
export const metadata = { title: "Library" };

interface LibraryPageProps {
  searchParams?: { order?: string | string[] };
}

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const { products } = await loadCatalog();
  const order = searchParams?.order;
  return <LibraryView products={products} initialOrderNo={(Array.isArray(order) ? order[0] : order) ?? ""} />;
}
