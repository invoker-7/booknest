import { loadCatalog } from "@/lib/catalogServer";
import LibraryView from "@/components/views/LibraryView";

export const revalidate = 60;
export const metadata = { title: "Library" };

// static (ISR): ?order=ORD-... ถูกอ่านที่เบราว์เซอร์ใน LibraryView
export default async function LibraryPage() {
  const { products } = await loadCatalog();
  return <LibraryView products={products} />;
}
