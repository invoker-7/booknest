import AuthView from "@/components/views/AuthView";
import { isAuthConfigured, isGoogleEnabled, safeNext } from "@/lib/auth";

export const metadata = { title: "Create account", robots: { index: false } };

interface SignupPageProps {
  searchParams?: { next?: string | string[] };
}

export default function SignupPage({ searchParams }: SignupPageProps) {
  const next = searchParams?.next;
  return (
    <AuthView
      mode="signup"
      next={safeNext(Array.isArray(next) ? next[0] : next)}
      google={isGoogleEnabled}
      configured={isAuthConfigured}
    />
  );
}
