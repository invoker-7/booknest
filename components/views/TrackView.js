"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useLang } from "@/components/LangProvider";
import Cover from "@/components/Cover";
import { StatusBadge, Timeline } from "@/components/Pieces";
import { Download } from "@/components/Icons";
import { fmtDate, fmtTime, isEmail, money, pick } from "@/lib/format";
import { findLocalOrder, rememberOrder } from "@/lib/localOrders";

export default function TrackView() {
  const { t, lang } = useLang();
  const params = useSearchParams();

  const [orderNo, setOrderNo] = useState("");
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkMsg, setLinkMsg] = useState("");

  // เติมค่าจาก ?order= และจากรายการที่จำไว้ในเครื่อง
  useEffect(() => {
    const fromUrl = params.get("order");
    if (!fromUrl) return;
    setOrderNo(fromUrl);
    const local = findLocalOrder(fromUrl);
    if (local?.email) setEmail(local.email);
  }, [params]);

  async function lookup(no = orderNo, mail = email) {
    if (!no.trim() || !isEmail(mail)) {
      setFailed(true);
      return;
    }
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNo: no, email: mail }),
      });
      const data = await res.json();
      if (!res.ok || !data.order) throw new Error();
      setOrder(data.order);
      rememberOrder({
        orderNo: data.order.order_no,
        name: data.order.customer_name,
        email: data.order.customer_email,
        title: data.order.book.title_th,
        amount: data.order.amount,
      });
    } catch {
      setOrder(null);
      setFailed(true);
    }
    setBusy(false);
  }

  async function getLink() {
    setLinkBusy(true);
    setLinkMsg("");
    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNo: order.order_no,
          email: order.customer_email,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error();
      window.open(data.url, "_blank", "noopener");
    } catch {
      setLinkMsg(t("downloadFail"));
    }
    setLinkBusy(false);
  }

  /* ---------- ผลการค้นหา ---------- */
  if (order) {
    const title = pick(order.book, "title", lang);
    return (
      <div className="pad">
        <div className="card">
          <div
            style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center", gap: 10, marginBottom: 12,
            }}
          >
            <strong style={{ fontSize: 15 }}>{order.order_no}</strong>
            <StatusBadge status={order.status} />
          </div>

          <div className="row" style={{ margin: 0, border: "none", padding: 0, background: "none" }}>
            <div className="thumb"><Cover cover={order.book.cover} title={title} /></div>
            <div className="body">
              <h4>{title}</h4>
              <p>{money(order.amount, lang)}</p>
            </div>
          </div>

          <dl style={{ margin: "12px 0 0" }}>
            <div className="kv">
              <dt>{t("orderedAt")}</dt>
              <dd>{fmtDate(order.created_at, lang)} · {fmtTime(order.created_at)}</dd>
            </div>
            <div className="kv"><dt>{t("name")}</dt><dd>{order.customer_name}</dd></div>
            <div className="kv"><dt>{t("email")}</dt><dd>{order.customer_email}</dd></div>
            <div className="kv total">
              <dt>{t("total")}</dt>
              <dd>{money(order.amount, lang)}</dd>
            </div>
          </dl>
        </div>

        <div className="card"><Timeline status={order.status} /></div>

        {order.status === "PENDING" ? (
          <div className="card">
            <p className="sub" style={{ margin: "0 0 12px" }}>{t("payPending")}</p>
            <Link className="btn" href={`/pay/${order.order_no}`}>{t("payThisOrder")}</Link>
          </div>
        ) : (
          <div className="card">
            <button className="btn" onClick={getLink} disabled={linkBusy}>
              {linkBusy ? t("downloadOpening") : <><Download /> {t("download")}</>}
            </button>
            {linkMsg && <p className="errtext">{linkMsg}</p>}
            <div style={{ height: 12 }} />
            <div className="note">{t("emailNote")}</div>
          </div>
        )}

        <div className="spacer" />
        <button
          className="btn ghost"
          onClick={() => { setOrder(null); setLinkMsg(""); }}
        >
          {t("searchAgain")}
        </button>
        <div className="spacer" />
      </div>
    );
  }

  /* ---------- ฟอร์มค้นหา ---------- */
  return (
    <div className="pad">
      <p className="sub" style={{ marginBottom: 16 }}>{t("trackIntro")}</p>

      <div className="card">
        <div className="field">
          <label htmlFor="i-tid">{t("trackNo")}</label>
          <input
            id="i-tid"
            type="text"
            autoCapitalize="characters"
            placeholder={t("trackNoPh")}
            value={orderNo}
            onChange={(e) => setOrderNo(e.target.value)}
          />
        </div>
        <div className="field" style={{ marginBottom: 4 }}>
          <label htmlFor="i-temail">{t("email")}</label>
          <input
            id="i-temail"
            type="email"
            inputMode="email"
            placeholder={t("emailPh")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && lookup()}
          />
        </div>
      </div>

      {failed && <p className="errtext">{t("trackFail")}</p>}

      <div className="spacer" />
      <button className="btn" onClick={() => lookup()} disabled={busy}>
        {busy ? t("working") : t("trackBtn")}
      </button>

      <div className="spacer" />
      <div className="note">{t("trackPrivacy")}</div>
      <div className="spacer" />
    </div>
  );
}
