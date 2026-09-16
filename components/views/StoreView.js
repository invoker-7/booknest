"use client";

import Link from "next/link";
import { useState } from "react";
import { useLang } from "@/components/LangProvider";
import Cover from "@/components/Cover";
import { Search, Track, Arrow } from "@/components/Icons";
import { money, pick } from "@/lib/format";

export default function StoreView({ books }) {
  const { t, lang } = useLang();
  const [q, setQ] = useState("");

  const query = q.trim().toLowerCase();
  const list = books.filter((b) => {
    if (!query) return true;
    return (
      pick(b, "title", lang).toLowerCase().includes(query) ||
      pick(b, "short", lang).toLowerCase().includes(query)
    );
  });

  return (
    <div className="pad">
      <div className="search">
        <Search />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("searchPh")}
          aria-label={t("searchPh")}
        />
      </div>

      {!query && (
        <div className="hero">
          <div className="hero-txt">
            <h2>{t("heroTitle")}</h2>
            <p>{t("heroSub")}</p>
          </div>
          <svg width="88" height="112" viewBox="0 0 88 112" fill="none" aria-hidden="true">
            <path d="M40 112V62" stroke="#6E8F76" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M40 78c-10-2-16-9-17-19 11 1 17 8 17 19z" fill="#6E8F76" opacity=".75" />
            <path d="M40 70c9-3 14-11 14-21-10 2-15 10-14 21z" fill="#6E8F76" opacity=".55" />
            <circle cx="34" cy="46" r="8" fill="#E4703B" />
            <circle cx="34" cy="46" r="3" fill="#FBE4D2" />
            <circle cx="56" cy="56" r="6.5" fill="#E4703B" opacity=".75" />
            <circle cx="56" cy="56" r="2.4" fill="#FBE4D2" />
            <circle cx="47" cy="30" r="5" fill="#E4703B" opacity=".5" />
          </svg>
        </div>
      )}

      <div className="section-head">
        <h3>{t("featured")}</h3>
      </div>

      {list.length > 0 ? (
        <div className="grid">
          {list.map((b) => (
            <Link className="bookcard" href={`/book/${b.id}`} key={b.id}>
              <div className="cover">
                <Cover cover={b.cover} title={pick(b, "title", lang)} />
              </div>
              <h4>{pick(b, "title", lang)}</h4>
              <p className="price">{money(b.price, lang)}</p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty">
          <p>{t("noResult")}</p>
          <button className="btn ghost small" onClick={() => setQ("")} style={{ margin: "0 auto", width: "auto" }}>
            {t("clearSearch")}
          </button>
        </div>
      )}

      <div className="section-head">
        <h3>{t("track")}</h3>
      </div>
      <Link className="row" href="/track">
        <div
          style={{
            width: 52, height: 52, borderRadius: 12, background: "var(--sage-soft)",
            display: "grid", placeItems: "center", color: "var(--sage)", flex: "none",
          }}
        >
          <Track />
        </div>
        <div className="body">
          <h4>{t("track")}</h4>
          <p>{t("trackIntro")}</p>
        </div>
        <span style={{ color: "var(--muted)" }}><Arrow /></span>
      </Link>

      <div className="spacer" />
    </div>
  );
}
