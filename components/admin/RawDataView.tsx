"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLang } from "@/components/LangProvider";
import { AdminHead } from "@/components/admin/AdminShell";
import { Search } from "@/components/Icons";
import { Empty, Notice } from "@/components/ui";

interface RawDataViewProps {
  tables: readonly string[];
  table: string;
  page: number;
  pageSize: number;
  columns: string[];
  rows: Record<string, unknown>[];
  total: number;
  failed: boolean;
}

/** ค่าหนึ่งช่องเป็นข้อความ — object/array แสดงเป็น JSON */
const text = (value: unknown): string =>
  value === null || value === undefined ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);

/** ข้อมูลดิบ: ดูทุกคอลัมน์ของแต่ละตารางตามที่เก็บในฐานข้อมูล (อ่านอย่างเดียว) */
export default function RawDataView({ tables, table, page, pageSize, columns, rows, total, failed }: RawDataViewProps) {
  const { t } = useLang();
  const [q, setQ] = useState("");

  const shown = useMemo(() => {
    const query = q.trim().toLowerCase();
    return query ? rows.filter((row) => columns.some((c) => text(row[c]).toLowerCase().includes(query))) : rows;
  }, [rows, columns, q]);

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const href = (name: string, n = 1) => `/admin/raw?table=${name}${n > 1 ? `&page=${n}` : ""}`;

  return (
    <>
      <AdminHead title={t("admRaw")} sub={t("admRawSub")} />

      <nav className="rawtabs" aria-label={t("admRawTables")}>
        {tables.map((name) => (
          <Link key={name} href={href(name)} className="mono" aria-current={name === table ? "page" : undefined}>
            {name}
          </Link>
        ))}
      </nav>

      <div className="toolbar">
        <label className="search">
          <Search size={18} />
          <span className="sr-only">{t("navSearch")}</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("admRawFilter")} />
        </label>
        <span className="mono muted rawcount">
          {from.toLocaleString("en-US")}–{to.toLocaleString("en-US")} / {total.toLocaleString("en-US")} {t("admRawRows")}
        </span>
      </div>

      {failed ? (
        <Notice tone="error">{t("genericError")}</Notice>
      ) : shown.length === 0 ? (
        <Empty title={t("admRawEmpty")} />
      ) : (
        <div className="adm-card flush tscroll">
          <table className="ltable rawtable">
            <thead>
              <tr>{columns.map((c) => <th scope="col" key={c}>{c}</th>)}</tr>
            </thead>
            <tbody>
              {shown.map((row, i) => (
                <tr key={i}>
                  {columns.map((c) => {
                    const value = text(row[c]);
                    // ข้อความยาวถูกตัดในตาราง ชี้เมาส์ค้างเพื่อดูค่าเต็ม
                    return row[c] === null || row[c] === undefined
                      ? <td key={c} className="mono muted">null</td>
                      : <td key={c} className="mono" title={value.length > 40 ? value : undefined}>{value}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav className="rawpager" aria-label={t("admRawPages")}>
          {page > 1
            ? <Link className="btn secondary small" href={href(table, page - 1)}>{t("admPrev")}</Link>
            : <span className="btn secondary small" aria-disabled="true">{t("admPrev")}</span>}
          <span className="mono muted">{page} / {pages}</span>
          {page < pages
            ? <Link className="btn secondary small" href={href(table, page + 1)}>{t("admNext")}</Link>
            : <span className="btn secondary small" aria-disabled="true">{t("admNext")}</span>}
        </nav>
      )}
    </>
  );
}
