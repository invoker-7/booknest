import CustomersAdminView from "@/components/admin/CustomersAdminView";
import { listCustomers } from "@/lib/admin";
import { withAdmin } from "@/lib/auth";

export const metadata = { title: "Customers" };

export default async function AdminCustomersPage() {
  const { data } = await withAdmin("/admin/customers", listCustomers);
  return <CustomersAdminView customers={data} />;
}
