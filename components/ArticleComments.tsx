"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Share, Trash } from "@/components/Icons";
import { useLang } from "@/components/LangProvider";
import { useStore } from "@/components/StoreProvider";
import { Button, Notice } from "@/components/ui";
import { sendJson } from "@/lib/apiClient";
import { fmtDate } from "@/lib/format";
import type { TKey } from "@/lib/i18n";
import type { ArticleComment } from "@/lib/types";

const MAX_LENGTH = 1000;

/** แชร์บทความ: ใช้แผ่นแชร์ของเครื่องถ้ามี (มือถือ) ไม่มีก็คัดลอกลิงก์ */
export function ShareButton({ title }: { title: string }) {
  const { t } = useLang();
  const { notify } = useStore();

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) return await navigator.share({ title, url });
      await navigator.clipboard.writeText(url);
      notify(t("shareCopied"));
    } catch {
      // ผู้ใช้ปิดแผ่นแชร์เอง หรือเบราว์เซอร์ไม่ให้คัดลอก — ไม่ต้องแจ้ง
    }
  }

  return (
    <Button variant="secondary" size="small" onClick={share}>
      <Share size={16} /> {t("share")}
    </Button>
  );
}

/** ความคิดเห็นใต้บทความ: ทุกคนอ่านได้ ผู้ที่ล็อกอินแล้วเขียนได้ */
export default function ArticleComments({ slug }: { slug: string }) {
  const { t, lang } = useLang();
  const { ready, user } = useAuth();
  const { notify } = useStore();
  const pathname = usePathname() || "/";

  // null = กำลังโหลด (ดึงหลังหน้าแสดงแล้ว หน้าบทความจึงยังเป็น static)
  const [comments, setComments] = useState<ArticleComment[] | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState<TKey | "">("");

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    fetch(`/api/comments?article=${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { comments: [] }))
      .then((data: { comments: ArticleComment[] }) => alive && setComments(data.comments))
      .catch(() => alive && setComments([]));
    return () => {
      alive = false;
    };
  }, [ready, user?.id, slug]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!body.trim()) return setError("commentEmpty");
    setBusy("save");
    try {
      const { comment } = await sendJson<{ comment: ArticleComment }>("/api/comments", { article: slug, body });
      setComments((list) => [comment, ...(list ?? [])]);
      setBody("");
      notify(t("commentSaved"));
    } catch (err) {
      setError(err instanceof Error && err.message === "too_fast" ? "commentTooFast" : "genericError");
    } finally {
      setBusy("");
    }
  }

  async function remove(c: ArticleComment) {
    if (!window.confirm(t("commentDeleteAsk"))) return;
    setBusy(c.id);
    setError("");
    try {
      await sendJson(`/api/comments?id=${encodeURIComponent(c.id)}`, undefined, "DELETE");
      setComments((list) => (list ?? []).filter((x) => x.id !== c.id));
      notify(t("commentDeleted"));
    } catch {
      setError("genericError");
    } finally {
      setBusy("");
    }
  }

  const count = comments?.length ?? 0;

  return (
    <section className="comments" aria-labelledby="comments-title">
      <h2 id="comments-title" className="doc-label">
        {t("comments")}{count > 0 && ` (${count.toLocaleString("en-US")})`}
      </h2>

      <div className="rev-write" style={{ marginTop: 16 }}>
        {!ready ? null : !user ? (
          <Link className="btn secondary" href={`/login?next=${encodeURIComponent(pathname)}`}>{t("commentLoginFirst")}</Link>
        ) : (
          <form onSubmit={submit} noValidate>
            {error && <div style={{ marginBottom: 12 }}><Notice tone="error">{t(error)}</Notice></div>}
            <div className="field">
              <label htmlFor="comment-body">{t("commentLabel")}</label>
              <textarea id="comment-body" rows={3} maxLength={MAX_LENGTH} value={body} onChange={(e) => setBody(e.target.value)} placeholder={t("commentPh")} />
              <span className="hint mono">{body.length} / {MAX_LENGTH}</span>
            </div>
            <Button type="submit" loading={busy === "save"} loadingText={t("loading")}>{t("commentSubmit")}</Button>
          </form>
        )}
      </div>

      {comments && count === 0 && <p className="muted" style={{ marginTop: 24 }}>{t("noCommentsYet")}</p>}

      {count > 0 && (
        <ul className="rev-list">
          {comments!.map((c) => (
            <li key={c.id}>
              <div className="rev-head">
                <strong>{c.name || "—"}</strong>
                <span className="mono muted rev-date">{fmtDate(c.created_at, lang)}</span>
              </div>
              <p className="rev-body">{c.body}</p>
              {(c.own || user?.isAdmin) && (
                <Button variant="danger" size="small" onClick={() => remove(c)} loading={busy === c.id} aria-label={`${t("commentDelete")}: ${c.name}`}>
                  <Trash size={14} /> {t("commentDelete")}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
