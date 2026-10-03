import CompleteView from "@/components/views/CompleteView";

export const metadata = { title: "Mission complete" };

export default function CompletePage({ params }: { params: { id: string } }) {
  return <CompleteView id={decodeURIComponent(params.id)} />;
}
