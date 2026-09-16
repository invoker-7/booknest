"use client";

import { useLang } from "./LangProvider";
import { Check, Dot } from "./Icons";
import { STATUS_FLOW } from "@/lib/format";

export function Steps({ active }) {
  const { t } = useLang();
  const labels = [t("stepInfo"), t("stepConfirm"), t("stepPay")];
  return (
    <div className="steps">
      {labels.map((label, i) => {
        const n = i + 1;
        const cls = n < active ? "done" : n === active ? "on" : "";
        return (
          <div className={`step ${cls}`} key={label + n}>
            <div className="dot">{n < active ? <Check /> : n}</div>
            <small>{label}</small>
          </div>
        );
      })}
    </div>
  );
}

export function StatusBadge({ status }) {
  const cls =
    status === "PENDING" ? "pending" : status === "COMPLETED" ? "done" : "paid";
  return <span className={`badge ${cls}`}>{status}</span>;
}

export function Timeline({ status }) {
  const { t } = useLang();
  const descs = {
    PENDING: t("stPendingDesc"),
    PAID: t("stPaidDesc"),
    PROCESSING: t("stProcDesc"),
    COMPLETED: t("stDoneDesc"),
  };
  const idx = Math.max(STATUS_FLOW.indexOf(status), 0);

  return (
    <ul className="timeline">
      {STATUS_FLOW.map((s, i) => {
        const cls = i < idx ? "complete" : i === idx ? "active" : "pendingstep";
        const mark = i < idx || (i === idx && s === "COMPLETED") ? <Check /> : <Dot />;
        return (
          <li className={cls} key={s}>
            <span className="tdot">{mark}</span>
            <div className="tbody">
              <h4>{s}</h4>
              <p>{descs[s]}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** แสดงเมื่อยังไม่ได้ตั้งค่า Supabase เพื่อไม่ให้หน้าเว็บพังเฉย ๆ */
export function SetupNotice() {
  const { t } = useLang();
  return (
    <div className="pad" style={{ paddingTop: 24 }}>
      <div className="card">
        <h3>{t("setupTitle")}</h3>
        <p className="sub" style={{ lineHeight: 1.7 }}>{t("setupBody")}</p>
      </div>
      <div className="spacer" />
      <div className="note warn">
        NEXT_PUBLIC_SUPABASE_URL · SUPABASE_SECRET_KEY · SUPABASE_EBOOK_BUCKET
        <br />
        RESEND_API_KEY · EMAIL_FROM
      </div>
    </div>
  );
}

export function Empty({ text, action }) {
  return (
    <div className="empty">
      <p>{text}</p>
      {action}
    </div>
  );
}
