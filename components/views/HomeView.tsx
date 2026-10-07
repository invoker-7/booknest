"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { useLang } from "@/components/LangProvider";
import ProductArt from "@/components/ProductArt";
import { Arrow, ArrowLeft } from "@/components/Icons";
import { SectionHead, TextLink, LinkButton, PreviewBanner, Empty } from "@/components/ui";
import { CATEGORIES, sortProducts, stamp } from "@/lib/catalog";
import { ARCHIVE } from "@/lib/archive";
import { fmtDate, money, pick } from "@/lib/format";
import type { Product } from "@/lib/types";

interface HomeViewProps {
  products: Product[];
  creatorCount: number;
  live: boolean;
}

// ภาพประกอบหน้าแรกอยู่ใน public/home (สาธารณสมบัติ CC0 — ที่มาอยู่ใน public/home/CREDITS.md)
const WHY = [
  { title: "p1Title", body: "p1Body", img: "/home/why-spec.jpg" },
  { title: "p2Title", body: "p2Body", img: "/home/why-delivery.jpg" },
  { title: "p3Title", body: "p3Body", img: "/home/why-creators.jpg" },
] as const;

const STORY_IMAGES = ["/home/story-1.jpg", "/home/story-2.jpg", "/home/story-3.jpg"];

const SHOWCASE_SIZE = 5;

/** โชว์เคสสินค้าเด่น: เลื่อนด้วยนิ้ว/ล้อเมาส์ได้เอง (scroll-snap) ปุ่มแค่สั่งเลื่อนทีละใบ */
function Showcase({ items }: { items: Product[] }) {
  const { t, lang } = useLang();
  const track = useRef<HTMLDivElement>(null);

  const step = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div className="showcase">
      <div className="showcase-track" ref={track}>
        {items.map((p, i) => {
          const title = pick(p, "title", lang);
          return (
            <article className="slide" key={p.id}>
              <ProductArt p={p} bare sizes="(max-width: 760px) 100vw, 760px" priority={i === 0} />
              <div className="slide-overlay">
                <div className="slide-meta mono">
                  <span>{t(`cat_${p.category}`)}</span>
                  <span>{money(p.price, lang)}</span>
                </div>
                <h3><Link href={`/product/${p.id}`}>{title}</Link></h3>
                <p>{pick(p, "short", lang)}</p>
              </div>
            </article>
          );
        })}
      </div>
      {items.length > 1 && (
        <div className="showcase-nav">
          <button type="button" onClick={() => step(-1)} aria-label={t("admPrev")}><ArrowLeft size={20} /></button>
          <button type="button" onClick={() => step(1)} aria-label={t("admNext")}><Arrow size={20} /></button>
        </div>
      )}
    </div>
  );
}

export default function HomeView({ products, creatorCount, live }: HomeViewProps) {
  const { t, lang } = useLang();

  const showcase = sortProducts(products, "rating").slice(0, SHOWCASE_SIZE);

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
        <Image className="hero-img" src="/home/hero.jpg" alt="" fill priority sizes="100vw" />
        <div className="wrap hero-body">
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
            <LinkButton href="/about" variant="outline-light">{t("heroCta2")}</LinkButton>
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
          <section className="section wrap lead" aria-labelledby="sec-featured">
            <div className="lead-copy">
              <div className="sec-label mono"><span>Featured</span></div>
              <h2 id="sec-featured">{t("homeStatement")}</h2>
              <p>{t("featuredSub")}</p>
              <div>
                <LinkButton href="/products">{t("heroCta")} <Arrow size={18} /></LinkButton>
              </div>
            </div>
            <Showcase items={showcase} />
          </section>

          <section className="band" aria-labelledby="sec-cats">
            <div className="wrap">
              <SectionHead
                label="Index"
                id="sec-cats"
                title={t("byCategory")}
                action={<TextLink href="/products">{t("viewAll")}</TextLink>}
              />
              <div className="tiles">
                {CATEGORIES.map((c) => (
                  <Link key={c} href={`/products?cat=${c}`} className="tile">
                    <Image src={`/home/cat-${c}.jpg`} alt="" fill sizes="(max-width: 760px) 50vw, 320px" />
                    <span className="tile-count mono">{counts[c]} {t("categoryCount")}</span>
                    <h3>{t(`cat_${c}`)} <Arrow /></h3>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      <section className="section wrap" aria-labelledby="sec-why">
        <div className="lead-copy wide">
          <div className="sec-label mono"><span>Principles</span></div>
          <h2 id="sec-why">{t("whyStatement")}</h2>
          <div>
            <LinkButton href="/about" variant="secondary">{t("heroCta2")}</LinkButton>
          </div>
        </div>
        <div className="why">
          {WHY.map((item, i) => (
            <article className="why-tile" key={item.title}>
              <Image src={item.img} alt="" fill sizes="(max-width: 760px) 100vw, 420px" />
              <div className="why-overlay">
                <span className="mono">P / {String(i + 1).padStart(2, "0")}</span>
                <h3>{t(item.title)}</h3>
                <p>{t(item.body)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="band band-end" aria-labelledby="sec-archive">
        <div className="wrap">
          <SectionHead
            label="Archive"
            id="sec-archive"
            title={t("latestArchive")}
            action={<TextLink href="/archive">{t("viewAll")}</TextLink>}
          />
          <div className={articles.length === 1 ? "stories solo" : "stories"}>
            {articles.map((a, i) => (
              <article className="story" key={a.slug}>
                <div className="story-img">
                  <Image src={STORY_IMAGES[i % STORY_IMAGES.length]} alt="" fill sizes="(max-width: 760px) 100vw, 640px" />
                </div>
                <div className="story-body">
                  <div className="story-meta mono">
                    <span>{fmtDate(a.date, lang)}</span>
                    <span>{t(`type_${a.type}`)}</span>
                  </div>
                  <h3><Link href={`/archive/${a.slug}`}>{pick(a, "title", lang)}</Link></h3>
                  <p>{pick(a, "dek", lang)}</p>
                  <span className="story-more" aria-hidden="true">{t("readMore")} <Arrow size={16} /></span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
