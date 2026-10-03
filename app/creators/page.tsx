import { loadCreators } from "@/lib/catalogServer";
import { CreatorsView } from "@/components/views/CreatorsView";

export const revalidate = 60;
export const metadata = { title: "Creators" };

export default async function CreatorsPage() {
  const { creators, live } = await loadCreators();
  return <CreatorsView creators={creators} live={live} />;
}
