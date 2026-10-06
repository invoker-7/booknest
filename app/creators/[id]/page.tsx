import { notFound } from "next/navigation";
import { loadCreator } from "@/lib/catalogServer";
import { CreatorView } from "@/components/views/CreatorsView";

export const revalidate = 60;

// ไม่ pre-render ตอน build แต่เปิดให้ cache เป็น static หลังคำขอแรก (ISR) — ไม่ต้องรัน function ทุกครั้งที่มีคนเปิด
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: { id: string } }) {
  const { creator } = await loadCreator(params.id);
  return creator ? { title: creator.name } : {};
}

export default async function CreatorPage({ params }: { params: { id: string } }) {
  const { creator, live } = await loadCreator(params.id);
  if (!creator) notFound();
  return <CreatorView creator={creator} live={live} />;
}
