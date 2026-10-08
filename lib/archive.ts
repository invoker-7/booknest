/**
 * เนื้อหาในหน้า Archive (บทความ บันทึกการออกแบบ ไกด์ และอัปเดตสินค้า)
 * เก็บเป็นไฟล์ในโปรเจกต์ ไม่ต้องมีตารางในฐานข้อมูล
 * type: story | note | guide | article | update
 */
import type { Article, ArticleType } from "@/lib/types";

export const ARCHIVE_TYPES: ArticleType[] = ["story", "note", "guide", "article", "update"];

// ยังไม่มีบทความ — เพิ่มได้ที่นี่ (ใส่ product เป็นรหัสสินค้าจริงในร้านถ้าเป็นบทความเกี่ยวกับสินค้า)
// ไม่มีบทความเลย: เมนู "คลังบทความ" และส่วนบทความในหน้าแรกจะไม่แสดง
export const ARCHIVE: Article[] = [];
