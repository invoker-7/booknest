"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/components/LangProvider";
import Plate from "@/components/Plate";
import { Check, Download, Library, Print } from "@/components/Icons";
import { Button, LinkButton, Steps, Notice, Empty } from "@/components/ui";
import { categoryOf } from "@/lib/catalog";
import { openDownload } from "@/lib/download";
import { pick } from "@/lib/format";
import { findReceipt } from "@/lib/localOrders";
import type { BookRow, Receipt, SafeOrder } from "@/lib/types";

interface CompleteBodyProps {
  receipt: Receipt;
  /** false เมื่อเปิดจากอุปกรณ์อื่น (ไม่รู้อีเมลผู้ซื้อ) ให้ไปค้นในคลังแทน */
  canDownload?: boolean;
  shownEmail?: string;
}

/**
 * หน้ายืนยันหลังชำระเงิน — "MISSION COMPLETE"
 */
export function CompleteBody({ receipt, canDownload = true, shownEmail }: CompleteBodyProps) {
  const { t, lang } = useLang();
  const [busy, setBusy] = useState("");
  const [failed, setFailed] = useState("");

  const many = receipt.orders.length > 1;
  const emailFailed = receipt.orders.some((o) => o.emailStatus === "failed");
  const emailMocked = receipt.orders.some((o) => o.emailStatus === "mock");

  async function download(orderNo: string) {
    setBusy(orderNo);
    setFailed("");
    const ok = await openDownload(orderNo, receipt.email);
    if (!ok) setFailed(orderNo);
    setBusy("");
  }

  return (
    <div className="wrap page-pad">
      <Steps active={4} />

      <section className="done-hero" aria-labelledby="done-title">
        <span className="done-label"><Check size={16} /> {t("missionComplete")}</span>
        <h1 id="done-title">{many ? t("readyMany") : t("ready")}</h1>
        <p>
          {t("readySub")} <strong>{shownEmail || receipt.email}</strong>
        </p>

        <div className="done-actions">
          {canDownload ? (
            !many && (
              <Button
                onClick={() => download(receipt.orders[0].orderNo)}
                loading={busy === receipt.orders[0].orderNo}
                loadingText={t("preparing")}
              >
                <Download size={18} /> {t("downloadProduct")}
              </Button>
            )
          ) : (
            <LinkButton href={`/library?order=${encodeURIComponent(receipt.orders[0].orderNo)}`}>
              {t("findInLibrary")}
            </LinkButton>
          )}
          <LinkButton href="/library" variant="secondary"><Library size={18} /> {t("viewLibrary")}</LinkButton>
          {canDownload && (
            <LinkButton href={`/receipt/${encodeURIComponent(receipt.id)}`} variant="secondary">
              <Print size={18} /> {t("viewReceipt")}
            </LinkButton>
          )}
        </div>

        {!many && failed && (
          <div style={{ marginTop: 16, maxWidth: 560 }}>
            <Notice tone="error">{t("downloadFail")}</Notice>
          </div>
        )}
      </section>

      <ul className="dl-list" aria-label={t("products")}>
        {receipt.orders.map((o) => (
          <li className="dl-item" key={o.orderNo}>
            <div className="thumb"><Plate category={o.category} title="" bare /></div>
            <div>
              <h2>{pick(o, "title", lang)}</h2>
              <p className="mono">{o.orderNo}{o.version ? ` · V${o.version}` : ""}</p>
              {failed === o.orderNo && many && <p className="err" role="alert">{t("downloadFail")}</p>}
            </div>
            <div>
              {canDownload && many && (
                <Button
                  variant="secondary"
                  onClick={() => download(o.orderNo)}
                  loading={busy === o.orderNo}
                  loadingText={t("preparing")}
                >
                  <Download size={18} /> {t("downloadAll")}
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <div style={{ marginTop: 32, display: "grid", gap: 12, maxWidth: 720 }}>
        {emailFailed && <Notice tone="warn">{t("emailFailed")}</Notice>}
        {emailMocked && <Notice tone="info">{t("emailMocked")}</Notice>}
        <Notice tone="info">{canDownload ? t("linkNote") : t("otherDevice")}</Notice>
      </div>
    </div>
  );
}

/** /complete/[id] — อ่านใบเสร็จจากเบราว์เซอร์ */
export default function CompleteView({ id }: { id: string }) {
  const { t } = useLang();
  // undefined = ยังไม่ได้อ่าน localStorage, null = ไม่พบ
  const [receipt, setReceipt] = useState<Receipt | null | undefined>(undefined);

  useEffect(() => {
    setReceipt(findReceipt(id));
  }, [id]);

  if (receipt === undefined) return <div className="wrap page-pad" aria-busy="true" />;
  if (!receipt) {
    return (
      <div className="wrap page-pad">
        <Empty
          title={t("receiptMissing")}
          body={t("otherDevice")}
          action={<LinkButton href={`/library?order=${encodeURIComponent(id)}`}>{t("findInLibrary")}</LinkButton>}
        />
      </div>
    );
  }
  return <CompleteBody receipt={receipt} />;
}

/** /success/[orderNo] — คำสั่งซื้อเดียว ข้อมูลจาก server (ไม่มีอีเมลเต็ม) */
interface SingleOrderCompleteProps {
  order: SafeOrder;
  book: BookRow;
  localEmail: string;
}

export function SingleOrderComplete({ order, book, localEmail }: SingleOrderCompleteProps) {
  const mocked = order.email_note?.includes("SMTP_USER") || order.email_note?.includes("SMTP_PASS");
  const receipt: Receipt = {
    id: order.order_no,
    email: localEmail || "",
    orders: [{
      orderNo: order.order_no,
      bookId: book.id,
      title_th: book.title_th,
      title_en: book.title_en,
      category: categoryOf(book),
      version: book.version || "1.0",
      emailStatus: !order.email_sent ? "failed" : mocked ? "mock" : "sent",
    }],
  };
  return <CompleteBody receipt={receipt} canDownload={Boolean(localEmail)} shownEmail={localEmail || order.masked_email} />;
}
