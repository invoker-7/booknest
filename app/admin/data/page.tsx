import DataView from "@/components/admin/DataView";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Import / Export" };

export default async function AdminDataPage() {
  await requireAdmin("/admin/data");
  return <DataView />;
}
