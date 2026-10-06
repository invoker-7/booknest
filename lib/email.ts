import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import type { EmailStatus } from "@/lib/types";

const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS?.replace(/\s/g, "");
const FROM = process.env.EMAIL_FROM || SMTP_USER;

export interface DownloadEmail {
  to: string;
  name: string;
  orderNo: string;
  bookTitle: string;
  downloadUrl: string | null;
}

export interface EmailResult {
  status: EmailStatus;
  note: string | null;
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

/**
 * ส่งอีเมลลิงก์ดาวน์โหลดหลังสถานะเป็น PAID
 *
 * ถ้ายังไม่ได้ตั้ง SMTP_USER หรือ SMTP_PASS จะคืน "mock" โดยไม่ส่งอะไร
 * (ผู้ซื้อยังดาวน์โหลดได้จากหน้าเว็บ หน้าผลลัพธ์จะแจ้งว่าไม่ได้ส่งอีเมล)
 */
export async function sendDownloadEmail({
  to,
  name,
  orderNo,
  bookTitle,
  downloadUrl,
}: DownloadEmail): Promise<EmailResult> {
  if (!SMTP_USER || !SMTP_PASS || !FROM) {
    return {
      status: "mock",
      note: "SMTP_USER or SMTP_PASS not set — delivery simulated for testing",
    };
  }

  try {
    await getTransporter().sendMail({
      from: FROM,
      to,
      subject: `VECTOR — ลิงก์ดาวน์โหลด ${bookTitle} (${orderNo})`,
      html: emailHtml({ name, orderNo, bookTitle, downloadUrl }),
    });

    return { status: "sent", note: null };
  } catch (err) {
    console.error("gmail smtp error:", err);
    return { status: "failed", note: String(err).slice(0, 180) };
  }
}

export interface SlipNotice {
  /** อีเมลผู้ดูแลร้าน */
  to: string[];
  orderNos: string[];
  /** ยอดรวม (บาท) */
  amount: number;
  customer: string;
  /** ลิงก์ไปหน้าคำสั่งซื้อที่รอตรวจสลิป */
  link: string;
}

/** แจ้งเจ้าของร้านว่ามีสลิปรอตรวจ — ไม่ได้ตั้ง SMTP ก็ข้ามไป (ร้านยังเห็นตัวเลขแจ้งเตือนในหลังบ้าน) */
export async function sendSlipNotice({ to, orderNos, amount, customer, link }: SlipNotice): Promise<void> {
  if (!SMTP_USER || !SMTP_PASS || !FROM || to.length === 0) return;
  const total = `฿ ${amount.toLocaleString("en-US")}`;
  try {
    await getTransporter().sendMail({
      from: FROM,
      to,
      subject: `VECTOR — มีสลิปรอตรวจ ${orderNos[0]} (${total})`,
      text: `มีสลิปโอนเงินรอตรวจ\nคำสั่งซื้อ: ${orderNos.join(", ")}\nยอดรวม: ${total}\nผู้ซื้อ: ${customer}\n\nตรวจสลิปและยืนยันรับเงิน: ${link}`,
      html: `<!doctype html>
<html lang="th"><body style="margin:0;padding:24px;background:#F4F3EF;
  font-family:'IBM Plex Sans','Helvetica Neue',Arial,'IBM Plex Sans Thai','Noto Sans Thai',sans-serif;color:#17191C">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #D9D9D5;padding:32px">
    <div style="font-size:18px;font-weight:700;letter-spacing:.22em;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid #17191C">VECTOR</div>
    <div style="font-size:12px;color:#1F3A68;letter-spacing:.16em;margin-bottom:8px">ACTION NEEDED</div>
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:500">มีสลิปโอนเงินรอตรวจ</h1>
    <table style="width:100%;font-size:15px;line-height:1.7;border-collapse:collapse;margin-bottom:24px">
      <tr><td style="color:#5C6066;width:110px">คำสั่งซื้อ</td><td style="font-family:Menlo,Consolas,monospace">${escapeHtml(orderNos.join(", "))}</td></tr>
      <tr><td style="color:#5C6066">ยอดรวม</td><td><strong>${escapeHtml(total)}</strong></td></tr>
      <tr><td style="color:#5C6066">ผู้ซื้อ</td><td>${escapeHtml(customer)}</td></tr>
    </table>
    <a href="${escapeHtml(link)}" style="display:inline-block;background:#1F6B45;color:#ffffff;text-decoration:none;
       padding:14px 26px;font-weight:600;font-size:13px;letter-spacing:.1em">ตรวจสลิปและยืนยันรับเงิน</a>
    <p style="margin:20px 0 0;font-size:13px;color:#5C6066;line-height:1.6">ผู้ซื้อจะได้ไฟล์หลังจากคุณกดยืนยันเท่านั้น</p>
  </div>
</body></html>`,
    });
  } catch (err) {
    console.error("gmail smtp error:", err);
  }
}

export interface OtpEmail {
  to: string;
  name: string;
  code: string;
  /** อายุของรหัส (นาที) */
  minutes: number;
}

/**
 * ส่งรหัสยืนยัน 6 หลักสำหรับขั้นที่สองของการเข้าสู่ระบบ
 * ถ้ายังไม่ได้ตั้ง SMTP จะคืน "mock" โดยไม่ส่งอะไร — ผู้เรียกเป็นคนตัดสินว่ายอมรับได้ไหม
 */
export async function sendOtpEmail({ to, name, code, minutes }: OtpEmail): Promise<EmailResult> {
  if (!SMTP_USER || !SMTP_PASS || !FROM) {
    return { status: "mock", note: "SMTP_USER or SMTP_PASS not set" };
  }

  try {
    await getTransporter().sendMail({
      from: FROM,
      to,
      subject: `VECTOR — รหัสยืนยัน ${code}`,
      text: `รหัสยืนยันการเข้าสู่ระบบ VECTOR ของคุณคือ ${code} (ใช้ได้ ${minutes} นาที)\nYour VECTOR sign-in code is ${code}. It expires in ${minutes} minutes.`,
      html: otpHtml({ name, code, minutes }),
    });
    return { status: "sent", note: null };
  } catch (err) {
    console.error("gmail smtp error:", err);
    return { status: "failed", note: String(err).slice(0, 180) };
  }
}

function otpHtml({ name, code, minutes }: Omit<OtpEmail, "to">): string {
  return `<!doctype html>
<html lang="th"><body style="margin:0;padding:24px;background:#F4F3EF;
  font-family:'IBM Plex Sans','Helvetica Neue',Arial,'IBM Plex Sans Thai','Noto Sans Thai',sans-serif;color:#17191C">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #D9D9D5;padding:32px">

    <div style="font-size:18px;font-weight:700;letter-spacing:.22em;color:#17191C;margin-bottom:24px;
                padding-bottom:16px;border-bottom:1px solid #17191C">VECTOR</div>

    <div style="font-size:12px;color:#1F3A68;letter-spacing:.16em;margin-bottom:8px">SIGN-IN CODE</div>
    <h1 style="margin:0 0 10px;font-size:22px;font-weight:500">รหัสยืนยันการเข้าสู่ระบบ</h1>
    <p style="margin:0 0 22px;font-size:15px;line-height:1.7;color:#3A3E44">
      ${name ? `สวัสดีคุณ ${escapeHtml(name)}<br>` : ""}กรอกรหัสนี้ในหน้าเข้าสู่ระบบเพื่อดำเนินการต่อ
    </p>

    <div style="background:#F4F3EF;border:1px solid #D9D9D5;padding:18px;margin-bottom:20px;text-align:center;
                font-family:'IBM Plex Mono',Menlo,Consolas,monospace;font-size:32px;font-weight:600;letter-spacing:.3em">
      ${escapeHtml(code)}
    </div>

    <p style="margin:0;font-size:13px;color:#5C6066;line-height:1.7">
      รหัสมีอายุ ${minutes} นาที และใช้ได้ครั้งเดียว ถ้าคุณไม่ได้เข้าสู่ระบบ ไม่ต้องทำอะไรกับอีเมลนี้<br>
      This code expires in ${minutes} minutes and works once. If you didn't try to sign in, ignore this email.
    </p>
  </div>
</body></html>`;
}

function emailHtml({ name, orderNo, bookTitle, downloadUrl }: Omit<DownloadEmail, "to">): string {
  const linkBlock = downloadUrl
    ? `<a href="${escapeHtml(downloadUrl)}"
          style="display:inline-block;background:#1F3A68;color:#ffffff;text-decoration:none;
                 padding:14px 26px;font-weight:600;font-size:13px;letter-spacing:.1em">
         ดาวน์โหลดสินค้า / DOWNLOAD
       </a>
       <p style="margin:16px 0 0;font-size:13px;color:#5C6066;line-height:1.6">
         ลิงก์นี้มีอายุ 24 ชั่วโมง ขอลิงก์ใหม่ได้จากหน้า "คลังของฉัน"<br>
         This link expires in 24 hours. Request a new one from your Library.
       </p>`
    : `<p style="margin:0;font-size:14px;color:#B3261E;line-height:1.6">
         ยังสร้างลิงก์ดาวน์โหลดไม่ได้ กรุณาเปิดหน้า "คลังของฉัน" เพื่อขอลิงก์อีกครั้ง
       </p>`;

  return `<!doctype html>
<html lang="th"><body style="margin:0;padding:24px;background:#F4F3EF;
  font-family:'IBM Plex Sans','Helvetica Neue',Arial,'IBM Plex Sans Thai','Noto Sans Thai',sans-serif;color:#17191C">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #D9D9D5;padding:32px">

    <div style="font-size:18px;font-weight:700;letter-spacing:.22em;color:#17191C;margin-bottom:24px;
                padding-bottom:16px;border-bottom:1px solid #17191C">VECTOR</div>

    <div style="font-size:12px;color:#1F3A68;letter-spacing:.16em;margin-bottom:8px">MISSION COMPLETE</div>
    <h1 style="margin:0 0 10px;font-size:22px;font-weight:500">สินค้าของคุณพร้อมแล้ว</h1>
    <p style="margin:0 0 22px;font-size:15px;line-height:1.7;color:#3A3E44">
      สวัสดีคุณ ${escapeHtml(name)}<br>
      คำสั่งซื้อ <strong>${escapeHtml(orderNo)}</strong> ชำระเงินเรียบร้อยแล้ว
    </p>

    <div style="background:#F4F3EF;border:1px solid #D9D9D5;padding:16px;margin-bottom:24px">
      <div style="font-size:12px;color:#5C6066;letter-spacing:.08em;margin-bottom:4px">PRODUCT</div>
      <div style="font-size:15px;font-weight:600">${escapeHtml(bookTitle)}</div>
    </div>

    ${linkBlock}

    <hr style="border:none;border-top:1px solid #D9D9D5;margin:26px 0">
    <p style="margin:0;font-size:12px;color:#5C6066;line-height:1.7">
      คุณได้รับอีเมลนี้เพราะมีการสั่งซื้อจาก VECTOR ด้วยอีเมลนี้ ดาวน์โหลดซ้ำได้จากหน้า "คลังของฉัน"<br>
      You're receiving this because an order was placed at VECTOR with this address.
    </p>
  </div>
</body></html>`;
}

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => HTML_ESCAPES[c] ?? c);
}
