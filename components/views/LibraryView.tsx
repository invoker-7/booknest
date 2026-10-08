"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLang } from "@/components/LangProvider";
import { useStore } from "@/components/StoreProvider";
import ProductArt from "@/components/ProductArt";
import { Arrow, Download, Library } from "@/components/Icons";
import { Button, LinkButton, Empty, StatusTag, ProductTile } from "@/components/ui";
import { checkOrder } from "@/lib/apiClient";
import { categoryOf } from "@/lib/catalog";
import { openDownload } from "@/lib/download";
import { cartNoOf, fmtDate, pick } from "@/lib/format";
import { clearLocalOrders, forgetOrder, rememberOrder } from "@/lib/localOrders";
import type { Category, LocalOrder, LookupOrder, Product } from "@/lib/types";

type Tab = "purchases" | "saved";

/** หนึ่งแถวในคลัง: คำสั่งซื้อที่จำไว้ + ข้อมูลสินค้าล่าสุด (ถ้ายังวางขายอยู่) */
interface LibraryRow {
  o: LocalOrder;
  title: string;
  category: Category;
  cover: string | null | undefined;
  mine: string;
  latest: string;
  updated: boolean;
  date: string | null | undefined;
  pending: boolean;
}

// ซิงก์สถานะกับ server ไม่เกินจำนวนนี้ต่อการเปิดหน้า
const SYNC_LIMIT = 12;

function remember(o: LookupOrder): void {
  rememberOrder({
    orderNo: o.order_no,
    name: o.customer_name,
    email: o.customer_email,
    bookId: o.book.id,
    title: o.book.title_th,
    title_th: o.book.title_th,
    title_en: o.book.title_en,
    kind: o.book.kind,
    cover: o.book.cover,
    amount: o.amount,
    status: o.status,
    slip: Boolean(o.slip),
    purchasedAt: o.paid_at || o.created_at,
  });
}

/** คลังของฉัน — สินค้าที่ซื้อแล้ว + รายการที่บันทึก + ค้นหาคำสั่งซื้อเดิม */
interface LibraryViewProps {
  products: Product[];
}

export default function LibraryView({ products }: LibraryViewProps) {
  const { t, lang } = useLang();
  const { ready, orders, saved, refresh } = useStore();

  const [tab, setTab] = useState<Tab>("purchases");
  const [busy, setBusy] = useState("");
  const [failed, setFailed] = useState("");

  const synced = useRef(false);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  // ซิงก์สถานะล่าสุดจาก server หนึ่งครั้ง (ใช้อีเมลที่จำไว้ยืนยันตัวตน)
  useEffect(() => {
    if (!ready || synced.current) return;
    synced.current = true;
    (async () => {
      for (const o of orders.slice(-SYNC_LIMIT)) {
        if (!o.email) continue;
        const fresh = await checkOrder(o.orderNo, o.email);
        // server ไม่มีคำสั่งซื้อนี้แล้ว (เช่น ร้านลบไป): เอาออกจากคลังบนอุปกรณ์นี้ด้วย
        if (fresh === "missing") forgetOrder(o.orderNo);
        else if (fresh) remember(fresh);
      }
    })();
  }, [ready, orders]);

  async function download(o: LocalOrder) {
    setBusy(o.orderNo);
    setFailed("");
    const ok = await openDownload(o.orderNo, o.email);
    if (!ok) setFailed(o.orderNo);
    setBusy("");
  }

  function clearAll() {
    if (!window.confirm(t("clearConfirm"))) return;
    clearLocalOrders();
    refresh();
  }

  const rows: LibraryRow[] = orders.slice().reverse().map((o) => {
    const p = o.bookId ? byId.get(o.bookId) : undefined;
    const title = (p && pick(p, "title", lang)) || pick(o, "title", lang) || o.title || o.orderNo;
    const latest = p?.version || o.version || "—";
    const mine = o.version || latest;
    return {
      o, title,
      category: p?.category || categoryOf({ kind: o.kind }),
      // รูปล่าสุดจากแคตตาล็อกก่อน ถ้าสินค้าถูกถอดออกแล้วใช้รูปที่จำไว้ตอนซื้อ
      cover: p?.cover ?? o.cover,
      mine, latest,
      updated: Boolean(p) && mine !== latest,
      date: o.purchasedAt || o.savedAt,
      pending: o.status === "PENDING",
    };
  });


  const actions = (r: LibraryRow) =>
    r.pending ? (
      <LinkButton
        // แนบสลิปแล้ว: ไปหน้า QR ที่แสดงสถานะการตรวจสลิปได้เลย
        href={r.o.slip ? `/pay-qr?orders=${encodeURIComponent(r.o.orderNo)}` : `/pay/${encodeURIComponent(r.o.orderNo)}`}
        size="small"
        variant={r.o.slip ? "secondary" : "primary"}
      >
        {t(r.o.slip ? "viewPayStatus" : "completePayment")}
      </LinkButton>
    ) : (
      <>
        <Button
          size="small"
          onClick={() => download(r.o)}
          loading={busy === r.o.orderNo}
          loadingText={t("preparing")}
          aria-label={`${t("download")}: ${r.title}`}
        >
          <Download size={16} /> {t("download")}
        </Button>
        {r.o.bookId && (
          <LinkButton href={`/product/${r.o.bookId}`} variant="secondary" size="small" aria-label={`${t("details")}: ${r.title}`}>
            {t("details")}
          </LinkButton>
        )}
      </>
    );

  return (
    <div className="wrap">
      <header className="phead" style={{ borderBottom: 0, paddingBottom: 0 }}>
        <ol className="crumbs">
          <li><Link href="/">VECTOR</Link></li>
          <li aria-current="page">{t("navLibrary")}</li>
        </ol>
        <h1>{t("libraryTitle")}</h1>
        <p>{t("librarySub")}</p>
      </header>

      <div className="tabs" role="tablist" aria-label={t("libraryTitle")}>
        <button type="button" role="tab" aria-selected={tab === "purchases"} onClick={() => setTab("purchases")}>
          {t("tabPurchases")} <span className="mono">{ready ? orders.length : 0}</span>
        </button>
        <button type="button" role="tab" aria-selected={tab === "saved"} onClick={() => setTab("saved")}>
          {t("tabSaved")} <span className="mono">{ready ? saved.length : 0}</span>
        </button>
      </div>

      {!ready ? (
        <div aria-busy="true" style={{ minHeight: 240 }} />
      ) : tab === "saved" ? (
        saved.length === 0 ? (
          <Empty
            title={t("savedEmptyTitle")}
            body={t("savedEmptyBody")}
            action={<LinkButton href="/products">{t("browseProducts")} <Arrow size={18} /></LinkButton>}
          />
        ) : (
          <div className="ptiles compact">
            {saved.map((s) => <ProductTile key={s.id} p={byId.get(s.id) || { ...s, rating: 0, reviews: 0 }} />)}
          </div>
        )
      ) : rows.length === 0 ? (
        <Empty
          icon={<Library />}
          title={t("libEmptyTitle")}
          body={t("libEmptyBody")}
          action={<LinkButton href="/products">{t("browseProducts")} <Arrow size={18} /></LinkButton>}
        />
      ) : (
        <>
          {/* เดสก์ท็อป: ตาราง */}
          <table className="ltable">
            <thead>
              <tr>
                <th scope="col">{t("colProduct")}</th>
                <th scope="col">{t("colPurchased")}</th>
                <th scope="col">{t("colVersion")}</th>
                <th scope="col">{t("colLatest")}</th>
                <th scope="col">{t("colStatus")}</th>
                <th scope="col"><span className="sr-only">{t("colActions")}</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.o.orderNo}>
                  <td>
                    <div className="prod">
                      <div className="thumb"><ProductArt p={r} bare sizes="120px" /></div>
                      <div>
                        <strong>{r.title}</strong>
                        <span className="mono">{cartNoOf(r.o.orderNo)}</span>
                      </div>
                    </div>
                  </td>
                  <td className="mono">{fmtDate(r.date, lang)}</td>
                  <td className="mono">V{r.mine}</td>
                  <td className="mono">
                    V{r.latest}
                    {r.updated && <> <span className="tag amber">{t("newVersion")}</span></>}
                  </td>
                  <td>{r.o.status ? <StatusTag status={r.o.status} slip={r.o.slip} /> : "—"}</td>
                  <td>
                    <div className="acts">{actions(r)}</div>
                    {failed === r.o.orderNo && <p className="err" role="alert">{t("downloadFail")}</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* มือถือ: รายการแบบเรียงลง */}
          <ul className="lib-cards">
            {rows.map((r) => (
              <li className="lib-card" key={r.o.orderNo}>
                <div className="top">
                  <div className="thumb"><ProductArt p={r} bare sizes="120px" /></div>
                  <div>
                    {r.o.status && <StatusTag status={r.o.status} slip={r.o.slip} />}
                    <strong>{r.title}</strong>
                    <span className="mono">{cartNoOf(r.o.orderNo)}</span>
                  </div>
                </div>
                <dl>
                  <div><dt>{t("colPurchased")}</dt><dd>{fmtDate(r.date, lang)}</dd></div>
                  <div><dt>{t("colVersion")}</dt><dd className="mono">V{r.mine}</dd></div>
                  <div><dt>{t("colLatest")}</dt><dd className="mono">V{r.latest}{r.updated ? " ↑" : ""}</dd></div>
                </dl>
                <div className="acts">{actions(r)}</div>
                {failed === r.o.orderNo && <p className="err" role="alert">{t("downloadFail")}</p>}
              </li>
            ))}
          </ul>

          <div className="lib-foot">
            <span>{t("localNote")}</span>
            <button type="button" className="linkbtn" onClick={clearAll}>{t("clearLibrary")}</button>
          </div>
        </>
      )}
      <div style={{ height: 112 }} />
    </div>
  );
}
