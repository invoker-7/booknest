import ReportsView from "@/components/admin/ReportsView";
import { loadReport, REPORT_PERIODS, type ReportPeriod } from "@/lib/admin";
import { withAdmin } from "@/lib/auth";

export const metadata = { title: "Reports" };

interface ReportsPageProps {
  searchParams?: { days?: string | string[] };
}

export default async function AdminReportsPage({ searchParams }: ReportsPageProps) {
  const raw = searchParams?.days;
  const wanted = Number(Array.isArray(raw) ? raw[0] : raw);
  const days: ReportPeriod = REPORT_PERIODS.find((d) => d === wanted) ?? 30;

  const { data } = await withAdmin("/admin/reports", () => loadReport(days));
  return <ReportsView periods={REPORT_PERIODS} report={data} />;
}
