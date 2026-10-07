import DashboardView from "@/components/admin/DashboardView";
import { loadStats } from "@/lib/admin";
import { withAdmin } from "@/lib/auth";

// หน้านี้อยู่ชั้นเดียวกับ layout ของหลังบ้าน template ของ layout จึงไม่ถูกใช้ — ใส่ชื่อเต็มเอง
export const metadata = { title: { absolute: "Dashboard · VECTOR Admin" } };

export default async function AdminDashboardPage() {
  const { data } = await withAdmin("/admin", () => loadStats());
  return <DashboardView initial={data} />;
}
