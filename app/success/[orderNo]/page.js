import { notFound, redirect } from "next/navigation";
import { getOrder, isSupabaseConfigured } from "@/lib/supabase";
import SuccessView from "@/components/views/SuccessView";
import { SetupNotice } from "@/components/Pieces";
import { maskEmail } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SuccessPage({ params }) {
  if (!isSupabaseConfigured) return <SetupNotice />;

  const order = await getOrder(params.orderNo);
  if (!order) notFound();
  if (order.status === "PENDING") redirect(`/pay/${order.order_no}`);

  const safe = {
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
