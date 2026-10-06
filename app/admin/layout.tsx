import type { ReactNode } from "react";
import AdminShell from "@/components/admin/AdminShell";

// หลังบ้านอ่าน cookie ทุก request — ไม่ cache และไม่ให้ search engine เก็บ
// สิทธิ์ admin ตรวจในแต่ละหน้า (requireAdmin) เพราะ layout ไม่ได้ render ก่อน page เสมอไป
export const dynamic = "force-dynamic";
// ข้อมูลหลังบ้านต้องสดเสมอ: หน้าเริ่ม query พร้อมกับการตรวจสิทธิ์ (withAdmin) ซึ่งเกิดก่อนอ่าน cookie
// ถ้าไม่ปิดไว้ Next จะเก็บผล fetch ของ Supabase ใน data cache แล้วแสดงข้อมูลเก่า
export const fetchCache = "force-no-store";
export const metadata = { title: { default: "Admin", template: "%s · VECTOR Admin" }, robots: { index: false } };

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
