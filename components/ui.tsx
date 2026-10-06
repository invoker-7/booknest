"use client";

import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ComponentProps, type ElementType, type ReactNode } from "react";
import { useLang } from "./LangProvider";
import { useStore } from "./StoreProvider";
import ProductArt from "./ProductArt";
import { Arrow, Check, Spinner, Star, Alert, Info } from "./Icons";
import { money, pick } from "@/lib/format";
import { discountOf } from "@/lib/catalog";
import type { OrderStatus, PayOptions, Product } from "@/lib/types";

type ButtonVariant = "primary" | "success" | "secondary" | "ghost" | "danger" | "light" | "outline-light";
type ButtonSize = "small";

/** ข้อมูลขั้นต่ำที่การ์ดสินค้าต้องใช้ — รับได้ทั้ง Product เต็มและรายการที่บันทึกไว้ */
export type ProductSummary = Pick<
  Product,
  "id" | "title_th" | "title_en" | "category" | "version" | "price" | "list_price" | "productNo" | "rating" | "reviews"
> & {
  short_th?: string;
  short_en?: string;
  creatorName?: string | null;
  cover?: string | null;
};

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

/* ---------- หัวข้อส่วน: 01 — FEATURED ---------- */
interface SectionHeadProps {
  no?: string;
  label: string;
  title?: ReactNode;
  sub?: ReactNode;
  action?: ReactNode;
  as?: ElementType;
  id?: string;
}

export function SectionHead({ no, label, title, sub, action, as: H = "h2", id }: SectionHeadProps) {
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
export function TextLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={cx("textlink", className)}>
      <span>{children}</span>
      <Arrow size={18} />
    </Link>
  );
}

/** ป้ายข้อมูลแบบ KEY / VALUE */
export function Meta({ k, v }: { k: string; v: ReactNode }) {
  return (
    <span className="meta mono">
      <span className="meta-k">{k}</span>
      <span className="meta-sep">/</span>
      <span className="meta-v">{v}</span>
    </span>
  );
}

export function Rating({ value, count, compact = false }: { value: number; count: number; compact?: boolean }) {
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

export function Price({ p, size }: { p: { price: number; list_price?: number | null }; size?: "lg" }) {
  const { lang } = useLang();
  const off = discountOf(p);
  return (
    <span className={cx("price", size)}>
      <strong>{money(p.price, lang)}</strong>
      {off > 0 && <s className="muted">{money(p.list_price, lang)}</s>}
    </span>
  );
}

/**
 * ปุ่ม: variant = primary | success (ยืนยัน/อนุมัติ) | secondary | ghost | danger
 * loading แสดง spinner + ข้อความ และกันการกดซ้ำ
 */
interface ButtonStyleProps {
  variant?: ButtonVariant;
  block?: boolean;
  size?: ButtonSize;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonStyleProps {
  loading?: boolean;
  loadingText?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", loading = false, loadingText, children, className, block, size, type = "button", disabled, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx("btn", variant, block && "block", size, className)}
      disabled={loading || disabled}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <><Spinner /> <span>{loadingText || children}</span></> : children}
    </button>
  );
});

type LinkButtonProps = ComponentProps<typeof Link> & ButtonStyleProps;

export function LinkButton({ variant = "primary", block, size, className, children, ...rest }: LinkButtonProps) {
  return (
    <Link className={cx("btn", variant, block && "block", size, className)} {...rest}>
      {children}
    </Link>
  );
}

/* ---------- สถานะสินค้าในการ์ด: เป็นเจ้าของแล้ว / มีอัปเดต ---------- */
function OwnTag({ p }: { p: ProductSummary }) {
  const { t } = useLang();
  const { owned } = useStore();
  const o = owned.get(p.id);
  if (!o) return null;
  const updated = o.version && p.version && o.version !== p.version;
  return (
    <span className={cx("tag", updated ? "amber" : "blue")}>
      {updated ? t("updatedBadge") : <><Check size={12} /> {t("owned")}</>}
    </span>
  );
}

/** แถวสินค้าแบบแคตตาล็อก (ใช้ในหน้าแรกและมุมมองรายการ) */
export function ProductRow({ p, index }: { p: ProductSummary; index: number }) {
  const { t, lang } = useLang();
  const title = pick(p, "title", lang);
  return (
    <article className="prow">
      <Link href={`/product/${p.id}`} className="prow-link" aria-label={title} />
      <div className="prow-no mono">{String(index + 1).padStart(2, "0")}</div>
      <div className="prow-plate">
        <ProductArt p={p} title={title} bare sizes="(max-width: 760px) 40vw, 200px" />
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
export function ProductTile({ p }: { p: ProductSummary }) {
  const { t, lang } = useLang();
  const title = pick(p, "title", lang);
  return (
    <article className="ptile">
      <Link href={`/product/${p.id}`} className="ptile-link">
        <div className="ptile-plate">
          <ProductArt p={p} no={p.productNo} label={t(`cat_${p.category}`)} title={title} sizes="(max-width: 760px) 100vw, 400px" />
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

interface EmptyProps {
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}

export function Empty({ title, body, action, icon }: EmptyProps) {
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
export function Steps({ active }: { active: number }) {
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

/** slip = ยังไม่ได้จ่ายแต่แนบสลิปแล้ว: แสดงว่า "รอร้านตรวจสลิป" แทน "รอชำระเงิน" */
export function StatusTag({ status, slip = false }: { status: OrderStatus; slip?: boolean }) {
  const { t } = useLang();
  const review = status === "PENDING" && slip;
  const tone = review ? "neutral" : status === "PENDING" ? "amber" : status === "COMPLETED" ? "blue" : "neutral";
  return (
    <span className={cx("tag", tone)}>
      <span className="tag-dot" aria-hidden="true" />
      {t(review ? "st_REVIEW" : `st_${status}`)}
    </span>
  );
}

interface NoticeProps {
  tone?: "info" | "warn" | "error";
  title?: ReactNode;
  children: ReactNode;
}

export function Notice({ tone = "info", title, children }: NoticeProps) {
  return (
    <div className={cx("notice", tone)} role={tone === "error" ? "alert" : "status"}>
      <span className="notice-icon">{tone === "info" ? <Info size={18} /> : <Alert size={18} />}</span>
      <div>
        {title && <strong className="notice-title">{title}</strong>}
        <div>{children}</div>
      </div>
    </div>
  );
}

/** กล่องบอกวิธีชำระเงินของร้าน: QR พร้อมเพย์ หรือโหมดทดสอบในเครื่อง — ไม่แสดงเมื่อร้านยังไม่เปิดรับชำระเงิน */
export function PayNote({ pay }: { pay: PayOptions }) {
  const { t } = useLang();
  if (!pay.method) return null;
  const mock = pay.method === "mock";
  return (
    <div className="paydemo">
      <span className={`tag ${mock ? "amber" : "blue"}`}>{mock ? t("demoTag") : "PROMPTPAY"}</span>
      <p>{t(mock ? "demoBody" : "promptPayBody")}</p>
    </div>
  );
}

/** แถบแจ้งว่าร้านยังไม่ได้เชื่อมต่อฐานข้อมูล */
export function PreviewBanner({ live }: { live: boolean }) {
  const { t } = useLang();
  if (live) return null;
  return (
    <div className="preview-banner mono" role="status">
      <Info size={14} /> {t("previewBanner")}
    </div>
  );
}

export function SetupNotice() {
  const { t } = useLang();
  return (
    <div className="wrap page-pad">
      <Notice tone="warn" title={t("setupTitle")}>{t("setupBody")}</Notice>
    </div>
  );
}
