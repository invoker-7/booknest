"use client";

import Link from "next/link";
import { useLang } from "@/components/LangProvider";
import { AdminHead } from "@/components/admin/AdminShell";
import SalesChart from "@/components/admin/SalesChart";
import { Download } from "@/components/Icons";
import { fmtDate, fmtTime, money } from "@/lib/format";
import type { TKey } from "@/lib/i18n";
import type { ActivityKind, AdminReport } from "@/lib/types";

const EVENT_LABEL: Record<ActivityKind, TKey> = {
  order_created: "admLogOrderCreated",
  order_paid: "admLogOrderPaid",
  order_delivered: "admLogOrderDelivered",
  email_failed: "admLogEmailFailed",
  member_joined: "admLogMemberJoined",
};

const EVENT_TONE: Record<ActivityKind, string> = {
  order_created: "neutral",
  order_paid: "blue",
  order_delivered: "blue",
  email_failed: "red",
  member_joined: "amber",
};

/** รายงาน: สรุปยอดตามช่วงเวลา ยอดขายรายวัน สินค้าขายดี และบันทึกกิจกรรมล่าสุด */
export default function ReportsView({ periods, report }: { periods: readonly number[]; report: AdminReport }) {
  const { t, lang } = useLang();
  const pct = (value: number | null) =>
    value === null ? t("admNoCompare") : `${value >= 0 ? "▲" : "▼"} ${Math.abs(value).toLocaleString("en-US")}%`;

  const kpis = [
    { label: t("admSales"), value: money(report.sales, lang), delta: report.salesChange },
    { label: t("admTotalOrders"), value: report.orders.toLocaleString("en-US"), delta: report.ordersChange },
    { label: t("admTotalCustomers"), value: report.customers.toLocaleString("en-US"), delta: report.customersChange },
    { label: t("admRepAverage"), value: money(report.orders ? Math.round(report.sales / report.orders) : 0, lang) },
  ];

  // เฉพาะวันที่มียอด ใหม่สุดก่อน — วันที่ไม่มียอดดูได้จากกราฟ
  const activeDays = report.daily.filter((d) => d.orders > 0).reverse();

  return (
    <>
      <AdminHead
        title={t("admReports")}
        sub={t("admReportsSub")}
        action={
          <>
            <a className="btn secondary small" href="/api/admin/export?type=sales&format=csv" download>
              <Download size={16} /> CSV
            </a>
            <a className="btn secondary small" href="/api/admin/export?type=sales&format=xlsx" download>
              <Download size={16} /> Excel
            </a>
          </>
        }
      />

      <nav className="rawtabs" aria-label={t("admRepPeriod")}>
        {periods.map((d) => (
          <Link key={d} href={`/admin/reports?days=${d}`} className="mono" aria-current={d === report.days ? "page" : undefined}>
            {t("admRepDays").replace("{n}", String(d))}
          </Link>
        ))}
      </nav>

      <dl className="kpis">
        {kpis.map((k) => (
          <div className="kpi" key={k.label}>
            <dt>{k.label}</dt>
            <dd>{k.value}</dd>
            {"delta" in k && (
              <span className={`kpi-delta ${k.delta === null || k.delta === undefined ? "muted" : k.delta >= 0 ? "up" : "down"}`}>
                {pct(k.delta ?? null)}
              </span>
            )}
          </div>
        ))}
      </dl>

      <div className="adm-grid">
        <section className="adm-card" aria-labelledby="rep-sales">
          <header>
            <h2 id="rep-sales">{t("admSalesOverview")}</h2>
            <span className="mono muted">{t("admRepDays").replace("{n}", String(report.days))}</span>
          </header>
          <SalesChart data={report.daily} />
        </section>

        <section className="adm-card" aria-labelledby="rep-top">
          <header>
            <h2 id="rep-top">{t("admTopProducts")}</h2>
            <span className="mono muted">{t("admRepAllTime")}</span>
          </header>
          {report.top.length === 0 ? (
            <p className="muted">{t("admNoSales")}</p>
          ) : (
            <ol className="toplist">
              {report.top.map((p, i) => (
                <li key={p.id}>
                  <span className="mono muted">{String(i + 1).padStart(2, "0")}</span>
                  <Link href={`/admin/products/${p.id}`}>{p.title}</Link>
                  <span className="mono">{p.sold}</span>
                  <span className="num">{money(p.revenue, lang)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <div className="adm-grid even">
        <section className="adm-card" aria-labelledby="rep-days">
          <header><h2 id="rep-days">{t("admRepByDay")}</h2></header>
          {activeDays.length === 0 ? (
            <p className="muted">{t("admNoSales")}</p>
          ) : (
            <div className="tscroll replist">
              <table className="ltable">
                <thead>
                  <tr>
                    <th scope="col">{t("admRepDate")}</th>
                    <th scope="col" className="num">{t("admOrders")}</th>
                    <th scope="col" className="num">{t("admSales")}</th>
                  </tr>
                </thead>
                <tbody>
                  {activeDays.map((d) => (
                    <tr key={d.day}>
                      <td className="mono">{fmtDate(d.day, lang)}</td>
                      <td className="num">{d.orders}</td>
                      <td className="num">{money(d.sales, lang)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="adm-card" aria-labelledby="rep-log">
          <header>
            <h2 id="rep-log">{t("admLog")}</h2>
            <span className="mono muted">{t("admLogLatest").replace("{n}", String(report.activity.length))}</span>
          </header>
          {report.activity.length === 0 ? (
            <p className="muted">{t("admLogEmpty")}</p>
          ) : (
            <ol className="loglist replist">
              {report.activity.map((e, i) => (
                <li key={`${e.at}-${e.kind}-${i}`}>
                  <time className="mono muted" dateTime={e.at}>{fmtDate(e.at, lang)} {fmtTime(e.at)}</time>
                  <span className={`tag ${EVENT_TONE[e.kind]}`}>{t(EVENT_LABEL[e.kind])}</span>
                  <span className="log-what">
                    {e.ref && <span className="mono">{e.ref}</span>} {e.who}
                    {e.amount !== null && <span className="muted"> · {money(e.amount, lang)}</span>}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  );
}
