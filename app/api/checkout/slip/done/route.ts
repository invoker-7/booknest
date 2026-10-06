import { NextResponse } from "next/server";
import { normalizeOrderNo, readJsonBody } from "@/lib/api";
import { adminEmails } from "@/lib/auth";
import { sendSlipNotice } from "@/lib/email";
import { MAX_CHECKOUT_ORDERS } from "@/lib/payments";
import { isFirstFreshSlip } from "@/lib/slips";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/checkout/slip/done  { orders: "ORD-1,ORD-2" } -> { ok }
 * เบราว์เซอร์เรียกหลังอัปโหลดสลิปเสร็จ เพื่อแจ้งเจ้าของร้านทางอีเมลว่ามีสลิปรอตรวจ
 * ส่งอีเมลเฉพาะสลิปใบแรกของคำสั่งซื้อที่เพิ่งแนบ — แนบซ้ำหรือเรียกซ้ำทีหลังไม่ทำให้อีเมลถูกส่งอีก
 */
export async function POST(req: Request) {
  if (!isSupabaseConfigured) return NextResponse.json({ ok: true });

  const body = await readJsonBody(req);
  const orderNos = [...new Set(String(body?.orders || "").split(",").map(normalizeOrderNo).filter(Boolean))];
  const to = adminEmails();
  if (orderNos.length === 0 || orderNos.length > MAX_CHECKOUT_ORDERS || to.length === 0) {
    return NextResponse.json({ ok: true });
  }

  try {
    const { data } = await supabaseAdmin()
      .from("orders")
      .select("order_no, amount, customer_name, customer_email, status")
      .in("order_no", orderNos)
      .eq("status", "PENDING")
      .retry(false)
      .returns<{ order_no: string; amount: number; customer_name: string; customer_email: string }[]>();
    const open = data ?? [];
    const first = open[0];
    if (first && (await isFirstFreshSlip(first.order_no))) {
      await sendSlipNotice({
        to,
        orderNos: open.map((o) => o.order_no),
        amount: open.reduce((sum, o) => sum + o.amount, 0),
        customer: `${first.customer_name} <${first.customer_email}>`,
        link: `${new URL(req.url).origin}/admin/orders?filter=review`,
      });
    }
  } catch (err) {
    console.error("slip notice:", err instanceof Error ? err.message : err);
  }
  // ตอบเหมือนกันทุกกรณี: การแจ้งร้านเป็นงานเสริม ไม่กระทบสลิปที่แนบไปแล้ว
  return NextResponse.json({ ok: true });
}
