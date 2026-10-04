import AuthView from "@/components/views/AuthView";
import { isAuthConfigured, isGoogleEnabled, safeNext } from "@/lib/auth";

export const metadata = { title: "Sign in", robots: { index: false } };

interface LoginPageProps {
  searchParams?: { next?: string | string[]; error?: string | string[] };
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  const next = searchParams?.next;
  return (
    <AuthView
      mode="login"
      next={safeNext(Array.isArray(next) ? next[0] : next)}
      google={isGoogleEnabled}
      configured={isAuthConfigured}
      oauthError={Boolean(searchParams?.error)}
    />
  );
}
