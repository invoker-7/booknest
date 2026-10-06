"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useLang } from "@/components/LangProvider";
import { useStore } from "@/components/StoreProvider";
import { AdminHead } from "@/components/admin/AdminShell";
import { Alert, ArrowLeft, Check, Upload } from "@/components/Icons";
import { Button, LinkButton, Notice } from "@/components/ui";
import { sendJson } from "@/lib/apiClient";
import { CATEGORIES, categoryOf } from "@/lib/catalog";
import { fileSize, MAX_UPLOAD_BYTES, UPLOAD_EXTENSIONS } from "@/lib/format";
import type { TKey } from "@/lib/i18n";
import type { BookRow, ShopRef } from "@/lib/types";

const ERRORS: Record<string, TKey> = {
  id_invalid: "admErrId",
  id_taken: "admErrIdTaken",
  title_required: "admErrTitle",
  price_invalid: "admErrPrice",
  list_price_invalid: "admErrListPrice",
  file_required: "admErrFile",
  file_type: "admErrFileType",
  file_too_large: "admErrFileSize",
  shop_not_found: "admErrShop",
};

const LICENSES = ["personal", "commercial", "mit"] as const;

type Fields = Record<
  | "id" | "title_th" | "title_en" | "short_th" | "short_en" | "long_th" | "long_en" | "author_th"
  | "kind" | "price" | "list_price" | "version" | "license" | "file_path" | "file_size" | "sort" | "shop_id",
  string
>;

const initial = (p?: BookRow): Fields => ({
  id: p?.id ?? "",
  title_th: p?.title_th ?? "",
  title_en: p?.title_en ?? "",
  short_th: p?.short_th ?? "",
  short_en: p?.short_en ?? "",
  long_th: p?.long_th ?? "",
  long_en: p?.long_en ?? "",
  author_th: p?.author_th ?? "",
  kind: p ? categoryOf(p) : "template",
  price: p ? String(p.price) : "",
  list_price: p && p.list_price > p.price ? String(p.list_price) : "",
  version: p?.version ?? "1.0",
  license: p?.license ?? "",
  file_path: p?.file_path ?? "",
  file_size: p?.file_size ?? "",
  sort: p?.sort ? String(p.sort) : "",
  shop_id: p?.shop_id ?? "",
});

/** ฟอร์มเพิ่ม / แก้ไขสินค้า พร้อมอัปโหลดไฟล์ตรงไปที่ Storage */
export default function ProductForm({ product, shops }: { product?: BookRow; shops: ShopRef[] }) {
  const { t } = useLang();
  const { notify } = useStore();
  const router = useRouter();
  const editing = Boolean(product);

  const [f, setF] = useState<Fields>(() => initial(product));
  const [published, setPublished] = useState(product ? product.published !== false : true);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<TKey | "">("");
  const fileInput = useRef<HTMLInputElement>(null);

  const set = (key: keyof Fields) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((prev) => ({ ...prev, [key]: e.target.value }));

  /** ขอ URL อัปโหลดจาก server แล้วส่งไฟล์ตรงไปที่ Storage (XHR เพื่อแสดงความคืบหน้า) */
  async function upload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!UPLOAD_EXTENSIONS.includes(ext)) return setError("admErrFileType");
    if (file.size > MAX_UPLOAD_BYTES) return setError("admErrFileSize");

    setProgress(0);
    try {
      const { path, url } = await sendJson<{ path: string; url: string }>("/api/admin/upload", {
        filename: file.name,
        size: file.size,
      });
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", url);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.upload.onprogress = (ev) => ev.lengthComputable && setProgress(Math.round((ev.loaded / ev.total) * 100));
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("upload_failed")));
        xhr.onerror = () => reject(new Error("upload_failed"));
        xhr.send(file);
      });
      setF((prev) => ({ ...prev, file_path: path, file_size: fileSize(file.size) }));
    } catch (err) {
      setError(ERRORS[err instanceof Error ? err.message : ""] || "admErrUpload");
    } finally {
      setProgress(null);
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!f.title_th.trim() && !f.title_en.trim()) return setError("admErrTitle");
    if (f.price.trim() === "") return setError("admErrPrice");
    if (!f.file_path) return setError("admErrFile");

    setSaving(true);
    try {
      // ฟอร์มมีช่องผู้สร้างช่องเดียว: ชื่อภาษาอังกฤษเดิมคงไว้ถ้าไม่ได้แก้
      const author_en = product && f.author_th === product.author_th ? product.author_en : f.author_th;
      const body = { ...f, author_en, published };
      if (product) await sendJson(`/api/admin/products/${encodeURIComponent(product.id)}`, body, "PATCH");
      else await sendJson("/api/admin/products", body);
      notify(t("admSaved"));
      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      setError(ERRORS[err instanceof Error ? err.message : ""] || "genericError");
      setSaving(false);
    }
  }

  const uploading = progress !== null;

  return (
    <form onSubmit={save} noValidate>
      <AdminHead
        title={editing ? t("admEditProduct") : t("admNewProduct")}
        sub={<Link href="/admin/products" className="adm-backlink"><ArrowLeft size={14} /> {t("admProducts")}</Link>}
        action={
          <>
            <LinkButton href="/admin/products" variant="ghost" size="small">{t("cancel")}</LinkButton>
            <Button type="submit" size="small" loading={saving} loadingText={t("loading")} disabled={uploading}>
              <Check size={16} /> {t("admSave")}
            </Button>
          </>
        }
      />

      {error && <div className="adm-gap"><Notice tone="error">{t(error)}</Notice></div>}

      <div className="adm-form">
        <div>
          <section className="adm-card">
            <header><h2>{t("admBasics")}</h2></header>
            <div className="two">
              <div className="field">
                <label htmlFor="pf-title-th">{t("admTitleTh")}</label>
                <input id="pf-title-th" value={f.title_th} onChange={set("title_th")} maxLength={200} required />
              </div>
              <div className="field">
                <label htmlFor="pf-title-en">{t("admTitleEn")}</label>
                <input id="pf-title-en" value={f.title_en} onChange={set("title_en")} maxLength={200} />
              </div>
              <div className="field">
                <label htmlFor="pf-short-th">{t("admShortTh")}</label>
                <input id="pf-short-th" value={f.short_th} onChange={set("short_th")} maxLength={300} />
              </div>
              <div className="field">
                <label htmlFor="pf-short-en">{t("admShortEn")}</label>
                <input id="pf-short-en" value={f.short_en} onChange={set("short_en")} maxLength={300} />
              </div>
              <div className="field">
                <label htmlFor="pf-long-th">{t("admLongTh")}</label>
                <textarea id="pf-long-th" rows={5} value={f.long_th} onChange={set("long_th")} />
              </div>
              <div className="field">
                <label htmlFor="pf-long-en">{t("admLongEn")}</label>
                <textarea id="pf-long-en" rows={5} value={f.long_en} onChange={set("long_en")} />
              </div>
            </div>
            <span className="hint muted">{t("admBlankHint")}</span>
          </section>

          <section className="adm-card">
            <header><h2>{t("admFile")}</h2></header>
            <input
              ref={fileInput}
              type="file"
              className="sr-only"
              tabIndex={-1}
              accept={UPLOAD_EXTENSIONS.map((x) => `.${x}`).join(",")}
              onChange={upload}
            />
            <div className="filebox">
              <div>
                {f.file_path ? (
                  <>
                    <strong className="mono">{f.file_path}</strong>
                    <span className="muted">{f.file_size}</span>
                  </>
                ) : (
                  <span className="muted">{t("admNoFile")}</span>
                )}
              </div>
              <Button
                variant="secondary"
                size="small"
                onClick={() => fileInput.current?.click()}
                loading={uploading}
                loadingText={`${progress ?? 0}%`}
              >
                <Upload size={16} /> {f.file_path ? t("admReplaceFile") : t("admUploadFile")}
              </Button>
            </div>
            {uploading && (
              <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress ?? 0}>
                <span style={{ width: `${progress ?? 0}%` }} />
              </div>
            )}
            <span className="hint muted"><Alert size={14} style={{ display: "inline", verticalAlign: -2 }} /> {t("admFileHint")}</span>
          </section>
        </div>

        <aside>
          <section className="adm-card">
            <header><h2>{t("admPricing")}</h2></header>
            <div className="field">
              <label htmlFor="pf-price">{t("admPrice")}</label>
              <input id="pf-price" type="number" inputMode="numeric" min={0} step={1} value={f.price} onChange={set("price")} required />
            </div>
            <div className="field">
              <label htmlFor="pf-list">{t("admListPrice")}</label>
              <input id="pf-list" type="number" inputMode="numeric" min={0} step={1} value={f.list_price} onChange={set("list_price")} />
              <span className="hint">{t("admListPriceHint")}</span>
            </div>
          </section>

          <section className="adm-card">
            <header><h2>{t("admOrganize")}</h2></header>
            <label className="check">
              <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
              {t("admPublishedLabel")}
            </label>
            <div className="field" style={{ marginTop: 12 }}>
              <label htmlFor="pf-kind">{t("admCategory")}</label>
              <select id="pf-kind" className="select" value={f.kind} onChange={set("kind")}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{t(`cat_${c}`)}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="pf-id">{t("admSlug")}</label>
              <input id="pf-id" className="mono" value={f.id} onChange={set("id")} readOnly={editing} placeholder="landing-kit" maxLength={60} />
              <span className="hint">{t(editing ? "admSlugLocked" : "admSlugHint")}</span>
            </div>
            <div className="field">
              <label htmlFor="pf-author">{t("admAuthor")}</label>
              <input id="pf-author" value={f.author_th} onChange={set("author_th")} maxLength={120} />
            </div>
            {shops.length > 0 && (
              <div className="field">
                <label htmlFor="pf-shop">{t("admShop")}</label>
                <select id="pf-shop" className="select" value={f.shop_id} onChange={set("shop_id")}>
                  <option value="">—</option>
                  {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
            <div className="two">
              <div className="field">
                <label htmlFor="pf-version">{t("colVersion")}</label>
                <input id="pf-version" className="mono" value={f.version} onChange={set("version")} maxLength={20} />
              </div>
              <div className="field">
                <label htmlFor="pf-sort">{t("admSort")}</label>
                <input id="pf-sort" type="number" min={0} step={1} value={f.sort} onChange={set("sort")} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="pf-license">{t("admLicense")}</label>
              <select id="pf-license" className="select" value={f.license} onChange={set("license")}>
                <option value="">{t("admLicenseAuto")}</option>
                {LICENSES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </section>
        </aside>
      </div>
    </form>
  );
}
