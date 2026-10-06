import DashboardView from "@/components/admin/DashboardView";
import { loadStats } from "@/lib/admin";
import { withAdmin } from "@/lib/auth";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  const { data } = await withAdmin("/admin", () => loadStats());
  return <DashboardView initial={data} />;
}
