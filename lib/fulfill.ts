import "server-only";
import { sendDownloadEmail } from "@/lib/email";
import { createDownloadLink, supabaseAdmin } from "@/lib/supabase";
import { cartNoOf } from "@/lib/format";
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

/** ทุกแถวของคำสั่งซื้อ (ตะกร้า) หนึ่งใบ เรียงตามลำดับในตะกร้า — [] เมื่อไม่มีเลขนี้ */
export async function loadCart(cartNo: string): Promise<OrderWithBook[]> {
  const { data, error } = await supabaseAdmin()
    .from("orders")
    .select(ORDER_WITH_BOOK)
    .or(`cart_no.eq.${cartNo},order_no.eq.${cartNo}`)
    .order("order_no")
    .retry(false)
    .returns<OrderWithBook[]>();
  if (error) throw new Error(`loadCart: ${error.message}`);
  return data ?? [];
}

/** เปลี่ยน PENDING -> PAID ให้แถวนี้ — true เฉพาะคำขอที่เปลี่ยนสำเร็จ (กันการยืนยันซ้ำพร้อมกัน) */
async function claim(order: OrderWithBook): Promise<boolean> {
  if (order.status !== "PENDING") return false;
  const { data, error } = await supabaseAdmin()
    .from("orders")
    .update({ status: "PAID", paid_at: new Date().toISOString() })
    .eq("order_no", order.order_no)
    .eq("status", "PENDING")
    .select("order_no");
  if (error) throw new Error(`fulfill ${order.order_no}: ${error.message}`);
  return Boolean(data?.length);
}

/**
 * สร้างลิงก์ดาวน์โหลดชั่วคราว (24 ชั่วโมง) ของทุกแถว ส่งอีเมลฉบับเดียวต่อคำสั่งซื้อ แล้วบันทึกผลการจัดส่ง
 * ทุกแถวที่ส่งมาต้องเป็นของผู้ซื้อคนเดียวกัน (ตะกร้าเดียว)
 */
async function deliver(orders: OrderWithBook[]): Promise<FulfillResult> {
  const first = orders[0];
  if (!first) return { status: "COMPLETED" };

  const items = await Promise.all(
    orders.map(async (order) => {
      let downloadUrl: string | null = null;
      try {
        downloadUrl = (await createDownloadLink(order.book.file_path ?? "")).url;
      } catch (err) {
        console.error("download link:", err);
      }
      return { title: order.book.title_th, downloadUrl };
    })
  );

  const mail = await sendDownloadEmail({
    to: first.customer_email,
    name: first.customer_name,
    orderNo: first.cart_no || cartNoOf(first.order_no),
    items,
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
    .in("order_no", orders.map((o) => o.order_no));

  return { status, emailStatus: mail.status };
}

/**
 * บันทึกว่าชำระแล้วและส่งไฟล์: PENDING -> PAID -> COMPLETED ทั้งชุดที่ส่งมา (ตะกร้าเดียว จ่ายครั้งเดียว)
 * เรียกหลังยืนยันการชำระเงินแล้วเท่านั้น (ตรวจสลิปผ่าน เจ้าของร้านยืนยันรับเงิน หรือโหมดจำลองในเครื่อง)
 * เรียกซ้ำได้: เฉพาะแถวที่คำขอนี้เปลี่ยนสถานะจาก PENDING สำเร็จเท่านั้นที่ถูกส่ง — ผู้ซื้อได้อีเมลฉบับเดียว
 */
export async function fulfill(orders: OrderWithBook[]): Promise<FulfillResult> {
  const claimed = (await Promise.all(orders.map(async (o) => ((await claim(o)) ? o : null)))).filter(
    (o): o is OrderWithBook => o !== null
  );
  if (claimed.length === 0) {
    const pending = orders.find((o) => o.status === "PENDING");
    return { status: pending ? "PAID" : (orders[0]?.status ?? "PAID"), alreadyPaid: true };
  }
  return deliver(claimed);
}

export const fulfillOrder = (order: OrderWithBook): Promise<FulfillResult> => fulfill([order]);

/** ส่งอีเมลลิงก์ดาวน์โหลดอีกครั้งให้แถวที่จ่ายแล้ว (เจ้าของร้านกดจากหลังบ้านเมื่ออีเมลรอบแรกส่งไม่ถึง) */
export async function redeliver(orders: OrderWithBook[]): Promise<FulfillResult> {
  const paid = orders.filter((o) => o.status !== "PENDING");
  if (paid.length === 0) throw new Error(`redeliver ${orders[0]?.order_no}: not paid`);
  return deliver(paid);
}

/** จัดส่งหลายแถวพร้อมกันจากเลขแถว (ตะกร้าเดียว จ่ายครั้งเดียว) */
export async function fulfillOrders(orderNos: string[]): Promise<void> {
  await fulfill(await loadOrders(orderNos));
}
