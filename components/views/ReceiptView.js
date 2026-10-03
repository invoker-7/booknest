"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/components/LangProvider";
import { Mark, Print } from "@/components/Icons";
import { Button, LinkButton, Empty } from "@/components/ui";
import { fmtDate, fmtTime, money, pick } from "@/lib/format";
import { findLocalOrder, findReceipt, findReceiptByOrder } from "@/lib/localOrders";

function load(id) {
  const r = findReceipt(id) || findReceiptByOrder(id);
  if (r) return r;
  // คำสั่งซื้อเดี่ยวที่ไม่มีใบเสร็จรวม (เช่น ชำระจากหน้าคำสั่งซื้อค้าง)
  const o = findLocalOrder(id);
  if (!o || !o.status || o.status === "PENDING") return null;
  return {
    id: o.orderNo, createdAt: o.savedAt, name: o.name, email: o.email, total: o.amount,
    orders: [{ orderNo: o.orderNo, title_th: o.title_th || o.title, title_en: o.title_en || o.title, version: o.version, amount: o.amount }],
  };
}

export default function ReceiptView({ id }) {
  const { t, lang } = useLang();
  const [r, setR] = useState(undefined);

  useEffect(() => setR(load(id)), [id]);

  if (r === undefined) return <div className="wrap page-pad" aria-busy="true" />;
  if (!r) {
    return (
      <div className="wrap page-pad">
        <Empty title={t("receiptMissing")} action={<LinkButton href="/library">{t("viewLibrary")}</LinkButton>} />
      </div>
    );
  }

  return (
    <div className="wrap page-pad">
      <article className="receipt">
        <header className="receipt-head">
          <div>
            <span className="wordmark"><Mark /> <span>VECTOR</span></span>
            <h1>{t("receipt")}</h1>
          </div>
          <span className="tag blue"><span className="tag-dot" /> {t("st_PAID")}</span>
        </header>

        <dl className="receipt-meta">
          <div><dt>{t("receiptNo")}</dt><dd className="mono">{r.id.replace(/^ORD/, "RCT")}</dd></div>
          <div><dt>{t("issued")}</dt><dd>{fmtDate(r.createdAt, lang)} · {fmtTime(r.createdAt)}</dd></div>
          <div><dt>{t("paymentMethod")}</dt><dd>{t("paymentDemo")}</dd></div>
          <div><dt>{t("billedTo")}</dt><dd>{r.name}<br />{r.email}</dd></div>
        </dl>

        <table className="rtable">
          <thead>
            <tr>
              <th scope="col">{t("item")}</th>
              <th scope="col">{t("orderNo")}</th>
              <th scope="col" className="num">{t("amount")}</th>
            </tr>
          </thead>
          <tbody>
            {r.orders.map((o) => (
              <tr key={o.orderNo}>
                <td>{pick(o, "title", lang)}{o.version ? <span className="muted mono"> · V{o.version}</span> : null}</td>
                <td className="mono">{o.orderNo}</td>
                <td className="num">{money(o.amount, lang)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}>{t("total")}</td>
              <td className="num">{money(r.total, lang)}</td>
            </tr>
          </tfoot>
        </table>

        <p className="receipt-foot">{t("demoReceipt")}</p>
      </article>

      <div className="receipt-actions">
        <Button onClick={() => window.print()}><Print size={18} /> {t("print")}</Button>
        <LinkButton href="/library" variant="secondary">{t("viewLibrary")}</LinkButton>
      </div>
    </div>
  );
}
