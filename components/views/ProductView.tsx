"use client";

import Link from "next/link";
import { Fragment } from "react";
import type { ReactNode } from "react";
import { useLang } from "@/components/LangProvider";
import { useStore } from "@/components/StoreProvider";
import { useRequireLogin } from "@/components/AuthProvider";
import ProductArt from "@/components/ProductArt";
import ProductGallery from "@/components/ProductGallery";
import { Bookmark, Cart, Check, Lock, Star, Library } from "@/components/Icons";
import { Button, LinkButton, Meta, Price, Rating, ProductTile, PreviewBanner, Notice } from "@/components/ui";
import { FAQ, discountOf, stamp, imageOf } from "@/lib/catalog";
import { pick } from "@/lib/format";
import type { TKey } from "@/lib/i18n";
import type { Product } from "@/lib/types";

function Stars({ value }: { value: number }) {
  return (
    <span className="stars" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={16} filled={n <= Math.round(value)} className={n <= Math.round(value) ? "" : "off"} />
      ))}
    </span>
  );
}

function Doc({ no, label, title, children }: { no: string; label: string; title: string; children: ReactNode }) {
  return (
    <section className="doc" aria-labelledby={`doc-${no}`}>
      <div className="doc-label">
        <b>{no} — {label}</b>
        <h2 id={`doc-${no}`}>{title}</h2>
      </div>
      <div className="doc-body">{children}</div>
    </section>
  );
}

/**
 * คำอธิบายยาวของสินค้า: เจ้าของร้านพิมพ์เป็นข้อความธรรมดา
 * เว้นบรรทัด = ขึ้นย่อหน้าใหม่ และบรรทัดที่ขึ้นต้นด้วย "- " ต่อกัน = รายการ
 */
function LongText({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <>
      {blocks.map((block, i) => {
        const lines = block.split("\n").map((l) => l.trim());
        const items = lines.filter((l) => l.startsWith("- "));
        if (items.length === 0) return <p key={i}>{block}</p>;
        const lead = lines.filter((l) => !l.startsWith("- ")).join(" ");
        return (
          <Fragment key={i}>
            {lead && <p>{lead}</p>}
            <ul className="pd-list">{items.map((item) => <li key={item}>{item.slice(2)}</li>)}</ul>
          </Fragment>
        );
      })}
    </>
  );
}

interface ProductViewProps {
  product: Product;
  related: Product[];
  /** URL ภาพตัวอย่างเนื้อหา (หน้าตัวอย่าง ภาพหน้าจอ) */
  previews: string[];
  live: boolean;
}

export default function ProductView({ product: p, related, live, previews }: ProductViewProps) {
  const { t, lang } = useLang();
  const { ready, inCart, isSaved, addToCart, toggleSaved, owned, notify } = useStore();
  const requireLogin = useRequireLogin();

  const title = pick(p, "title", lang);
  const catLabel = t(`cat_${p.category}`);
  const off = discountOf(p);
  const order = ready ? owned.get(p.id) : null;
  const hasUpdate = order?.version && order.version !== p.version;
  const carted = ready && inCart(p.id);
  const savedNow = ready && isSaved(p.id);

  function add() {
    if (!requireLogin()) return;
    addToCart(p);
    notify(t("addedToCart"));
  }

  const primary = order ? (
    <LinkButton href="/library" block>
      <Library size={18} /> {t("ownedCta")}
    </LinkButton>
  ) : carted ? (
    <LinkButton href="/cart" variant="secondary" block>
      <Check size={18} /> {t("goToCart")}
    </LinkButton>
  ) : (
    <Button onClick={add} block>
      <Cart size={18} /> {t("addToCart")}
    </Button>
  );

  const saveBtn = (
    <button
      type="button"
      className="btn save"
      aria-pressed={savedNow}
      aria-label={savedNow ? t("wishlistRemove") : t("wishlistAdd")}
      title={savedNow ? t("wishlistRemove") : t("wishlistAdd")}
      onClick={() => requireLogin() && toggleSaved(p)}
    >
      <Bookmark filled={savedNow} />
    </button>
  );

  const specs: [TKey, string][] = [
    ["specFormat", p.format],
    ["specPlatform", t(`plat_${p.platform}`)],
    ["specVersion", p.version],
    ["specSize", p.file_size || "—"],
    ["specUpdated", stamp(p.updated)],
    ["specLicense", t(`lic_${p.license}`)],
    ["specDelivery", t("deliveryVal")],
  ];

  return (
    <>
      <PreviewBanner live={live} />
      <div className="wrap">
        <ol className="crumbs" style={{ marginTop: 24, marginBottom: 0 }}>
          <li><Link href="/">VECTOR</Link></li>
          <li><Link href="/products">{t("navProducts")}</Link></li>
          <li><Link href={`/products?cat=${p.category}`}>{catLabel}</Link></li>
        </ol>

        <div className="pd-top">
          <div>
            <ProductGallery
              cover={<ProductArt p={p} no={p.productNo} label={catLabel} title={title} sizes="(max-width: 900px) 100vw, 640px" priority />}
              coverSrc={imageOf(p)}
              previews={previews}
            />
          </div>

          <div className="pd-buy">
            <div className="pd-metarow">
              <Meta k="Product" v={p.productNo} />
              <Meta k="Version" v={p.version} />
              <Meta k="Updated" v={stamp(p.updated)} />
            </div>

            <h1>{title}</h1>
            <p className="pd-by">
              {t("by")}{" "}
              {p.creatorId ? (
                <Link href={`/creators/${p.creatorId}`}>{p.creatorName}</Link>
              ) : (
                <span>{pick(p, "author", lang)}</span>
              )}
              {" · "}{catLabel}
            </p>
            <p className="pd-short">{pick(p, "short", lang)}</p>

            <div className="pd-rating">
              <Rating value={p.rating} count={p.reviews} />
            </div>

            <div className="pd-pricebox">
              <Price p={p} size="lg" />
              {off > 0 && <span className="tag red">{t("save")} {off}%</span>}
            </div>

            {order && (
              <div className="pd-owned">
                <Notice tone={hasUpdate ? "warn" : "info"} title={hasUpdate ? t("updatedBadge") : t("owned")}>
                  {hasUpdate
                    ? `V${order.version} → V${p.version}`
                    : `${t("orderNo")} ${order.orderNo}`}
                </Notice>
              </div>
            )}

            <div className="pd-actions">
              {primary}
              {saveBtn}
            </div>
            <p className="pd-trust"><Lock size={16} /> {t("secureNote")}</p>

            <dl className="spec" aria-label={t("specs")}>
              {specs.map(([k, v]) => (
                <div key={k}>
                  <dt>{t(k)}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <Doc no="01" label="Overview" title={t("overview")}>
          <LongText text={pick(p, "long", lang)} />
        </Doc>

        <Doc no="02" label="Reviews" title={t("reviewsTitle")}>
          {p.reviews > 0 ? (
            <>
              <div className="rev-summary">
                <span className="rev-big">{p.rating.toFixed(1)}</span>
                <div>
                  <Stars value={p.rating} />
                  <p className="muted" style={{ marginTop: 6, fontSize: 14 }}>
                    {t("reviewsBasis")} {p.reviews.toLocaleString("en-US")} {t("reviews")}
                  </p>
                </div>
              </div>
              <p className="muted" style={{ marginTop: 20, fontSize: 15 }}>{t("reviewsLiveNote")}</p>
            </>
          ) : (
            <p className="muted">{t("noReviewsYet")}</p>
          )}
        </Doc>

        <Doc no="03" label="FAQ" title={t("faq")}>
          <div className="faq">
            {FAQ.map((k) => (
              <details key={k}>
                <summary>{t(`${k}Q`)} <span className="pm" aria-hidden="true" /></summary>
                <p>{t(`${k}A`)}</p>
              </details>
            ))}
          </div>
        </Doc>

        {related.length > 0 && (
          <section className="doc" style={{ display: "block" }} aria-labelledby="doc-06">
            <div className="doc-label" style={{ marginBottom: 32 }}>
              <b>06 — Related</b>
              <h2 id="doc-06">{t("related")}</h2>
            </div>
            <div className="ptiles compact">
              {related.map((r) => <ProductTile key={r.id} p={r} />)}
            </div>
          </section>
        )}
      </div>

      {/* มือถือ: ปุ่มหลักอยู่ล่างจอ กดถึงง่าย */}
      <div className="sticky-buy">
        <Price p={p} />
        {primary}
        {saveBtn}
      </div>
    </>
  );
}
