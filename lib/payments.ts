import "server-only";
import { fulfill, loadOrders } from "@/lib/fulfill";
import { isPromptPayEnabled, promptPayMasked } from "@/lib/promptpay";
import { isStripeEnabled, isStripeTestMode, type StripeSession } from "@/lib/stripe";
import type { PayOptions } from "@/lib/types";

/**
 * การชำระเงินของร้าน — เปิดได้สองช่องทางพร้อมกัน ผู้ซื้อเลือกเองตอนชำระเงิน:
 * - Stripe (ตั้ง STRIPE_SECRET_KEY) — บัตรหรือ QR พร้อมเพย์ ยืนยันอัตโนมัติ ส่งไฟล์ทันที
 * - โอนผ่าน QR พร้อมเพย์ของร้าน (ตั้ง PROMPTPAY_ID) — ผู้ซื้อแนบสลิป ร้านหรือระบบตรวจสลิปยืนยัน
 * ไม่ได้ตั้งทั้งสอง: production ปิดการสั่งซื้อ, ในเครื่อง (pnpm dev) ใช้แบบจำลอง กดแล้วถือว่าจ่ายทันที
 */

/** true = ยังไม่ได้ตั้งช่องทางชำระเงิน และไม่ได้รันบน production — ช่องทางจำลองเปิดให้ใช้ทดสอบในเครื่อง */
export const isMockPayment = !isStripeEnabled && !isPromptPayEnabled && process.env.NODE_ENV !== "production";

/** จำนวนคำสั่งซื้อสูงสุดที่จ่ายรวมกันได้ในครั้งเดียว */
export const MAX_CHECKOUT_ORDERS = 20;

/** ข้อมูลที่หน้าเว็บใช้แสดงวิธีชำระเงิน (ไม่มี key หรือเบอร์เต็มรั่วออกไป) — method เป็น null เมื่อร้านยังไม่เปิดรับชำระเงิน */
const methods: PayOptions["methods"] = [
  ...(isStripeEnabled ? (["stripe"] as const) : []),
  ...(isPromptPayEnabled ? (["promptpay"] as const) : []),
  ...(isMockPayment ? (["mock"] as const) : []),
];

export const payOptions: PayOptions = {
  method: methods[0] ?? null,
  methods,
  promptPayId: promptPayMasked(),
  test: isStripeEnabled && isStripeTestMode,
};

export type StripeSettlement =
  | { paid: true; cartNo: string; orderNos: string[] }
  | { paid: false; cartNo: string | null; orderNos: string[] };

/**
 * ปิดการชำระเงินจากหน้าชำระเงินของ Stripe: Stripe บอกว่าจ่ายแล้ว และยอดตรงกับคำสั่งซื้อ -> บันทึกการชำระและส่งไฟล์
 * เรียกได้จากทั้งหน้ากลับจาก Stripe และ webhook — เรียกซ้ำกี่ครั้งก็ส่งไฟล์ครั้งเดียว (fulfill เปลี่ยนสถานะแบบมีเงื่อนไข)
 * session ต้องอ่านมาจาก Stripe ด้วย secret key หรือมาจาก webhook ที่ตรวจลายเซ็นแล้วเท่านั้น
 */
export async function settleStripeSession(session: StripeSession): Promise<StripeSettlement> {
  const cartNo = session.client_reference_id;
  const orderNos = (session.metadata?.orders || "").split(",").filter(Boolean);
  if (session.payment_status !== "paid" || !cartNo || orderNos.length === 0) return { paid: false, cartNo, orderNos };

  const orders = await loadOrders(orderNos);
  const total = orders.reduce((sum, o) => sum + o.amount, 0);
  // ยอดที่ Stripe เก็บได้ต้องเท่ากับยอดในฐานข้อมูล (หน่วยสตางค์) — ไม่ตรงถือว่ายังไม่จ่าย ให้ร้านตรวจเอง
  if (orders.length !== orderNos.length || session.currency !== "thb" || session.amount_total !== Math.round(total * 100)) {
    console.error(`stripe ${session.id}: amount mismatch for ${cartNo} (stripe ${session.amount_total} ${session.currency}, orders ${total})`);
    return { paid: false, cartNo, orderNos };
  }

  await fulfill(orders);
  return { paid: true, cartNo, orderNos };
}
