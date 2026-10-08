import "server-only";

/**
 * ตรวจสลิปโอนเงินอัตโนมัติผ่าน EasySlip (API v2) — เปิดใช้เมื่อตั้ง EASYSLIP_API_KEY
 * บริการอ่าน QR บนสลิปแล้วยืนยันรายการกับธนาคาร: สลิปปลอมหรือแก้ตัวเลขจะหาไม่เจอ
 * ร้านต้องลงทะเบียนบัญชีรับเงินไว้ในหน้าจัดการของ EasySlip ก่อน (ใช้เทียบว่าเงินเข้าบัญชีร้านจริง)
 * ไม่ได้ตั้ง key หรือบริการตอบไม่ได้ = ไม่ตัดสินอะไร ร้านตรวจสลิปเองในหลังบ้านเหมือนเดิม
 */

// EASYSLIP_API_URL ใช้ชี้ไปที่ตัวจำลองตอนทดสอบในเครื่องเท่านั้น
const API_URL = process.env.EASYSLIP_API_URL || "https://api.easyslip.com/v2/verify/bank";
const apiKey = process.env.EASYSLIP_API_KEY || "";

export const isSlipVerifyEnabled = Boolean(apiKey);

/** บริการรับรูปไม่เกิน 4 MB */
const MAX_VERIFY_BYTES = 4 * 1024 * 1024;
const TIMEOUT_MS = 12_000;
// นาฬิกาของธนาคารกับ server ต่างกันได้เล็กน้อย
const CLOCK_SKEW_MS = 2 * 60_000;

export type SlipVerdict =
  | { ok: true; transRef: string }
  /** ตรวจได้ แต่สลิปใช้กับคำสั่งซื้อนี้ไม่ได้ — ร้านยังดูเองได้ในหลังบ้าน */
  | { ok: false; reason: "not_found" | "duplicate" | "wrong_account" | "wrong_amount" | "too_old" }
  /** ตรวจไม่ได้ (ไม่ได้เปิดใช้ รูปใหญ่เกิน บริการล่ม โควตาหมด) — ไม่ใช่ความผิดของสลิป */
  | { ok: false; reason: "unavailable" };

interface VerifyResponse {
  success?: boolean;
  data?: {
    isDuplicate?: boolean;
    matchedAccount?: unknown;
    isAmountMatched?: boolean;
    amountInSlip?: number;
    rawSlip?: { transRef?: string; date?: string; amount?: { amount?: number } };
  };
  error?: { code?: string; message?: string };
}

/**
 * @param image    ไฟล์สลิปที่ผู้ซื้อแนบ
 * @param amount   ยอดที่ต้องได้รับ (รวมทุกคำสั่งซื้อที่จ่ายด้วยสลิปใบนี้)
 * @param notBefore เวลาที่สร้างคำสั่งซื้อ — สลิปที่โอนก่อนหน้านั้นเป็นของรายการอื่น
 */
export async function verifySlip(image: Blob, amount: number, notBefore: Date): Promise<SlipVerdict> {
  if (!isSlipVerifyEnabled || image.size === 0 || image.size > MAX_VERIFY_BYTES) return { ok: false, reason: "unavailable" };

  let body: VerifyResponse;
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        base64: Buffer.from(await image.arrayBuffer()).toString("base64"),
        matchAccount: true,
        matchAmount: amount,
        checkDuplicate: true,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    body = (await res.json().catch(() => ({}))) as VerifyResponse;
  } catch (err) {
    console.error("verifySlip:", err instanceof Error ? err.message : err);
    return { ok: false, reason: "unavailable" };
  }

  if (!body.success || !body.data) {
    const code = body.error?.code || "";
    // อ่าน QR ไม่ได้ หรือธนาคารไม่มีรายการนี้ = สลิปใช้ไม่ได้; รหัสอื่นเป็นปัญหาของบริการหรือการตั้งค่า
    if (code === "SLIP_NOT_FOUND" || code === "INVALID_IMAGE_FORMAT" || code === "INVALID_IMAGE_TYPE") {
      return { ok: false, reason: "not_found" };
    }
    console.error("verifySlip:", code || "no response", body.error?.message || "");
    return { ok: false, reason: "unavailable" };
  }

  const { isDuplicate, matchedAccount, isAmountMatched, amountInSlip, rawSlip } = body.data;
  if (isDuplicate) return { ok: false, reason: "duplicate" };
  if (!matchedAccount) return { ok: false, reason: "wrong_account" };

  const paid = amountInSlip ?? rawSlip?.amount?.amount;
  if (isAmountMatched === false || typeof paid !== "number" || Math.abs(paid - amount) > 0.001) {
    return { ok: false, reason: "wrong_amount" };
  }

  // สลิปเก่าที่โอนก่อนสร้างคำสั่งซื้อนี้ (เช่น ของรายการที่ร้านยืนยันเองไปแล้ว) ใช้ซ้ำไม่ได้
  const paidAt = Date.parse(rawSlip?.date || "");
  if (!Number.isFinite(paidAt) || paidAt < notBefore.getTime() - CLOCK_SKEW_MS) return { ok: false, reason: "too_old" };

  return { ok: true, transRef: rawSlip?.transRef || "" };
}
