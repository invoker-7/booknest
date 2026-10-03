import CompleteView from "@/components/views/CompleteView";

export const metadata = { title: "Mission complete" };

export default function CompletePage({ params }) {
  return <CompleteView id={decodeURIComponent(params.id)} />;
}
