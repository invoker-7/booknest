import { loadCatalog } from "@/lib/catalogServer";
import CheckoutView from "@/components/views/CheckoutView";

export const revalidate = 60;
export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const { live } = await loadCatalog();
  return <CheckoutView live={live} />;
}
