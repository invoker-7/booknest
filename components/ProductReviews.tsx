"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Star, Trash } from "@/components/Icons";
import { useLang } from "@/components/LangProvider";
import { useStore } from "@/components/StoreProvider";
import { Button, Notice } from "@/components/ui";
import { sendJson } from "@/lib/apiClient";
import { fmtDate } from "@/lib/format";
import type { TKey } from "@/lib/i18n";
import type { Review } from "@/lib/types";

const MAX_LENGTH = 1000;

function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="stars" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={size} filled={n <= Math.round(value)} />)}
    </span>
  );
}

interface ProductReviewsProps {
  productId: string;
  /** รีวิวทั้งหมดของสินค้า ใหม่สุดก่อน (มากับหน้าสินค้า) */
  reviews: Review[];
}

/** รีวิวของสินค้า: คะแนนรวม รายการรีวิว และฟอร์มเขียนรีวิวสำหรับผู้ที่ซื้อแล้ว */
export default function ProductReviews({ productId, reviews }: ProductReviewsProps) {
  const { t, lang } = useLang();
  const { ready, user } = useAuth();
  const { notify } = useStore();
  const router = useRouter();
  const pathname = usePathname() || "/";

  // สถานะของผู้ที่ล็อกอินอยู่: เขียนได้ไหม และรีวิวเดิม (ถามหลังรู้ว่าล็อกอินอยู่ หน้าสินค้าจึงยังเป็น static)
  const [mine, setMine] = useState<{ canReview: boolean; review: Review | null } | null>(null);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState<"" | "save" | "delete" | string>("");
  const [error, setError] = useState<TKey | "">("");

  useEffect(() => {
    if (!ready || !user) return setMine(null);
    let alive = true;
    fetch(`/api/reviews?book=${encodeURIComponent(productId)}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { canReview: boolean; review: Review | null } | null) => {
        if (!alive || !data) return;
        setMine(data);
        if (data.review) {
          setRating(data.review.rating);
          setBody(data.review.body);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [ready, user, productId]);

  const count = reviews.length;
  const average = count ? reviews.reduce((sum, r) => sum + r.rating, 0) / count : 0;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (rating < 1) return setError("reviewNeedRating");
    setBusy("save");
    try {
      const { review } = await sendJson<{ review: Review }>("/api/reviews", { bookId: productId, rating, body });
      setMine({ canReview: true, review });
      notify(t("reviewSaved"));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error && err.message === "not_purchased" ? "reviewBuyersOnly" : "genericError");
    } finally {
      setBusy("");
    }
  }

  async function remove(review: Review, own: boolean) {
    if (!window.confirm(t("reviewDeleteAsk"))) return;
    setBusy(own ? "delete" : review.id);
    setError("");
    try {
      await sendJson(`/api/reviews?id=${encodeURIComponent(review.id)}`, undefined, "DELETE");
      if (own) {
        setMine({ canReview: true, review: null });
        setRating(0);
        setBody("");
      }
      notify(t("reviewDeleted"));
      router.refresh();
    } catch {
      setError("genericError");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="reviews">
      {count > 0 ? (
        <div className="rev-summary">
          <span className="rev-big">{average.toFixed(1)}</span>
          <div>
            <Stars value={average} size={18} />
            <p className="muted" style={{ marginTop: 6, fontSize: 14 }}>
              {t("reviewsBasis")} {count.toLocaleString("en-US")} {t("reviews")}
            </p>
          </div>
        </div>
      ) : (
        <p className="muted">{t("noReviewsYet")}</p>
      )}

      {count > 0 && (
        <ul className="rev-list">
          {reviews.map((r) => (
            <li key={r.id}>
              <div className="rev-head">
                <strong>{r.name || "—"}</strong>
                <span className="tag green"><span className="tag-dot" aria-hidden="true" />{t("reviewVerified")}</span>
                <span className="mono muted rev-date">{fmtDate(r.created_at, lang)}</span>
              </div>
              <span className="rev-stars" role="img" aria-label={`${r.rating} / 5 ${t("reviewStars")}`}><Stars value={r.rating} /></span>
              {r.body && <p className="rev-body">{r.body}</p>}
              {user?.isAdmin && r.id !== mine?.review?.id && (
                <Button variant="danger" size="small" onClick={() => remove(r, false)} loading={busy === r.id} aria-label={`${t("reviewDelete")}: ${r.name}`}>
                  <Trash size={14} /> {t("reviewDelete")}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="rev-write">
        {!ready ? null : !user ? (
          <Link className="btn secondary" href={`/login?next=${encodeURIComponent(pathname)}`}>{t("reviewLoginFirst")}</Link>
        ) : !mine ? null : !mine.canReview ? (
          <p className="muted">{t("reviewBuyersOnly")}</p>
        ) : (
          <form onSubmit={submit} noValidate>
            <h3>{t(mine.review ? "reviewEdit" : "reviewWrite")}</h3>
            {error && <div style={{ marginBottom: 12 }}><Notice tone="error">{t(error)}</Notice></div>}

            <fieldset className="rev-rate">
              <legend>{t("reviewYourRating")}</legend>
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className={n <= rating ? "on" : undefined}>
                  <input type="radio" className="sr-only" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} />
                  <Star size={28} filled={n <= rating} />
                  <span className="sr-only">{n} {t("reviewStars")}</span>
                </label>
              ))}
            </fieldset>

            <div className="field">
              <label htmlFor="rev-body">{t("reviewBodyLabel")}</label>
              <textarea id="rev-body" rows={4} maxLength={MAX_LENGTH} value={body} onChange={(e) => setBody(e.target.value)} placeholder={t("reviewBodyPh")} />
              <span className="hint mono">{body.length} / {MAX_LENGTH}</span>
            </div>

            <div className="rev-actions">
              <Button type="submit" loading={busy === "save"} loadingText={t("loading")}>{t(mine.review ? "reviewUpdate" : "reviewSubmit")}</Button>
              {mine.review && (
                <Button variant="danger" onClick={() => remove(mine.review!, true)} loading={busy === "delete"}>
                  <Trash size={16} /> {t("reviewDelete")}
                </Button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
