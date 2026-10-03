import ReceiptView from "@/components/views/ReceiptView";

export const metadata = { title: "Receipt" };

export default function ReceiptPage({ params }) {
  return <ReceiptView id={decodeURIComponent(params.id)} />;
}
