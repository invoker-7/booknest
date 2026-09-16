"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLang } from "@/components/LangProvider";
import Cover from "@/components/Cover";
import { Steps } from "@/components/Pieces";
import { Arrow } from "@/components/Icons";
import { isEmail, money, pick } from "@/lib/format";
import { rememberOrder } from "@/lib/localOrders";

export default function CheckoutView({ book }) {
  const { t, lang } = useLang();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const nameBad = touched && !name.trim();
  const emailBad = touched && !isEmail(email);
  const title = pick(book, "title", lang);

  async function submit() {
    setTouched(true);
    setError("");
    if (!name.trim() || !isEmail(email)) return;

    setBusy(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId: book.id, name: name.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "failed");

      rememberOrder({
        orderNo: data.orderNo,
        name: name.trim(),
        email: email.trim(),
        title,
        amount: book.price,
      });
      router.push(`/pay/${data.orderNo}`);
    } catch (err) {
      setError(t("genericError"));
      setBusy(false);
    }
  }

  return (
    <>
      <div className="pad">
        <Steps active={1} />

        <div className="card">
          <h3>{t("buyerInfo")}</h3>

          <div className={`field${nameBad ? " invalid" : ""}`}>
            <label htmlFor="i-name">{t("name")}</label>
            <input
              id="i-name"
              type="text"
              autoComplete="name"
              placeholder={t("namePh")}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <span className="err">{t("errName")}</span>
          </div>

          <div className={`field${emailBad ? " invalid" : ""}`} style={{ marginBottom: 6 }}>
            <label htmlFor="i-email">{t("email")}</label>
            <input
              id="i-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder={t("emailPh")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
            <span className="err">{t("errEmail")}</span>
          </div>

          <p className="sub" style={{ fontSize: 12 }}>{t("emailHint")}</p>
        </div>

        <div className="card">
          <h3>{t("summary")}</h3>
          <div className="row" style={{ margin: 0, border: "none", padding: 0, background: "none" }}>
            <div className="thumb"><Cover cover={book.cover} title={title} /></div>
            <div className="body">
              <h4>{title}</h4>
              <p>{money(book.price, lang)} · PDF</p>
            </div>
            <span style={{ color: "var(--muted)", fontSize: 13 }}>×1</span>
          </div>
          <dl style={{ margin: "12px 0 0" }}>
            <div className="kv total">
              <dt>{t("total")}</dt>
              <dd>{money(book.price, lang)}</dd>
            </div>
          </dl>
        </div>

        {error && <p className="errtext">{error}</p>}
        <div className="spacer" />
      </div>

      <div className="sticky-cta">
        <button className="btn" onClick={submit} disabled={busy}>
          {busy ? t("working") : t("next")} {!busy && <Arrow />}
        </button>
      </div>
    </>
  );
}
