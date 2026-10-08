import { NextResponse } from "next/server";
import { settleStripeSession } from "@/lib/payments";
import { readWebhook } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// เหตุการณ์ที่แปลว่า "หน้าชำระเงินนี้ได้เงินแล้ว" — แบบหลังคือวิธีจ่ายที่ยืนยันทีหลัง
const PAID_EVENTS = new Set(["checkout.session.completed", "checkout.session.async_payment_succeeded"]);

/**
 * POST /api/stripe/webhook — Stripe แจ้งผลการชำระเงินมาที่นี่ (ตั้งปลายทางใน Stripe Dashboard > Developers > Webhooks)
 * ใช้เป็นหลักประกัน: ผู้ซื้อปิดหน้าต่างก่อนถูกพากลับมา ระบบก็ยังได้รู้ว่าจ่ายแล้วและส่งไฟล์ให้
 * รับเฉพาะคำขอที่ลายเซ็นถูกต้อง (STRIPE_WEBHOOK_SECRET) — ใครก็ยิงมาที่ URL นี้ได้ จึงห้ามเชื่อเนื้อหาที่ไม่ได้เซ็น
 */
export async function POST(req: Request) {
  const event = readWebhook(await req.text(), req.headers.get("stripe-signature"));
  if (!event) return NextResponse.json({ error: "invalid_signature" }, { status: 400 });

  if (PAID_EVENTS.has(event.type)) {
    try {
      await settleStripeSession(event.data.object);
    } catch (err) {
      // ตอบ 500 ให้ Stripe ส่งมาใหม่ภายหลัง
      console.error("stripe webhook:", err instanceof Error ? err.message : err);
      return NextResponse.json({ error: "settle_failed" }, { status: 500 });
    }
  }
  return NextResponse.json({ received: true });
}
