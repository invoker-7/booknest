import { notFound } from "next/navigation";
import { getBook, isSupabaseConfigured } from "@/lib/supabase";
import BookView from "@/components/views/BookView";
import { SetupNotice } from "@/components/Pieces";

export const revalidate = 60;

export default async function BookPage({ params }) {
  if (!isSupabaseConfigured) return <SetupNotice />;
  const book = await getBook(params.id);
  if (!book) notFound();
  return <BookView book={book} />;
}
