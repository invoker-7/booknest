import { notFound } from "next/navigation";
import { loadProduct } from "@/lib/catalogServer";
import BuyNow from "@/components/views/BuyNow";

export const dynamic = "force-dynamic";

export default async function BuyNowPage({ params }: { params: { id: string } }) {
  const { product } = await loadProduct(params.id);
  if (!product) notFound();
  return <BuyNow product={product} />;
}
