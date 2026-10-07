import OrdersAdminView from "@/components/admin/OrdersAdminView";
import { listOrders, ORDER_PAGE_SIZE } from "@/lib/admin";
import { withAdmin } from "@/lib/auth";
import type { OrderFilter } from "@/lib/types";

export const metadata = { title: "Orders" };

const FILTERS: OrderFilter[] = ["all", "review", "unpaid", "undelivered"];

interface OrdersPageProps {
  searchParams?: { page?: string | string[]; filter?: string | string[]; q?: string | string[] };
}

const first = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);

export default async function AdminOrdersPage({ searchParams }: OrdersPageProps) {
  const page = Math.max(1, Math.floor(Number(first(searchParams?.page))) || 1);
  const wanted = first(searchParams?.filter);
  const filter = FILTERS.find((f) => f === wanted) ?? "all";

  const search = (first(searchParams?.q) || "").trim();

  const { data: { orders, total } } = await withAdmin("/admin/orders", () => listOrders(page, filter, search));
  return <OrdersAdminView orders={orders} total={total} page={page} pageSize={ORDER_PAGE_SIZE} filter={filter} search={search} />;
}
