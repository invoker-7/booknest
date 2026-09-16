import "server-only";
import nodemailer from "nodemailer";

const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS?.replace(/\s/g, "");
const FROM = process.env.EMAIL_FROM || SMTP_USER;

let transporter = null;

function getTransporter() {
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
 * คืนค่า { status: 'sent' | 'mock' | 'failed', note }
 *
 * ถ้ายังไม่ได้ตั้ง SMTP_USER หรือ SMTP_PASS จะทำงานในโหมด mock
 * (ใบงานอนุญาตให้ "แสดงการส่งอีเมลสำเร็จสำหรับการทดสอบ" ได้)
 */
export async function sendDownloadEmail({ to, name, orderNo, bookTitle, downloadUrl }) {
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
      subject: `BookNest — ลิงก์ดาวน์โหลด ${bookTitle} (${orderNo})`,
      html: emailHtml({ name, orderNo, bookTitle, downloadUrl }),
    });

    return { status: "sent", note: null };
  } catch (err) {
    console.error("gmail smtp error:", err);
    return { status: "failed", note: String(err).slice(0, 180) };
  }
}

function emailHtml({ name, orderNo, bookTitle, downloadUrl }) {
  const linkBlock = downloadUrl
    ? `<a href="${downloadUrl}"
          style="display:inline-block;background:#E4703B;color:#ffffff;text-decoration:none;
                 padding:13px 26px;border-radius:12px;font-weight:600;font-size:15px">
         ดาวน์โหลดอีบุ๊ก / Download
       </a>
       <p style="margin:16px 0 0;font-size:13px;color:#918477;line-height:1.6">
         ลิงก์นี้มีอายุ 24 ชั่วโมง<br>This link expires in 24 hours.
       </p>`
    : `<p style="margin:0;font-size:14px;color:#B84A38;line-height:1.6">
         ยังสร้างลิงก์ดาวน์โหลดไม่ได้ กรุณาเปิดหน้าติดตามคำสั่งซื้อเพื่อขอลิงก์อีกครั้ง
       </p>`;

  return `<!doctype html>
<html lang="th"><body style="margin:0;padding:24px;background:#FBF3EA;
  font-family:'Helvetica Neue',Arial,'Noto Sans Thai',sans-serif;color:#2E2823">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #EFE3D5;
              border-radius:20px;padding:32px">

    <div style="font-size:19px;font-weight:700;color:#E4703B;margin-bottom:4px">BookNest</div>
    <div style="font-size:12px;color:#918477;letter-spacing:.06em;margin-bottom:24px">
      DEMO ONLY — ระบบสาธิต ไม่มีการรับชำระเงินจริง
    </div>

    <h1 style="margin:0 0 10px;font-size:21px;font-weight:600">ชำระเงินสำเร็จแล้ว</h1>
    <p style="margin:0 0 22px;font-size:15px;line-height:1.7;color:#5C5147">
      สวัสดีคุณ ${escapeHtml(name)}<br>
      คำสั่งซื้อ <strong>${escapeHtml(orderNo)}</strong> ชำระเงิน (จำลอง) เรียบร้อยแล้ว
    </p>

    <div style="background:#FDF7F0;border:1px solid #EFE3D5;border-radius:14px;
                padding:16px;margin-bottom:24px">
      <div style="font-size:12px;color:#918477;margin-bottom:4px">อีบุ๊กของคุณ</div>
      <div style="font-size:15px;font-weight:600">${escapeHtml(bookTitle)}</div>
    </div>

    ${linkBlock}

    <hr style="border:none;border-top:1px solid #EFE3D5;margin:26px 0">
    <p style="margin:0;font-size:12px;color:#918477;line-height:1.7">
      อีเมลนี้ถูกส่งจากระบบสาธิตเพื่อการเรียนการสอน ไม่ใช่ร้านค้าจริง
      และไม่มีการเรียกเก็บเงินใด ๆ<br>
      This message comes from a classroom demo. No payment was taken.
    </p>
  </div>
</body></html>`;
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}
