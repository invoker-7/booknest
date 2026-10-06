import AuthView from "@/components/views/AuthView";
import OtpView from "@/components/views/OtpView";
import { getPendingIdentity, isAuthConfigured, isGoogleEnabled, safeNext } from "@/lib/auth";
import { OTP_LENGTH, OTP_TTL_MINUTES } from "@/lib/otp";

export const metadata = { title: "Sign in", robots: { index: false } };

interface LoginPageProps {
  searchParams?: { next?: string | string[]; error?: string | string[] };
}

const first = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const next = safeNext(first(searchParams?.next));
  const error = first(searchParams?.error);

  // ผ่าน Google มาแล้วแต่ยังไม่ได้กรอกรหัส -> ขั้นที่สอง
  const pending = await getPendingIdentity();
  if (pending) {
    return <OtpView email={pending.email} next={next} length={OTP_LENGTH} minutes={OTP_TTL_MINUTES} />;
  }

  return (
    <AuthView
      next={next}
      google={isGoogleEnabled}
      configured={isAuthConfigured}
      oauthError={error === "oauth"}
    />
  );
}
