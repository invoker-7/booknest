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
 * ถ้ายังไม่ได้ตั้ง SMTP_USER หรือ SMTP_PASS จะทำงานในโหมด mock
 * (ใบงานอนุญาตให้ "แสดงการส่งอีเมลสำเร็จสำหรับการทดสอบ" ได้)
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

    <div style="font-size:18px;font-weight:700;letter-spacing:.22em;color:#17191C;margin-bottom:4px">VECTOR</div>
    <div style="font-size:12px;color:#5C6066;letter-spacing:.06em;margin-bottom:24px;
                padding-bottom:16px;border-bottom:1px solid #17191C">
      DEMO BUILD — ระบบสาธิต ไม่มีการรับชำระเงินจริง
    </div>

    <div style="font-size:12px;color:#1F3A68;letter-spacing:.16em;margin-bottom:8px">MISSION COMPLETE</div>
    <h1 style="margin:0 0 10px;font-size:22px;font-weight:500">สินค้าของคุณพร้อมแล้ว</h1>
    <p style="margin:0 0 22px;font-size:15px;line-height:1.7;color:#3A3E44">
      สวัสดีคุณ ${escapeHtml(name)}<br>
      คำสั่งซื้อ <strong>${escapeHtml(orderNo)}</strong> ชำระเงิน (จำลอง) เรียบร้อยแล้ว
    </p>

    <div style="background:#F4F3EF;border:1px solid #D9D9D5;padding:16px;margin-bottom:24px">
      <div style="font-size:12px;color:#5C6066;letter-spacing:.08em;margin-bottom:4px">PRODUCT</div>
      <div style="font-size:15px;font-weight:600">${escapeHtml(bookTitle)}</div>
    </div>

    ${linkBlock}

    <hr style="border:none;border-top:1px solid #D9D9D5;margin:26px 0">
    <p style="margin:0;font-size:12px;color:#5C6066;line-height:1.7">
      อีเมลนี้ถูกส่งจากระบบสาธิต ไม่ใช่ร้านค้าจริง และไม่มีการเรียกเก็บเงินใด ๆ<br>
      This message comes from a demo build. No payment was taken.
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
