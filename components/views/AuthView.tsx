"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useLang } from "@/components/LangProvider";
import { Alert, Arrow, Mail } from "@/components/Icons";
import { Button, Notice } from "@/components/ui";
import { login, signup } from "@/lib/apiClient";
import { isEmail, MIN_PASSWORD } from "@/lib/format";
import type { TKey } from "@/lib/i18n";

interface AuthViewProps {
  mode: "login" | "signup";
  /** ปลายทางหลังล็อกอิน (ตรวจที่ server แล้วว่าเป็น path ภายในเว็บ) */
  next: string;
  google: boolean;
  configured: boolean;
  /** ?error=oauth จาก callback */
  oauthError?: boolean;
}

const ERRORS: Record<string, TKey> = {
  invalid_credentials: "authErrCredentials",
  email_not_confirmed: "authErrUnconfirmed",
  email_taken: "authErrTaken",
  weak_password: "authErrWeak",
  auth_not_configured: "authNotConfigured",
};

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

/** หน้าเข้าสู่ระบบ / สมัครสมาชิก (อีเมล + รหัสผ่าน หรือ Google) */
export default function AuthView({ mode, next, google, configured, oauthError = false }: AuthViewProps) {
  const { t } = useLang();
  const router = useRouter();
  const { ready, user, refresh } = useAuth();
  const isSignup = mode === "signup";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TKey | "">(oauthError ? "authErrOauth" : "");
  const [confirm, setConfirm] = useState(false);

  // ล็อกอินอยู่แล้ว ไม่ต้องเห็นฟอร์ม
  useEffect(() => {
    if (ready && user) router.replace(next);
  }, [ready, user, next, router]);

  const nameBad = touched && isSignup && !name.trim();
  const emailBad = touched && !isEmail(email);
  const passBad = touched && (isSignup ? password.length < MIN_PASSWORD : !password);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    setError("");
    if ((isSignup && !name.trim()) || !isEmail(email) || (isSignup ? password.length < MIN_PASSWORD : !password)) return;

    setBusy(true);
    try {
      if (isSignup) {
        const res = await signup(name.trim(), email.trim(), password);
        if (res.confirm) {
          setConfirm(true);
          return;
        }
      } else {
        await login(email.trim(), password);
      }
      await refresh();
      router.replace(next);
    } catch (err) {
      setError(ERRORS[err instanceof Error ? err.message : ""] || "genericError");
    } finally {
      setBusy(false);
    }
  }

  const other = isSignup ? "/login" : "/signup";
  const otherHref = next === "/account" ? other : `${other}?next=${encodeURIComponent(next)}`;

  return (
    <div className="wrap page-pad">
      <div className="auth">
        <header className="auth-head">
          <span className="mono">{isSignup ? "Account / 01" : "Account / 02"}</span>
          <h1>{t(isSignup ? "signupTitle" : "loginTitle")}</h1>
          <p>{t(isSignup ? "signupSub" : "loginSub")}</p>
        </header>

        {!configured && (
          <div className="auth-gap">
            <Notice tone="warn" title={t("authNotConfigured")}>{t("authNotConfiguredBody")}</Notice>
          </div>
        )}

        {confirm ? (
          <div className="panel">
            <Notice tone="info" title={t("confirmTitle")}>
              <Mail size={16} style={{ display: "inline", verticalAlign: -3, marginRight: 6 }} />
              {t("confirmBody")} <strong>{email.trim()}</strong>
            </Notice>
          </div>
        ) : (
          <form className="panel" onSubmit={submit} noValidate>
            {error && (
              <div className="auth-gap">
                <Notice tone="error">{t(error)}</Notice>
              </div>
            )}

            {google && (
              <>
                <a className="btn secondary block" href={`/api/auth/google?next=${encodeURIComponent(next)}`}>
                  <GoogleMark /> {t("continueGoogle")}
                </a>
                <div className="auth-or mono"><span>{t("or")}</span></div>
              </>
            )}

            {isSignup && (
              <div className={`field${nameBad ? " invalid" : ""}`}>
                <label htmlFor="au-name">{t("name")}</label>
                <input
                  id="au-name"
                  type="text"
                  autoComplete="name"
                  placeholder={t("namePh")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-invalid={nameBad || undefined}
                  required
                />
                <span className="err"><Alert size={14} /> {t("errName")}</span>
              </div>
            )}

            <div className={`field${emailBad ? " invalid" : ""}`}>
              <label htmlFor="au-email">{t("email")}</label>
              <input
                id="au-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder={t("emailPh")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={emailBad || undefined}
                required
              />
              <span className="err"><Alert size={14} /> {t("errEmail")}</span>
            </div>

            <div className={`field${passBad ? " invalid" : ""}`}>
              <label htmlFor="au-pass">{t("password")}</label>
              <input
                id="au-pass"
                type="password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={passBad || undefined}
                aria-describedby={isSignup ? "au-pass-hint" : undefined}
                minLength={isSignup ? MIN_PASSWORD : undefined}
                maxLength={72}
                required
              />
              <span className="err"><Alert size={14} /> {t(isSignup ? "errPasswordShort" : "errPassword")}</span>
              {isSignup && !passBad && <span className="hint" id="au-pass-hint">{t("passwordHint")}</span>}
            </div>

            <Button type="submit" block loading={busy} loadingText={t("loading")} disabled={!configured}>
              {t(isSignup ? "signupBtn" : "loginBtn")} <Arrow size={18} />
            </Button>
          </form>
        )}

        <p className="auth-foot">
          {t(isSignup ? "haveAccount" : "noAccount")}{" "}
          <Link href={otherHref} className="linkbtn">{t(isSignup ? "loginBtn" : "signupBtn")}</Link>
        </p>
        <p className="auth-foot muted">{t("guestNote")}</p>
      </div>
    </div>
  );
}
