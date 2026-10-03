/**
 * Type กลางของทั้งโปรเจกต์
 * - *Row  = รูปร่างของแถวในฐานข้อมูล Supabase
 * - ที่เหลือ = รูปร่างที่หน้าเว็บใช้ (หลังเติม metadata แล้ว)
 */

export type Lang = "th" | "en";

export type Category =
  | "notion"
  | "uikit"
  | "design"
  | "devtool"
  | "productivity"
  | "template"
  | "guide"
  | "asset";

export type Platform = "notion" | "figma" | "code" | "pdf" | "adobe";
export type License = "personal" | "commercial" | "mit";
export type OrderStatus = "PENDING" | "PAID" | "PROCESSING" | "COMPLETED";
export type EmailStatus = "sent" | "mock" | "failed";
export type SortKey = "featured" | "newest" | "priceAsc" | "priceDesc" | "rating";
export type PriceBandId = "u200" | "200-400" | "o400";
export type ArticleType = "story" | "note" | "guide" | "article" | "update";

export interface ShopRef {
  id: string;
  name: string;
}

/** ตาราง shops */
export interface ShopRow extends ShopRef {
  bio_th?: string | null;
  bio_en?: string | null;
  created_at?: string | null;
}

/** ตาราง books (สินค้าดิจิทัล) — ฟิลด์ท้าย ๆ เป็นค่าที่ข้อมูลตัวอย่างกำหนดเองได้ */
export interface BookRow {
  id: string;
  title_th: string;
  title_en: string;
  short_th: string;
  short_en: string;
  long_th: string;
  long_en: string;
  author_th: string;
  author_en: string;
  price: number;
  list_price: number;
  rating?: number | string | null;
  reviews?: number | null;
  pages?: number | null;
  file_size?: string | null;
  cover?: string | null;
  file_path?: string;
  sort?: number | null;
  created_at?: string | null;
  kind?: string | null;
  shop_id?: string | null;
  published?: boolean | null;
  shop?: ShopRef | null;
  platform?: Platform;
  format?: string;
  license?: License;
  version?: string;
  updated?: string | null;
}

/** สินค้าที่เติม metadata แล้ว พร้อมแสดงผล */
export interface Product extends Omit<BookRow, "rating" | "reviews" | "platform" | "format" | "license" | "version" | "updated"> {
  category: Category;
  platform: Platform;
  format: string;
  license: License;
  version: string;
  updated: string | null;
  productNo: string;
  creatorId: string | null;
  creatorName: string | null;
  rating: number;
  reviews: number;
  sample?: boolean;
}

/** ข้อมูลสินค้าย่อที่เก็บในตะกร้า / รายการที่บันทึก (localStorage) */
export interface CartItem {
  id: string;
  title_th: string;
  title_en: string;
  price: number;
  list_price: number;
  kind?: string | null;
  category: Category;
  version: string;
  license: License;
  format: string;
  productNo: string;
  creatorName: string | null;
  sample: boolean;
}

/** ข้อมูลเพิ่มเติมของครีเอเตอร์ (มีในข้อมูลตัวอย่าง) */
export interface CreatorProfile extends ShopRow {
  since?: number;
  location?: string;
  followers?: number;
  spec_th?: string;
  spec_en?: string;
}

export interface Creator extends CreatorProfile {
  products: Product[];
  productCount: number;
  reviews: number;
  rating: number;
}

/** ตาราง orders */
export interface OrderRow {
  id?: string;
  order_no: string;
  book_id: string;
  customer_name: string;
  customer_email: string;
  amount: number;
  status: OrderStatus;
  paid_at?: string | null;
  email_sent?: boolean | null;
  email_note?: string | null;
  delivered_at?: string | null;
  created_at: string;
}

export interface OrderWithBook extends OrderRow {
  book: BookRow;
}

/** ข้อมูลคำสั่งซื้อที่ส่งให้หน้าเว็บได้โดยไม่มีข้อมูลส่วนบุคคล */
export interface SafeOrder {
  order_no: string;
  amount: number;
  status: OrderStatus;
  created_at: string;
  email_sent?: boolean | null;
  email_note?: string | null;
  masked_email?: string;
}

/** ผลของ POST /api/orders/lookup */
export interface LookupOrder {
  order_no: string;
  status: OrderStatus;
  amount: number;
  customer_name: string;
  customer_email: string;
  created_at: string;
  paid_at?: string | null;
  delivered_at?: string | null;
  email_sent?: boolean | null;
  book: BookRow;
}

/** คำสั่งซื้อที่จำไว้ในเบราว์เซอร์ */
export interface LocalOrder {
  orderNo: string;
  name?: string;
  email?: string;
  title?: string;
  title_th?: string;
  title_en?: string;
  amount?: number;
  bookId?: string;
  kind?: string | null;
  version?: string;
  status?: OrderStatus;
  receiptId?: string;
  purchasedAt?: string | null;
  savedAt?: string;
}

export interface ReceiptLine {
  orderNo: string;
  bookId?: string;
  title_th?: string;
  title_en?: string;
  category?: Category;
  version?: string;
  amount?: number;
  emailStatus?: EmailStatus | null;
}

/** ใบเสร็จ: รวมหลายคำสั่งซื้อจากการชำระเงินครั้งเดียว */
export interface Receipt {
  id: string;
  createdAt?: string;
  name?: string;
  email: string;
  orders: ReceiptLine[];
  total?: number;
}

export interface Article {
  slug: string;
  type: ArticleType;
  date: string;
  read: number;
  product: string | null;
  author: string;
  title_th: string;
  title_en: string;
  dek_th: string;
  dek_en: string;
  body_th: string[];
  body_en: string[];
}

export interface SampleReview {
  name: string;
  role_th: string;
  role_en: string;
  rating: number;
  date: string;
  th: string;
  en: string;
}

export interface CatalogFilters {
  q?: string;
  cats?: Category[];
  plats?: Platform[];
  price?: PriceBandId | "";
  rating?: number;
}
