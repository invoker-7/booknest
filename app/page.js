import { getBooks, isSupabaseConfigured } from "@/lib/supabase";
import StoreView from "@/components/views/StoreView";
import { SetupNotice } from "@/components/Pieces";

export const dynamic = "force-dynamic";

export default async function StorePage() {
  if (!isSupabaseConfigured) return <SetupNotice />;
  const books = await getBooks();
  return <StoreView books={books} />;
}
