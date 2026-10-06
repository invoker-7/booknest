import { notFound, redirect } from "next/navigation";
import { getOrder, isSupabaseConfigured } from "@/lib/supabase";
import PayView from "@/components/views/PayView";
import { payOptions } from "@/lib/payments";
import { SetupNotice } from "@/components/ui";
import type { SafeOrder } from "@/lib/types";
export const dynamic = "force-dynamic";
// สถานะคำสั่งซื้อต้องสดเสมอ ห้ามให้ Next เก็บผล fetch ของ Supabase ไว้ใน data cache
export const fetchCache = "force-no-store";

export default async function PayPage({ params }: { params: { orderNo: string } }) {
  if (!isSupabaseConfigured) return <SetupNotice />;

  const order = await getOrder(params.orderNo);
  if (!order) notFound();

  // จ่ายไปแล้วให้ข้ามไปหน้าผลลัพธ์
  if (order.status !== "PENDING") redirect(`/success/${order.order_no}`);

  // ส่งเฉพาะข้อมูลที่ไม่ใช่ข้อมูลส่วนบุคคล เพราะหน้านี้เปิดได้ด้วยเลขคำสั่งซื้ออย่างเดียว
  const safe: SafeOrder = {
    order_no: order.order_no,
    amount: order.amount,
    status: order.status,
    created_at: order.created_at,
  };

  return <PayView order={safe} book={order.book} pay={payOptions} />;
}
