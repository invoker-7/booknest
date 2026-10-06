import ReceiptView from "@/components/views/ReceiptView";

export const metadata = { title: "Receipt" };

export default function ReceiptPage({ params }: { params: { id: string } }) {
  return <ReceiptView id={decodeURIComponent(params.id)} />;
}
