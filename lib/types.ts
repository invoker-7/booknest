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
export type UserRole = "customer" | "admin";
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

/** ตาราง books (สินค้าดิจิทัล) */
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
}

/** ข้อมูลเพิ่มเติมของครีเอเตอร์ */
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
  user_id?: string | null;
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
  /** ยังไม่ได้จ่าย แต่แนบสลิปแล้ว รอร้านตรวจ */
  slip?: boolean;
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
  /** ยังไม่ได้จ่าย แต่แนบสลิปแล้ว รอร้านตรวจ */
  slip?: boolean;
  receiptId?: string;
  purchasedAt?: string | null;
  savedAt?: string;
  /** true = ดึงมาจากบัญชีที่ล็อกอิน (ลบออกจากอุปกรณ์เมื่อออกจากระบบ) */
  account?: boolean;
}

/** วิธีชำระเงิน: QR พร้อมเพย์ (ร้านยืนยันรับเงินเอง) หรือแบบจำลองตอนทดสอบในเครื่อง */
export type PayMethod = "promptpay" | "mock";

/** วิธีชำระเงินที่ร้านใช้อยู่ ส่งให้หน้าเว็บแสดง */
export interface PayOptions {
  /** null = ร้านยังไม่ได้เปิดรับชำระเงิน (ปิดการสั่งซื้อ) */
  method: PayMethod | null;
  /** เบอร์พร้อมเพย์ของร้านแบบปิดบางส่วน */
  promptPayId: string;
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
  /** true = ส่งผู้ซื้อไปหน้า QR พร้อมเพย์แล้ว ยังไม่ได้ยืนยันกับ server ว่าร้านรับเงินแล้ว */
  awaiting?: boolean;
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

export interface CatalogFilters {
  q?: string;
  cats?: Category[];
  plats?: Platform[];
  price?: PriceBandId | "";
  rating?: number;
}

/* ---------- สมาชิก ---------- */

/** ผู้ใช้ที่ล็อกอินอยู่ (ส่งให้หน้าเว็บได้) */
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
}

/** คำสั่งซื้อของบัญชีที่ล็อกอิน — GET /api/account/orders */
export interface AccountOrder {
  order_no: string;
  status: OrderStatus;
  amount: number;
  customer_name: string;
  customer_email: string;
  created_at: string;
  paid_at?: string | null;
  /** ยังไม่ได้จ่าย แต่แนบสลิปแล้ว รอร้านตรวจ */
  slip?: boolean;
  book: Pick<BookRow, "id" | "title_th" | "title_en" | "kind" | "version"> | null;
}

/* ---------- หลังบ้าน ---------- */

/** ข้อมูลสินค้าที่ฟอร์มหลังบ้านส่งมา */
export interface ProductInput {
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
  kind: Category;
  version: string;
  license: License | null;
  file_path: string;
  file_size: string;
  /** URL รูปสินค้าใน bucket สาธารณะ — null = ใช้ภาพแบบร่างตามหมวดหมู่ */
  cover: string | null;
  published: boolean;
  sort: number;
  shop_id: string | null;
}

export interface AdminOrder {
  order_no: string;
  status: OrderStatus;
  amount: number;
  customer_name: string;
  customer_email: string;
  created_at: string;
  paid_at: string | null;
  book_id: string;
  title: string;
  /** ยังไม่ได้จ่าย แต่ผู้ซื้อแนบสลิปแล้ว */
  slip?: boolean;
}

export interface AdminCustomer {
  email: string;
  name: string;
  /** true = มีบัญชีสมาชิก, false = ซื้อแบบไม่ล็อกอิน */
  member: boolean;
  role: UserRole | null;
  joined: string | null;
  orders: number;
  spent: number;
}

/** สมาชิกหนึ่งบัญชีในหน้าจัดการผู้ใช้ */
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  joined: string | null;
  /** เป็นผู้ดูแลจาก ADMIN_EMAILS — เปลี่ยนสิทธิ์หรือลบจากหน้าเว็บไม่ได้ */
  locked: boolean;
}

export interface DailyPoint {
  /** YYYY-MM-DD (เวลาไทย) */
  day: string;
  sales: number;
  orders: number;
}

export type ActivityKind = "order_created" | "order_paid" | "order_delivered" | "email_failed" | "member_joined";

/** หนึ่งเหตุการณ์ในบันทึกกิจกรรม (ประกอบจากเวลาที่บันทึกไว้ในคำสั่งซื้อและบัญชีสมาชิก) */
export interface ActivityEvent {
  at: string;
  kind: ActivityKind;
  /** เลขคำสั่งซื้อ — null สำหรับเหตุการณ์ของสมาชิก */
  ref: string | null;
  /** อีเมลของลูกค้าหรือสมาชิก */
  who: string;
  amount: number | null;
}

/** รายงานของช่วง N วันล่าสุด — ตัวเลขเป็นของช่วงนั้น เทียบกับ N วันก่อนหน้า */
export interface AdminReport {
  days: number;
  sales: number;
  orders: number;
  customers: number;
  salesChange: number | null;
  ordersChange: number | null;
  customersChange: number | null;
  daily: DailyPoint[];
  /** สินค้าขายดีตลอดเวลา (ไม่จำกัดช่วง) */
  top: AdminStats["top"];
  activity: ActivityEvent[];
}

export interface AdminStats {
  generatedAt: string;
  sales: number;
  orders: number;
  customers: number;
  products: number;
  /** เปลี่ยนแปลงเทียบ 30 วันก่อนหน้า (%), null เมื่อไม่มีฐานเปรียบเทียบ */
  salesChange: number | null;
  ordersChange: number | null;
  customersChange: number | null;
  daily: DailyPoint[];
  top: { id: string; title: string; kind: string | null; sold: number; revenue: number }[];
  recent: AdminOrder[];
}

export interface ImportResult {
  total: number;
  created: number;
  updated: number;
  errors: { row: number; message: string }[];
}
