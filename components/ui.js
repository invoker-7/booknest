"use client";

import Link from "next/link";
import { useLang } from "./LangProvider";
import { useStore } from "./StoreProvider";
import Plate from "./Plate";
import { Arrow, Check, Spinner, Star, Alert, Info } from "./Icons";
import { money, pick } from "@/lib/format";
import { discountOf, stamp } from "@/lib/catalog";

/* ---------- หัวข้อส่วน: 01 — FEATURED ---------- */
export function SectionHead({ no, label, title, sub, action, as: H = "h2", id }) {
  return (
    <header className="sec-head">
      <div className="sec-label mono">
        {no && <span>{no}</span>}
        <span>{label}</span>
      </div>
      <div className="sec-row">
        <div>
          {title && <H className="sec-title" id={id}>{title}</H>}
          {sub && <p className="sec-sub">{sub}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}

/** ลิงก์ข้อความพร้อมลูกศร (แทนปุ่มรองในหลายจุด) */
export function TextLink({ href, children, className = "" }) {
  return (
    <Link href={href} className={`textlink ${className}`}>
      <span>{children}</span>
      <Arrow size={18} />
    </Link>
  );
}

/** ป้ายข้อมูลแบบ KEY / VALUE */
export function Meta({ k, v }) {
  return (
    <span className="meta mono">
      <span className="meta-k">{k}</span>
      <span className="meta-sep">/</span>
      <span className="meta-v">{v}</span>
    </span>
  );
}

export function Rating({ value, count, compact = false }) {
  const { t } = useLang();
  if (!value) return <span className="rating muted">{t("noReviewsYet")}</span>;
  return (
    <span className="rating" aria-label={`${value} / 5 · ${count} ${t("reviews")}`}>
      <Star size={14} />
      <strong>{Number(value).toFixed(1)}</strong>
      {!compact && <span className="muted">({count.toLocaleString("en-US")})</span>}
    </span>
  );
}

export function Price({ p, size }) {
  const { lang } = useLang();
  const off = discountOf(p);
  return (
    <span className={`price ${size || ""}`}>
      <strong>{money(p.price, lang)}</strong>
      {off > 0 && <s className="muted">{money(p.list_price, lang)}</s>}
    </span>
  );
}

/**
 * ปุ่ม: variant = primary | secondary | ghost | danger
 * loading แสดง spinner + ข้อความ และกันการกดซ้ำ
 */
export function Button({ variant = "primary", loading, loadingText, children, className = "", block, size, ...rest }) {
  return (
    <button
      className={`btn ${variant} ${block ? "block" : ""} ${size || ""} ${className}`}
      disabled={loading || rest.disabled}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <><Spinner /> <span>{loadingText || children}</span></> : children}
    </button>
  );
}

export function LinkButton({ variant = "primary", href, children, block, size, className = "", ...rest }) {
  return (
    <Link href={href} className={`btn ${variant} ${block ? "block" : ""} ${size || ""} ${className}`} {...rest}>
      {children}
    </Link>
  );
}

/* ---------- สถานะสินค้าในการ์ด: เป็นเจ้าของแล้ว / มีอัปเดต ---------- */
function OwnTag({ p }) {
  const { t } = useLang();
  const { owned } = useStore();
  const o = owned.get(p.id);
  if (!o) return null;
  const updated = o.version && p.version && o.version !== p.version;
  return (
    <span className={`tag ${updated ? "amber" : "blue"}`}>
      {updated ? t("updatedBadge") : <><Check size={12} /> {t("owned")}</>}
    </span>
  );
}

/** แถวสินค้าแบบแคตตาล็อก (ใช้ในหน้าแรกและมุมมองรายการ) */
export function ProductRow({ p, index }) {
  const { t, lang } = useLang();
  const title = pick(p, "title", lang);
  return (
    <article className="prow">
      <Link href={`/product/${p.id}`} className="prow-link" aria-label={title} />
      <div className="prow-no mono">{String(index + 1).padStart(2, "0")}</div>
      <div className="prow-plate">
        <Plate category={p.category} title={title} bare />
      </div>
      <div className="prow-main">
        <div className="prow-meta mono">
          <span>{t(`cat_${p.category}`)}</span>
          <span>V{p.version}</span>
          {p.creatorName && <span className="hide-sm">{p.creatorName}</span>}
        </div>
        <h3 className="prow-title">{title}</h3>
        <p className="prow-desc">{pick(p, "short", lang)}</p>
        <OwnTag p={p} />
      </div>
      <div className="prow-side">
        <Price p={p} />
        <Rating value={p.rating} count={p.reviews} />
        <span className="prow-arrow" aria-hidden="true"><Arrow /></span>
      </div>
    </article>
  );
}

/** ไทล์สินค้าแบบกริด — ไม่มีกรอบการ์ด ใช้เส้นบนเป็นตัวแบ่ง */
export function ProductTile({ p }) {
  const { t, lang } = useLang();
  const title = pick(p, "title", lang);
  return (
    <article className="ptile">
      <Link href={`/product/${p.id}`} className="ptile-link">
        <div className="ptile-plate">
          <Plate category={p.category} no={p.productNo} label={t(`cat_${p.category}`)} title={title} />
        </div>
        <div className="ptile-meta mono">
          <span>{t(`cat_${p.category}`)}</span>
          <span>V{p.version}</span>
        </div>
        <h3 className="ptile-title">{title}</h3>
        <p className="ptile-desc">{pick(p, "short", lang)}</p>
        <div className="ptile-foot">
          <Price p={p} />
          <Rating value={p.rating} count={p.reviews} compact />
        </div>
      </Link>
      <OwnTag p={p} />
    </article>
  );
}

export function Empty({ title, body, action, icon }) {
  return (
    <div className="empty" role="status">
      {icon && <div className="empty-icon">{icon}</div>}
      <h2 className="empty-title">{title}</h2>
      {body && <p className="empty-body">{body}</p>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}

/** ขั้นตอนการซื้อ: ตะกร้า → ข้อมูล → ชำระเงิน → ยืนยัน → ดาวน์โหลด */
export function Steps({ active }) {
  const { t } = useLang();
  const labels = [t("stepCart"), t("stepInfo"), t("stepPay"), t("stepDone"), t("stepDownload")];
  return (
    <ol className="steps mono" aria-label="Checkout progress">
      {labels.map((label, i) => {
        const state = i < active ? "done" : i === active ? "current" : "todo";
        return (
          <li key={label} className={state} aria-current={state === "current" ? "step" : undefined}>
            <span className="steps-n">{state === "done" ? <Check size={12} /> : String(i + 1).padStart(2, "0")}</span>
            <span className="steps-l">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function StatusTag({ status }) {
  const { t } = useLang();
  const tone = status === "PENDING" ? "amber" : status === "COMPLETED" ? "blue" : "neutral";
  return (
    <span className={`tag ${tone}`}>
      <span className="tag-dot" aria-hidden="true" />
      {t(`st_${status}`)}
    </span>
  );
}

export function Notice({ tone = "info", title, children }) {
  return (
    <div className={`notice ${tone}`} role={tone === "error" ? "alert" : "status"}>
      <span className="notice-icon">{tone === "info" ? <Info size={18} /> : <Alert size={18} />}</span>
      <div>
        {title && <strong className="notice-title">{title}</strong>}
        <div>{children}</div>
      </div>
    </div>
  );
}

/** แถบแจ้งว่ากำลังแสดงแคตตาล็อกตัวอย่าง */
export function PreviewBanner({ live }) {
  const { t } = useLang();
  if (live) return null;
  return (
    <div className="preview-banner mono" role="status">
      <Info size={14} /> {t("previewBanner")}
    </div>
  );
}

export function DateStamp({ value }) {
  return <span className="mono">{stamp(value)}</span>;
}

export function SetupNotice() {
  const { t } = useLang();
  return (
    <div className="wrap page-pad">
      <Notice tone="warn" title={t("setupTitle")}>{t("setupBody")}</Notice>
    </div>
  );
}
