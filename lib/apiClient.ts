import type { AccountOrder, EmailStatus, LookupOrder, OrderStatus, SessionUser } from "@/lib/types";

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

export async function sendJson<T>(url: string, body?: unknown, method = "POST"): Promise<T> {
  const res = await fetch(url, {
    method,
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

const postJson = sendJson;

/** สร้างคำสั่งซื้อหนึ่งรายการ (ราคาอ่านจากฐานข้อมูลฝั่ง server เสมอ) */
export const createOrder = (input: CreateOrderInput) =>
  postJson<CreateOrderResult>("/api/orders", input);

export type CheckoutStart =
  | { mode: "promptpay"; orderNos: string[] } // แสดง QR พร้อมเพย์ที่ /pay-qr
  | { mode: "free" } // สินค้าแจกฟรี จัดส่งแล้ว
  | { mode: "mock" }; // ทดสอบในเครื่องโดยยังไม่ได้ตั้งพร้อมเพย์ ใช้แบบจำลอง

/** เริ่มชำระเงินของคำสั่งซื้อที่ค้างอยู่ (ทั้งตะกร้าจ่ายครั้งเดียว) */
export const startCheckout = (orderNos: string[]) => postJson<CheckoutStart>("/api/checkout", { orderNos });

export interface PromptPayState {
  orders: { orderNo: string; status: OrderStatus }[];
  /** ยอดที่ยังต้องจ่าย (บาท) */
  amount: number;
  /** เบอร์พร้อมเพย์ของร้านแบบปิดบางส่วน */
  account: string;
  /** QR เป็น SVG — มีเมื่อขอด้วย withQr */
  qr?: string;
}

/** QR พร้อมเพย์และสถานะของคำสั่งซื้อชุดนี้ — คืน null เมื่อเปิดไม่ได้ */
export async function fetchPromptPay(orders: string, withQr: boolean): Promise<PromptPayState | null> {
  try {
    const res = await fetch(`/api/checkout/promptpay?orders=${encodeURIComponent(orders)}${withQr ? "&qr=1" : ""}`, { cache: "no-store" });
    return res.ok ? ((await res.json()) as PromptPayState) : null;
  } catch {
    return null;
  }
}

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

/* ---------- สมาชิก ---------- */

/** ผู้ใช้ที่ล็อกอินอยู่ — null เมื่อไม่ได้ล็อกอินหรือเรียกไม่สำเร็จ */
export async function fetchMe(): Promise<SessionUser | null> {
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    const data = (await res.json()) as { user?: SessionUser | null };
    return data.user ?? null;
  } catch {
    return null;
  }
}

/** ขั้นที่สองหลัง Google: ส่งรหัสจากอีเมล — โยน Error(code) เมื่อไม่ผ่าน */
export const verifyOtp = (code: string) => postJson<{ ok: true }>("/api/auth/otp", { code });

/**
 * ขอรหัสทางอีเมล — retryIn = อีกกี่วินาทีจึงขอได้อีก
 * auto = true ใช้ตอนหน้ากรอกรหัสเปิด: server ส่งเฉพาะเมื่อยังไม่มีรหัสที่ใช้ได้
 */
export async function resendOtp(auto = false): Promise<{ ok: boolean; error?: string; retryIn?: number }> {
  try {
    const res = await fetch("/api/auth/otp/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auto }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; retryIn?: number };
    return { ok: res.ok, error: data.error, retryIn: data.retryIn };
  } catch {
    return { ok: false };
  }
}

export const logout = () => postJson<{ ok: true }>("/api/auth/logout");

/** ประวัติคำสั่งซื้อของบัญชี — คืน [] เมื่อไม่สำเร็จ */
export async function fetchAccountOrders(): Promise<AccountOrder[]> {
  try {
    const res = await fetch("/api/account/orders", { cache: "no-store" });
    if (!res.ok) return [];
    const data = (await res.json()) as { orders?: AccountOrder[] };
    return data.orders ?? [];
  } catch {
    return [];
  }
}
