import { NextResponse } from "next/server";
import { settleStripeSession } from "@/lib/payments";
import { getCheckoutSession, isStripeEnabled } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /pay/return?session_id=cs_...
 * Stripe พาผู้ซื้อกลับมาที่นี่หลังชำระเงิน: ถาม Stripe ตรง ๆ ว่าจ่ายแล้วจริงไหม แล้วส่งไฟล์ทันที
 * (ไม่เชื่ออะไรจาก URL นอกจากรหัสของหน้าชำระเงิน — ยอดและรายการอ่านจาก Stripe กับฐานข้อมูล)
 * webhook ทำงานเดียวกันอยู่เบื้องหลัง เผื่อผู้ซื้อปิดหน้าต่างก่อนกลับมาถึง
 */
export async function GET(req: Request) {
  const { origin, searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id") || "";
  if (!isStripeEnabled || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return NextResponse.redirect(`${origin}/library`);

  try {
    const result = await settleStripeSession(await getCheckoutSession(sessionId));
    if (!result.cartNo) return NextResponse.redirect(`${origin}/library`);
    // คำสั่งซื้อชิ้นเดียวมีหน้าผลลัพธ์ที่อ่านจาก server ได้เลย หลายชิ้นใช้ใบเสร็จที่หน้าเว็บเก็บไว้ก่อนออกไปจ่าย
    // (ยังไม่จ่ายก็ไปหน้าเดียวกัน: หน้านั้นถาม server เองแล้วแสดงว่ารอการชำระ)
    const single = result.orderNos.length === 1;
    return NextResponse.redirect(`${origin}${single ? "/success/" : "/complete/"}${encodeURIComponent(result.cartNo)}`);
  } catch (err) {
    console.error("stripe return:", err instanceof Error ? err.message : err);
    return NextResponse.redirect(`${origin}/library`);
  }
}
