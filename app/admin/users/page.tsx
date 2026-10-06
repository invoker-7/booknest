import UsersAdminView from "@/components/admin/UsersAdminView";
import { listUsers } from "@/lib/admin";
import { isEnvAdmin, withAdmin } from "@/lib/auth";

export const metadata = { title: "Users" };

export default async function AdminUsersPage() {
  const { admin, data } = await withAdmin("/admin/users", () => listUsers(isEnvAdmin));
  return <UsersAdminView users={data} meId={admin.id} />;
}
