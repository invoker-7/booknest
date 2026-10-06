"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useLang } from "@/components/LangProvider";
import { useStore } from "@/components/StoreProvider";
import { AdminHead } from "@/components/admin/AdminShell";
import { Search, Trash } from "@/components/Icons";
import { Button, Empty, Notice } from "@/components/ui";
import { sendJson } from "@/lib/apiClient";
import { fmtDate } from "@/lib/format";
import type { AdminUser, UserRole } from "@/lib/types";

/** จัดการผู้ใช้: ดูสมาชิกทั้งหมด เปลี่ยนสิทธิ์ (สมาชิก / ผู้ดูแล) และลบบัญชี */
export default function UsersAdminView({ users, meId }: { users: AdminUser[]; meId: string }) {
  const { t, lang } = useLang();
  const { notify } = useStore();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState(false);

  const shown = useMemo(() => {
    const query = q.trim().toLowerCase();
    return query ? users.filter((u) => `${u.email} ${u.name}`.toLowerCase().includes(query)) : users;
  }, [users, q]);

  const admins = users.filter((u) => u.role === "admin").length;

  async function run(user: AdminUser, action: () => Promise<unknown>, done: string) {
    setBusy(user.id);
    setError(false);
    try {
      await action();
      notify(done);
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setBusy("");
    }
  }

  const changeRole = (user: AdminUser, role: UserRole) =>
    run(user, () => sendJson(`/api/admin/users/${user.id}`, { role }, "PATCH"), t("admUserRoleSaved"));

  function remove(user: AdminUser) {
    if (!window.confirm(`${t("admUserDeleteConfirm")}\n\n${user.email}`)) return;
    void run(user, () => sendJson(`/api/admin/users/${user.id}`, undefined, "DELETE"), t("admUserDeleted"));
  }

  return (
    <>
      <AdminHead
        title={t("admUsers")}
        sub={`${users.length.toLocaleString("en-US")} ${t("admMembers")} · ${admins.toLocaleString("en-US")} ${t("roleAdmin")}`}
      />

      <div className="toolbar">
        <label className="search">
          <Search size={18} />
          <span className="sr-only">{t("navSearch")}</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("admSearchCustomers")} />
        </label>
      </div>

      {error && <div className="adm-gap"><Notice tone="error">{t("genericError")}</Notice></div>}

      {shown.length === 0 ? (
        <Empty title={t("admNoUsers")} />
      ) : (
        <div className="adm-card flush tscroll">
          <table className="ltable">
            <thead>
              <tr>
                <th scope="col">{t("admUser")}</th>
                <th scope="col">{t("admJoined")}</th>
                <th scope="col">{t("admRole")}</th>
                <th scope="col"><span className="sr-only">{t("admDelete")}</span></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((u) => {
                const self = u.id === meId;
                // บัญชีตัวเองและผู้ดูแลจาก ADMIN_EMAILS แก้จากหน้านี้ไม่ได้ (server ตรวจซ้ำอีกชั้น)
                const fixed = self || u.locked;
                return (
                  <tr key={u.id}>
                    <td>
                      {u.name || "—"}
                      {self && <span className="tag blue user-you">{t("admYou")}</span>}
                      <span className="sub">{u.email}</span>
                    </td>
                    <td className="mono">{fmtDate(u.joined, lang)}</td>
                    <td>
                      {fixed ? (
                        <>
                          <span className={`tag ${u.role === "admin" ? "amber" : "blue"}`}>
                            {t(u.role === "admin" ? "roleAdmin" : "roleCustomer")}
                          </span>
                          {u.locked && <span className="sub">{t("admRoleLocked")}</span>}
                        </>
                      ) : (
                        <select
                          className="select role-select"
                          value={u.role}
                          disabled={busy === u.id}
                          onChange={(e) => void changeRole(u, e.target.value as UserRole)}
                          aria-label={`${t("admRole")}: ${u.email}`}
                        >
                          <option value="customer">{t("roleCustomer")}</option>
                          <option value="admin">{t("roleAdmin")}</option>
                        </select>
                      )}
                    </td>
                    <td>
                      {!fixed && (
                        <div className="acts">
                          <Button
                            variant="danger"
                            size="small"
                            onClick={() => remove(u)}
                            loading={busy === u.id}
                            aria-label={`${t("admDelete")}: ${u.email}`}
                          >
                            <Trash size={16} />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
