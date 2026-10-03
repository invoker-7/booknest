import { Suspense } from "react";
import { loadCatalog } from "@/lib/catalogServer";
import LibraryView from "@/components/views/LibraryView";

export const revalidate = 60;
export const metadata = { title: "Library" };

export default async function LibraryPage() {
  const { products } = await loadCatalog();
  return (
    <Suspense fallback={null}>
      <LibraryView products={products} />
    </Suspense>
  );
}
