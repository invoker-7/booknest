"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLang } from "@/components/LangProvider";
import { BigCheck, Mail, Download } from "@/components/Icons";
import { fmtDate, fmtTime } from "@/lib/format";
import { findLocalOrder } from "@/lib/localOrders";

export default function SuccessView({ order, book }) {
  const { t, lang } = useLang();
  const [me, setMe] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setMe(findLocalOrder(order.order_no));
  }, [order.order_no]);

  const shownEmail = me?.email || order.masked_email;
  const delivered = order.email_sent;
  const mocked = order.email_note?.includes("RESEND_API_KEY");

  async function getLink() {
    if (!me?.email) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNo: order.order_no, email: me.email }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error();
      window.open(data.url, "_blank", "noopener");
    } catch {
      setMsg(t("downloadFail"));
    }
    setBusy(false);
  }

  return (
    <>
      <div className="center-screen">
        <div className="icon" style={{ background: "var(--sage-soft)", color: "var(--sage)" }}>
          <BigCheck />
        </div>
        <h2>{t("paidTitle")}</h2>
        <p>{t("paidBody")}</p>
        <div className="ordno">{t("orderNo")} · {order.order_no}</div>
      </div>

      <div className="pad">
        <div className="card">
          <div style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
            <div
              style={{
                width: 38, height: 38, borderRadius: 11, flex: "none",
                display: "grid", placeItems: "center",
                background: delivered ? "var(--sage-soft)" : "var(--orange-soft)",
                color: delivered ? "var(--sage)" : "var(--orange)",
              }}
            >
              <Mail width={20} height={20} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ margin: "0 0 4px" }}>
                {delivered
                  ? mocked ? t("emailMockTitle") : t("emailSentTitle")
                  : t("emailFailTitle")}
              </h3>
              <p className="sub" style={{ lineHeight: 1.6 }}>
                {mocked ? t("emailMockBody") : <>{t("emailSentBody")} <strong style={{ color: "var(--ink)" }}>{shownEmail}</strong></>}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <dl style={{ margin: 0 }}>
            <div className="kv">
              <dt>{t("orderedAt")}</dt>
              <dd>{fmtDate(order.created_at, lang)} · {fmtTime(order.created_at)}</dd>
            </div>
            <div className="kv">
              <dt>{t("email")}</dt>
              <dd>{shownEmail}</dd>
            </div>
          </dl>

          <div style={{ height: 12 }} />
          {me?.email ? (
            <button className="btn" onClick={getLink} disabled={busy}>
              {busy ? t("downloadOpening") : <><Download /> {t("download")}</>}
            </button>
          ) : (
            <Link className="btn" href={`/track?order=${encodeURIComponent(order.order_no)}`}>
              {t("viewStatus")}
            </Link>
          )}
          {msg && <p className="errtext">{msg}</p>}
        </div>

        <div className="spacer" />
        <div className="note">{t("emailNote")}</div>
        <div className="spacer" />
      </div>

      <div className="sticky-cta btn-stack">
        <Link className="btn ghost" href={`/track?order=${encodeURIComponent(order.order_no)}`}>
          {t("viewStatus")}
        </Link>
        <Link className="btn ghost" href="/">{t("backToStore")}</Link>
      </div>
    </>
  );
}
