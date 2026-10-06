"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLang } from "@/components/LangProvider";
import { Arrow, Check, Plus } from "@/components/Icons";
import { Button, Empty, ProductRow, PreviewBanner, SectionHead } from "@/components/ui";
import { pick } from "@/lib/format";
import type { Creator } from "@/lib/types";

const FOLLOWING_KEY = "vx.following";

function readFollowing(): string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(FOLLOWING_KEY) || "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n));

function Crumbs({ leaf }: { leaf?: string }) {
  const { t } = useLang();
  return (
    <ol className="crumbs">
      <li><Link href="/">VECTOR</Link></li>
      {leaf ? (
        <>
          <li><Link href="/creators">{t("navCreators")}</Link></li>
          <li aria-current="page">{leaf}</li>
        </>
      ) : (
        <li aria-current="page">{t("navCreators")}</li>
      )}
    </ol>
  );
}

export function CreatorsView({ creators, live }: { creators: Creator[]; live: boolean }) {
  const { t, lang } = useLang();
  return (
    <>
      <PreviewBanner live={live} />
      <div className="wrap">
        <header className="phead" style={{ borderBottom: 0 }}>
          <Crumbs />
          <h1>{t("creatorsTitle")}</h1>
          <p>{t("creatorsSub")}</p>
        </header>

        {creators.length === 0 ? (
          <Empty title={t("noCreators")} body={t("noCreatorsBody")} />
        ) : (
          <ul className="clist">
            {creators.map((c) => (
              <li className="crow" key={c.id}>
                <div className="avatar" aria-hidden="true">{initials(c.name)}</div>
                <div>
                  <h2><Link href={`/creators/${c.id}`}>{c.name}</Link></h2>
                  {pick(c, "spec", lang) && <p className="spec-line">{pick(c, "spec", lang)}</p>}
                </div>
                <p>{pick(c, "bio", lang)}</p>
                <div className="num">{c.productCount}<small>{t("products")}</small></div>
                <div className="num">{c.rating ? c.rating.toFixed(1) : "—"}<small>{t("avgRating")}</small></div>
                <div className="num followers">{c.followers ? compact(c.followers) : "—"}<small>{t("followers")}</small></div>
                <Arrow />
              </li>
            ))}
          </ul>
        )}
        <div style={{ height: 112 }} />
      </div>
    </>
  );
}

export function CreatorView({ creator: c, live }: { creator: Creator; live: boolean }) {
  const { t, lang } = useLang();
  const [following, setFollowing] = useState(false);

  // การติดตามจำไว้ในเบราว์เซอร์นี้เท่านั้น
  useEffect(() => {
    setFollowing(readFollowing().includes(c.id));
  }, [c.id]);

  function toggle() {
    const next = !following;
    setFollowing(next);
    try {
      const others = readFollowing().filter((id) => id !== c.id);
      localStorage.setItem(FOLLOWING_KEY, JSON.stringify(next ? [...others, c.id] : others));
    } catch {}
  }

  const followers = c.followers ? c.followers + (following ? 1 : 0) : null;

  return (
    <>
      <PreviewBanner live={live} />
      <div className="wrap">
        <div style={{ paddingTop: 24 }}><Crumbs leaf={c.name} /></div>

        <header className="cp-head" style={{ paddingTop: 16 }}>
          <div className="avatar lg" aria-hidden="true">{initials(c.name)}</div>
          <div>
            {pick(c, "spec", lang) && <p className="spec-line">{pick(c, "spec", lang)}</p>}
            <h1>{c.name}</h1>
            {pick(c, "bio", lang) && <p>{pick(c, "bio", lang)}</p>}
          </div>
          <div>
            <Button
              variant="secondary"
              className={following ? "following" : ""}
              aria-pressed={following}
              onClick={toggle}
            >
              {following ? <><Check size={18} /> {t("following")}</> : <><Plus size={18} /> {t("follow")}</>}
            </Button>
          </div>
        </header>

        <dl className="cp-stats">
          <div><dt>{t("products")}</dt><dd>{c.productCount}</dd></div>
          <div><dt>{t("avgRating")}</dt><dd>{c.rating ? c.rating.toFixed(1) : "—"}</dd></div>
          <div><dt>{t("reviewsTitle")}</dt><dd>{c.reviews.toLocaleString("en-US")}</dd></div>
          <div><dt>{t("followers")}</dt><dd>{followers ? followers.toLocaleString("en-US") : "—"}</dd></div>
          <div><dt>{t("since")}</dt><dd className="sm">{c.since || "—"}{c.location ? ` · ${c.location}` : ""}</dd></div>
        </dl>

        <section className="section" style={{ paddingTop: 64 }} aria-labelledby="cp-products">
          <SectionHead no="01" label="Products" id="cp-products" title={t("creatorProducts")} />
          <div className="prows">
            {c.products.map((p, i) => <ProductRow key={p.id} p={p} index={i} />)}
          </div>
        </section>
        <div style={{ height: 112 }} />
      </div>
    </>
  );
}
