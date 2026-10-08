import "server-only";
import { getBooks, getBook, getShop, IMAGE_BUCKET, imageBaseUrl, isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";
import { enrich, creatorsFrom } from "@/lib/catalog";
import type { Creator, Product } from "@/lib/types";

export interface Catalog {
  products: Product[];
  /** false = ยังไม่ได้ตั้งค่าฐานข้อมูล (หน้าร้านแสดงแถบแจ้งและปิดการสั่งซื้อ) */
  live: boolean;
}

// ฐานข้อมูลว่างหรือเชื่อมต่อไม่ได้: จำผลไว้ชั่วครู่ ไม่ต้องรอ timeout ซ้ำทุกหน้า
const EMPTY_TTL_MS = 60_000;

// เก็บบน globalThis เพราะในโหมด dev โมดูลถูกโหลดใหม่บ่อย ตัวแปรระดับโมดูลจะหายทุกครั้ง
const state = ((globalThis as { __vectorCatalog?: { emptyUntil: number; inflight: Promise<Catalog> | null } })
  .__vectorCatalog ??= { emptyUntil: 0, inflight: null });

// ร้านที่ยังไม่มีสินค้าแสดงหน้าว่าง ไม่มีสินค้าตัวอย่าง — เจ้าของร้านเพิ่มเองจากหลังบ้าน
const emptyCatalog = (): Catalog => ({ products: [], live: isSupabaseConfigured });

/** หลังบ้านแก้สินค้าแล้ว: ลืมผล "ฐานข้อมูลว่าง" ที่จำไว้ */
export function resetCatalogCache(): void {
  state.emptyUntil = 0;
}

/**
 * โหลดแคตตาล็อกสำหรับหน้าร้าน
 * สินค้ามาจาก Supabase เท่านั้น — ฐานข้อมูลว่างหรือเชื่อมต่อไม่ได้ = รายการว่าง
 */
export function loadCatalog(): Promise<Catalog> {
  if (Date.now() < state.emptyUntil) return Promise.resolve(emptyCatalog());
  // หลายส่วนของหน้าเดียวกันเรียกพร้อมกัน ให้ใช้คำขอเดียว
  if (!state.inflight) {
    state.inflight = getBooks()
      .then((rows) => {
        if (rows.length > 0) return { products: rows.map((row, i) => enrich(row, i)), live: true };
        state.emptyUntil = Date.now() + EMPTY_TTL_MS;
        return emptyCatalog();
      })
      .finally(() => { state.inflight = null; });
  }
  return state.inflight;
}

export async function loadProduct(id: string): Promise<Catalog & { product: Product | null }> {
  const { products, live } = await loadCatalog();
  let product = products.find((p) => p.id === id);
  // สินค้าที่ซ่อนจากหน้าร้านแล้ว (published = false) ยังเปิดดูได้จากคำสั่งซื้อเก่า
  if (!product && live) {
    const row = await getBook(id);
    if (row) product = enrich(row);
  }
  return { product: product || null, products, live };
}

/** โฟลเดอร์ภาพตัวอย่างเนื้อหาของสินค้าใน bucket รูปสินค้า (สาธารณะ) */
export const previewFolder = (productId: string): string => `previews/${productId}`;

export interface ProductPreview {
  name: string;
  url: string;
}

/**
 * ภาพตัวอย่างเนื้อหาของสินค้า เรียงตามชื่อไฟล์ — [] เมื่อไม่มี
 * เก็บเป็นไฟล์ในโฟลเดอร์ของสินค้า จึงไม่ต้องมีคอลัมน์เพิ่มในฐานข้อมูล: มีไฟล์ในโฟลเดอร์ = มีภาพตัวอย่าง
 */
export async function loadPreviews(productId: string): Promise<ProductPreview[]> {
  if (!isSupabaseConfigured || !/^[a-z0-9-]+$/.test(productId)) return [];
  try {
    const folder = previewFolder(productId);
    const { data, error } = await supabaseAdmin()
      .storage.from(IMAGE_BUCKET)
      .list(folder, { limit: 12, sortBy: { column: "name", order: "asc" } });
    if (error || !data) return [];
    return data
      .filter((file) => /\.(jpe?g|png|webp)$/i.test(file.name))
      .map((file) => ({ name: file.name, url: `${imageBaseUrl()}${folder}/${encodeURIComponent(file.name)}` }));
  } catch {
    return [];
  }
}

export async function loadCreators(): Promise<Catalog & { creators: Creator[] }> {
  const { products, live } = await loadCatalog();
  const creators = creatorsFrom(products);
  return { creators, products, live };
}

export async function loadCreator(id: string): Promise<Catalog & { creator: Creator | null }> {
  const { creators, products, live } = await loadCreators();
  let creator = creators.find((c) => c.id === id) || null;
  if (creator && live) {
    const shop = await getShop(id);
    if (shop) creator = { ...creator, ...shop, products: creator.products };
  }
  return { creator, products, live };
}
