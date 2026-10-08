"use client";

import Link from "next/link";
import { useState } from "react";
import { useLang } from "@/components/LangProvider";
import { ArrowLeft } from "@/components/Icons";
import { ProductRow, Empty } from "@/components/ui";
import { ARCHIVE_TYPES } from "@/lib/archive";
import { fmtDate, pick } from "@/lib/format";
import type { Article, ArticleType, Product } from "@/lib/types";

/** articles มาจาก server เรียงใหม่สุดก่อนแล้ว */
export function ArchiveView({ articles }: { articles: Article[] }) {
  const { t, lang } = useLang();
  const [type, setType] = useState<ArticleType | "">("");
  const list = type ? articles.filter((a) => a.type === type) : articles;

  return (
    <div className="wrap">
      <header className="phead" style={{ borderBottom: 0, paddingBottom: 0 }}>
        <ol className="crumbs">
          <li><Link href="/">VECTOR</Link></li>
          <li aria-current="page">{t("navArchive")}</li>
        </ol>
        <h1>{t("archiveTitle")}</h1>
        <p>{t("archiveSub")}</p>
      </header>

      <div className="arc-filter" role="group" aria-label={t("filters")}>
        <button type="button" aria-pressed={!type} onClick={() => setType("")}>{t("allCategories")}</button>
        {ARCHIVE_TYPES.map((k) => (
          <button key={k} type="button" aria-pressed={type === k} onClick={() => setType(k)}>
            {t(`type_${k}`)}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <Empty title={t("noResultTitle")} />
      ) : (
        <ol className="alist" style={{ borderTopColor: "var(--ink)" }}>
          {list.map((a, i) => (
            <li className="aitem" key={a.slug}>
              <div className="aitem-no">{String(list.length - i).padStart(3, "0")}</div>
              <div className="aitem-type">{t(`type_${a.type}`)}</div>
              <div>
                <h3><Link href={`/archive/${a.slug}`}>{pick(a, "title", lang)}</Link></h3>
                <p>{pick(a, "dek", lang)}</p>
              </div>
              <div className="aitem-date">{fmtDate(a.date, lang)}<br />{a.read} {t("minRead")}</div>
            </li>
          ))}
        </ol>
      )}
      <div style={{ height: 112 }} />
    </div>
  );
}

export function ArticleView({ article: a, product }: { article: Article; product: Product | null }) {
  const { t, lang } = useLang();
  const body = lang === "en" ? a.body_en : a.body_th;

  return (
    <div className="wrap">
      <article className="article">
        <aside className="article-side">
          <Link href="/archive" className="textlink" style={{ marginBottom: 16 }}>
            <ArrowLeft size={18} /> <span>{t("backToArchive")}</span>
          </Link>
          <dl>
            <div><dt>Type</dt><dd>{t(`type_${a.type}`)}</dd></div>
            <div><dt>Date</dt><dd>{fmtDate(a.date, lang)}</dd></div>
            <div><dt>Author</dt><dd>{a.author}</dd></div>
            <div><dt>Read</dt><dd>{a.read} {t("minRead")}</dd></div>
          </dl>
        </aside>

        <div>
          <h1>{pick(a, "title", lang)}</h1>
          <p className="dek">{pick(a, "dek", lang)}</p>
          <div className="body">
            {body.map((p, i) => <p key={i}>{p}</p>)}
          </div>

          {product && (
            <section className="mention" aria-labelledby="mention-title">
              <h2 id="mention-title" className="doc-label" style={{ marginBottom: 8 }}>{t("relatedProduct")}</h2>
              <div className="prows" style={{ borderTop: 0 }}>
                <ProductRow p={product} index={0} />
              </div>
            </section>
          )}
        </div>
        <aside aria-hidden="true" />
      </article>
    </div>
  );
}
