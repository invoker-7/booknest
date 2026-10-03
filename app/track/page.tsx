import { redirect } from "next/navigation";

// หน้าติดตามคำสั่งซื้อเดิม — ตอนนี้ค้นหาได้จากคลังของฉัน
export default function TrackPage({ searchParams }: { searchParams?: { order?: string } }) {
  const order = searchParams?.order;
  redirect(order ? `/library?order=${encodeURIComponent(order)}` : "/library");
}
