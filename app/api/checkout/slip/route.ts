import { NextResponse } from "next/server";
import { normalizeOrderNo, readJsonBody } from "@/lib/api";
import { IMAGE_EXTENSIONS, MAX_IMAGE_BYTES } from "@/lib/format";
import { MAX_CHECKOUT_ORDERS } from "@/lib/payments";
import { isPromptPayEnabled } from "@/lib/promptpay";
import { createSlipUploads } from "@/lib/slips";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/checkout/slip  { orders: "ORD-1,ORD-2", filename, size } -> { uploads: [{ orderNo, url }] }
 * ผู้ซื้อแนบสลิปโอนเงิน: ออก URL อัปโหลดครั้งเดียวให้เบราว์เซอร์ส่งรูปตรงไปที่ Storage (bucket private)
 * รับเฉพาะคำสั่งซื้อที่มีอยู่จริงและยังไม่ได้จ่าย — การแนบสลิปไม่ได้ทำให้ได้ไฟล์ ร้านต้องตรวจแล้วยืนยันเอง
 */
export async function POST(req: Request) {
  if (!isSupabaseConfigured || !isPromptPayEnabled) {
    return NextResponse.json({ error: "promptpay_disabled" }, { status: 503 });
  }

  const body = await readJsonBody(req);
  const orderNos = [...new Set(String(body?.orders || "").split(",").map(normalizeOrderNo).filter(Boolean))];
  const filename = String(body?.filename || "");
  const size = Number(body?.size);
  const ext = filename.includes(".") ? filename.split(".").pop()!.toLowerCase() : "";

  if (orderNos.length === 0 || orderNos.length > MAX_CHECKOUT_ORDERS) {
    return NextResponse.json({ error: "invalid_orders" }, { status: 400 });
  }
  if (!IMAGE_EXTENSIONS.includes(ext)) return NextResponse.json({ error: "image_type" }, { status: 400 });
  if (!Number.isFinite(size) || size <= 0 || size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "image_too_large" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin()
    .from("orders")
    .select("order_no, status")
    .in("order_no", orderNos)
    .retry(false)
    .returns<{ order_no: string; status: string }[]>();
  if (error) return NextResponse.json({ error: "load_failed" }, { status: 500 });
  if ((data ?? []).length !== orderNos.length) return NextResponse.json({ error: "order_not_found" }, { status: 404 });

  const open = data.filter((o) => o.status === "PENDING").map((o) => o.order_no);
  if (open.length === 0) return NextResponse.json({ error: "already_paid" }, { status: 409 });

  try {
    return NextResponse.json({ uploads: await createSlipUploads(open, ext) });
  } catch (err) {
    console.error("slip upload:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }
}
