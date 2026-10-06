/**
 * เนื้อหาในหน้า Archive (บทความ บันทึกการออกแบบ ไกด์ และอัปเดตสินค้า)
 * เก็บเป็นไฟล์ในโปรเจกต์ ไม่ต้องมีตารางในฐานข้อมูล
 * type: story | note | guide | article | update
 */
import type { Article, ArticleType } from "@/lib/types";

export const ARCHIVE_TYPES: ArticleType[] = ["story", "note", "guide", "article", "update"];

// บทความเกี่ยวกับสินค้าเพิ่มได้ที่นี่ โดยใส่ product เป็นรหัสสินค้าจริงในร้าน
export const ARCHIVE: Article[] = [
  {
    slug: "why-we-built-vector",
    type: "article",
    date: "2026-05-01",
    read: 4,
    product: null,
    author: "VECTOR",
    title_th: "ทำไมเราถึงสร้าง VECTOR",
    title_en: "Why we built VECTOR",
    dek_th: "ตลาดสินค้าดิจิทัลที่ให้ข้อมูลก่อนการตลาด",
    dek_en: "A digital marketplace that puts specifications before marketing.",
    body_th: [
      "สินค้าดิจิทัลส่วนใหญ่ขายด้วยภาพหน้าปก แต่คนที่ซื้อไปใช้งานจริงอยากรู้ว่าได้ไฟล์อะไร ใช้กับโปรแกรมไหน และอัปเดตล่าสุดเมื่อไร",
      "VECTOR จึงแสดงสินค้าทุกชิ้นเหมือนเอกสารสเปก รูปแบบไฟล์ เวอร์ชัน ไลเซนส์ และการจัดส่งอยู่ในที่เดียวกันเสมอ",
    ],
    body_en: [
      "Most digital products are sold on cover art. The people who buy them to do real work want to know what files they get, what software they need, and when it was last updated.",
      "So every product on VECTOR reads like a specification sheet: format, version, license and delivery, always in the same place.",
    ],
  },
];
