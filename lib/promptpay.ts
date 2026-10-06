import "server-only";
import QRCode from "qrcode";

/**
 * QR พร้อมเพย์ (มาตรฐาน EMVCo / Thai QR Payment) — สร้างเองจากเบอร์พร้อมเพย์ของร้าน ไม่ต้องมีผู้ให้บริการ
 * ระบบรู้ไม่ได้ว่าเงินเข้าจริงหรือยัง (ต้องมี API ของธนาคาร) เจ้าของร้านจึงกดยืนยันรับเงินเองในหลังบ้าน
 * ตั้ง PROMPTPAY_ID เป็นเบอร์มือถือ 10 หลัก หรือเลขประจำตัว 13 หลักที่ผูกพร้อมเพย์ไว้
 */

const ID = (process.env.PROMPTPAY_ID || "").replace(/\D/g, "");

export const isPromptPayEnabled = ID.length === 10 || ID.length === 13;

const field = (id: string, value: string): string => `${id}${String(value.length).padStart(2, "0")}${value}`;

/** CRC-16/CCITT-FALSE ตามที่มาตรฐาน EMVCo กำหนด */
function crc16(text: string): string {
  let crc = 0xffff;
  for (let i = 0; i < text.length; i++) {
    crc ^= text.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** ข้อความใน QR สำหรับโอนเข้าพร้อมเพย์ id เป็นจำนวน amount บาท (ระบุยอดไว้ใน QR ผู้จ่ายแก้ไม่ได้) */
export function promptPayPayload(id: string, amount: number): string {
  const digits = id.replace(/\D/g, "");
  // เบอร์มือถือ: 0066 + เบอร์ที่ตัด 0 ตัวหน้า, เลขประจำตัว: 13 หลักตรง ๆ
  const target = digits.length === 13 ? field("02", digits) : field("01", `0066${digits.slice(1)}`);
  const body =
    field("00", "01") +
    field("01", "12") + // 12 = ใช้ครั้งเดียว มียอดเงิน
    field("29", field("00", "A000000677010111") + target) +
    field("58", "TH") +
    field("53", "764") + // บาท
    field("54", amount.toFixed(2)) +
    "6304";
  return body + crc16(body);
}

/** QR พร้อมเพย์ของร้านเป็น SVG สำหรับยอด amount บาท */
export function promptPayQr(amount: number): Promise<string> {
  return QRCode.toString(promptPayPayload(ID, amount), { type: "svg", margin: 1, errorCorrectionLevel: "M" });
}

/** เบอร์พร้อมเพย์แบบปิดบางส่วน ให้ผู้จ่ายเทียบกับชื่อที่แอปธนาคารแสดง */
export const promptPayMasked = (): string => (ID ? `${ID.slice(0, 3)}-xxx-${ID.slice(-4)}` : "");
