"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useLang } from "@/components/LangProvider";
import { useStore } from "@/components/StoreProvider";
import Plate from "@/components/Plate";
import { Alert, Arrow, Cart, Check, Info, Lock, Spinner } from "@/components/Icons";
import { Button, LinkButton, Empty, Steps, Notice } from "@/components/ui";
import { SummaryLines, totalsOf } from "@/components/views/CartView";
import { isEmail, money, pick } from "@/lib/format";
import { rememberOrder, saveReceipt } from "@/lib/localOrders";

async function post(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "failed");
  return data;
}

/**
 * Checkout หน้าเดียว: ข้อมูลผู้ซื้อ → ชำระเงิน (จำลอง)
 * backend รับคำสั่งซื้อทีละสินค้า จึงสร้างคำสั่งซื้อหนึ่งรายการต่อสินค้าหนึ่งชิ้น
 * แล้วรวมเป็นใบเสร็จเดียวให้ผู้ซื้อ — ผู้ซื้อกดชำระครั้งเดียว
 */
export default function CheckoutView({ live }) {
  const { t, lang } = useLang();
  const router = useRouter();
  const { ready, cart, orders, removeManyFromCart } = useStore();

  const [step, setStep] = useState(1); // 1 = ข้อมูลผู้ซื้อ, 2 = ชำระเงิน
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [phase, setPhase] = useState("idle"); // idle | create | charge | error
  const [error, setError] = useState("");
  const created = useRef(new Map()); // bookId -> orderNo กันสร้างซ้ำเมื่อกดลองใหม่
  const leaving = useRef(false);
  const paying = useRef(null); // รายการที่กำลังชำระ — ตะกร้าจะถูกตัดรายการที่จ่ายแล้วออกระหว่างทาง
  const nameRef = useRef(null);

  // เติมชื่อและอีเมลจากคำสั่งซื้อล่าสุดบนอุปกรณ์นี้
  useEffect(() => {
    const last = orders[orders.length - 1];
    if (last && !name && !email) {
      setName(last.name || "");
      setEmail(last.email || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  if (!ready) return <div className="wrap page-pad" aria-busy="true" />;

  if (cart.length === 0 && !leaving.current) {
    return (
      <div className="wrap page-pad">
        <Empty
          icon={<Cart />}
          title={t("cartEmptyTitle")}
          body={t("cartEmptyBody")}
          action={<LinkButton href="/products">{t("browseProducts")} <Arrow size={18} /></LinkButton>}
        />
      </div>
    );
  }

  const blocked = !live || cart.some((p) => p.sample);
  const nameBad = touched && !name.trim();
  const emailBad = touched && !isEmail(email);
  const busy = phase === "create" || phase === "charge";
  const shown = paying.current || cart;
  const { total } = totalsOf(shown);

  function toPayment(e) {
    e.preventDefault();
    setTouched(true);
    if (!name.trim() || !isEmail(email)) {
      (name.trim() ? document.getElementById("co-email") : nameRef.current)?.focus();
      return;
    }
    setStep(2);
    setTimeout(() => document.getElementById("co-pay")?.focus(), 0);
  }

  async function pay() {
    if (busy || blocked) return;
    setError("");
    const buyer = { name: name.trim(), email: email.trim().toLowerCase() };
    const items = cart.slice();
    paying.current = items;
    leaving.current = true;
    let charging = false;

    try {
      // 1) สร้างคำสั่งซื้อ (ราคาอ่านจากฐานข้อมูลฝั่ง server เสมอ)
      setPhase("create");
      for (const p of items) {
        if (created.current.has(p.id)) continue;
        // มีคำสั่งซื้อที่ยังไม่ชำระของสินค้านี้อยู่แล้ว (เช่น ชำระไม่สำเร็จรอบก่อน) ให้ใช้รายการเดิม
        const open = orders.find((o) => o.bookId === p.id && o.status === "PENDING" && o.email === buyer.email);
        if (open) {
          created.current.set(p.id, open.orderNo);
          continue;
        }
        const data = await post("/api/orders", { bookId: p.id, ...buyer });
        created.current.set(p.id, data.orderNo);
        rememberOrder({
          orderNo: data.orderNo, ...buyer, bookId: p.id,
          title: p.title_th, title_th: p.title_th, title_en: p.title_en,
          kind: p.kind, version: p.version, amount: p.price, status: "PENDING",
        });
      }

      // 2) ชำระเงิน (จำลอง)
      charging = true;
      setPhase("charge");
      const lines = [];
      for (const p of items) {
        const orderNo = created.current.get(p.id);
        const data = await post(`/api/orders/${encodeURIComponent(orderNo)}/pay`);
        const status = data.status || "PAID";
        rememberOrder({ orderNo, status });
        lines.push({
          orderNo, bookId: p.id, title_th: p.title_th, title_en: p.title_en,
          category: p.category, version: p.version, amount: p.price, emailStatus: data.emailStatus || null,
        });
      }

      const receipt = {
        id: lines[0].orderNo,
        createdAt: new Date().toISOString(),
        ...buyer,
        orders: lines,
        total: lines.reduce((s, l) => s + l.amount, 0),
      };
      saveReceipt(receipt);
      for (const l of lines) rememberOrder({ orderNo: l.orderNo, receiptId: receipt.id });

      removeManyFromCart(items.map((p) => p.id));
      router.push(`/complete/${receipt.id}`);
    } catch {
      leaving.current = false;
      paying.current = null;
      setError(charging || created.current.size > 0 ? t("payPartial") : t("payError"));
      setPhase("error");
    }
  }

  return (
    <div className="wrap page-pad">
      <Steps active={step} />

      <div className="co-grid">
        <div>
          {blocked && (
            <div style={{ marginBottom: 24 }}>
              <Notice tone="warn" title={t("previewBlockedTitle")}>{t("previewBlockedBody")}</Notice>
            </div>
          )}

          {/* ---------- 01 ข้อมูลผู้ซื้อ ---------- */}
          {step === 1 ? (
            <form className="panel" onSubmit={toPayment} noValidate>
              <div className="panel-head">
                <div>
                  <span className="panel-n">01</span>
                  <h2>{t("buyerInfo")}</h2>
                  <p>{t("buyerInfoSub")}</p>
                </div>
              </div>

              {touched && (nameBad || emailBad) && (
                <div style={{ marginBottom: 20 }}>
                  <Notice tone="error">{t("errSummary")}</Notice>
                </div>
              )}

              <div className="two">
                <div className={`field${nameBad ? " invalid" : ""}`}>
                  <label htmlFor="co-name">{t("name")}</label>
                  <input
                    id="co-name"
                    ref={nameRef}
                    type="text"
                    autoComplete="name"
                    placeholder={t("namePh")}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    aria-invalid={nameBad || undefined}
                    aria-describedby={nameBad ? "co-name-err" : undefined}
                    required
                  />
                  <span className="err" id="co-name-err"><Alert size={14} /> {t("errName")}</span>
                </div>

                <div className={`field${emailBad ? " invalid" : ""}`}>
                  <label htmlFor="co-email">{t("email")}</label>
                  <input
                    id="co-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder={t("emailPh")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={emailBad || undefined}
                    aria-describedby={emailBad ? "co-email-err" : "co-email-hint"}
                    required
                  />
                  <span className="err" id="co-email-err"><Alert size={14} /> {t("errEmail")}</span>
                  {!emailBad && <span className="hint" id="co-email-hint">{t("emailHint")}</span>}
                </div>
              </div>

              <Button type="submit">{t("continue")} <Arrow size={18} /></Button>
            </form>
          ) : (
            <div className="panel done">
              <div className="panel-head" style={{ marginBottom: 0 }}>
                <div>
                  <span className="panel-n">01 <Check size={12} style={{ display: "inline", verticalAlign: -1 }} /></span>
                  <h2>{t("buyerInfo")}</h2>
                  <p className="summary-line">{name.trim()} · {email.trim()}</p>
                </div>
                <Button variant="ghost" size="small" onClick={() => setStep(1)} disabled={busy}>{t("edit")}</Button>
              </div>
            </div>
          )}

          {/* ---------- 02 ชำระเงิน ---------- */}
          <div className={`panel${step === 1 ? " locked" : ""}`} aria-disabled={step === 1 || undefined}>
            <div className="panel-head">
              <div>
                <span className="panel-n">02</span>
                <h2>{t("payment")}</h2>
                <p>{t("paymentSub")}</p>
              </div>
            </div>

            {step === 2 && (
              <>
                <div className="paydemo">
                  <span className="tag amber">{t("demoTag")}</span>
                  <p>{t("demoBody")}</p>
                </div>

                {phase === "error" && (
                  <div style={{ marginTop: 16 }}>
                    <Notice tone="error">{error}</Notice>
                  </div>
                )}

                {busy && (
                  <ol className="progress" aria-live="polite">
                    <li className={phase === "create" ? "on" : "ok"}>
                      {phase === "create" ? <Spinner size={14} /> : <Check size={14} />} {t("payStepCreate")}
                    </li>
                    <li className={phase === "charge" ? "on" : ""}>
                      {phase === "charge" ? <Spinner size={14} /> : <Info size={14} />} {t("payStepCharge")}
                    </li>
                  </ol>
                )}

                <div style={{ marginTop: 20 }}>
                  <Button
                    id="co-pay"
                    onClick={pay}
                    loading={busy}
                    loadingText={t("paying")}
                    disabled={blocked}
                    block
                  >
                    <Lock size={18} /> {phase === "error" ? t("retry") : `${t("payNow")} ${money(total, lang)}`}
                  </Button>
                </div>
                <p className="hint muted" style={{ fontSize: 13, marginTop: 12 }}>{t("termsNote")}</p>
              </>
            )}
          </div>
        </div>

        <aside className="co-aside" aria-label={t("orderSummary")}>
          <h2>{t("orderSummary")}</h2>
          <ul className="co-mini">
            {shown.map((p) => (
              <li key={p.id}>
                <div className="thumb"><Plate category={p.category} title="" bare /></div>
                <div>
                  <span className="mono">{t(`cat_${p.category}`).toUpperCase()} · V{p.version}</span>
                  {pick(p, "title", lang)}
                </div>
                <span>{money(p.price, lang)}</span>
              </li>
            ))}
          </ul>
          <SummaryLines items={shown} />
          <p className="co-note"><Lock size={16} /> {t("secureNote")}</p>
        </aside>
      </div>
    </div>
  );
}
