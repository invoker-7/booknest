"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { useLang } from "@/components/LangProvider";
import { useStore } from "@/components/StoreProvider";
import { AdminHead } from "@/components/admin/AdminShell";
import { ArrowLeft, Check } from "@/components/Icons";
import { Button, LinkButton, Notice } from "@/components/ui";
import { sendJson } from "@/lib/apiClient";
import { ARCHIVE_TYPES } from "@/lib/archive";
import type { TKey } from "@/lib/i18n";
import type { ArticleRow } from "@/lib/types";

const ERRORS: Record<string, TKey> = {
  title_required: "admErrArticleTitle",
  body_required: "admErrArticleBody",
  slug_required: "admErrArticleSlug",
  slug_taken: "admErrArticleSlugTaken",
  product_not_found: "admErrArticleProduct",
};

type Fields = Pick<ArticleRow, "slug" | "type" | "title_th" | "title_en" | "dek_th" | "dek_en" | "body_th" | "body_en" | "author"> & {
  product: string;
};

interface ArticleFormProps {
  /** null = เขียนบทความใหม่ */
  article: ArticleRow | null;
  products: { id: string; title: string }[];
}

/** หลังบ้าน: เขียนและแก้บทความ — เนื้อหาเป็นข้อความธรรมดา เว้นบรรทัดเพื่อขึ้นย่อหน้าใหม่ */
export default function ArticleForm({ article, products }: ArticleFormProps) {
  const { t } = useLang();
  const { notify } = useStore();
  const router = useRouter();
  const editing = Boolean(article);

  const [f, setF] = useState<Fields>({
    slug: article?.slug ?? "",
    type: article?.type ?? "article",
    title_th: article?.title_th ?? "",
    title_en: article?.title_en ?? "",
    dek_th: article?.dek_th ?? "",
    dek_en: article?.dek_en ?? "",
    body_th: article?.body_th ?? "",
    body_en: article?.body_en ?? "",
    author: article?.author ?? "VECTOR",
    product: article?.product ?? "",
  });
  const [published, setPublished] = useState(article?.published ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<TKey | "">("");

  const set = (key: keyof Fields) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF((prev) => ({ ...prev, [key]: e.target.value }));

  async function save(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!f.title_th.trim() && !f.title_en.trim()) return setError("admErrArticleTitle");
    if (!f.body_th.trim() && !f.body_en.trim()) return setError("admErrArticleBody");

    setSaving(true);
    try {
      const payload = { ...f, published, published_at: article?.published_at };
      if (article) await sendJson(`/api/admin/articles/${encodeURIComponent(article.slug)}`, payload, "PUT");
      else await sendJson("/api/admin/articles", payload);
      notify(t("admArticleSaved"));
      router.push("/admin/articles");
      router.refresh();
    } catch (err) {
      setError(ERRORS[err instanceof Error ? err.message : ""] || "genericError");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} noValidate>
      <AdminHead
        title={editing ? t("admEditArticle") : t("admNewArticle")}
        sub={<Link href="/admin/articles" className="adm-backlink"><ArrowLeft size={14} /> {t("admArticles")}</Link>}
        action={
          <>
            <LinkButton href="/admin/articles" variant="ghost" size="small">{t("cancel")}</LinkButton>
            <Button type="submit" size="small" loading={saving} loadingText={t("loading")}>
              <Check size={16} /> {t("admSave")}
            </Button>
          </>
        }
      />

      {error && <div className="adm-gap"><Notice tone="error">{t(error)}</Notice></div>}

      <div className="adm-form">
        <div>
          <section className="adm-card">
            <header><h2>{t("admArticleContentTh")}</h2></header>
            <div className="field">
              <label htmlFor="af-title-th">{t("admArticleTitle")}</label>
              <input id="af-title-th" type="text" value={f.title_th} onChange={set("title_th")} maxLength={200} />
            </div>
            <div className="field">
              <label htmlFor="af-dek-th">{t("admArticleDek")}</label>
              <input id="af-dek-th" type="text" value={f.dek_th} onChange={set("dek_th")} maxLength={300} />
              <span className="hint">{t("admArticleDekHint")}</span>
            </div>
            <div className="field">
              <label htmlFor="af-body-th">{t("admArticleBody")}</label>
              <textarea id="af-body-th" rows={16} value={f.body_th} onChange={set("body_th")} />
              <span className="hint">{t("admArticleBodyHint")}</span>
            </div>
          </section>

          <section className="adm-card">
            <header><h2>{t("admArticleContentEn")}</h2><span className="mono muted">{t("admOptional")}</span></header>
            <div className="field">
              <label htmlFor="af-title-en">{t("admArticleTitle")}</label>
              <input id="af-title-en" type="text" value={f.title_en} onChange={set("title_en")} maxLength={200} />
            </div>
            <div className="field">
              <label htmlFor="af-dek-en">{t("admArticleDek")}</label>
              <input id="af-dek-en" type="text" value={f.dek_en} onChange={set("dek_en")} maxLength={300} />
            </div>
            <div className="field">
              <label htmlFor="af-body-en">{t("admArticleBody")}</label>
              <textarea id="af-body-en" rows={12} value={f.body_en} onChange={set("body_en")} />
              <span className="hint">{t("admArticleEnHint")}</span>
            </div>
          </section>
        </div>

        <div>
          <section className="adm-card">
            <header><h2>{t("admOrganize")}</h2></header>
            <label className="check">
              <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
              {t("admArticlePublishLabel")}
            </label>
            <div className="field" style={{ marginTop: 12 }}>
              <label htmlFor="af-type">{t("admArticleType")}</label>
              <select id="af-type" className="select" value={f.type} onChange={set("type")}>
                {ARCHIVE_TYPES.map((k) => <option key={k} value={k}>{t(`type_${k}`)}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="af-author">{t("admArticleAuthor")}</label>
              <input id="af-author" type="text" value={f.author} onChange={set("author")} maxLength={80} />
            </div>
            <div className="field">
              <label htmlFor="af-product">{t("admArticleProduct")}</label>
              <select id="af-product" className="select" value={f.product} onChange={set("product")}>
                <option value="">{t("admArticleNoProduct")}</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
              <span className="hint">{t("admArticleProductHint")}</span>
            </div>
            <div className="field">
              <label htmlFor="af-slug">{t("admArticleSlug")}</label>
              <input id="af-slug" type="text" className="mono" value={f.slug} onChange={set("slug")} disabled={editing} placeholder="my-article" maxLength={80} />
              <span className="hint">{t(editing ? "admArticleSlugLocked" : "admArticleSlugHint")}</span>
            </div>
          </section>
        </div>
      </div>
    </form>
  );
}
