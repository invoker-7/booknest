import ShopsAdminView from "@/components/admin/ShopsAdminView";
import { listShopsFull } from "@/lib/admin";
import { withAdmin } from "@/lib/auth";

export const metadata = { title: "Creators" };

export default async function AdminShopsPage() {
  const { data: shops } = await withAdmin("/admin/shops", () => listShopsFull());
  return <ShopsAdminView shops={shops} />;
}
