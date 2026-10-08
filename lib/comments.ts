import "server-only";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";
import type { ArticleComment, SessionUser } from "@/lib/types";

/**
 * ความคิดเห็นใต้บทความ — ตาราง article_comments (supabase/comments.sql)
 * ผู้ที่ล็อกอินแล้วเขียนได้ เจ้าของลบของตัวเองได้ ผู้ดูแลลบได้ทุกรายการ
 */

const COLUMNS = "id, article, user_id, name, body, created_at";
export const COMMENT_MAX_LENGTH = 1000;

// กันการส่งรัว: เว้นระยะระหว่างความคิดเห็น และจำกัดจำนวนต่อวันต่อคน
const MIN_GAP_MS = 15_000;
const MAX_PER_DAY = 30;

type Row = Omit<ArticleComment, "own"> & { user_id: string };

const toComment = ({ user_id, ...row }: Row, userId?: string): ArticleComment => ({ ...row, own: user_id === userId });

/** ความคิดเห็นของบทความ ใหม่สุดก่อน — ยังไม่ได้รัน comments.sql = ไม่มีความคิดเห็น */
export async function loadComments(article: string, userId?: string, limit = 200): Promise<ArticleComment[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabaseAdmin()
    .from("article_comments")
    .select(COLUMNS)
    .eq("article", article)
    .order("created_at", { ascending: false })
    .limit(limit)
    .retry(false)
    .returns<Row[]>();
  return error ? [] : (data ?? []).map((row) => toComment(row, userId));
}

export type CommentError = "invalid_input" | "too_fast" | "not_found" | "save_failed";

/** เขียนความคิดเห็น — คืน error หรือความคิดเห็นที่บันทึกแล้ว */
export async function addComment(
  user: SessionUser,
  input: { article: string; body: string }
): Promise<{ comment: ArticleComment } | { error: CommentError }> {
  const body = input.body.replace(/\r\n/g, "\n").trim().slice(0, COMMENT_MAX_LENGTH);
  if (!input.article || !body) return { error: "invalid_input" };

  const db = supabaseAdmin();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [recent, article] = await Promise.all([
    db.from("article_comments").select("created_at").eq("user_id", user.id).gte("created_at", dayAgo)
      .order("created_at", { ascending: false }).limit(MAX_PER_DAY).retry(false).returns<{ created_at: string }[]>(),
    db.from("articles").select("slug").eq("slug", input.article).eq("published", true).retry(false).maybeSingle(),
  ]);
  if (!article.data) return { error: "not_found" };
  const mine = recent.data ?? [];
  if (mine.length >= MAX_PER_DAY || (mine[0] && Date.now() - Date.parse(mine[0].created_at) < MIN_GAP_MS)) {
    return { error: "too_fast" };
  }

  const { data, error } = await db
    .from("article_comments")
    .insert({
      article: input.article,
      user_id: user.id,
      // แสดงชื่อ ถ้าไม่มีใช้ส่วนหน้าของอีเมล (ไม่แสดงอีเมลเต็ม)
      name: user.name || user.email.split("@")[0] || "",
      body,
    })
    .select(COLUMNS)
    .single<Row>();
  if (error || !data) {
    console.error("addComment:", error?.message);
    return { error: "save_failed" };
  }
  return { comment: toComment(data, user.id) };
}

/** ลบความคิดเห็น: เจ้าของลบของตัวเองได้ ผู้ดูแลลบได้ทุกรายการ */
export async function removeComment(id: string, user: SessionUser): Promise<boolean> {
  let query = supabaseAdmin().from("article_comments").delete().eq("id", id);
  if (!user.isAdmin) query = query.eq("user_id", user.id);
  const { data, error } = await query.select("id").returns<{ id: string }[]>();
  if (error) console.error("removeComment:", error.message);
  return (data?.length ?? 0) > 0;
}

/** ความคิดเห็นหนึ่งรายการในหลังบ้าน พร้อมชื่อบทความ */
export interface AdminComment extends ArticleComment {
  title: string;
}

/** ความคิดเห็นทั้งหมด ใหม่สุดก่อน (หลังบ้าน — ผู้เรียกต้องตรวจสิทธิ์ admin ก่อน) */
export async function listAllComments(limit = 500): Promise<AdminComment[]> {
  const { data, error } = await supabaseAdmin()
    .from("article_comments")
    .select(`${COLUMNS}, post:articles(title_th)`)
    .order("created_at", { ascending: false })
    .limit(limit)
    .retry(false)
    .returns<(Row & { post: { title_th: string } | null })[]>();
  if (error) throw new Error(`article_comments: ${error.message}`);
  return (data ?? []).map(({ post, ...row }) => ({ ...toComment(row), title: post?.title_th || row.article }));
}
