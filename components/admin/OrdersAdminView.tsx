"use client";

import Link from "next/link";
import { useLang } from "@/components/LangProvider";
import { AdminHead } from "@/components/admin/AdminShell";
import { Download } from "@/components/Icons";
import { Empty, StatusTag } from "@/components/ui";
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
                  <td><StatusTag status={o.status} /></td>
                  <td className="num">{money(o.amount, lang)}</td>
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
