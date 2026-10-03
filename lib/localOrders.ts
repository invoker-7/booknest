import type { LocalOrder, Receipt } from "@/lib/types";

/**
 * จำคำสั่งซื้อไว้ในเบราว์เซอร์เพื่อความสะดวกเท่านั้น
 * ไม่ใช่แหล่งข้อมูลจริง — ข้อมูลจริงอยู่ในตาราง orders บน Supabase
 * และการดาวน์โหลด/เปิดดูรายละเอียดยังต้องยืนยันด้วยอีเมลที่ตรงกันเสมอ
 */
const KEY = "bn.localOrders";
const RECEIPTS = "vx.receipts";

/** แจ้ง StoreProvider ในแท็บเดียวกันว่าข้อมูลใน localStorage เปลี่ยน */
export const STORAGE_EVENT = "vx:storage";

function read<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    const arr: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? (arr as T[]) : [];
  } catch {
    return [];
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event(STORAGE_EVENT));
  } catch {}
}

export function listLocalOrders(): LocalOrder[] {
  return read<LocalOrder>(KEY);
}

/** เพิ่มหรืออัปเดตคำสั่งซื้อ (รวมกับข้อมูลเดิมของเลขเดียวกัน) */
export function rememberOrder(entry: LocalOrder): void {
  const all = listLocalOrders();
  const prev = all.find((o) => o.orderNo === entry.orderNo);
  const rest = all.filter((o) => o.orderNo !== entry.orderNo);
  rest.push({ ...prev, ...entry, savedAt: prev?.savedAt || new Date().toISOString() });
  write(KEY, rest.slice(-60));
}

export function findLocalOrder(orderNo: string): LocalOrder | null {
  return listLocalOrders().find((o) => o.orderNo === orderNo) || null;
}

export function clearLocalOrders(): void {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(RECEIPTS);
    window.dispatchEvent(new Event(STORAGE_EVENT));
  } catch {}
}

/* ---------- ใบเสร็จ (รวมหลายคำสั่งซื้อจากการชำระเงินครั้งเดียว) ---------- */
export function saveReceipt(receipt: Receipt): void {
  const all = read<Receipt>(RECEIPTS).filter((r) => r.id !== receipt.id);
  all.push(receipt);
  write(RECEIPTS, all.slice(-30));
}

export function findReceipt(id: string): Receipt | null {
  return read<Receipt>(RECEIPTS).find((r) => r.id === id) || null;
}

/** ใบเสร็จที่มีคำสั่งซื้อนี้อยู่ */
export function findReceiptByOrder(orderNo: string): Receipt | null {
  return read<Receipt>(RECEIPTS).find((r) => r.orders?.some((o) => o.orderNo === orderNo)) || null;
}
