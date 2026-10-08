import { NextResponse } from "next/server";
import { normalizeOrderNo, readJsonBody } from "@/lib/api";
import { cartNoOf } from "@/lib/format";
import { fulfillOrders, loadOrders } from "@/lib/fulfill";
import { MAX_CHECKOUT_ORDERS, payOptions } from "@/lib/payments";
import { isPromptPayEnabled } from "@/lib/promptpay";
import { createCheckoutSession, STRIPE_MIN_THB } from "@/lib/stripe";
import { isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/checkout  { orderNos: string[], method?: "stripe" | "promptpay" }
 *   -> { mode: "stripe", url } | { mode: "promptpay", orderNos } | { mode: "free" } | { mode: "mock" }
 * เริ่มการชำระเงินของคำสั่งซื้อที่ค้างอยู่ (ทั้งตะกร้าจ่ายครั้งเดียว)
 * method = วิธีที่ผู้ซื้อเลือก (ต้องเป็นวิธีที่ร้านเปิดไว้) — ไม่ระบุใช้วิธีเริ่มต้นของร้าน
 */
export async function POST(req: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 503 });
  }

  if (!payOptions.method) return NextResponse.json({ error: "payment_not_configured" }, { status: 503 });
  // ทดสอบในเครื่องโดยยังไม่ได้ตั้งช่องทางชำระเงิน: ให้หน้าเว็บใช้การชำระเงินแบบจำลอง
  if (payOptions.method === "mock") return NextResponse.json({ mode: "mock" });

  const body = await readJsonBody(req);
  // วิธีที่ผู้ซื้อเลือก ใช้ได้ก็ต่อเมื่อร้านเปิดวิธีนั้นไว้ ไม่เช่นนั้นใช้วิธีเริ่มต้น
  const method = payOptions.methods.find((m) => m === body?.method) ?? payOptions.method;
  const orderNos = Array.isArray(body?.orderNos) ? [...new Set(body.orderNos.map(normalizeOrderNo).filter(Boolean))] : [];
  if (orderNos.length === 0 || orderNos.length > MAX_CHECKOUT_ORDERS) {
    return NextResponse.json({ error: "invalid_orders" }, { status: 400 });
  }

  try {
    const orders = await loadOrders(orderNos);
    const open = orders.filter((o) => o.status === "PENDING");
    if (orders.length !== orderNos.length) return NextResponse.json({ error: "order_not_found" }, { status: 404 });
    if (open.length === 0) return NextResponse.json({ error: "already_paid" }, { status: 409 });

    // สินค้าแจกฟรี: ไม่มีอะไรให้จ่าย จัดส่งเลย
    if (open.every((o) => o.amount === 0)) {
      await fulfillOrders(open.map((o) => o.order_no));
      return NextResponse.json({ mode: "free" });
    }

    const total = open.reduce((sum, o) => sum + o.amount, 0);
    const first = open[0]!;

    // Stripe: พาไปหน้าชำระเงินของ Stripe — ยอดต่ำกว่าขั้นต่ำของ Stripe ใช้ QR พร้อมเพย์ของร้านแทนถ้าเปิดไว้
    if (method === "stripe" && (total >= STRIPE_MIN_THB || !isPromptPayEnabled)) {
      if (total < STRIPE_MIN_THB) return NextResponse.json({ error: "amount_too_small" }, { status: 400 });
      const origin = new URL(req.url).origin;
      const session = await createCheckoutSession({
        cartNo: first.cart_no || cartNoOf(first.order_no),
        orderNos: open.map((o) => o.order_no),
        lines: open.map((o) => ({ name: o.book.title_th || o.book_id, amount: o.amount })),
        email: first.customer_email,
        successUrl: `${origin}/pay/return?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${origin}/checkout`,
      });
      if (!session.url) throw new Error("stripe session has no url");
      return NextResponse.json({ mode: "stripe", url: session.url });
    }

    if (!isPromptPayEnabled) return NextResponse.json({ error: "payment_not_configured" }, { status: 503 });
    // หน้า /pay-qr แสดง QR พร้อมเพย์ของร้านและรอการยืนยันรับเงิน
    return NextResponse.json({ mode: "promptpay", orderNos: open.map((o) => o.order_no) });
  } catch (err) {
    console.error("checkout:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "checkout_failed" }, { status: 502 });
  }
}
