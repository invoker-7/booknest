import { createOrder, payOrder } from "@/lib/apiClient";
import { listLocalOrders, rememberOrder, saveReceipt } from "@/lib/localOrders";
import type { CartItem, Receipt, ReceiptLine } from "@/lib/types";

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

/**
 * ซื้อสินค้าทั้งตะกร้าด้วยการกดชำระครั้งเดียว
 *
 * backend รับคำสั่งซื้อทีละสินค้า จึงสร้างคำสั่งซื้อหนึ่งรายการต่อสินค้าหนึ่งชิ้น
 * แล้วรวมเป็นใบเสร็จเดียว ทุกขั้นถูกจำไว้ใน localStorage ทันที
 * เรียกซ้ำได้อย่างปลอดภัย: คำสั่งซื้อที่ยังไม่ชำระของสินค้าเดิมจะถูกนำกลับมาใช้
 */
export async function purchase(
  items: CartItem[],
  buyer: Buyer,
  onPhase: (phase: PurchasePhase) => void = () => {}
): Promise<Receipt> {
  const orderNos = new Map<string, string>();
  let touched = false;

  try {
    // 1) สร้างคำสั่งซื้อ (ราคาอ่านจากฐานข้อมูลฝั่ง server เสมอ)
    onPhase("create");
    const known = listLocalOrders();
    for (const p of items) {
      const open = known.find(
        (o) => o.bookId === p.id && o.status === "PENDING" && o.email === buyer.email
      );
      if (open) {
        orderNos.set(p.id, open.orderNo);
        touched = true;
        continue;
      }
      const { orderNo } = await createOrder({ bookId: p.id, ...buyer });
      orderNos.set(p.id, orderNo);
      touched = true;
      rememberOrder({
        orderNo,
        ...buyer,
        bookId: p.id,
        title: p.title_th,
        title_th: p.title_th,
        title_en: p.title_en,
        kind: p.kind,
        version: p.version,
        amount: p.price,
        status: "PENDING",
      });
    }

    // 2) ชำระเงิน (จำลอง)
    onPhase("charge");
    const lines: ReceiptLine[] = [];
    for (const p of items) {
      const orderNo = orderNos.get(p.id);
      if (!orderNo) throw new Error("missing_order");
      const paid = await payOrder(orderNo);
      rememberOrder({ orderNo, status: paid.status || "PAID" });
      lines.push({
        orderNo,
        bookId: p.id,
        title_th: p.title_th,
        title_en: p.title_en,
        category: p.category,
        version: p.version,
        amount: p.price,
        emailStatus: paid.emailStatus ?? null,
      });
    }

    const first = lines[0];
    if (!first) throw new Error("empty_cart");

    const receipt: Receipt = {
      id: first.orderNo,
      createdAt: new Date().toISOString(),
      ...buyer,
      orders: lines,
      total: lines.reduce((sum, l) => sum + (l.amount ?? 0), 0),
    };
    saveReceipt(receipt);
    for (const l of lines) rememberOrder({ orderNo: l.orderNo, receiptId: receipt.id });
    return receipt;
  } catch {
    throw new PurchaseError(touched);
  }
}
