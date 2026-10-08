import "server-only";
import { normalizeOrderNo } from "@/lib/api";
import { findSlip } from "@/lib/slips";
import { expireOpenSessions, isStripeEnabled } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";
import type { SessionUser } from "@/lib/types";

/**
 * ผู้ซื้อยกเลิกคำสั่งซื้อที่ยังไม่ได้ชำระ — ยกเลิกทั้งตะกร้า (ทุกแถวที่ใช้เลขคำสั่งซื้อเดียวกัน)
 * ยกเลิกได้เฉพาะคำสั่งซื้อของตัวเองที่ทุกรายการยังเป็น PENDING และยังไม่ได้แนบสลิป
 * (แนบสลิปแล้ว = อาจโอนเงินมาแล้ว ต้องให้ร้านตรวจก่อน ผู้ซื้อยกเลิกเองไม่ได้)
 * หน้าชำระเงินของ Stripe ที่ยังเปิดค้างอยู่ถูกปิดก่อนลบ กันการจ่ายเงินให้คำสั่งซื้อที่ไม่มีแล้ว
 */
export type CancelResult = { orderNos: string[] } | { error: "not_found" | "not_cancellable" | "failed" };

export async function cancelCart(orderNo: string, user: SessionUser): Promise<CancelResult> {
  const no = normalizeOrderNo(orderNo);
  if (!/^[A-Z0-9-]{4,40}$/.test(no)) return { error: "not_found" };
  const db = supabaseAdmin();

  const { data: rows, error } = await db
    .from("orders")
    .select("order_no, cart_no, status")
    .eq("user_id", user.id)
    .or(`cart_no.eq.${no},order_no.eq.${no}`)
    .retry(false)
    .returns<{ order_no: string; cart_no: string | null; status: string }[]>();
  if (error) {
    console.error("cancelCart:", error.message);
    return { error: "failed" };
  }
  const first = rows?.[0];
  if (!first) return { error: "not_found" };

  // ได้มาแค่แถวเดียวของตะกร้า (ขอด้วยเลขของแถว เช่น ...-2): ดึงทั้งตะกร้า
  const cartNo = first.cart_no || first.order_no;
  let lines = rows;
  if (cartNo !== no) {
    const all = await db.from("orders").select("order_no, cart_no, status").eq("user_id", user.id).eq("cart_no", cartNo)
      .retry(false).returns<typeof rows>();
    if (all.error || !all.data?.length) return { error: "failed" };
    lines = all.data;
  }

  if (lines.some((o) => o.status !== "PENDING")) return { error: "not_cancellable" };
  const slips = await Promise.all(lines.map((o) => findSlip(o.order_no)));
  if (slips.some(Boolean)) return { error: "not_cancellable" };

  if (isStripeEnabled) {
    try {
      await expireOpenSessions(cartNo);
    } catch (err) {
      // ปิดหน้าชำระเงินไม่สำเร็จ: ไม่ลบคำสั่งซื้อ ไม่เช่นนั้นผู้ซื้ออาจจ่ายเงินให้คำสั่งซื้อที่หายไปแล้ว
      console.error("cancelCart: expire stripe session:", err instanceof Error ? err.message : err);
      return { error: "failed" };
    }
  }

  // เงื่อนไข status ซ้ำอีกครั้งตอนลบ: ถ้าจ่ายสำเร็จพอดีระหว่างนี้ แถวนั้นจะไม่ถูกลบ
  const removed = await db
    .from("orders")
    .delete()
    .eq("user_id", user.id)
    .eq("status", "PENDING")
    .in("order_no", lines.map((o) => o.order_no))
    .select("order_no")
    .returns<{ order_no: string }[]>();
  if (removed.error) {
    console.error("cancelCart: delete:", removed.error.message);
    return { error: "failed" };
  }
  return { orderNos: (removed.data ?? []).map((o) => o.order_no) };
}
