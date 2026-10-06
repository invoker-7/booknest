"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type DragEvent } from "react";
import { useLang } from "@/components/LangProvider";
import { AdminHead } from "@/components/admin/AdminShell";
import { Download, Spinner, Upload } from "@/components/Icons";
import { Notice } from "@/components/ui";
import type { TKey } from "@/lib/i18n";
import type { ImportResult } from "@/lib/types";

const TYPES: { id: "products" | "users" | "sales"; label: TKey; sub: TKey }[] = [
  { id: "products", label: "admProducts", sub: "admExportProductsSub" },
  { id: "users", label: "admCustomers", sub: "admExportUsersSub" },
  { id: "sales", label: "admSales", sub: "admExportSalesSub" },
];
const FORMATS = [["csv", "CSV"], ["xlsx", "Excel"], ["json", "JSON"]] as const;

const ERRORS: Record<string, TKey> = {
  file_unreadable: "admImpUnreadable",
  file_too_large: "admImpTooLarge",
  too_many_rows: "admImpTooMany",
  shop_not_found: "admErrShop",
};

const ROW_ERRORS: Record<string, TKey> = {
  id_invalid: "admErrId",
  id_duplicate: "admImpDuplicate",
  title_required: "admErrTitle",
  price_invalid: "admErrPrice",
  list_price_invalid: "admErrListPrice",
  kind_invalid: "admErrKind",
  license_invalid: "admErrLicense",
  file_required: "admImpFilePath",
};

/** Import / Export — ส่งออกสินค้า ผู้ใช้ ยอดขาย และนำเข้าสินค้าจากไฟล์ */
export default function DataView() {
  const { t } = useLang();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<TKey | "">("");

  async function send(file: File | undefined) {
    if (!file || busy) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/import", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as ImportResult & { error?: string };
      if (!res.ok) throw new Error(data.error || "");
      setResult(data);
      router.refresh();
    } catch (err) {
      setError(ERRORS[err instanceof Error ? err.message : ""] || "genericError");
    } finally {
      setBusy(false);
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    void send(e.dataTransfer.files[0]);
  };

  return (
    <>
      <AdminHead title={t("admData")} sub={t("admDataSub")} />

      <div className="adm-grid even">
        <section className="adm-card" aria-labelledby="adm-export">
          <header><h2 id="adm-export">{t("admExport")}</h2></header>
          <ul className="exports">
            {TYPES.map(({ id, label, sub }) => (
              <li key={id}>
                <div>
                  <strong>{t(label)}</strong>
                  <span className="muted">{t(sub)}</span>
                </div>
                <div className="exports-btns">
                  {FORMATS.map(([format, name]) => (
                    <a
                      key={format}
                      className="btn secondary small"
                      href={`/api/admin/export?type=${id}&format=${format}`}
                      download
                      aria-label={`${t("admExport")} ${t(label)} ${name}`}
                    >
                      <Download size={14} /> {name}
                    </a>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="adm-card" aria-labelledby="adm-import">
          <header><h2 id="adm-import">{t("admImport")}</h2></header>
          <p className="muted adm-gap">{t("admImportSub")}</p>

          <input
            ref={input}
            type="file"
            className="sr-only"
            tabIndex={-1}
            accept=".csv,.xlsx,.json"
            onChange={(e) => { void send(e.target.files?.[0]); e.target.value = ""; }}
          />
          <button
            type="button"
            className={`drop${over ? " over" : ""}`}
            onClick={() => input.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={onDrop}
            disabled={busy}
          >
            {busy ? <Spinner size={22} /> : <Upload size={22} />}
            <strong>{busy ? t("admImporting") : t("admDropHere")}</strong>
            <span className="mono">CSV · XLSX · JSON</span>
          </button>

          <p className="hint muted" style={{ marginTop: 12 }}>
            {t("admImportTemplate")}{" "}
            <a className="linkbtn" href="/api/admin/export?type=products&format=csv" download>{t("admImportTemplateLink")}</a>
          </p>

          {error && <div style={{ marginTop: 16 }}><Notice tone="error">{t(error)}</Notice></div>}

          {result && (
            <div style={{ marginTop: 16 }} aria-live="polite">
              <Notice tone={result.errors.length ? "warn" : "info"} title={t("admImportDone")}>
                {t("admImpCreated")} {result.created} · {t("admImpUpdated")} {result.updated} · {t("admImpSkipped")} {result.errors.length}
              </Notice>
              {result.errors.length > 0 && (
                <ul className="imp-errors mono">
                  {result.errors.slice(0, 50).map((e) => (
                    <li key={e.row}>{t("admImpRow")} {e.row}: {t(ROW_ERRORS[e.message] || "genericError")}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
