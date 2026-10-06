import { redirect } from "next/navigation";
import { safeNext } from "@/lib/auth";

interface SignupPageProps {
  searchParams?: { next?: string | string[] };
}

/** ไม่มีหน้าสมัครแยกแล้ว — บัญชีถูกสร้างตอนเข้าสู่ระบบด้วย Google ครั้งแรก (ลิงก์เก่ายังใช้ได้) */
export default function SignupPage({ searchParams }: SignupPageProps) {
  const next = searchParams?.next;
  const to = safeNext(Array.isArray(next) ? next[0] : next);
  redirect(to === "/account" ? "/login" : `/login?next=${encodeURIComponent(to)}`);
}
