import { Suspense } from "react";
import { loadCatalog } from "@/lib/catalogServer";
import CatalogView from "@/components/views/CatalogView";

export const revalidate = 60;
export const metadata = { title: "Products" };

export default async function ProductsPage() {
  const { products, live } = await loadCatalog();
  return (
    <Suspense fallback={null}>
      <CatalogView products={products} live={live} />
    </Suspense>
  );
}
