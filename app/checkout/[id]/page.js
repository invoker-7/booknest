import { notFound } from "next/navigation";
import { getBook, isSupabaseConfigured } from "@/lib/supabase";
import CheckoutView from "@/components/views/CheckoutView";
import { SetupNotice } from "@/components/Pieces";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({ params }) {
  if (!isSupabaseConfigured) return <SetupNotice />;
  const book = await getBook(params.id);
  if (!book) notFound();
  return <CheckoutView book={book} />;
}
