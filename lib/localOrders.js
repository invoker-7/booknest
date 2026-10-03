/**
 * จำคำสั่งซื้อไว้ในเบราว์เซอร์เพื่อความสะดวกเท่านั้น
 * ไม่ใช่แหล่งข้อมูลจริง — ข้อมูลจริงอยู่ในตาราง orders บน Supabase
 * และการดาวน์โหลด/เปิดดูรายละเอียดยังต้องยืนยันด้วยอีเมลที่ตรงกันเสมอ
 *
 * entry: { orderNo, name, email, title, amount, bookId?, title_th?, title_en?,
 *          kind?, version?, status?, receiptId?, savedAt }
 */
const KEY = "bn.localOrders";
const RECEIPTS = "vx.receipts";

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event("vx:storage"));
  } catch {}
}

export function listLocalOrders() {
  return read(KEY);
}

export function rememberOrder(entry) {
  const all = listLocalOrders();
  const prev = all.find((o) => o.orderNo === entry.orderNo);
  const rest = all.filter((o) => o.orderNo !== entry.orderNo);
  rest.push({ ...prev, ...entry, savedAt: prev?.savedAt || new Date().toISOString() });
  write(KEY, rest.slice(-60));
}

export function findLocalOrder(orderNo) {
  return listLocalOrders().find((o) => o.orderNo === orderNo) || null;
}

export function clearLocalOrders() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(RECEIPTS);
    window.dispatchEvent(new Event("vx:storage"));
  } catch {}
}

/* ---------- ใบเสร็จ (รวมหลายคำสั่งซื้อจากการชำระเงินครั้งเดียว) ---------- */
export function saveReceipt(receipt) {
  const all = read(RECEIPTS).filter((r) => r.id !== receipt.id);
  all.push(receipt);
  write(RECEIPTS, all.slice(-30));
}

export function findReceipt(id) {
  return read(RECEIPTS).find((r) => r.id === id) || null;
}

/** ใบเสร็จที่มีคำสั่งซื้อนี้อยู่ */
export function findReceiptByOrder(orderNo) {
  return read(RECEIPTS).find((r) => r.orders?.some((o) => o.orderNo === orderNo)) || null;
}
