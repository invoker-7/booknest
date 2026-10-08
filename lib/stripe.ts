import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Stripe Checkout ผ่าน REST API ตรง ๆ (ไม่ใช้ SDK — ไม่มีแพ็กเกจเพิ่ม) — เปิดใช้เมื่อตั้ง STRIPE_SECRET_KEY
 * ผู้ซื้อถูกพาไปหน้าชำระเงินของ Stripe (บัตร หรือ QR พร้อมเพย์ ตามที่เปิดไว้ใน Dashboard)
 * Stripe เป็นคนยืนยันว่าจ่ายแล้ว ระบบจึงส่งไฟล์ได้เองโดยไม่มีสลิปและไม่ต้องให้ร้านกดยืนยัน
 * key ที่ขึ้นต้นด้วย sk_test_ = โหมดทดสอบ: ไม่มีเงินจริง ใช้บัตรทดสอบ 4242 4242 4242 4242 ได้
 */

// STRIPE_API_BASE ใช้ชี้ไปที่ตัวจำลองตอนทดสอบในเครื่องเท่านั้น
const API = (process.env.STRIPE_API_BASE || "https://api.stripe.com").replace(/\/+$/, "");
const secret = process.env.STRIPE_SECRET_KEY || "";
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export const isStripeEnabled = Boolean(secret);
export const isStripeTestMode = secret.startsWith("sk_test_");
export const isStripeWebhookEnabled = Boolean(secret && webhookSecret);

/** Stripe ไม่รับยอดต่ำกว่านี้สำหรับเงินบาท */
export const STRIPE_MIN_THB = 10;

// Stripe ให้หน้าชำระเงินมีอายุขั้นต่ำ 30 นาที — ใช้ 60 นาที พอสำหรับสแกน QR แล้วกลับมา
const SESSION_MINUTES = 60;
const TIMEOUT_MS = 15_000;

export interface StripeSession {
  id: string;
  url: string | null;
  status: "open" | "complete" | "expired" | null;
  payment_status: "paid" | "unpaid" | "no_payment_required";
  amount_total: number | null;
  currency: string | null;
  /** เลขคำสั่งซื้อของตะกร้า */
  client_reference_id: string | null;
  metadata: { orders?: string } | null;
}

async function call<T>(path: string, form?: URLSearchParams): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: form ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${secret}`,
      ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: form,
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: { code?: string; message?: string } };
  if (!res.ok) throw new Error(`stripe ${data.error?.code || res.status}: ${data.error?.message || "request failed"}`);
  return data;
}

export interface CheckoutLine {
  name: string;
  /** ราคา (บาท) จากฐานข้อมูล */
  amount: number;
}

/**
 * สร้างหน้าชำระเงินของ Stripe สำหรับคำสั่งซื้อหนึ่งใบ (ทั้งตะกร้า จ่ายครั้งเดียว)
 * เลขแถวของคำสั่งซื้อฝากไว้ใน metadata — ตอนยืนยันจะอ่านจาก Stripe ไม่รับจากเบราว์เซอร์
 */
export function createCheckoutSession(input: {
  cartNo: string;
  orderNos: string[];
  lines: CheckoutLine[];
  email: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<StripeSession> {
  const form = new URLSearchParams({
    mode: "payment",
    client_reference_id: input.cartNo,
    customer_email: input.email,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    expires_at: String(Math.floor(Date.now() / 1000) + SESSION_MINUTES * 60),
    "metadata[orders]": input.orderNos.join(","),
    "payment_intent_data[description]": `VECTOR ${input.cartNo}`,
  });
  input.lines.forEach((line, i) => {
    form.set(`line_items[${i}][quantity]`, "1");
    form.set(`line_items[${i}][price_data][currency]`, "thb");
    form.set(`line_items[${i}][price_data][unit_amount]`, String(Math.round(line.amount * 100))); // หน่วยสตางค์
    form.set(`line_items[${i}][price_data][product_data][name]`, line.name.slice(0, 250));
  });
  // ไม่ระบุ payment_method_types: Stripe แสดงทุกวิธีที่เปิดไว้ใน Dashboard (บัตร, พร้อมเพย์ ฯลฯ)
  return call<StripeSession>("/v1/checkout/sessions", form);
}

/** อ่านสถานะล่าสุดของหน้าชำระเงินจาก Stripe โดยตรง */
export const getCheckoutSession = (id: string): Promise<StripeSession> =>
  call<StripeSession>(`/v1/checkout/sessions/${encodeURIComponent(id)}`);

interface StripeEvent {
  type: string;
  data: { object: StripeSession };
}

// คำขอที่เก่ากว่านี้ไม่รับ (กันการเอา webhook เก่ามายิงซ้ำ)
const WEBHOOK_TOLERANCE_S = 5 * 60;

/**
 * ตรวจลายเซ็นของ webhook (header Stripe-Signature: t=<เวลา>,v1=<HMAC-SHA256 ของ "t.payload">)
 * คืน event เมื่อถูกต้อง, null เมื่อปลอม เก่าเกิน หรือยังไม่ได้ตั้ง STRIPE_WEBHOOK_SECRET
 */
export function readWebhook(payload: string, signature: string | null): StripeEvent | null {
  if (!webhookSecret || !signature) return null;
  const parts = signature.split(",").map((p) => p.split("=") as [string, string]);
  const time = parts.find(([k]) => k === "t")?.[1];
  const sent = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!time || sent.length === 0 || Math.abs(Date.now() / 1000 - Number(time)) > WEBHOOK_TOLERANCE_S) return null;

  const expected = Buffer.from(createHmac("sha256", webhookSecret).update(`${time}.${payload}`).digest("hex"));
  const ok = sent.some((v) => {
    const got = Buffer.from(v);
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
  if (!ok) return null;
  try {
    return JSON.parse(payload) as StripeEvent;
  } catch {
    return null;
  }
}
