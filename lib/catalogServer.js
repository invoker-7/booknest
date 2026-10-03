import "server-only";
import { getBooks, getBook, getShop } from "@/lib/supabase";
import { enrich, creatorsFrom, SAMPLE_PRODUCTS, SAMPLE_CREATORS } from "@/lib/catalog";

// ฐานข้อมูลว่างหรือเชื่อมต่อไม่ได้: จำผลไว้ชั่วครู่ ไม่ต้องรอ timeout ซ้ำทุกหน้า
const EMPTY_TTL_MS = 120_000;
let emptyUntil = 0;
let inflight = null;

const sampleCatalog = () => ({
  products: SAMPLE_PRODUCTS.map((p, i) => ({ ...enrich(p, i), sample: true })),
  live: false,
});

/**
 * โหลดแคตตาล็อกสำหรับหน้าร้าน
 * live = true  -> สินค้าจริงจาก Supabase
 * live = false -> ฐานข้อมูลว่างหรือเชื่อมต่อไม่ได้ ใช้ข้อมูลตัวอย่าง (สั่งซื้อไม่ได้)
 */
export function loadCatalog() {
  if (Date.now() < emptyUntil) return Promise.resolve(sampleCatalog());
  // หลายส่วนของหน้าเดียวกันเรียกพร้อมกัน ให้ใช้คำขอเดียว
  if (!inflight) {
    inflight = getBooks()
      .then((rows) => {
        if (rows.length > 0) return { products: rows.map(enrich), live: true };
        emptyUntil = Date.now() + EMPTY_TTL_MS;
        return sampleCatalog();
      })
      .finally(() => { inflight = null; });
  }
  return inflight;
}

export async function loadProduct(id) {
  const { products, live } = await loadCatalog();
  let product = products.find((p) => p.id === id);
  // สินค้าที่ซ่อนจากหน้าร้านแล้ว (published = false) ยังเปิดดูได้จากคำสั่งซื้อเก่า
  if (!product && live) {
    const row = await getBook(id);
    if (row) product = enrich(row);
  }
  return { product: product || null, products, live };
}

export async function loadCreators() {
  const { products, live } = await loadCatalog();
  const creators = creatorsFrom(products, live ? [] : SAMPLE_CREATORS);
  return { creators, products, live };
}

export async function loadCreator(id) {
  const { creators, products, live } = await loadCreators();
  let creator = creators.find((c) => c.id === id) || null;
  if (creator && live) {
    const shop = await getShop(id);
    if (shop) creator = { ...creator, ...shop, products: creator.products };
  }
  return { creator, products, live };
}
