import { createOrder, payOrder, startCheckout } from "@/lib/apiClient";
import { cartNoOf } from "@/lib/format";
import { forgetOrder, listLocalOrders, rememberOrder, saveReceipt } from "@/lib/localOrders";
import type { CartItem, PayMethod, Receipt, ReceiptLine } from "@/lib/types";

export interface Buyer {
  name: string;
  email: string;
}

export type PurchasePhase = "create" | "charge";

/**
 * การชำระเงินไม่สำเร็จ
 * partial = true เมื่อมีคำสั่งซื้อถูกสร้างไว้แล้ว (ค้างสถานะ PENDING หรือบางรายการจ่ายแล้ว)
 * ผู้ซื้อกลับมาชำระต่อได้จากคลังของฉัน หรือกดลองใหม่ได้โดยไม่เกิดคำสั่งซื้อซ้ำ
 */
export class PurchaseError extends Error {
  constructor(public readonly partial: boolean) {
    super(partial ? "purchase_partial" : "purchase_failed");
    this.name = "PurchaseError";
  }
}

const lineOf = (p: CartItem, orderNo: string, emailStatus: ReceiptLine["emailStatus"]): ReceiptLine => ({
  orderNo,
  bookId: p.id,
  title_th: p.title_th,
  title_en: p.title_en,
  category: p.category,
  cover: p.cover,
  version: p.version,
  amount: p.price,
  emailStatus,
});

/** รวมคำสั่งซื้อเป็นใบเสร็จเดียว แล้วจำไว้ในเบราว์เซอร์ */
function buildReceipt(buyer: Buyer, lines: ReceiptLine[], awaiting: boolean): Receipt {
  const first = lines[0];
  if (!first) throw new Error("empty_cart");
  const receipt: Receipt = {
    id: first.orderNo,
    createdAt: new Date().toISOString(),
    ...buyer,
    orders: lines,
    total: lines.reduce((sum, l) => sum + (l.amount ?? 0), 0),
    ...(awaiting ? { awaiting } : {}),
  };
  saveReceipt(receipt);
  for (const l of lines) rememberOrder({ orderNo: l.orderNo, receiptId: receipt.id });
  return receipt;
}

/** คำสั่งซื้อที่ยังไม่ชำระบนอุปกรณ์นี้ ซึ่งมีสินค้าตรงกับตะกร้านี้พอดี — กดลองใหม่จะไม่เกิดคำสั่งซื้อซ้ำ */
function findOpenCart(items: CartItem[], buyer: Buyer): Map<string, string> | null {
  const pending = listLocalOrders().filter((o) => o.status === "PENDING" && o.email === buyer.email && o.bookId);
  const first = pending.find((o) => o.bookId === items[0]?.id);
  if (!first) return null;
  const lines = pending.filter((o) => cartNoOf(o.orderNo) === cartNoOf(first.orderNo));
  const sameItems = lines.length === items.length && items.every((p) => lines.some((o) => o.bookId === p.id));
  return sameItems ? new Map(lines.map((o) => [o.bookId as string, o.orderNo])) : null;
}

/** สร้างคำสั่งซื้อใบเดียวสำหรับทั้งตะกร้า แล้วจำไว้ในเบราว์เซอร์ */
async function createCart(items: CartItem[], buyer: Buyer): Promise<Map<string, string>> {
  const { orders } = await createOrder({ bookIds: items.map((p) => p.id), ...buyer });
  const orderNos = new Map(orders.map((o) => [o.bookId, o.orderNo]));
  for (const p of items) {
    const orderNo = orderNos.get(p.id);
    if (!orderNo) throw new Error("missing_order");
    rememberOrder({
      orderNo,
      ...buyer,
      bookId: p.id,
      title: p.title_th,
      title_th: p.title_th,
      title_en: p.title_en,
      kind: p.kind,
      cover: p.cover,
      version: p.version,
      amount: p.price,
      status: "PENDING",
    });
  }
  return orderNos;
}

/**
 * ซื้อสินค้าทั้งตะกร้าด้วยการกดชำระครั้งเดียว
 *
 * หนึ่งตะกร้า = หนึ่งคำสั่งซื้อ: เลขคำสั่งซื้อเดียว ยอดรวมเดียว จ่ายครั้งเดียวด้วย QR พร้อมเพย์
 * (ข้างในคำสั่งซื้อมีแถวละหนึ่งสินค้า เพราะไฟล์และสิทธิ์ดาวน์โหลดเป็นของแต่ละชิ้น)
 * ทุกขั้นถูกจำไว้ใน localStorage ทันที
 * เรียกซ้ำได้อย่างปลอดภัย: คำสั่งซื้อที่ยังไม่ชำระของตะกร้าเดิมจะถูกนำกลับมาใช้
 */
export async function purchase(
  items: CartItem[],
  buyer: Buyer,
  onPhase: (phase: PurchasePhase) => void = () => {},
  /** วิธีชำระเงินที่ผู้ซื้อเลือก — ไม่ระบุใช้วิธีเริ่มต้นของร้าน */
  method: PayMethod | null = null
): Promise<Receipt> {
  let touched = false;

  try {
    // 1) สร้างคำสั่งซื้อ (ราคาอ่านจากฐานข้อมูลฝั่ง server เสมอ)
    onPhase("create");
    const reused = findOpenCart(items, buyer);
    let orderNos = reused ?? (await createCart(items, buyer));
    touched = true;

    // 2) ชำระเงิน
    onPhase("charge");
    const lineUp = () =>
      items.map((p) => {
        const orderNo = orderNos.get(p.id);
        if (!orderNo) throw new Error("missing_order");
        return { p, orderNo };
      });
    let ordered = lineUp();

    let checkout;
    try {
      checkout = await startCheckout(ordered.map((o) => o.orderNo), method);
    } catch (error) {
      // คำสั่งซื้อที่จำไว้ไม่อยู่บน server แล้ว (เช่น ร้านลบไป) หรือจ่ายไปแล้ว: ออกคำสั่งซื้อใหม่ให้ตะกร้านี้
      const stale = error instanceof Error && (error.message === "order_not_found" || error.message === "already_paid");
      if (!reused || !stale) throw error;
      for (const orderNo of reused.values()) forgetOrder(orderNo);
      orderNos = await createCart(items, buyer);
      ordered = lineUp();
      checkout = await startCheckout(ordered.map((o) => o.orderNo), method);
    }
    if (checkout.mode !== "mock") {
      // จ่ายด้วย QR พร้อมเพย์ (หรือสินค้าฟรีที่ server จัดส่งให้แล้ว):
      // เก็บใบเสร็จไว้ก่อน หน้าใบเสร็จจะถาม server เองว่าร้านยืนยันรับเงินแล้วจริงไหม
      const receipt = buildReceipt(
        buyer,
        ordered.map(({ p, orderNo }) => lineOf(p, orderNo, null)),
        true
      );
      if (checkout.mode === "free") return receipt;
      if (checkout.mode === "stripe") {
        // หน้าชำระเงินของ Stripe: จ่ายเสร็จ Stripe พากลับมาที่ /pay/return ซึ่งยืนยันและส่งไฟล์เอง
        window.location.assign(checkout.url);
        return new Promise<Receipt>(() => {});
      }
      window.location.assign(`/pay-qr?orders=${encodeURIComponent(checkout.orderNos.join(","))}&receipt=1`);
      return new Promise<Receipt>(() => {}); // กำลังออกจากหน้านี้ไปหน้า QR
    }

    // ทดสอบในเครื่องโดยยังไม่ได้ตั้งพร้อมเพย์: ชำระแบบจำลอง ทีละคำสั่งซื้อ
    const lines: ReceiptLine[] = [];
    for (const { p, orderNo } of ordered) {
      const paid = await payOrder(orderNo);
      rememberOrder({ orderNo, status: paid.status || "PAID" });
      lines.push(lineOf(p, orderNo, paid.emailStatus ?? null));
    }
    return buildReceipt(buyer, lines, false);
  } catch {
    throw new PurchaseError(touched);
  }
}
