"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useLang } from "@/components/LangProvider";
import { Check, Spinner, Upload } from "@/components/Icons";
import { Button, Empty, LinkButton, Notice, Steps } from "@/components/ui";
import { fetchPromptPay, uploadSlip, type PromptPayState } from "@/lib/apiClient";
import { cartNoOf, IMAGE_EXTENSIONS, MAX_IMAGE_BYTES, money } from "@/lib/format";
import type { TKey } from "@/lib/i18n";

// ถามซ้ำว่าร้านยืนยันรับเงินแล้วหรือยัง — หยุดเมื่อแท็บไม่ได้เปิดดูอยู่
const POLL_MS = 4000;

/**
 * ชำระด้วย QR พร้อมเพย์: แสดง QR ที่ระบุยอดไว้แล้ว → ผู้ซื้อโอนแล้วแนบสลิป → เจ้าของร้านตรวจและยืนยันในหลังบ้าน
 * ยืนยันแล้วหน้านี้พาไปหน้าดาวน์โหลดเอง
 */
export default function PromptPayView() {
  const { t, lang } = useLang();
  const router = useRouter();
  // undefined = กำลังโหลด, null = เปิดไม่ได้ (ลิงก์ผิด / ร้านไม่ได้เปิดพร้อมเพย์)
  const [state, setState] = useState<PromptPayState | null | undefined>(undefined);
  const [qr, setQr] = useState("");
  const [orders, setOrders] = useState("");
  const [sending, setSending] = useState(false);
  const [slipError, setSlipError] = useState<TKey | "">("");
  const slipInput = useRef<HTMLInputElement>(null);
  // ถามสถานะคำสั่งซื้อทันที (ไม่รอรอบถัดไป) — ตั้งค่าใน effect ด้านล่าง
  const refresh = useRef<() => void>(() => {});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orders = params.get("orders") || "";
    setOrders(orders);
    const fromCart = params.get("receipt") === "1";
    let alive = true;

    const done = (first: string) => router.replace(`${fromCart ? "/complete/" : "/success/"}${encodeURIComponent(first)}`);

    const load = async (withQr: boolean) => {
      if (!withQr && document.visibilityState !== "visible") return;
      const next = await fetchPromptPay(orders, withQr);
      if (!alive) return;
      if (!next) {
        if (withQr) setState(null); // ถามซ้ำแล้วพลาดครั้งเดียวไม่เป็นไร รอบหน้าลองใหม่
        return;
      }
      if (next.orders.length > 0 && next.orders.every((o) => o.status !== "PENDING")) return done(next.orders[0].orderNo);
      setState(next);
      if (next.qr) setQr(next.qr);
    };

    void load(true);
    refresh.current = () => void load(false);
    const timer = setInterval(() => void load(false), POLL_MS);
    const onVisible = () => void load(false);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  async function attach(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setSlipError("");

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!IMAGE_EXTENSIONS.includes(ext)) return setSlipError("admErrImageType");
    if (file.size > MAX_IMAGE_BYTES) return setSlipError("admErrImageSize");

    setSending(true);
    try {
      const { verified } = await uploadSlip(orders, file);
      // ระบบตรวจสลิปผ่านแล้ว: ถามสถานะทันที หน้านี้จะพาไปหน้าสั่งซื้อสำเร็จเอง
      if (verified) return refresh.current();
      // ยังต้องรอร้านตรวจ: แสดงว่าแนบแล้วทันที ไม่ต้องรอรอบถามสถานะถัดไป
      setState((prev) => (prev ? { ...prev, orders: prev.orders.map((o) => ({ ...o, slip: true })) } : prev));
    } catch {
      setSlipError("ppSlipFailed");
    } finally {
      setSending(false);
    }
  }

  if (state === undefined) return <div className="wrap page-pad" aria-busy="true" />;
  if (!state) {
    return (
      <div className="wrap page-pad">
        <Empty title={t("ppMissingTitle")} body={t("ppMissingBody")} action={<LinkButton href="/library">{t("navLibrary")}</LinkButton>} />
      </div>
    );
  }

  const hasSlip = state.orders.some((o) => o.status === "PENDING" && o.slip);

  return (
    <div className="wrap page-pad">
      <Steps active={2} />
      <div className="ppay">
        <div className="panel ppay-qr">
          <span className="panel-n">PROMPTPAY</span>
          <h1>{t("ppTitle")}</h1>
          {/* SVG สร้างที่ server จากเบอร์พร้อมเพย์ของร้านและยอดในฐานข้อมูล ไม่มีข้อมูลจากผู้ใช้ปนอยู่ */}
          <div className="ppay-code" role="img" aria-label={t("ppQrAlt")} dangerouslySetInnerHTML={{ __html: qr }} />
          <p className="ppay-amount">{money(state.amount, lang)}</p>
          <p className="mono muted">{t("ppAccount")} {state.account}</p>
        </div>

        <div>
          <div className="panel">
            <h2 className="ppay-h">{t("ppHowTitle")}</h2>
            <ol className="ppay-steps">
              <li>{t("ppStep1")}</li>
              <li>{t("ppStep2")}</li>
              <li>{t("ppStep3")}</li>
            </ol>
            <p className={`ppay-wait${hasSlip ? "" : " idle"}`} role="status">
              {hasSlip ? <><Spinner size={16} /> {t("ppWaiting")}</> : t("ppWaitSlip")}
            </p>
            {/* หนึ่งตะกร้า = หนึ่งคำสั่งซื้อ: แสดงเลขเดียว (คำสั่งซื้อเก่าที่แยกใบจะเห็นครบทุกเลข) */}
            <p className="mono muted ppay-orders">{[...new Set(state.orders.map((o) => cartNoOf(o.orderNo)))].join(" · ")}</p>
          </div>
          <div className="panel">
            <h2 className="ppay-h">{t("ppSlipTitle")}</h2>
            <input
              ref={slipInput}
              type="file"
              className="sr-only"
              tabIndex={-1}
              accept={IMAGE_EXTENSIONS.map((x) => `.${x}`).join(",")}
              onChange={attach}
            />
            {hasSlip ? (
              <Notice tone="info" title={<><Check size={16} style={{ display: "inline", verticalAlign: -3 }} /> {t("ppSlipSent")}</>}>
                {t("ppSlipSentBody")}
              </Notice>
            ) : (
              <p className="muted">{t("ppSlipBody")}</p>
            )}
            {slipError && <div style={{ marginTop: 12 }}><Notice tone="error">{t(slipError)}</Notice></div>}
            <div className="ppay-slip">
              <Button
                variant={hasSlip ? "secondary" : "primary"}
                onClick={() => slipInput.current?.click()}
                loading={sending}
                loadingText={t("loading")}
              >
                <Upload size={18} /> {t(hasSlip ? "ppSlipAgain" : "ppSlipChoose")}
              </Button>
              <span className="hint muted">{t("ppSlipHint")}</span>
            </div>
          </div>
          <Notice tone="info">{t("ppNote")}</Notice>
          <div style={{ marginTop: 16 }}>
            <LinkButton href="/library" variant="ghost">{t("ppLater")}</LinkButton>
          </div>
        </div>
      </div>
    </div>
  );
}
