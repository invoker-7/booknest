import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { readJsonBody } from "@/lib/api";
import { refreshStorefront } from "@/lib/admin";
import { hasPurchased, loadOwnReview, removeReview, saveReview } from "@/lib/reviews";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/reviews?book=<id> -> { canReview, review }
 * สถานะของผู้ที่ล็อกอินอยู่ต่อสินค้านี้: เขียนรีวิวได้ไหม (ซื้อและจ่ายแล้ว) และรีวิวที่เคยเขียน
 * รายการรีวิวของทุกคนมากับหน้าสินค้าอยู่แล้ว ไม่ได้ดึงจากที่นี่
 */
export async function GET(req: Request) {
  const bookId = new URL(req.url).searchParams.get("book") || "";
  const user = await getSessionUser();
  if (!user || !bookId) return NextResponse.json({ canReview: false, review: null }, { headers: { "Cache-Control": "private, no-store" } });

  const [canReview, review] = await Promise.all([hasPurchased(bookId, user.id), loadOwnReview(bookId, user.id)]);
  return NextResponse.json({ canReview, review }, { headers: { "Cache-Control": "private, no-store" } });
}

/** POST /api/reviews  { bookId, rating, body } -> { review } — เขียนหรือแก้รีวิวของตัวเอง (ต้องเป็นผู้ซื้อ) */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "login_required" }, { status: 401 });

  const body = await readJsonBody(req);
  const result = await saveReview(user, {
    bookId: String(body?.bookId || "").trim(),
    rating: Number(body?.rating),
    body: String(body?.body ?? ""),
  });
  if ("error" in result) {
    const status = result.error === "not_purchased" ? 403 : result.error === "invalid_input" ? 400 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }
  refreshStorefront(); // คะแนนเฉลี่ยของสินค้าเปลี่ยน หน้าร้านต้องสร้างใหม่
  return NextResponse.json({ review: result.review });
}

/** DELETE /api/reviews?id=<uuid> -> { ok } — ลบรีวิวของตัวเอง (ผู้ดูแลลบได้ทุกรีวิว) */
export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "login_required" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id") || "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  if (!(await removeReview(id, user))) return NextResponse.json({ error: "not_found" }, { status: 404 });

  refreshStorefront();
  return NextResponse.json({ ok: true });
}
