import { notFound, redirect } from "next/navigation";
import { getOrder, isSupabaseConfigured } from "@/lib/supabase";
import SuccessView from "@/components/views/SuccessView";
import { SetupNotice } from "@/components/ui";
import { maskEmail } from "@/lib/format";
import type { SafeOrder } from "@/lib/types";
export const dynamic = "force-dynamic";
// สถานะคำสั่งซื้อต้องสดเสมอ ห้ามให้ Next เก็บผล fetch ของ Supabase ไว้ใน data cache
export const fetchCache = "force-no-store";

export default async function SuccessPage({ params }: { params: { orderNo: string } }) {
  if (!isSupabaseConfigured) return <SetupNotice />;

  const order = await getOrder(params.orderNo);
  if (!order) notFound();
  if (order.status === "PENDING") redirect(`/pay/${order.order_no}`);

  const safe: SafeOrder = {
    order_no: order.order_no,
    amount: order.amount,
    status: order.status,
    created_at: order.created_at,
    email_sent: order.email_sent,
    email_note: order.email_note,
    masked_email: maskEmail(order.customer_email),
  };

  return <SuccessView order={safe} book={order.book} />;
}
