import "server-only";
import { isPromptPayEnabled, promptPayMasked } from "@/lib/promptpay";
import type { PayOptions } from "@/lib/types";

/**
 * การชำระเงินของร้าน: QR พร้อมเพย์ (ตั้ง PROMPTPAY_ID) — เจ้าของร้านยืนยันรับเงินในหลังบ้าน
 * ถ้ายังไม่ได้ตั้ง: production ปิดการสั่งซื้อ, ในเครื่อง (pnpm dev) ใช้แบบจำลอง กดแล้วถือว่าจ่ายทันที
 */

/** true = ยังไม่ได้ตั้งพร้อมเพย์ และไม่ได้รันบน production — ช่องทางจำลองเปิดให้ใช้ทดสอบในเครื่อง */
export const isMockPayment = !isPromptPayEnabled && process.env.NODE_ENV !== "production";

/** จำนวนคำสั่งซื้อสูงสุดที่จ่ายรวมกันได้ในครั้งเดียว */
export const MAX_CHECKOUT_ORDERS = 20;

/** ข้อมูลที่หน้าเว็บใช้แสดงวิธีชำระเงิน (ไม่มีเบอร์เต็มรั่วออกไป) — method เป็น null เมื่อร้านยังไม่เปิดรับชำระเงิน */
export const payOptions: PayOptions = {
  method: isPromptPayEnabled ? "promptpay" : isMockPayment ? "mock" : null,
  promptPayId: promptPayMasked(),
};
