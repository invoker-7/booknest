"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useLang } from "@/components/LangProvider";
import { useStore } from "@/components/StoreProvider";
import { AdminHead } from "@/components/admin/AdminShell";
import { Search, Trash } from "@/components/Icons";
import { Button, Empty, Notice } from "@/components/ui";
import { sendJson } from "@/lib/apiClient";

interface RawDataViewProps {
  tables: readonly string[];
  table: string;
  /** คอลัมน์คีย์หลักของตารางนี้ */
  keyColumn: string;
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

type Row = Record<string, unknown>;
/** ค่าที่กำลังแก้ในฟอร์ม: ข้อความของช่อง และช่องนั้นเป็น null อยู่ไหม */
type Draft = Record<string, { value: string; isNull: boolean }>;

const draftOf = (row: Row, columns: string[]): Draft =>
  Object.fromEntries(columns.map((c) => [c, { value: text(row[c]), isNull: row[c] === null || row[c] === undefined }]));

/** ฟอร์มแก้ไขหนึ่งแถว: หนึ่งช่องต่อหนึ่งคอลัมน์ ส่งเฉพาะช่องที่เปลี่ยน */
function RowEditor({ table, keyColumn, columns, row, onClose }: { table: string; keyColumn: string; columns: string[]; row: Row; onClose: (saved: boolean) => void }) {
  const { t } = useLang();
  const dialog = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<Draft>(() => draftOf(row, columns));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  const set = (column: string, next: Partial<Draft[string]>) =>
    setDraft((d) => ({ ...d, [column]: { ...d[column]!, ...next } }));

  async function save(e: FormEvent) {
    e.preventDefault();
    const before = draftOf(row, columns);
    const values: Record<string, string | null> = {};
    for (const c of columns) {
      const now = draft[c]!, was = before[c]!;
      if (c !== keyColumn && (now.isNull !== was.isNull || (!now.isNull && now.value !== was.value))) values[c] = now.isNull ? null : now.value;
    }
    if (Object.keys(values).length === 0) return onClose(false);
    setBusy(true);
    setError("");
    try {
      await sendJson("/api/admin/raw", { table, key: text(row[keyColumn]), values }, "PATCH");
      onClose(true);
    } catch (err) {
      // ข้อความจากฐานข้อมูลบอกตรง ๆ ว่าช่องไหนผิดกติกา (หน้านี้ใช้ได้เฉพาะผู้ดูแล)
      setError(err instanceof Error ? err.message : t("genericError"));
      setBusy(false);
    }
  }

  return (
    <dialog ref={dialog} className="rawedit" onClose={() => onClose(false)} aria-labelledby="rawedit-title">
      <form onSubmit={save}>
        <h2 id="rawedit-title">{t("admRawEditTitle")} <span className="mono muted">{table}</span></h2>
        {error && <div style={{ marginBottom: 16 }}><Notice tone="error">{error}</Notice></div>}
        <div className="rawedit-fields">
          {columns.map((c) => {
            const field = draft[c]!;
            const isKey = c === keyColumn;
            const long = field.value.length > 60 || field.value.includes("\n");
            return (
              <div className="field" key={c}>
                <label htmlFor={`raw-${c}`} className="mono">{c}</label>
                {long ? (
                  <textarea id={`raw-${c}`} className="mono" rows={5} value={field.value} disabled={isKey || field.isNull} onChange={(e) => set(c, { value: e.target.value })} />
                ) : (
                  <input id={`raw-${c}`} className="mono" value={field.value} disabled={isKey || field.isNull} onChange={(e) => set(c, { value: e.target.value })} />
                )}
                {isKey ? (
                  <span className="hint">{t("admRawKeyHint")}</span>
                ) : (
                  <label className="rawnull mono">
                    <input type="checkbox" checked={field.isNull} onChange={(e) => set(c, { isNull: e.target.checked })} /> null
                  </label>
                )}
              </div>
            );
          })}
        </div>
        <div className="rawedit-actions">
          <Button type="submit" loading={busy} loadingText={t("loading")}>{t("admSave")}</Button>
          <Button variant="secondary" onClick={() => dialog.current?.close()} disabled={busy}>{t("cancel")}</Button>
        </div>
      </form>
    </dialog>
  );
}

/** ข้อมูลดิบ: ดูทุกคอลัมน์ของแต่ละตารางตามที่เก็บในฐานข้อมูล แก้ไขและลบแถวได้ */
export default function RawDataView({ tables, table, keyColumn, page, pageSize, columns, rows, total, failed }: RawDataViewProps) {
  const { t } = useLang();
  const { notify } = useStore();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function remove(row: Row) {
    const key = text(row[keyColumn]);
    if (!window.confirm(`${t("admRawDeleteAsk")}\n\n${table} · ${keyColumn} = ${key}`)) return;
    setBusy(key);
    setError("");
    try {
      await sendJson(`/api/admin/raw?table=${encodeURIComponent(table)}&key=${encodeURIComponent(key)}`, undefined, "DELETE");
      notify(t("admRawDeleted"));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("genericError"));
    } finally {
      setBusy("");
    }
  }

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

      {error && <div className="adm-gap"><Notice tone="error">{error}</Notice></div>}

      {failed ? (
        <Notice tone="warn">{t("admRawMissing")}</Notice>
      ) : shown.length === 0 ? (
        <Empty title={t("admRawEmpty")} />
      ) : (
        <div className="adm-card flush tscroll">
          <table className="ltable rawtable">
            <thead>
              <tr>
                <th scope="col" className="rawacts"><span className="sr-only">{t("colActions")}</span></th>
                {columns.map((c) => <th scope="col" key={c}>{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {shown.map((row, i) => (
                <tr key={text(row[keyColumn]) || i}>
                  <td className="rawacts">
                    <div className="acts">
                      <Button size="small" variant="secondary" onClick={() => setEditing(row)}>{t("admRawEdit")}</Button>
                      <Button size="small" variant="danger" onClick={() => remove(row)} loading={busy === text(row[keyColumn])} aria-label={`${t("admRawDelete")}: ${text(row[keyColumn])}`}>
                        <Trash size={16} />
                      </Button>
                    </div>
                  </td>
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

      {editing && (
        <RowEditor
          key={text(editing[keyColumn])}
          table={table}
          keyColumn={keyColumn}
          columns={columns}
          row={editing}
          onClose={(saved) => {
            setEditing(null);
            if (saved) {
              notify(t("admRawSaved"));
              router.refresh();
            }
          }}
        />
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
