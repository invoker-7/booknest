"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLang } from "@/components/LangProvider";
import ProductArt from "@/components/ProductArt";
import { Lock } from "@/components/Icons";
import { Button, LinkButton, Steps, Notice, PayNote } from "@/components/ui";
import { categoryOf } from "@/lib/catalog";
import { money, pick } from "@/lib/format";
import { payOrder, startCheckout } from "@/lib/apiClient";
import { findLocalOrder, rememberOrder } from "@/lib/localOrders";
import type { BookRow, LocalOrder, PayOptions, SafeOrder } from "@/lib/types";

/**
 * ชำระเงินคำสั่งซื้อที่ค้างอยู่ (PENDING) — เข้ามาจากคลังของฉัน
 * หน้านี้เปิดได้ด้วยเลขคำสั่งซื้ออย่างเดียว จึงไม่แสดงชื่อ/อีเมลจากเซิร์ฟเวอร์
 * จะแสดงก็ต่อเมื่อเป็นเครื่องที่สั่งซื้อเอง (อ่านจาก localStorage)
 */
export default function PayView({ order, book, pay: payOptions }: { order: SafeOrder; book: BookRow; pay: PayOptions }) {
  const { t, lang } = useLang();
  const router = useRouter();
  const [me, setMe] = useState<LocalOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const closed = !payOptions.method;

  useEffect(() => {
    setMe(findLocalOrder(order.order_no));
  }, [order.order_no]);

  const title = pick(book, "title", lang);

  async function pay() {
    setBusy(true);
    setError("");
    try {
      const checkout = await startCheckout([order.order_no]);
      if (checkout.mode === "promptpay") {
        router.push(`/pay-qr?orders=${encodeURIComponent(order.order_no)}`);
        return;
      }
      // "free" = server จัดส่งให้แล้ว, "mock" = ทดสอบในเครื่องโดยยังไม่ได้ตั้งพร้อมเพย์
      const paid = checkout.mode === "free" ? { status: "COMPLETED" as const } : await payOrder(order.order_no);
      if (me) rememberOrder({ orderNo: order.order_no, status: paid.status || "PAID", bookId: book.id });
      router.push(`/success/${order.order_no}`);
    } catch {
      setError(t("payError"));
      setBusy(false);
    }
  }

  return (
    <div className="wrap page-pad">
      <Steps active={2} />
      <div className="co-grid">
        <div>
          <div className="panel">
            <div className="panel-head">
              <div>
                <span className="panel-n">{order.order_no}</span>
                <h2>{t("resumeTitle")}</h2>
                <p>{t("resumeSub")}</p>
              </div>
            </div>
            {closed ? <Notice tone="warn" title={t("previewBlockedTitle")}>{t("previewBlockedBody")}</Notice> : <PayNote pay={payOptions} />}
            {error && <div style={{ marginTop: 16 }}><Notice tone="error">{error}</Notice></div>}
            <div style={{ marginTop: 20, display: "grid", gap: 8 }}>
              <Button onClick={pay} loading={busy} loadingText={t("paying")} disabled={closed} block>
                <Lock size={18} /> {error ? t("retry") : `${t("payNow")} ${money(order.amount, lang)}`}
              </Button>
              <LinkButton href="/library" variant="ghost" block>{t("back")}</LinkButton>
            </div>
          </div>
        </div>

        <aside className="co-aside" aria-label={t("orderSummary")}>
          <h2>{t("orderSummary")}</h2>
          <ul className="co-mini">
            <li>
              <div className="thumb"><ProductArt p={{ cover: book.cover, category: categoryOf(book) }} bare sizes="120px" /></div>
              <div>
                <span className="mono">{order.order_no}</span>
                {title}
              </div>
              <span>{money(order.amount, lang)}</span>
            </li>
          </ul>
          <dl className="co-lines">
            {me && <div><dt>{t("email")}</dt><dd>{me.email}</dd></div>}
            <div className="total"><dt>{t("total")}</dt><dd>{money(order.amount, lang)}</dd></div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
