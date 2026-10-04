import type { ReactNode } from "react";
import AdminShell from "@/components/admin/AdminShell";

// หลังบ้านอ่าน cookie ทุก request — ไม่ cache และไม่ให้ search engine เก็บ
// สิทธิ์ admin ตรวจในแต่ละหน้า (requireAdmin) เพราะ layout ไม่ได้ render ก่อน page เสมอไป
export const dynamic = "force-dynamic";
export const metadata = { title: { default: "Admin", template: "%s · VECTOR Admin" }, robots: { index: false } };

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
