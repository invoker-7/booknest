import type { EmailStatus, LookupOrder, OrderStatus } from "@/lib/types";

/**
 * ตัวเรียก API ของร้านจากฝั่งเบราว์เซอร์
 * รวมไว้ที่เดียวเพื่อให้ทุกหน้าใช้ type และการจัดการ error แบบเดียวกัน
 */

export interface CreateOrderInput {
  bookId: string;
  name: string;
  email: string;
}

export interface CreateOrderResult {
  orderNo: string;
  status: OrderStatus;
}

export interface PayOrderResult {
  status: OrderStatus;
  emailStatus?: EmailStatus;
  alreadyPaid?: boolean;
}

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = (data as { error?: unknown }).error;
    throw new Error(typeof code === "string" ? code : `request_failed_${res.status}`);
  }
  return data as T;
}

/** สร้างคำสั่งซื้อหนึ่งรายการ (ราคาอ่านจากฐานข้อมูลฝั่ง server เสมอ) */
export const createOrder = (input: CreateOrderInput) =>
  postJson<CreateOrderResult>("/api/orders", input);

/** ชำระเงิน (จำลอง) */
export const payOrder = (orderNo: string) =>
  postJson<PayOrderResult>(`/api/orders/${encodeURIComponent(orderNo)}/pay`);

/** ค้นหาคำสั่งซื้อด้วยเลขคำสั่งซื้อ + อีเมล — คืน null เมื่อไม่พบหรืออีเมลไม่ตรง */
export async function lookupOrder(orderNo: string, email: string): Promise<LookupOrder | null> {
  try {
    const data = await postJson<{ order?: LookupOrder }>("/api/orders/lookup", { orderNo, email });
    return data.order ?? null;
  } catch {
    return null;
  }
}

/** ขอลิงก์ดาวน์โหลดชั่วคราว — คืน null เมื่อไม่สำเร็จ */
export async function requestDownloadUrl(orderNo: string, email: string): Promise<string | null> {
  try {
    const data = await postJson<{ url?: string }>("/api/download", { orderNo, email });
    return data.url ?? null;
  } catch {
    return null;
  }
}
