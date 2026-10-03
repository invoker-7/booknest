"use client";

import Link from "next/link";
import { useLang } from "@/components/LangProvider";
import Plate, { HeroArt } from "@/components/Plate";
import { Arrow } from "@/components/Icons";
import { SectionHead, TextLink, LinkButton, ProductRow, PreviewBanner, Meta, Price, Rating, Empty } from "@/components/ui";
import { CATEGORIES, sortProducts, stamp } from "@/lib/catalog";
import { ARCHIVE } from "@/lib/archive";
import { fmtDate, pick } from "@/lib/format";
import type { Product } from "@/lib/types";

interface HomeViewProps {
  products: Product[];
  creatorCount: number;
  live: boolean;
}

const PRINCIPLES = [
  { title: "p1Title", body: "p1Body" },
  { title: "p2Title", body: "p2Body" },
  { title: "p3Title", body: "p3Body" },
] as const;

export default function HomeView({ products, creatorCount, live }: HomeViewProps) {
  const { t, lang } = useLang();

  const ranked = sortProducts(products, "rating");
  const spotlight = ranked[0];
  const featured = products.filter((p) => p.id !== spotlight?.id).slice(0, 4);

  const rated = products.filter((p) => p.reviews > 0);
  const totalReviews = rated.reduce((s, p) => s + p.reviews, 0);
  const avg = totalReviews
    ? (rated.reduce((s, p) => s + p.rating * p.reviews, 0) / totalReviews).toFixed(1)
    : "—";

  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, products.filter((p) => p.category === c).length]));
  const articles = ARCHIVE.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);

  return (
    <>
      <PreviewBanner live={live} />

      <section className="hero" aria-labelledby="hero-title">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <div className="hero-label mono">
              <span>VECTOR</span>
              <span>CATALOG / {stamp(new Date())}</span>
            </div>
            <h1 id="hero-title">
              {t("heroTitle1")}
              <span>{t("heroTitle2")}</span>
            </h1>
            <p className="hero-sub">{t("heroSub")}</p>
            <div className="hero-cta">
              <LinkButton href="/products" variant="light">
                {t("heroCta")} <Arrow size={18} />
              </LinkButton>
              <TextLink href="/about" className="light">{t("heroCta2")}</TextLink>
            </div>
          </div>
          <div className="hero-art-wrap">
            <HeroArt />
          </div>
        </div>
        <div className="hero-strip mono">
          <dl className="wrap">
            <div><dt>{t("statProducts")}</dt><dd>{products.length}</dd></div>
            <div><dt>{t("statCreators")}</dt><dd>{creatorCount || "—"}</dd></div>
            <div><dt>{t("statRating")}</dt><dd>{avg}</dd></div>
            <div><dt>{t("statDelivery")}</dt><dd>{t("statDeliveryVal")}</dd></div>
          </dl>
        </div>
      </section>

      {products.length === 0 ? (
        <div className="wrap page-pad">
          <Empty title={t("noResultTitle")} body={t("noCreatorsBody")} />
        </div>
      ) : (
        <>
          <section className="section wrap" aria-labelledby="sec-featured">
            <SectionHead
              no="01"
              label="Featured"
              id="sec-featured"
              title={t("featured")}
              sub={t("featuredSub")}
              action={<TextLink href="/products">{t("viewAll")}</TextLink>}
            />
            <div className="prows">
              {featured.map((p, i) => <ProductRow key={p.id} p={p} index={i} />)}
            </div>
          </section>

          {spotlight && (
            <section className="feature-band" aria-label={pick(spotlight, "title", lang)}>
              <div className="wrap feature-band-grid">
                <div className="feature-band-plate">
                  <Plate
                    category={spotlight.category}
                    no={spotlight.productNo}
                    label={t(`cat_${spotlight.category}`)}
                    title={pick(spotlight, "title", lang)}
                  />
                </div>
                <div className="feature-band-copy">
                  <div className="pd-metarow">
                    <Meta k="Product" v={spotlight.productNo} />
                    <Meta k="Version" v={spotlight.version} />
                    <Meta k="Updated" v={stamp(spotlight.updated)} />
                  </div>
                  <h2>{pick(spotlight, "title", lang)}</h2>
                  <p>{pick(spotlight, "long", lang)}</p>
                  <div className="pd-rating">
                    <Price p={spotlight} />
                    <Rating value={spotlight.rating} count={spotlight.reviews} />
                  </div>
                  <div><TextLink href={`/product/${spotlight.id}`}>{t("details")}</TextLink></div>
                </div>
              </div>
            </section>
          )}

          <section className="section wrap" aria-labelledby="sec-cats">
            <SectionHead no="02" label="Index" id="sec-cats" title={t("byCategory")} />
            <div className="cat-index">
              {CATEGORIES.map((c, i) => (
                <Link key={c} href={`/products?cat=${c}`} className="cat-cell">
                  <div className="mono">
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    <span>{counts[c]} {t("categoryCount")}</span>
                  </div>
                  <h3>{t(`cat_${c}`)} <Arrow /></h3>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}

      <section className="section wrap" aria-labelledby="sec-principles">
        <SectionHead no="03" label="Principles" id="sec-principles" title={t("principles")} />
        <div className="principles">
          {PRINCIPLES.map((item, i) => (
            <div className="principle" key={item.title}>
              <span className="mono">P / {String(i + 1).padStart(2, "0")}</span>
              <h3>{t(item.title)}</h3>
              <p>{t(item.body)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section wrap" aria-labelledby="sec-archive">
        <SectionHead
          no="04"
          label="Archive"
          id="sec-archive"
          title={t("latestArchive")}
          action={<TextLink href="/archive">{t("viewAll")}</TextLink>}
        />
        <ol className="alist">
          {articles.map((a, i) => (
            <li className="aitem" key={a.slug}>
              <div className="aitem-no">{String(i + 1).padStart(2, "0")}</div>
              <div className="aitem-type">{t(`type_${a.type}`)}</div>
              <div>
                <h3><Link href={`/archive/${a.slug}`}>{pick(a, "title", lang)}</Link></h3>
                <p>{pick(a, "dek", lang)}</p>
              </div>
              <div className="aitem-date">{fmtDate(a.date, lang)}</div>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
