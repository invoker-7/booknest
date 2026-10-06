import UsersAdminView from "@/components/admin/UsersAdminView";
import { listUsers } from "@/lib/admin";
import { isEnvAdmin, requireAdmin } from "@/lib/auth";

export const metadata = { title: "Users" };

export default async function AdminUsersPage() {
  const me = await requireAdmin("/admin/users");
  return <UsersAdminView users={await listUsers(isEnvAdmin)} meId={me.id} />;
}
