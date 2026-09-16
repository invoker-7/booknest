"use client";

import Link from "next/link";
import { useLang } from "@/components/LangProvider";
import Cover from "@/components/Cover";
import { Star } from "@/components/Icons";
import { money, pick } from "@/lib/format";

export default function BookView({ book }) {
  const { t, lang } = useLang();
  const title = pick(book, "title", lang);
  const discount = Math.round((1 - book.price / book.list_price) * 100);

  return (
    <>
      <div className="pad">
        <div className="detailcover">
          <Cover cover={book.cover} title={title} />
        </div>

        <h2 className="h2">{title}</h2>
        <p className="sub">{pick(book, "short", lang)}</p>

        <div className="stars" style={{ marginTop: 10 }}>
          <Star />
          <strong style={{ color: "var(--ink)", fontWeight: 600 }}>{book.rating}</strong>
          <span>({book.reviews} {t("reviews")})</span>
        </div>

        <div className="pricerow">
          <span className="now">{money(book.price, lang)}</span>
          <span className="strike">{money(book.list_price, lang)}</span>
          {discount > 0 && (
            <span className="off">
              {lang === "th" ? `ลด ${discount}%` : `${discount}% OFF`}
            </span>
          )}
        </div>

        <hr className="sep" />

        <h3 style={{ margin: "0 0 8px", fontSize: 14.5, fontWeight: 600 }}>
          {t("description")}
        </h3>
        <p style={{ margin: 0, color: "var(--ink-2)", fontSize: 14, lineHeight: 1.7 }}>
          {pick(book, "long", lang)}
        </p>

        <dl style={{ margin: "18px 0 0" }}>
          <div className="kv">
            <dt>{t("author")}</dt>
            <dd>{pick(book, "author", lang)}</dd>
          </div>
          <div className="kv">
            <dt>{t("pages")}</dt>
            <dd>{book.pages} {t("pagesUnit")}</dd>
          </div>
          <div className="kv">
            <dt>{t("format")}</dt>
            <dd>PDF · {book.file_size}</dd>
          </div>
        </dl>

        <div className="spacer" />
      </div>

      <div className="sticky-cta">
        <Link className="btn" href={`/checkout/${book.id}`}>{t("buy")}</Link>
      </div>
    </>
  );
}
