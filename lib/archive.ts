/**
 * ประเภทของเนื้อหาในคลังบทความ (ใช้ได้ทั้ง server และ browser)
 * ตัวบทความเก็บในตาราง articles — ดู lib/articles.ts
 */
import type { ArticleType } from "@/lib/types";

export const ARCHIVE_TYPES: ArticleType[] = ["story", "note", "guide", "article", "update"];
