import "server-only";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";
import type { Review, SessionUser } from "@/lib/types";

/**
 * รีวิวสินค้า — ตาราง reviews (supabase/content.sql)
 * เขียนได้เฉพาะผู้ที่ซื้อสินค้านั้นและจ่ายเงินแล้ว คนละหนึ่งรีวิวต่อสินค้า (แก้ของเดิมได้)
 * คะแนนเฉลี่ยของสินค้า (books.rating / books.reviews) ถูกคำนวณใหม่ด้วย trigger ในฐานข้อมูล
 */

const COLUMNS = "id, book_id, name, rating, body, created_at";
export const REVIEW_MAX_LENGTH = 1000;

/** รีวิวของสินค้าหนึ่งชิ้น ใหม่สุดก่อน — ยังไม่ได้รัน content.sql = ไม่มีรีวิว */
export async function loadReviews(bookId: string, limit = 50): Promise<Review[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabaseAdmin()
    .from("reviews")
    .select(COLUMNS)
    .eq("book_id", bookId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .retry(false)
    .returns<Review[]>();
  return error ? [] : (data ?? []);
}

/** รีวิวของผู้ใช้คนนี้ต่อสินค้านี้ (ไว้เติมฟอร์มแก้ไข) */
export async function loadOwnReview(bookId: string, userId: string): Promise<Review | null> {
  const { data } = await supabaseAdmin()
    .from("reviews")
    .select(COLUMNS)
    .eq("book_id", bookId)
    .eq("user_id", userId)
    .retry(false)
    .maybeSingle<Review>();
  return data ?? null;
}

/** ผู้ใช้คนนี้ซื้อสินค้านี้และจ่ายเงินแล้วหรือยัง */
export async function hasPurchased(bookId: string, userId: string): Promise<boolean> {
  const { count, error } = await supabaseAdmin()
    .from("orders")
    .select("order_no", { count: "exact", head: true })
    .eq("book_id", bookId)
    .eq("user_id", userId)
    .neq("status", "PENDING")
    .retry(false);
  return !error && (count ?? 0) > 0;
}

export type ReviewError = "not_purchased" | "invalid_input" | "save_failed";

/** เขียนหรือแก้รีวิว — คืน error หรือรีวิวที่บันทึกแล้ว */
export async function saveReview(
  user: SessionUser,
  input: { bookId: string; rating: number; body: string }
): Promise<{ review: Review } | { error: ReviewError }> {
  const rating = Math.round(input.rating);
  const body = input.body.replace(/\r\n/g, "\n").trim().slice(0, REVIEW_MAX_LENGTH);
  if (!input.bookId || !(rating >= 1 && rating <= 5)) return { error: "invalid_input" };
  if (!(await hasPurchased(input.bookId, user.id))) return { error: "not_purchased" };

  const { data, error } = await supabaseAdmin()
    .from("reviews")
    .upsert(
      {
        book_id: input.bookId,
        user_id: user.id,
        // แสดงชื่อ ถ้าไม่มีใช้ส่วนหน้าของอีเมล (ไม่แสดงอีเมลเต็ม)
        name: user.name || user.email.split("@")[0] || "",
        rating,
        body,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "book_id,user_id" }
    )
    .select(COLUMNS)
    .single<Review>();
  if (error || !data) {
    console.error("saveReview:", error?.message);
    return { error: "save_failed" };
  }
  return { review: data };
}

/** ลบรีวิว: เจ้าของรีวิวลบของตัวเองได้ ผู้ดูแลลบได้ทุกรีวิว — คืนรหัสสินค้าเมื่อสำเร็จ */
export async function removeReview(id: string, user: SessionUser): Promise<string | null> {
  let query = supabaseAdmin().from("reviews").delete().eq("id", id);
  if (!user.isAdmin) query = query.eq("user_id", user.id);
  const { data, error } = await query.select("book_id").returns<{ book_id: string }[]>();
  if (error) console.error("removeReview:", error.message);
  return data?.[0]?.book_id ?? null;
}

/** รีวิวหนึ่งรายการในหลังบ้าน พร้อมชื่อสินค้า */
export interface AdminReview extends Review {
  title: string;
}

/** รีวิวทั้งหมดของร้าน ใหม่สุดก่อน (หลังบ้าน — ผู้เรียกต้องตรวจสิทธิ์ admin ก่อน) */
export async function listAllReviews(limit = 500): Promise<AdminReview[]> {
  const { data, error } = await supabaseAdmin()
    .from("reviews")
    .select(`${COLUMNS}, book:books(title_th)`)
    .order("created_at", { ascending: false })
    .limit(limit)
    .retry(false)
    .returns<(Review & { book: { title_th: string } | null })[]>();
  if (error) throw new Error(`reviews: ${error.message}`);
  return (data ?? []).map(({ book, ...review }) => ({ ...review, title: book?.title_th || review.book_id }));
}
