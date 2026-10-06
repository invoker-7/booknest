import DashboardView from "@/components/admin/DashboardView";
import { loadStats } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  await requireAdmin();
  return <DashboardView initial={await loadStats()} />;
}
