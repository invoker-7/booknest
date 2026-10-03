"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useLang } from "@/components/LangProvider";
import { useStore } from "@/components/StoreProvider";
import Plate from "@/components/Plate";
import { Alert, Arrow, Download, Library } from "@/components/Icons";
import { Button, LinkButton, Empty, StatusTag, Notice, ProductTile } from "@/components/ui";
import { lookupOrder } from "@/lib/apiClient";
import { categoryOf } from "@/lib/catalog";
import { openDownload } from "@/lib/download";
import { fmtDate, isEmail, pick } from "@/lib/format";
import { clearLocalOrders, rememberOrder } from "@/lib/localOrders";
import type { Category, LocalOrder, LookupOrder, Product } from "@/lib/types";

type Tab = "purchases" | "saved";
type LookupResult = "" | "ok" | "fail";

/** หนึ่งแถวในคลัง: คำสั่งซื้อที่จำไว้ + ข้อมูลสินค้าล่าสุด (ถ้ายังวางขายอยู่) */
interface LibraryRow {
  o: LocalOrder;
  title: string;
  category: Category;
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
    amount: o.amount,
    status: o.status,
    purchasedAt: o.paid_at || o.created_at,
  });
}

/** คลังของฉัน — สินค้าที่ซื้อแล้ว + รายการที่บันทึก + ค้นหาคำสั่งซื้อเดิม */
export default function LibraryView({ products }: { products: Product[] }) {
  const { t, lang } = useLang();
  const params = useSearchParams();
  const { ready, orders, saved, refresh } = useStore();

  const [tab, setTab] = useState<Tab>("purchases");
  const [busy, setBusy] = useState("");
  const [failed, setFailed] = useState("");

  const [no, setNo] = useState("");
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [finding, setFinding] = useState(false);
  const [result, setResult] = useState<LookupResult>("");
  const synced = useRef(false);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  // ?order=ORD-... เติมลงฟอร์มค้นหา
  useEffect(() => {
    const fromUrl = params.get("order");
    if (fromUrl) setNo(fromUrl);
  }, [params]);

  // ซิงก์สถานะล่าสุดจาก server หนึ่งครั้ง (ใช้อีเมลที่จำไว้ยืนยันตัวตน)
  useEffect(() => {
    if (!ready || synced.current) return;
    synced.current = true;
    (async () => {
      for (const o of orders.slice(-SYNC_LIMIT)) {
        if (!o.email) continue;
        const fresh = await lookupOrder(o.orderNo, o.email);
        if (fresh) remember(fresh);
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

  async function find(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    setResult("");
    if (!no.trim() || !isEmail(email)) return;
    setFinding(true);
    const order = await lookupOrder(no.trim(), email.trim());
    if (order) {
      remember(order);
      setResult("ok");
      setNo("");
      setTouched(false);
      setTab("purchases");
    } else {
      setResult("fail");
    }
    setFinding(false);
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
      mine, latest,
      updated: Boolean(p) && mine !== latest,
      date: o.purchasedAt || o.savedAt,
      pending: o.status === "PENDING",
    };
  });

  const noBad = touched && !no.trim();
  const emailBad = touched && !isEmail(email);

  const actions = (r: LibraryRow) =>
    r.pending ? (
      <LinkButton href={`/pay/${encodeURIComponent(r.o.orderNo)}`} size="small">{t("completePayment")}</LinkButton>
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
                      <div className="thumb"><Plate category={r.category} title="" bare /></div>
                      <div>
                        <strong>{r.title}</strong>
                        <span className="mono">{r.o.orderNo}</span>
                      </div>
                    </div>
                  </td>
                  <td className="mono">{fmtDate(r.date, lang)}</td>
                  <td className="mono">V{r.mine}</td>
                  <td className="mono">
                    V{r.latest}
                    {r.updated && <> <span className="tag amber">{t("newVersion")}</span></>}
                  </td>
                  <td>{r.o.status ? <StatusTag status={r.o.status} /> : "—"}</td>
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
                  <div className="thumb"><Plate category={r.category} title="" bare /></div>
                  <div>
                    {r.o.status && <StatusTag status={r.o.status} />}
                    <strong>{r.title}</strong>
                    <span className="mono">{r.o.orderNo}</span>
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

      <section className="lookup" aria-labelledby="lookup-title">
        <div className="doc-label">
          <b>Lookup</b>
          <h2 id="lookup-title">{t("findPurchase")}</h2>
          <p style={{ fontFamily: "var(--sans)", textTransform: "none", letterSpacing: 0, fontSize: 14, marginTop: 8 }}>
            {t("findPurchaseSub")}
          </p>
        </div>
        <div>
          <form onSubmit={find} noValidate>
            <div className={`field${noBad ? " invalid" : ""}`}>
              <label htmlFor="lk-no">{t("trackNo")}</label>
              <input
                id="lk-no"
                type="text"
                autoCapitalize="characters"
                autoComplete="off"
                placeholder={t("trackNoPh")}
                value={no}
                onChange={(e) => setNo(e.target.value)}
                aria-invalid={noBad || undefined}
              />
              <span className="err"><Alert size={14} /> {t("errOrderNo")}</span>
            </div>
            <div className={`field${emailBad ? " invalid" : ""}`}>
              <label htmlFor="lk-email">{t("email")}</label>
              <input
                id="lk-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder={t("emailPh")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={emailBad || undefined}
              />
              <span className="err"><Alert size={14} /> {t("errEmail")}</span>
            </div>
            <Button type="submit" variant="secondary" loading={finding} loadingText={t("loading")}>
              {t("trackBtn")}
            </Button>
          </form>
          {result === "fail" && <Notice tone="error">{t("trackFail")}</Notice>}
          {result === "ok" && <Notice tone="info">{t("trackAdded")}</Notice>}
        </div>
      </section>
      <div style={{ height: 112 }} />
    </div>
  );
}
