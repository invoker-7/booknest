import "server-only";
import { ARCHIVE_TYPES } from "@/lib/archive";
import { slugify } from "@/lib/admin";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";
import type { Article, ArticleRow, ArticleType } from "@/lib/types";

/**
 * บทความในคลังบทความ — เก็บในตาราง articles (supabase/content.sql) เขียนและแก้จากหลังบ้าน
 * หน้าร้านอ่านเฉพาะบทความที่เผยแพร่แล้ว ยังไม่ได้รัน content.sql = ไม่มีบทความ (ไม่ถือเป็นข้อผิดพลาด)
 */

const COLUMNS = "slug, type, title_th, title_en, dek_th, dek_en, body_th, body_en, author, product, published, published_at, created_at";

// อ่านภาษาไทยราว 900 ตัวอักษรต่อนาที
const CHARS_PER_MINUTE = 900;

const paragraphs = (text: string): string[] => text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

function toArticle(row: ArticleRow): Article {
  return {
    slug: row.slug,
    type: row.type,
    date: row.published_at,
    read: Math.max(1, Math.round(row.body_th.length / CHARS_PER_MINUTE)),
    product: row.product,
    author: row.author,
    title_th: row.title_th,
    title_en: row.title_en || row.title_th,
    dek_th: row.dek_th,
    dek_en: row.dek_en || row.dek_th,
    body_th: paragraphs(row.body_th),
    // ยังไม่ได้แปล: แสดงภาษาไทยแทนหน้าว่าง
    body_en: paragraphs(row.body_en || row.body_th),
  };
}

/** บทความที่เผยแพร่แล้ว ใหม่สุดก่อน */
export async function loadArticles(limit = 200): Promise<Article[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabaseAdmin()
    .from("articles")
    .select(COLUMNS)
    .eq("published", true)
    .order("published_at", { ascending: false })
    .limit(limit)
    .retry(false)
    .returns<ArticleRow[]>();
  if (error) return [];
  return (data ?? []).map(toArticle);
}

export async function loadArticle(slug: string): Promise<Article | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabaseAdmin()
    .from("articles")
    .select(COLUMNS)
    .eq("slug", slug)
    .eq("published", true)
    .retry(false)
    .maybeSingle<ArticleRow>();
  return error || !data ? null : toArticle(data);
}

// เมนู "คลังบทความ" อยู่ในโครงหน้าของทุกหน้า จึงจำคำตอบไว้ชั่วครู่ ไม่ถามฐานข้อมูลทุกคำขอ
const HAS_TTL_MS = 60_000;
let hasCache: { value: boolean; until: number } | null = null;

/** มีบทความที่เผยแพร่แล้วอย่างน้อยหนึ่งบทความไหม */
export async function hasArticles(): Promise<boolean> {
  if (hasCache && hasCache.until > Date.now()) return hasCache.value;
  let value = false;
  if (isSupabaseConfigured) {
    const { data, error } = await supabaseAdmin().from("articles").select("slug").eq("published", true).limit(1).retry(false);
    value = !error && (data?.length ?? 0) > 0;
  }
  hasCache = { value, until: Date.now() + HAS_TTL_MS };
  return value;
}

/* ---------- หลังบ้าน (ผู้เรียกต้องตรวจสิทธิ์ admin ก่อนเสมอ) ---------- */

/** บทความทั้งหมด รวมฉบับร่าง */
export async function listAllArticles(): Promise<ArticleRow[]> {
  const { data, error } = await supabaseAdmin()
    .from("articles")
    .select(COLUMNS)
    .order("published_at", { ascending: false })
    .retry(false)
    .returns<ArticleRow[]>();
  if (error) throw new Error(`articles: ${error.message}`);
  return data ?? [];
}

export async function getArticleRow(slug: string): Promise<ArticleRow | null> {
  const { data } = await supabaseAdmin().from("articles").select(COLUMNS).eq("slug", slug).retry(false).maybeSingle<ArticleRow>();
  return data ?? null;
}

export type ArticleErrorCode = "title_required" | "body_required" | "slug_required" | "type_invalid";

export type ArticleInput = Omit<ArticleRow, "created_at">;

const text = (value: unknown, max: number): string => String(value ?? "").replace(/\r\n/g, "\n").trim().slice(0, max);

/** ตรวจและจัดรูปข้อมูลบทความจากฟอร์มหลังบ้าน */
export function normalizeArticle(raw: Record<string, unknown>): { article: ArticleInput } | { error: ArticleErrorCode } {
  const title_th = text(raw.title_th, 200);
  const title_en = text(raw.title_en, 200);
  if (!title_th && !title_en) return { error: "title_required" };
  const body_th = text(raw.body_th, 40_000);
  const body_en = text(raw.body_en, 40_000);
  if (!body_th && !body_en) return { error: "body_required" };

  const slug = slugify(text(raw.slug, 80) || title_en || title_th);
  if (!slug) return { error: "slug_required" };
  const type = (text(raw.type, 20) || "article") as ArticleType;
  if (!ARCHIVE_TYPES.includes(type)) return { error: "type_invalid" };

  const published_at = new Date(text(raw.published_at, 40));
  return {
    article: {
      slug,
      type,
      title_th: title_th || title_en,
      title_en,
      dek_th: text(raw.dek_th, 300),
      dek_en: text(raw.dek_en, 300),
      body_th: body_th || body_en,
      body_en,
      author: text(raw.author, 80) || "VECTOR",
      product: text(raw.product, 120) || null,
      published: raw.published !== false,
      published_at: Number.isNaN(published_at.getTime()) ? new Date().toISOString() : published_at.toISOString(),
    },
  };
}

/** บันทึกบทความ (สร้างใหม่หรือทับของเดิมที่ slug เดียวกัน) — คืนรหัสข้อผิดพลาด หรือ null เมื่อสำเร็จ */
export async function saveArticle(article: ArticleInput): Promise<"product_not_found" | "save_failed" | null> {
  const { error } = await supabaseAdmin().from("articles").upsert(article, { onConflict: "slug" });
  if (error) console.error("saveArticle:", error.message);
  hasCache = null;
  return error ? (error.code === "23503" ? "product_not_found" : "save_failed") : null;
}

export async function removeArticle(slug: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin().from("articles").delete().eq("slug", slug).select("slug");
  if (error) console.error("removeArticle:", error.message);
  hasCache = null;
  return !error && Boolean(data?.length);
}
