import { notFound } from "next/navigation";
import { loadCreator } from "@/lib/catalogServer";
import { CreatorView } from "@/components/views/CreatorsView";

export const revalidate = 60;

export async function generateMetadata({ params }) {
  const { creator } = await loadCreator(params.id);
  return creator ? { title: creator.name } : {};
}

export default async function CreatorPage({ params }) {
  const { creator, live } = await loadCreator(params.id);
  if (!creator) notFound();
  return <CreatorView creator={creator} live={live} />;
}
