/**
 * จำเลขคำสั่งซื้อไว้ในเบราว์เซอร์เพื่อความสะดวกเท่านั้น
 * ไม่ใช่แหล่งข้อมูลจริง — ข้อมูลจริงอยู่ในตาราง orders บน Supabase
 * และการเปิดดูรายละเอียดยังต้องยืนยันด้วยอีเมลที่ตรงกันเสมอ
 */
const KEY = "bn.localOrders";

export function listLocalOrders() {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function rememberOrder(entry) {
  try {
    const all = listLocalOrders().filter((o) => o.orderNo !== entry.orderNo);
    all.push({ ...entry, savedAt: new Date().toISOString() });
    localStorage.setItem(KEY, JSON.stringify(all.slice(-30)));
  } catch {}
}

export function findLocalOrder(orderNo) {
  return listLocalOrders().find((o) => o.orderNo === orderNo) || null;
}

export function clearLocalOrders() {
  try { localStorage.removeItem(KEY); } catch {}
}
