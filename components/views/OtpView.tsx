"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useLang } from "@/components/LangProvider";
import { Alert, Arrow, Mail } from "@/components/Icons";
import { Button, Notice } from "@/components/ui";
import { resendOtp, verifyOtp } from "@/lib/apiClient";
import type { TKey } from "@/lib/i18n";

interface OtpViewProps {
  /** อีเมลของบัญชี Google ที่รหัสถูกส่งไป */
  email: string;
  /** ปลายทางหลังล็อกอิน (ตรวจที่ server แล้วว่าเป็น path ภายในเว็บ) */
  next: string;
  length: number;
  minutes: number;
}

const ERRORS: Record<string, TKey> = {
  otp_invalid: "otpErrInvalid",
  otp_expired: "otpErrExpired",
  otp_locked: "otpErrLocked",
  otp_send_failed: "otpErrSend",
  otp_no_session: "otpErrSession",
};

/** หน้าเข้าสู่ระบบ ขั้นที่ 2: กรอกรหัสที่ส่งไปยังอีเมล */
export default function OtpView({ email, next, length, minutes }: OtpViewProps) {
  const { t } = useLang();
  const router = useRouter();
  const { refresh, signOut } = useAuth();
  const input = useRef<HTMLInputElement>(null);

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  // true ตั้งแต่แรก: หน้านี้ขอให้ server ส่งรหัสเองทันทีที่เปิด
  const [resending, setResending] = useState(true);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<TKey | "">("");
  const [wait, setWait] = useState(0);
  const requested = useRef(false);

  // ส่งรหัสตอนเปิดหน้า (ไม่ใช่ตอน redirect กลับจาก Google) ผู้ใช้จึงเห็นหน้านี้ทันทีโดยไม่ต้องรอ SMTP
  useEffect(() => {
    if (requested.current) return; // StrictMode เรียก effect สองรอบในโหมด dev
    requested.current = true;
    void resendOtp(true).then((res) => {
      setResending(false);
      if (res.retryIn) setWait(res.retryIn);
      if (!res.ok && res.error !== "otp_cooldown") setError(ERRORS[res.error || ""] || "otpErrSend");
    });
  }, []);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  async function verify(value: string) {
    if (busy || value.length !== length) return;
    setBusy(true);
    setError("");
    setResent(false);
    try {
      await verifyOtp(value);
      await refresh();
      router.replace(next);
    } catch (err) {
      setError(ERRORS[err instanceof Error ? err.message : ""] || "genericError");
      setCode("");
      setBusy(false);
      input.current?.focus();
    }
  }

  function change(raw: string) {
    const value = raw.replace(/\D/g, "").slice(0, length);
    setCode(value);
    if (value.length === length) void verify(value); // กรอกครบหรือวางรหัส -> ส่งเลย
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (code.length !== length) {
      setError("otpErrInvalid");
      return;
    }
    void verify(code);
  }

  async function resend() {
    setResending(true);
    setError("");
    setResent(false);
    const res = await resendOtp();
    setResending(false);
    if (res.retryIn) setWait(res.retryIn);
    if (res.ok) {
      setResent(true);
      setCode("");
      input.current?.focus();
    } else if (res.error !== "otp_cooldown") {
      setError(ERRORS[res.error || ""] || "genericError");
    }
  }

  async function switchAccount() {
    await signOut();
    router.replace(next === "/account" ? "/login" : `/login?next=${encodeURIComponent(next)}`);
    router.refresh();
  }

  return (
    <div className="wrap page-pad">
      <div className="auth">
        <header className="auth-head">
          <span className="mono">Account / 02</span>
          <h1>{t("otpTitle")}</h1>
          <p>
            <Mail size={16} style={{ display: "inline", verticalAlign: -3, marginRight: 6 }} />
            {t("otpSub")} <strong>{email}</strong>
          </p>
        </header>

        <form className="panel" onSubmit={submit} noValidate>
          {error && (
            <div className="auth-gap">
              <Notice tone="error">{t(error)}</Notice>
            </div>
          )}
          {resent && !error && (
            <div className="auth-gap">
              <Notice tone="info">{t("otpResent")}</Notice>
            </div>
          )}

          <div className={`field${error === "otpErrInvalid" ? " invalid" : ""}`}>
            <label htmlFor="au-otp">{t("otpLabel")}</label>
            <input
              ref={input}
              id="au-otp"
              className="otp-input mono"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={length}
              placeholder={"0".repeat(length)}
              value={code}
              onChange={(e) => change(e.target.value)}
              aria-invalid={error === "otpErrInvalid" || undefined}
              aria-describedby="au-otp-hint"
              autoFocus
              required
            />
            <span className="err"><Alert size={14} /> {t("otpErrInvalid")}</span>
            <span className="hint" id="au-otp-hint">{t("otpHint").replace("{n}", String(minutes))}</span>
          </div>

          <Button type="submit" block loading={busy} loadingText={t("loading")}>
            {t("otpBtn")} <Arrow size={18} />
          </Button>
        </form>

        <p className="auth-foot">
          {resending ? (
            <span className="muted" role="status">{t("otpSending")}</span>
          ) : wait > 0 ? (
            <span className="muted" aria-live="off">{t("otpResendIn").replace("{n}", String(wait))}</span>
          ) : (
            <button type="button" className="linkbtn" onClick={resend}>
              {t("otpResend")}
            </button>
          )}
        </p>
        <p className="auth-foot">
          <button type="button" className="linkbtn" onClick={switchAccount}>{t("otpOtherAccount")}</button>
        </p>
      </div>
    </div>
  );
}
