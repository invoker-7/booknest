import OrdersAdminView from "@/components/admin/OrdersAdminView";
import { listOrders, ORDER_PAGE_SIZE } from "@/lib/admin";
import { withAdmin } from "@/lib/auth";

export const metadata = { title: "Orders" };

export default async function AdminOrdersPage({ searchParams }: { searchParams?: { page?: string | string[] } }) {
  const raw = searchParams?.page;
  const page = Math.max(1, Math.floor(Number(Array.isArray(raw) ? raw[0] : raw)) || 1);
  const { data: { orders, total } } = await withAdmin("/admin/orders", () => listOrders(page));
  return <OrdersAdminView orders={orders} total={total} page={page} pageSize={ORDER_PAGE_SIZE} />;
}
