"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLang } from "@/components/LangProvider";
import { Arrow } from "@/components/Icons";
import { fmtDate, money } from "@/lib/format";
import { listLocalOrders, clearLocalOrders } from "@/lib/localOrders";

export default function LocalOrdersView() {
  const { t, lang } = useLang();
  const [items, setItems] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(listLocalOrders().slice().reverse());
    setReady(true);
  }, []);

  if (!ready) return <div className="pad" />;

  if (items.length === 0) {
    return (
      <div className="pad">
        <div className="empty">
          <p>{t("emptyOrders")}</p>
          <Link className="btn small" href="/" style={{ width: "auto", display: "inline-flex" }}>
            {t("startShopping")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pad">
      <div className="note" style={{ marginBottom: 14 }}>{t("ordersLocalNote")}</div>

      {items.map((o) => (
        <Link
          className="row"
          key={o.orderNo}
          href={`/track?order=${encodeURIComponent(o.orderNo)}`}
        >
          <div className="body">
            <h4>{o.orderNo}</h4>
            <p>{fmtDate(o.savedAt, lang)}</p>
            <p style={{ color: "var(--ink)", fontWeight: 500, fontSize: 13, marginTop: 2 }}>
              {o.title}
            </p>
            <p style={{ color: "var(--orange)", fontWeight: 600, marginTop: 2 }}>
              {money(o.amount, lang)}
            </p>
          </div>
          <span style={{ color: "var(--muted)" }}><Arrow /></span>
        </Link>
      ))}

      <div className="spacer" />
      <button
        className="btn ghost small"
        style={{ color: "var(--danger)" }}
        onClick={() => { clearLocalOrders(); setItems([]); }}
      >
        {t("clearLocal")}
      </button>
      <div className="spacer" />
    </div>
  );
}
