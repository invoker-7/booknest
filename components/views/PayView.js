"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/components/LangProvider";
import Cover from "@/components/Cover";
import { Steps } from "@/components/Pieces";
import { Card } from "@/components/Icons";
import { money, pick } from "@/lib/format";
import { findLocalOrder } from "@/lib/localOrders";

/**
 * หน้ายืนยัน + Mock Payment
 * หน้านี้เปิดได้ด้วยเลขคำสั่งซื้ออย่างเดียว จึงไม่แสดงชื่อ/อีเมลจากเซิร์ฟเวอร์
 * จะแสดงก็ต่อเมื่อเป็นเครื่องที่สั่งซื้อเอง (อ่านจาก localStorage)
 */
export default function PayView({ order, book }) {
  const { t, lang } = useLang();
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setMe(findLocalOrder(order.order_no));
  }, [order.order_no]);

  const title = pick(book, "title", lang);

  async function pay() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(order.order_no)}/pay`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "failed");
      router.push(`/success/${order.order_no}`);
    } catch {
      setError(t("genericError"));
      setBusy(false);
    }
  }

  return (
    <>
      <div className="pad">
        <Steps active={2} />

        <div className="card">
          <div
            className="row"
            style={{
              margin: 0, border: "none", background: "none",
              padding: "0 0 12px", borderBottom: "1px solid var(--line)",
            }}
          >
            <div className="thumb"><Cover cover={book.cover} title={title} /></div>
            <div className="body">
              <h4>{title}</h4>
              <p>{money(order.amount, lang)}</p>
            </div>
          </div>

          <dl style={{ margin: "10px 0 0" }}>
            <div className="kv">
              <dt>{t("orderNo")}</dt>
              <dd>{order.order_no}</dd>
            </div>
            {me && (
              <>
                <div className="kv"><dt>{t("name")}</dt><dd>{me.name}</dd></div>
                <div className="kv"><dt>{t("email")}</dt><dd>{me.email}</dd></div>
              </>
            )}
            <div className="kv total">
              <dt>{t("total")}</dt>
              <dd>{money(order.amount, lang)}</dd>
            </div>
          </dl>

          <p className="sub" style={{ fontSize: 12, marginTop: 10 }}>{t("orderCreated")}</p>
        </div>

        <div className="card">
          <h3>{t("payMethod")}</h3>
          <div className="demobox">
            <div className="tag">{t("demoTag")}</div>
            <p>{t("demoBody")}</p>
          </div>
        </div>

        {error && <p className="errtext">{error}</p>}
        <div className="spacer" />
      </div>

      <div className="sticky-cta btn-stack">
        <button className="btn" onClick={pay} disabled={busy}>
          {busy ? t("working") : <><Card /> {t("payNow")}</>}
        </button>
        <Link className="btn ghost" href={`/checkout/${book.id}`}>{t("editBack")}</Link>
      </div>
    </>
  );
}
