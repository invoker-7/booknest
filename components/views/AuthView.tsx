"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useLang } from "@/components/LangProvider";
import { Notice } from "@/components/ui";

interface AuthViewProps {
  /** ปลายทางหลังล็อกอิน (ตรวจที่ server แล้วว่าเป็น path ภายในเว็บ) */
  next: string;
  google: boolean;
  configured: boolean;
  /** ?error=oauth จาก callback */
  oauthError?: boolean;
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 01-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 009 18z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 010-3.44V4.95H.96a9 9 0 000 8.1l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 00.96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

/** หน้าเข้าสู่ระบบ ขั้นที่ 1: Google เท่านั้น (ขั้นที่ 2 คือ OtpView) */
export default function AuthView({ next, google, configured, oauthError = false }: AuthViewProps) {
  const { t } = useLang();
  const router = useRouter();
  const { ready, user } = useAuth();

  // ล็อกอินอยู่แล้ว ไม่ต้องเห็นหน้านี้
  useEffect(() => {
    if (ready && user) router.replace(next);
  }, [ready, user, next, router]);

  return (
    <div className="wrap page-pad">
      <div className="auth">
        <header className="auth-head">
          <span className="mono">Account / 01</span>
          <h1>{t("loginTitle")}</h1>
          <p>{t("loginSub")}</p>
        </header>

        {!configured ? (
          <div className="auth-gap">
            <Notice tone="warn" title={t("authNotConfigured")}>{t("authNotConfiguredBody")}</Notice>
          </div>
        ) : !google ? (
          <div className="auth-gap">
            <Notice tone="warn" title={t("authGoogleOff")}>{t("authGoogleOffBody")}</Notice>
          </div>
        ) : (
          <div className="panel">
            {oauthError && (
              <div className="auth-gap">
                <Notice tone="error">{t("authErrOauth")}</Notice>
              </div>
            )}
            {/* <a> ธรรมดา: ต้องโหลดทั้งหน้าเพื่อไปหน้ายินยอมของ Google */}
            <a className="btn secondary block" href={`/api/auth/google?next=${encodeURIComponent(next)}`}>
              <GoogleMark /> {t("continueGoogle")}
            </a>
            <p className="auth-step muted">{t("loginOtpNote")}</p>
          </div>
        )}

        <p className="auth-foot muted">{t("guestNote")}</p>
      </div>
    </div>
  );
}
