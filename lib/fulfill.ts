import "server-only";
import { sendDownloadEmail } from "@/lib/email";
import { createDownloadLink, supabaseAdmin } from "@/lib/supabase";
import type { EmailStatus, OrderStatus, OrderWithBook } from "@/lib/types";

export interface FulfillResult {
  status: OrderStatus;
  /** undefined เมื่อคำสั่งซื้อนี้ถูกจัดส่งไปแล้วก่อนหน้า */
  emailStatus?: EmailStatus;
  alreadyPaid?: boolean;
}

const ORDER_WITH_BOOK = "*, book:books(*)";

export async function loadOrders(orderNos: string[]): Promise<OrderWithBook[]> {
  if (orderNos.length === 0) return [];
  const { data, error } = await supabaseAdmin()
    .from("orders")
    .select(ORDER_WITH_BOOK)
    .in("order_no", orderNos)
    .retry(false)
    .returns<OrderWithBook[]>();
  if (error) throw new Error(`loadOrders: ${error.message}`);
  // คืนตามลำดับที่ขอมา
  return orderNos.flatMap((no) => (data ?? []).filter((o) => o.order_no === no));
}

/**
 * บันทึกว่าชำระแล้วและส่งไฟล์: PENDING -> PAID -> COMPLETED
 * เรียกหลังยืนยันการชำระเงินแล้วเท่านั้น (เจ้าของร้านยืนยันรับเงิน หรือโหมดจำลองในเครื่อง)
 * เรียกซ้ำได้: เฉพาะคำขอแรกที่เปลี่ยนสถานะจาก PENDING สำเร็จเท่านั้นที่ส่งอีเมล (กันการกดยืนยันซ้ำ)
 */
export async function fulfillOrder(order: OrderWithBook): Promise<FulfillResult> {
  if (order.status !== "PENDING") return { status: order.status, alreadyPaid: true };

  const orderNo = order.order_no;

  const { data: claimed, error: payErr } = await supabaseAdmin()
    .from("orders")
    .update({ status: "PAID", paid_at: new Date().toISOString() })
    .eq("order_no", orderNo)
    .eq("status", "PENDING")
    .select("order_no");
  if (payErr) throw new Error(`fulfill ${orderNo}: ${payErr.message}`);
  if (!claimed?.length) return { status: "PAID", alreadyPaid: true };

  return deliver(order);
}

/** สร้างลิงก์ดาวน์โหลดชั่วคราว (24 ชั่วโมง) ส่งอีเมล แล้วบันทึกผลการจัดส่ง */
async function deliver(order: OrderWithBook): Promise<FulfillResult> {
  const orderNo = order.order_no;
  let downloadUrl: string | null = null;
  try {
    downloadUrl = (await createDownloadLink(order.book.file_path ?? "")).url;
  } catch (err) {
    console.error("download link:", err);
  }

  const mail = await sendDownloadEmail({
    to: order.customer_email,
    name: order.customer_name,
    orderNo,
    bookTitle: order.book.title_th,
    downloadUrl,
  });
  const delivered = mail.status === "sent" || mail.status === "mock";
  const status: OrderStatus = delivered ? "COMPLETED" : "PAID";

  await supabaseAdmin()
    .from("orders")
    .update({
      status,
      email_sent: delivered,
      email_note: mail.note,
      delivered_at: delivered ? new Date().toISOString() : null,
    })
    .eq("order_no", orderNo);

  return { status, emailStatus: mail.status };
}

/** ส่งอีเมลลิงก์ดาวน์โหลดอีกครั้งให้คำสั่งซื้อที่จ่ายแล้ว (เจ้าของร้านกดจากหลังบ้านเมื่ออีเมลรอบแรกส่งไม่ถึง) */
export async function redeliverOrder(order: OrderWithBook): Promise<FulfillResult> {
  if (order.status === "PENDING") throw new Error(`redeliver ${order.order_no}: not paid`);
  return deliver(order);
}

/** จัดส่งหลายคำสั่งซื้อพร้อมกัน (ตะกร้าเดียว จ่ายครั้งเดียว) */
export async function fulfillOrders(orderNos: string[]): Promise<void> {
  const orders = await loadOrders(orderNos);
  await Promise.all(orders.map((o) => fulfillOrder(o)));
}
