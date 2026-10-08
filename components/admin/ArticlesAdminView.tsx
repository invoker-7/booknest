"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLang } from "@/components/LangProvider";
import { useStore } from "@/components/StoreProvider";
import { AdminHead } from "@/components/admin/AdminShell";
import { Plus, Trash } from "@/components/Icons";
import { Button, Empty, LinkButton, Notice } from "@/components/ui";
import { sendJson } from "@/lib/apiClient";
import { fmtDate, pick } from "@/lib/format";
import type { ArticleRow } from "@/lib/types";

interface ArticlesAdminViewProps {
  articles: ArticleRow[];
  /** false = ยังไม่ได้สร้างตาราง articles (ยังไม่ได้รัน supabase/content.sql) */
  ready: boolean;
}

/** หลังบ้าน: รายการบทความทั้งหมด รวมฉบับร่าง */
export default function ArticlesAdminView({ articles, ready }: ArticlesAdminViewProps) {
  const { t, lang } = useLang();
  const { notify } = useStore();
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState(false);

  async function remove(a: ArticleRow) {
    if (!window.confirm(`${t("admArticleDeleteAsk")}\n\n${pick(a, "title", lang)}`)) return;
    setBusy(a.slug);
    setError(false);
    try {
      await sendJson(`/api/admin/articles/${encodeURIComponent(a.slug)}`, undefined, "DELETE");
      notify(t("admArticleDeleted"));
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
        title={t("admArticles")}
        sub={`${articles.length.toLocaleString("en-US")} ${t("admArticlesUnit")}`}
        action={ready && <LinkButton href="/admin/articles/new" size="small"><Plus size={16} /> {t("admNewArticle")}</LinkButton>}
      />

      {!ready && <div className="adm-gap"><Notice tone="warn" title={t("admContentSetupTitle")}>{t("admContentSetupBody")}</Notice></div>}
      {error && <div className="adm-gap"><Notice tone="error">{t("genericError")}</Notice></div>}

      {ready && articles.length === 0 ? (
        <Empty
          title={t("admNoArticles")}
          action={<LinkButton href="/admin/articles/new"><Plus size={18} /> {t("admNewArticle")}</LinkButton>}
        />
      ) : articles.length > 0 && (
        <div className="adm-card flush tscroll">
          <table className="ltable">
            <thead>
              <tr>
                <th scope="col">{t("admArticleTitle")}</th>
                <th scope="col">{t("admArticleType")}</th>
                <th scope="col">{t("admDate")}</th>
                <th scope="col">{t("colStatus")}</th>
                <th scope="col"><span className="sr-only">{t("colActions")}</span></th>
              </tr>
            </thead>
            <tbody>
              {articles.map((a) => (
                <tr key={a.slug}>
                  <td>
                    <Link href={`/admin/articles/${encodeURIComponent(a.slug)}`} className="linkbtn">{pick(a, "title", lang)}</Link>
                    <span className="sub mono">{a.slug}</span>
                  </td>
                  <td>{t(`type_${a.type}`)}</td>
                  <td className="mono">{fmtDate(a.published_at, lang)}</td>
                  <td>
                    <span className={`tag ${a.published ? "blue" : "neutral"}`}>
                      <span className="tag-dot" aria-hidden="true" />
                      {t(a.published ? "admArticlePublished" : "admArticleDraft")}
                    </span>
                  </td>
                  <td>
                    <div className="acts">
                      {a.published && (
                        <a className="btn ghost small" href={`/archive/${encodeURIComponent(a.slug)}`} target="_blank" rel="noreferrer">{t("admArticleView")}</a>
                      )}
                      <LinkButton href={`/admin/articles/${encodeURIComponent(a.slug)}`} variant="secondary" size="small">{t("edit")}</LinkButton>
                      <Button variant="danger" size="small" onClick={() => remove(a)} loading={busy === a.slug} aria-label={`${t("admDelete")}: ${pick(a, "title", lang)}`}>
                        <Trash size={16} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
