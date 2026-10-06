import ReportsView from "@/components/admin/ReportsView";
import { loadReport, REPORT_PERIODS, type ReportPeriod } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Reports" };

interface ReportsPageProps {
  searchParams?: { days?: string | string[] };
}

export default async function AdminReportsPage({ searchParams }: ReportsPageProps) {
  await requireAdmin("/admin/reports");

  const raw = searchParams?.days;
  const wanted = Number(Array.isArray(raw) ? raw[0] : raw);
  const days: ReportPeriod = REPORT_PERIODS.find((d) => d === wanted) ?? 30;

  return <ReportsView periods={REPORT_PERIODS} report={await loadReport(days)} />;
}
