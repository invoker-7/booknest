import { notFound, redirect } from "next/navigation";
import { getOrder, isSupabaseConfigured } from "@/lib/supabase";
import PayView from "@/components/views/PayView";
import { SetupNotice } from "@/components/Pieces";

export const dynamic = "force-dynamic";

export default async function PayPage({ params }) {
  if (!isSupabaseConfigured) return <SetupNotice />;

  const order = await getOrder(params.orderNo);
  if (!order) notFound();

  // จ่ายไปแล้วให้ข้ามไปหน้าผลลัพธ์
  if (order.status !== "PENDING") redirect(`/success/${order.order_no}`);

  // ส่งเฉพาะข้อมูลที่ไม่ใช่ข้อมูลส่วนบุคคล เพราะหน้านี้เปิดได้ด้วยเลขคำสั่งซื้ออย่างเดียว
  const safe = {
    order_no: order.order_no,
    amount: order.amount,
    status: order.status,
    created_at: order.created_at,
  };

  return <PayView order={safe} book={order.book} />;
}
