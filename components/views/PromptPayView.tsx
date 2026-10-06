"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLang } from "@/components/LangProvider";
import { Spinner } from "@/components/Icons";
import { Empty, LinkButton, Notice, Steps } from "@/components/ui";
import { fetchPromptPay, type PromptPayState } from "@/lib/apiClient";
import { money } from "@/lib/format";

// ถามซ้ำว่าร้านยืนยันรับเงินแล้วหรือยัง — หยุดเมื่อแท็บไม่ได้เปิดดูอยู่
const POLL_MS = 4000;

/**
 * ชำระด้วย QR พร้อมเพย์: แสดง QR ที่ระบุยอดไว้แล้ว และรอเจ้าของร้านยืนยันรับเงินในหลังบ้าน
 * ยืนยันแล้วหน้านี้พาไปหน้าดาวน์โหลดเอง ผู้ซื้อไม่ต้องกดอะไร
 */
export default function PromptPayView() {
  const { t, lang } = useLang();
  const router = useRouter();
  // undefined = กำลังโหลด, null = เปิดไม่ได้ (ลิงก์ผิด / ร้านไม่ได้เปิดพร้อมเพย์)
  const [state, setState] = useState<PromptPayState | null | undefined>(undefined);
  const [qr, setQr] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orders = params.get("orders") || "";
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
    const timer = setInterval(() => void load(false), POLL_MS);
    const onVisible = () => void load(false);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  if (state === undefined) return <div className="wrap page-pad" aria-busy="true" />;
  if (!state) {
    return (
      <div className="wrap page-pad">
        <Empty title={t("ppMissingTitle")} body={t("ppMissingBody")} action={<LinkButton href="/library">{t("navLibrary")}</LinkButton>} />
      </div>
    );
  }

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
            <p className="ppay-wait" role="status">
              <Spinner size={16} /> {t("ppWaiting")}
            </p>
            <p className="mono muted ppay-orders">{state.orders.map((o) => o.orderNo).join(" · ")}</p>
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
