import CustomersAdminView from "@/components/admin/CustomersAdminView";
import { listCustomers } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Customers" };

export default async function AdminCustomersPage() {
  await requireAdmin("/admin/customers");
  return <CustomersAdminView customers={await listCustomers()} />;
}
