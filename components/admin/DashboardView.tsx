"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLang } from "@/components/LangProvider";
import { AdminHead } from "@/components/admin/AdminShell";
import SalesChart from "@/components/admin/SalesChart";
import { StatusTag } from "@/components/ui";
import { fmtDate, fmtTime, money } from "@/lib/format";
import type { AdminStats } from "@/lib/types";

// "real-time" แบบถามซ้ำ: เบาและไม่ต้องเปิด connection ค้างไว้ — หยุดเมื่อแท็บไม่ได้เปิดดูอยู่
const REFRESH_MS = 15_000;

function Delta({ value }: { value: number | null }) {
  const { t } = useLang();
  if (value === null) return <span className="kpi-delta muted">{t("admNoCompare")}</span>;
  const up = value >= 0;
  return (
    <span className={`kpi-delta ${up ? "up" : "down"}`}>
      {up ? "▲" : "▼"} {Math.abs(value).toLocaleString("en-US")}% <span className="muted">{t("admVsPrev")}</span>
    </span>
  );
}

export default function DashboardView({ initial }: { initial: AdminStats }) {
  const { t, lang } = useLang();
  const [stats, setStats] = useState(initial);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/admin/stats", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const next = (await res.json()) as AdminStats;
        if (alive) { setStats(next); setStale(false); }
      } catch {
        if (alive) setStale(true);
      }
    };
    const timer = setInterval(load, REFRESH_MS);
    document.addEventListener("visibilitychange", load);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
    };
  }, []);

  const kpis = [
    { label: t("admTotalSales"), value: money(stats.sales, lang), delta: stats.salesChange },
    { label: t("admTotalOrders"), value: stats.orders.toLocaleString("en-US"), delta: stats.ordersChange },
    { label: t("admTotalCustomers"), value: stats.customers.toLocaleString("en-US"), delta: stats.customersChange },
    { label: t("admTotalProducts"), value: stats.products.toLocaleString("en-US") },
  ];

  return (
    <>
      <AdminHead
        title={t("admDashboard")}
        sub={t("admDashboardSub")}
        action={
          <span className={`live mono${stale ? " stale" : ""}`} role="status">
            <span className="live-dot" aria-hidden="true" />
            {stale ? t("admOffline") : `${t("admLive")} · ${fmtTime(stats.generatedAt)}`}
          </span>
        }
      />

      <dl className="kpis">
        {kpis.map((k) => (
          <div className="kpi" key={k.label}>
            <dt>{k.label}</dt>
            <dd>{k.value}</dd>
            {"delta" in k && <Delta value={k.delta ?? null} />}
          </div>
        ))}
      </dl>

      <div className="adm-grid">
        <section className="adm-card" aria-labelledby="adm-sales">
          <header>
            <h2 id="adm-sales">{t("admSalesOverview")}</h2>
            <span className="mono muted">{t("admLast30")}</span>
          </header>
          <SalesChart data={stats.daily} />
        </section>

        <section className="adm-card" aria-labelledby="adm-top">
          <header>
            <h2 id="adm-top">{t("admTopProducts")}</h2>
            <Link href="/admin/products" className="linkbtn">{t("viewAll")}</Link>
          </header>
          {stats.top.length === 0 ? (
            <p className="muted">{t("admNoSales")}</p>
          ) : (
            <ol className="toplist">
              {stats.top.map((p, i) => (
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

      <section className="adm-card" aria-labelledby="adm-recent">
        <header>
          <h2 id="adm-recent">{t("admRecentOrders")}</h2>
          <Link href="/admin/orders" className="linkbtn">{t("viewAll")}</Link>
        </header>
        {stats.recent.length === 0 ? (
          <p className="muted">{t("admNoOrders")}</p>
        ) : (
          <div className="tscroll">
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
                {stats.recent.map((o) => (
                  <tr key={o.order_no}>
                    <td className="mono">{o.order_no}</td>
                    <td>{o.title}</td>
                    <td>{o.customer_email}</td>
                    <td className="mono">{fmtDate(o.created_at, lang)} {fmtTime(o.created_at)}</td>
                    <td><StatusTag status={o.status} /></td>
                    <td className="num">{money(o.amount, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
