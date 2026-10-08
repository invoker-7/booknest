import { NextResponse } from "next/server";
import { normalizeOrderNo, readJsonBody } from "@/lib/api";
import { adminEmails } from "@/lib/auth";
import { sendSlipNotice } from "@/lib/email";
import { MAX_CHECKOUT_ORDERS } from "@/lib/payments";
import { fulfillOrders } from "@/lib/fulfill";
import { isFirstFreshSlip, readSlip } from "@/lib/slips";
import { isSlipVerifyEnabled, verifySlip } from "@/lib/slipVerify";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface OpenOrder {
  order_no: string;
  amount: number;
  customer_name: string;
  customer_email: string;
  created_at: string;
}

/**
 * POST /api/checkout/slip/done  { orders: "ORD-1,ORD-2" } -> { ok, verified }
 * เบราว์เซอร์เรียกหลังอัปโหลดสลิปเสร็จ
 * - เปิดตรวจสลิปอัตโนมัติไว้ (EASYSLIP_API_KEY): สลิปผ่าน = บันทึกการชำระและส่งไฟล์ทันที (verified: true)
 * - ไม่ได้เปิด ตรวจไม่ผ่าน หรือบริการตอบไม่ได้: แจ้งเจ้าของร้านทางอีเมลให้ตรวจเองในหลังบ้านเหมือนเดิม
 *   (อีเมลส่งเฉพาะสลิปใบแรกของคำสั่งซื้อ — แนบซ้ำหรือเรียกซ้ำไม่ทำให้อีเมลถูกส่งอีก)
 * ผู้เรียกเป็นใครก็ได้ จึงไม่เชื่ออะไรจากคำขอนอกจากเลขคำสั่งซื้อ: ยอดและเวลาอ่านจากฐานข้อมูล สลิปอ่านจาก Storage
 */
export async function POST(req: Request) {
  if (!isSupabaseConfigured) return NextResponse.json({ ok: true, verified: false });

  const body = await readJsonBody(req);
  const orderNos = [...new Set(String(body?.orders || "").split(",").map(normalizeOrderNo).filter(Boolean))];
  if (orderNos.length === 0 || orderNos.length > MAX_CHECKOUT_ORDERS) {
    return NextResponse.json({ ok: true, verified: false });
  }

  try {
    const { data } = await supabaseAdmin()
      .from("orders")
      .select("order_no, amount, customer_name, customer_email, created_at, status")
      .in("order_no", orderNos)
      .eq("status", "PENDING")
      .retry(false)
      .returns<OpenOrder[]>();
    const open = data ?? [];
    const first = open[0];
    if (!first) return NextResponse.json({ ok: true, verified: false });

    const total = open.reduce((sum, o) => sum + o.amount, 0);

    if (isSlipVerifyEnabled) {
      const slip = await readSlip(first.order_no);
      // เทียบกับคำสั่งซื้อที่สร้างก่อนสุดในชุด: สลิปต้องโอนหลังจากนั้น
      const earliest = new Date(Math.min(...open.map((o) => Date.parse(o.created_at))));
      const verdict = slip ? await verifySlip(slip, total, earliest) : null;
      if (verdict?.ok) {
        await fulfillOrders(open.map((o) => o.order_no));
        return NextResponse.json({ ok: true, verified: true });
      }
      if (verdict) console.info(`slip ${first.order_no}: ${verdict.reason}`);
    }

    const to = adminEmails();
    if (to.length > 0 && (await isFirstFreshSlip(first.order_no))) {
      await sendSlipNotice({
        to,
        orderNos: open.map((o) => o.order_no),
        amount: total,
        customer: `${first.customer_name} <${first.customer_email}>`,
        link: `${new URL(req.url).origin}/admin/orders?filter=review`,
      });
    }
  } catch (err) {
    console.error("slip done:", err instanceof Error ? err.message : err);
  }
  // ตอบเหมือนกันทุกกรณีที่ไม่ผ่านอัตโนมัติ: สลิปยังอยู่ให้ร้านตรวจ และไม่บอกผู้เรียกว่าไม่ผ่านเพราะอะไร
  return NextResponse.json({ ok: true, verified: false });
}
