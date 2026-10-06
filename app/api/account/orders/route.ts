import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import type { AccountOrder } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/account/orders -> { orders }
 * ประวัติคำสั่งซื้อของบัญชีที่ล็อกอิน (เฉพาะคำสั่งซื้อที่สร้างตอนล็อกอินอยู่)
 * คำสั่งซื้อแบบไม่ล็อกอินไม่ถูกผูกจากอีเมลอัตโนมัติ — ต้องยืนยันด้วยเลขคำสั่งซื้อ + อีเมลเหมือนเดิม
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin()
    .from("orders")
    .select(
      "order_no, status, amount, customer_name, customer_email, created_at, paid_at, book:books(id, title_th, title_en, kind, version)"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<AccountOrder[]>();

  if (error) {
    console.error("account orders:", error.message);
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }
  return NextResponse.json({ orders: data ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
}
