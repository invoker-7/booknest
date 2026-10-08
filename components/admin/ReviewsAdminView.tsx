"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLang } from "@/components/LangProvider";
import { useStore } from "@/components/StoreProvider";
import { AdminHead } from "@/components/admin/AdminShell";
import { Star, Trash } from "@/components/Icons";
import { Button, Empty, Notice } from "@/components/ui";
import { sendJson } from "@/lib/apiClient";
import { fmtDate } from "@/lib/format";
import type { AdminReview } from "@/lib/reviews";

/** หลังบ้าน: รีวิวทั้งหมดของร้าน — ผู้ดูแลลบรีวิวที่ไม่เหมาะสมได้ */
export default function ReviewsAdminView({ reviews, ready }: { reviews: AdminReview[]; ready: boolean }) {
  const { t, lang } = useLang();
  const { notify } = useStore();
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState(false);

  async function remove(r: AdminReview) {
    if (!window.confirm(`${t("reviewDeleteAsk")}\n\n${r.name} · ${r.title}`)) return;
    setBusy(r.id);
    setError(false);
    try {
      await sendJson(`/api/reviews?id=${encodeURIComponent(r.id)}`, undefined, "DELETE");
      notify(t("reviewDeleted"));
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <AdminHead title={t("admReviews")} sub={`${reviews.length.toLocaleString("en-US")} ${t("reviews")}`} />

      {!ready && <div className="adm-gap"><Notice tone="warn" title={t("admContentSetupTitle")}>{t("admContentSetupBody")}</Notice></div>}
      {error && <div className="adm-gap"><Notice tone="error">{t("genericError")}</Notice></div>}

      {ready && reviews.length === 0 ? (
        <Empty title={t("noReviewsYet")} body={t("admReviewsEmptyBody")} />
      ) : reviews.length > 0 && (
        <div className="adm-card flush tscroll">
          <table className="ltable">
            <thead>
              <tr>
                <th scope="col">{t("colProduct")}</th>
                <th scope="col">{t("admCustomer")}</th>
                <th scope="col">{t("reviewYourRating")}</th>
                <th scope="col">{t("reviewBodyLabel")}</th>
                <th scope="col">{t("admDate")}</th>
                <th scope="col"><span className="sr-only">{t("colActions")}</span></th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                <tr key={r.id}>
                  <td><Link href={`/product/${r.book_id}`} className="linkbtn" target="_blank">{r.title}</Link></td>
                  <td>{r.name || "—"}</td>
                  <td>
                    <span className="stars" role="img" aria-label={`${r.rating} / 5`}>
                      {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={14} filled={n <= r.rating} />)}
                    </span>
                  </td>
                  <td className="rev-cell">{r.body || "—"}</td>
                  <td className="mono">{fmtDate(r.created_at, lang)}</td>
                  <td>
                    <div className="acts">
                      <Button variant="danger" size="small" onClick={() => remove(r)} loading={busy === r.id} aria-label={`${t("reviewDelete")}: ${r.name}`}>
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
