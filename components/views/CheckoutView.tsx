"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLang } from "@/components/LangProvider";
import { useStore } from "@/components/StoreProvider";
import { useAuth } from "@/components/AuthProvider";
import ProductArt from "@/components/ProductArt";
import { Alert, Arrow, Cart, Check, Info, Lock, Spinner } from "@/components/Icons";
import { Button, LinkButton, Empty, Steps, Notice, PayMethods } from "@/components/ui";
import { SummaryLines, totalsOf } from "@/components/views/CartView";
import { isEmail, money, pick } from "@/lib/format";
import { purchase, PurchaseError, type PurchasePhase } from "@/lib/purchase";
import type { CartItem, PayOptions } from "@/lib/types";

type Phase = "idle" | PurchasePhase | "error";

/**
 * Checkout หน้าเดียว: ข้อมูลผู้ซื้อ → ชำระเงินด้วย QR พร้อมเพย์
 * ขั้นตอนการสั่งซื้อจริงอยู่ใน lib/purchase.ts — ผู้ซื้อกดชำระครั้งเดียว
 */
export default function CheckoutView({ live, pay: payOptions }: { live: boolean; pay: PayOptions }) {
  const { t, lang } = useLang();
  const router = useRouter();
  const { ready, cart, orders, removeManyFromCart } = useStore();
  const { ready: authReady, user } = useAuth();

  const [step, setStep] = useState<1 | 2>(1); // 1 = ข้อมูลผู้ซื้อ, 2 = ชำระเงิน
  const [method, setMethod] = useState(payOptions.method);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const leaving = useRef(false);
  const paying = useRef<CartItem[] | null>(null); // รายการที่กำลังชำระ — ตะกร้าจะถูกตัดรายการที่จ่ายแล้วออกระหว่างทาง
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    // กด Back จากหน้า QR: เบราว์เซอร์คืนหน้านี้จาก cache ทั้งที่ปุ่มยังค้างสถานะกำลังดำเนินการ
    const restored = (e: PageTransitionEvent) => e.persisted && window.location.reload();
    window.addEventListener("pageshow", restored);
    return () => window.removeEventListener("pageshow", restored);
  }, []);

  // เติมชื่อและอีเมลจากคำสั่งซื้อล่าสุดบนอุปกรณ์นี้
  useEffect(() => {
    const last = orders[orders.length - 1];
    if (last && !name && !email) {
      setName(last.name || "");
      setEmail(last.email || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  // ล็อกอินอยู่: คำสั่งซื้อผูกกับบัญชีและส่งไฟล์ไปที่อีเมลของบัญชีเสมอ
  useEffect(() => {
    if (!user) return;
    setEmail(user.email);
    setName((prev) => prev || user.name);
  }, [user]);

  // ซื้อได้เฉพาะสมาชิก: ยังไม่ล็อกอินให้ไปเข้าสู่ระบบก่อนแล้วกลับมาหน้านี้
  const mustLogin = authReady && !user;
  useEffect(() => {
    if (mustLogin) router.replace("/login?next=/checkout");
  }, [mustLogin, router]);

  if (!ready || !authReady || mustLogin) return <div className="wrap page-pad" aria-busy="true" />;

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

  const blocked = !live || !payOptions.method;
  const nameBad = touched && !name.trim();
  const emailBad = touched && !isEmail(email);
  const busy = phase === "create" || phase === "charge";
  const shown = paying.current || cart;
  const { total } = totalsOf(shown);

  function toPayment(e: FormEvent) {
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
    const items = cart.slice();
    paying.current = items;
    leaving.current = true;

    try {
      const receipt = await purchase(
        items,
        { name: name.trim(), email: email.trim().toLowerCase() },
        setPhase,
        method
      );
      removeManyFromCart(items.map((p) => p.id));
      router.push(`/complete/${receipt.id}`);
    } catch (err) {
      leaving.current = false;
      paying.current = null;
      setError(err instanceof PurchaseError && err.partial ? t("payPartial") : t("payError"));
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
                    readOnly={Boolean(user)}
                    aria-invalid={emailBad || undefined}
                    aria-describedby={emailBad ? "co-email-err" : "co-email-hint"}
                    required
                  />
                  <span className="err" id="co-email-err"><Alert size={14} /> {t("errEmail")}</span>
                  {!emailBad && <span className="hint" id="co-email-hint">{t(user ? "emailAccountHint" : "emailHint")}</span>}
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
                <PayMethods pay={payOptions} value={method} onChange={setMethod} disabled={busy} />

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
                <div className="thumb"><ProductArt p={p} bare sizes="120px" /></div>
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
