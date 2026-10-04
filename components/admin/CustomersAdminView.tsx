"use client";

import { useMemo, useState } from "react";
import { useLang } from "@/components/LangProvider";
import { AdminHead } from "@/components/admin/AdminShell";
import { Download, Search } from "@/components/Icons";
import { Empty } from "@/components/ui";
import { fmtDate, money } from "@/lib/format";
import type { AdminCustomer } from "@/lib/types";

export default function CustomersAdminView({ customers }: { customers: AdminCustomer[] }) {
  const { t, lang } = useLang();
  const [q, setQ] = useState("");

  const shown = useMemo(() => {
    const query = q.trim().toLowerCase();
    return query ? customers.filter((c) => `${c.email} ${c.name}`.toLowerCase().includes(query)) : customers;
  }, [customers, q]);

  return (
    <>
      <AdminHead
        title={t("admCustomers")}
        sub={`${customers.length.toLocaleString("en-US")} ${t("admPeople")} · ${customers.filter((c) => c.member).length.toLocaleString("en-US")} ${t("admMembers")}`}
        action={
          <a className="btn secondary small" href="/api/admin/export?type=users&format=csv" download>
            <Download size={16} /> {t("admExportCsv")}
          </a>
        }
      />

      <div className="toolbar">
        <label className="search">
          <Search size={18} />
          <span className="sr-only">{t("navSearch")}</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("admSearchCustomers")} />
        </label>
      </div>

      {shown.length === 0 ? (
        <Empty title={t("admNoCustomers")} />
      ) : (
        <div className="adm-card flush tscroll">
          <table className="ltable">
            <thead>
              <tr>
                <th scope="col">{t("admCustomer")}</th>
                <th scope="col">{t("admType")}</th>
                <th scope="col">{t("admJoined")}</th>
                <th scope="col" className="num">{t("admOrders")}</th>
                <th scope="col" className="num">{t("acctSpent")}</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.email}>
                  <td>
                    {c.name || "—"}
                    <span className="sub">{c.email}</span>
                  </td>
                  <td>
                    <span className={`tag ${c.role === "admin" ? "amber" : c.member ? "blue" : "neutral"}`}>
                      {c.role === "admin" ? t("roleAdmin") : c.member ? t("roleCustomer") : t("admGuest")}
                    </span>
                  </td>
                  <td className="mono">{fmtDate(c.joined, lang)}</td>
                  <td className="num">{c.orders}</td>
                  <td className="num">{money(c.spent, lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
