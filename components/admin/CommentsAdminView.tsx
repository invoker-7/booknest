"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLang } from "@/components/LangProvider";
import { useStore } from "@/components/StoreProvider";
import { AdminHead } from "@/components/admin/AdminShell";
import { Trash } from "@/components/Icons";
import { Button, Empty, Notice } from "@/components/ui";
import { sendJson } from "@/lib/apiClient";
import type { AdminComment } from "@/lib/comments";
import { fmtDate } from "@/lib/format";

/** หลังบ้าน: ความคิดเห็นใต้บทความทั้งหมด — ผู้ดูแลลบรายการที่ไม่เหมาะสมได้ */
export default function CommentsAdminView({ comments, ready }: { comments: AdminComment[]; ready: boolean }) {
  const { t, lang } = useLang();
  const { notify } = useStore();
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState(false);

  async function remove(c: AdminComment) {
    if (!window.confirm(`${t("commentDeleteAsk")}\n\n${c.name} · ${c.title}`)) return;
    setBusy(c.id);
    setError(false);
    try {
      await sendJson(`/api/comments?id=${encodeURIComponent(c.id)}`, undefined, "DELETE");
      notify(t("commentDeleted"));
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <AdminHead title={t("admComments")} sub={`${comments.length.toLocaleString("en-US")} ${t("comments")}`} />

      {!ready && <div className="adm-gap"><Notice tone="warn" title={t("admCommentsSetupTitle")}>{t("admCommentsSetupBody")}</Notice></div>}
      {error && <div className="adm-gap"><Notice tone="error">{t("genericError")}</Notice></div>}

      {ready && comments.length === 0 ? (
        <Empty title={t("noCommentsYet")} body={t("admCommentsEmptyBody")} />
      ) : comments.length > 0 && (
        <div className="adm-card flush tscroll">
          <table className="ltable">
            <thead>
              <tr>
                <th scope="col">{t("admArticles")}</th>
                <th scope="col">{t("admCustomer")}</th>
                <th scope="col">{t("commentLabel")}</th>
                <th scope="col">{t("admDate")}</th>
                <th scope="col"><span className="sr-only">{t("colActions")}</span></th>
              </tr>
            </thead>
            <tbody>
              {comments.map((c) => (
                <tr key={c.id}>
                  <td><Link href={`/archive/${c.article}`} className="linkbtn" target="_blank">{c.title}</Link></td>
                  <td>{c.name || "—"}</td>
                  <td className="rev-cell">{c.body}</td>
                  <td className="mono">{fmtDate(c.created_at, lang)}</td>
                  <td>
                    <div className="acts">
                      <Button variant="danger" size="small" onClick={() => remove(c)} loading={busy === c.id} aria-label={`${t("commentDelete")}: ${c.name}`}>
                        <Trash size={16} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
