/**
 * ข้อมูลแคตตาล็อกฝั่งหน้าเว็บ (ใช้ได้ทั้ง server และ client)
 *
 * ตาราง books ใน Supabase มีแค่ข้อมูลพื้นฐาน (ชื่อ ราคา kind file_size ...)
 * ไฟล์นี้เติม metadata ที่หน้าเว็บต้องใช้ เช่น หมวดหมู่ แพลตฟอร์ม เวอร์ชัน และไลเซนส์
 * โดยอ่านจากคอลัมน์จริงก่อนเสมอ ถ้าไม่มีจึงใช้ค่าตั้งต้นตามประเภทสินค้า
 *
 * เพื่อให้หน้าร้านยังดูและทดสอบ layout ได้ — สั่งซื้อจริงไม่ได้
 */

import type {
  BookRow,
  CatalogFilters,
  Category,
  Creator,
  CreatorProfile,
  License,
  Platform,
  PriceBandId,
  Product,
  SortKey,
} from "@/lib/types";

/* ---------- หมวดหมู่ ---------- */
export const CATEGORIES: Category[] = [
  "notion",
  "uikit",
  "design",
  "devtool",
  "productivity",
  "template",
  "guide",
  "asset",
];

// kind เดิมในฐานข้อมูล -> หมวดหมู่ใหม่
const KIND_ALIAS: Record<string, Category> = { preset: "asset" };

export const PLATFORMS: Platform[] = ["notion", "figma", "code", "pdf", "adobe"];

const DEFAULTS: Record<Category, { platform: Platform; format: string; license: License }> = {
  notion:       { platform: "notion", format: "Notion template",   license: "personal" },
  uikit:        { platform: "figma",  format: ".fig + PDF",         license: "commercial" },
  design:       { platform: "figma",  format: "SVG · PNG · .fig",   license: "commercial" },
  devtool:      { platform: "code",   format: "ZIP · Source code",  license: "mit" },
  productivity: { platform: "notion", format: "Notion template",   license: "personal" },
  template:     { platform: "pdf",    format: "DOCX · PDF",         license: "personal" },
  guide:        { platform: "pdf",    format: "PDF",                license: "personal" },
  asset:        { platform: "adobe",  format: "ZIP",                license: "commercial" },
};

const isCategory = (k: string): k is Category => k in DEFAULTS;

export function categoryOf(p: { kind?: string | null } | null | undefined): Category {
  const kind = p?.kind || "";
  const k = KIND_ALIAS[kind] || kind;
  return isCategory(k) ? k : "guide";
}

/** 2026-09-14 -> "2026.09" */
export function stamp(value: string | number | Date | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** URL รูปสินค้าที่ร้านอัปโหลด — null เมื่อยังไม่มี (คอลัมน์ cover รุ่นเก่าเก็บชื่อชุดปก ไม่ใช่ URL) */
export const imageOf = (p: { cover?: string | null }): string | null =>
  p.cover && /^https?:\/\//.test(p.cover) ? p.cover : null;

/** เติม metadata ให้สินค้าหนึ่งชิ้น — ค่าในฐานข้อมูลมาก่อนเสมอ */
export function enrich(p: BookRow, index = 0): Product {
  const category = categoryOf(p);
  const d = DEFAULTS[category];
  const no = typeof p.sort === "number" && p.sort > 0 ? p.sort : index + 1;
  return {
    ...p,
    category,
    platform: p.platform || d.platform,
    format: p.format || (category === "guide" && p.pages ? `PDF · ${p.pages} pp.` : d.format),
    license: p.license || d.license,
    version: p.version || "1.0",
    updated: p.updated || p.created_at || null,
    productNo: String(no).padStart(3, "0"),
    creatorId: p.shop?.id || p.shop_id || null,
    creatorName: p.shop?.name || null,
    rating: Number(p.rating) || 0,
    reviews: Number(p.reviews) || 0,
  };
}

export function discountOf(p: { price: number; list_price?: number | null }): number {
  if (!p.list_price || p.list_price <= p.price) return 0;
  return Math.round((1 - p.price / p.list_price) * 100);
}

/* ---------- ค้นหา / กรอง / เรียง ---------- */
export const PRICE_BANDS: { id: PriceBandId; test: (n: number) => boolean }[] = [
  { id: "u200", test: (n) => n < 200 },
  { id: "200-400", test: (n) => n >= 200 && n <= 400 },
  { id: "o400", test: (n) => n > 400 },
];

export const SORTS: SortKey[] = ["featured", "newest", "priceAsc", "priceDesc", "rating"];

export function filterProducts(
  list: Product[],
  { q = "", cats = [], plats = [], price = "", rating = 0 }: CatalogFilters
): Product[] {
  const query = q.trim().toLowerCase();
  const band = PRICE_BANDS.find((b) => b.id === price);
  return list.filter((p) => {
    if (cats.length && !cats.includes(p.category)) return false;
    if (plats.length && !plats.includes(p.platform)) return false;
    if (band && !band.test(p.price)) return false;
    if (rating && p.rating < rating) return false;
    if (!query) return true;
    return [p.title_th, p.title_en, p.short_th, p.short_en, p.creatorName, p.category]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
}

export function sortProducts(list: Product[], sort: SortKey): Product[] {
  const out = list.slice();
  const time = (p: Product) => new Date(p.updated || 0).getTime();
  if (sort === "newest") out.sort((a, b) => time(b) - time(a));
  else if (sort === "priceAsc") out.sort((a, b) => a.price - b.price);
  else if (sort === "priceDesc") out.sort((a, b) => b.price - a.price);
  else if (sort === "rating") out.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
  return out;
}

/** สินค้าที่เกี่ยวข้อง: หมวดเดียวกันก่อน แล้วร้านเดียวกัน แล้วที่เหลือ */
export function relatedTo(product: Product, list: Product[], n = 3): Product[] {
  const others = list.filter((p) => p.id !== product.id);
  const score = (p: Product) =>
    (p.category === product.category ? 2 : 0) +
    (p.creatorId && p.creatorId === product.creatorId ? 1 : 0);
  return others.sort((a, b) => score(b) - score(a)).slice(0, n);
}

/* ---------- ครีเอเตอร์ ---------- */
/** รวมครีเอเตอร์จากสินค้า (ใช้ shop ที่ join มา) พร้อมสถิติ */
export function creatorsFrom(products: Product[], extra: CreatorProfile[] = []): Creator[] {
  const map = new Map<string, CreatorProfile & { products: Product[] }>();
  for (const c of extra) map.set(c.id, { ...c, products: [] });
  for (const p of products) {
    if (!p.creatorId) continue;
    if (!map.has(p.creatorId)) {
      map.set(p.creatorId, { id: p.creatorId, name: p.creatorName || p.creatorId, products: [] });
    }
    map.get(p.creatorId)?.products.push(p);
  }
  return [...map.values()]
    .filter((c) => c.products.length > 0)
    .map((c) => {
      const reviews = c.products.reduce((s, p) => s + p.reviews, 0);
      const weighted = c.products.reduce((s, p) => s + p.rating * p.reviews, 0);
      return {
        ...c,
        productCount: c.products.length,
        reviews,
        rating: reviews ? Math.round((weighted / reviews) * 10) / 10 : 0,
      };
    });
}

/* ---------- คำถามที่พบบ่อย (ใช้ทั้งหน้าสินค้าและหน้าเกี่ยวกับ) ---------- */
export const FAQ = ["faqDelivery", "faqRedownload", "faqLicense", "faqUpdates", "faqPayment"] as const;
