"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLang } from "@/components/LangProvider";
import { useStore } from "@/components/StoreProvider";
import { AdminHead } from "@/components/admin/AdminShell";
import { Check, Download } from "@/components/Icons";
import { Button, Empty, Notice, StatusTag } from "@/components/ui";
import { sendJson } from "@/lib/apiClient";
import { fmtDate, fmtTime, money } from "@/lib/format";
import type { AdminOrder } from "@/lib/types";

interface OrdersAdminViewProps {
  orders: AdminOrder[];
  total: number;
  page: number;
  pageSize: number;
}

export default function OrdersAdminView({ orders, total, page, pageSize }: OrdersAdminViewProps) {
  const { t, lang } = useLang();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const { notify } = useStore();
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState(false);

  /** ได้รับเงินแล้ว (เช่น โอนผ่านพร้อมเพย์): บันทึกการชำระและส่งไฟล์ให้ผู้ซื้อ */
  async function confirm(o: AdminOrder) {
    if (!window.confirm(`${t("admConfirmPaidAsk")}\n\n${o.order_no} · ${money(o.amount, lang)}\n${o.customer_email}`)) return;
    setBusy(o.order_no);
    setError(false);
    try {
      await sendJson(`/api/admin/orders/${encodeURIComponent(o.order_no)}/confirm`);
      notify(t("admConfirmPaidDone"));
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <AdminHead
        title={t("admOrders")}
        sub={`${total.toLocaleString("en-US")} ${t("admOrdersUnit")}`}
        action={
          <a className="btn secondary small" href="/api/admin/export?type=sales&format=csv" download>
            <Download size={16} /> {t("admExportCsv")}
          </a>
        }
      />

      {error && <div className="adm-gap"><Notice tone="error">{t("genericError")}</Notice></div>}

      {orders.length === 0 ? (
        <Empty title={t("admNoOrders")} />
      ) : (
        <div className="adm-card flush tscroll">
          <table className="ltable">
            <thead>
              <tr>
                <th scope="col">{t("colOrder")}</th>
                <th scope="col">{t("colProduct")}</th>
                <th scope="col">{t("admCustomer")}</th>
                <th scope="col">{t("admDate")}</th>
                <th scope="col">{t("colStatus")}</th>
                <th scope="col" className="num">{t("colAmount")}</th>
                <th scope="col"><span className="sr-only">{t("admConfirmPaid")}</span></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.order_no}>
                  <td className="mono">{o.order_no}</td>
                  <td><Link href={`/admin/products/${o.book_id}`} className="linkbtn">{o.title}</Link></td>
                  <td>
                    {o.customer_name}
                    <span className="sub">{o.customer_email}</span>
                  </td>
                  <td className="mono">{fmtDate(o.created_at, lang)} {fmtTime(o.created_at)}</td>
                  <td>
                    <StatusTag status={o.status} slip={o.slip} />
                    {o.status === "PENDING" && !o.slip && <span className="sub">{t("admNoSlip")}</span>}
                  </td>
                  <td className="num">{money(o.amount, lang)}</td>
                  <td>
                    {o.status === "PENDING" && (
                      <div className="acts">
                        {o.slip && (
                          <a className="btn ghost small" href={`/api/admin/orders/${encodeURIComponent(o.order_no)}/slip`} target="_blank" rel="noreferrer">
                            {t("admViewSlip")}
                          </a>
                        )}
                        <Button variant={o.slip ? "success" : "secondary"} size="small" onClick={() => confirm(o)} loading={busy === o.order_no} loadingText={t("loading")}>
                          <Check size={16} /> {t("admConfirmPaid")}
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav className="pager mono" aria-label="Pagination">
          {page > 1 ? <Link href={`/admin/orders?page=${page - 1}`}>← {t("admPrev")}</Link> : <span />}
          <span>{page} / {pages}</span>
          {page < pages ? <Link href={`/admin/orders?page=${page + 1}`}>{t("admNext")} →</Link> : <span />}
        </nav>
      )}
    </>
  );
}
