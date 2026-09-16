import { NextResponse } from "next/server";
import {
  supabaseAdmin,
  isSupabaseConfigured,
  createDownloadLink,
} from "@/lib/supabase";
import { sendDownloadEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/orders/:orderNo/pay
 * Mock payment: PENDING -> PAID -> PROCESSING -> COMPLETED
 * ไม่มีการรับเงินจริง ไม่มีการเก็บข้อมูลบัตร
 */
export async function POST(_req, { params }) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 503 });
  }

  const orderNo = String(params.orderNo || "").trim();
  const db = supabaseAdmin();

  const { data: order, error } = await db
    .from("orders")
    .select("*, book:books(*)")
    .eq("order_no", orderNo)
    .maybeSingle();

  if (error || !order) {
    return NextResponse.json({ error: "order_not_found" }, { status: 404 });
  }
  if (order.status !== "PENDING") {
    return NextResponse.json({ status: order.status, alreadyPaid: true });
  }

  // 1) บันทึกการชำระเงิน (จำลอง)
  const paidAt = new Date().toISOString();
  const { error: payErr } = await db
    .from("orders")
    .update({ status: "PAID", paid_at: paidAt })
    .eq("order_no", orderNo)
    .eq("status", "PENDING"); // กันการกดซ้ำพร้อมกัน

  if (payErr) {
    console.error("pay update:", payErr.message);
    return NextResponse.json({ error: "pay_failed" }, { status: 500 });
  }

  // 2) กำลังจัดส่ง
  await db.from("orders").update({ status: "PROCESSING" }).eq("order_no", orderNo);

  // 3) สร้างลิงก์ชั่วคราวจากบั๊กเก็ต private (24 ชั่วโมง)
  let downloadUrl = null;
  try {
    const result = await createDownloadLink(order.book.file_path);
    downloadUrl = result.url;
  } catch (err) {
    console.error("download link:", err);
  }

  // 4) ส่งอีเมล
  const mail = await sendDownloadEmail({
    to: order.customer_email,
    name: order.customer_name,
    orderNo,
    bookTitle: order.book.title_th,
    downloadUrl,
  });

  const delivered = mail.status === "sent" || mail.status === "mock";

  await db
    .from("orders")
    .update({
      status: delivered ? "COMPLETED" : "PAID",
      email_sent: delivered,
      email_note: mail.note,
      delivered_at: delivered ? new Date().toISOString() : null,
    })
    .eq("order_no", orderNo);

  return NextResponse.json({
    orderNo,
    status: delivered ? "COMPLETED" : "PAID",
    emailStatus: mail.status,
    hasLink: Boolean(downloadUrl),
  });
}
