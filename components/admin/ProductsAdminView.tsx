"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useLang } from "@/components/LangProvider";
import { useStore } from "@/components/StoreProvider";
import { AdminHead } from "@/components/admin/AdminShell";
import { Plus, Search, Trash } from "@/components/Icons";
import { Button, Empty, LinkButton, Notice } from "@/components/ui";
import { sendJson } from "@/lib/apiClient";
import { CATEGORIES, categoryOf } from "@/lib/catalog";
import { money, pick } from "@/lib/format";
import type { BookRow, Category } from "@/lib/types";

/** รายการสินค้าทั้งหมด (รวมที่ซ่อนอยู่) — ค้นหา กรองหมวดหมู่ แก้ไข ลบ */
export default function ProductsAdminView({ products }: { products: BookRow[] }) {
  const { t, lang } = useLang();
  const { notify } = useStore();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Category | "">("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState(false);

  const shown = useMemo(() => {
    const query = q.trim().toLowerCase();
    return products.filter((p) => {
      if (cat && categoryOf(p) !== cat) return false;
      return !query || `${p.id} ${p.title_th} ${p.title_en}`.toLowerCase().includes(query);
    });
  }, [products, q, cat]);

  async function remove(p: BookRow) {
    if (!window.confirm(`${t("admDeleteConfirm")}\n\n${pick(p, "title", lang)}`)) return;
    setBusy(p.id);
    setError(false);
    try {
      const { result } = await sendJson<{ result: "deleted" | "hidden" }>(
        `/api/admin/products/${encodeURIComponent(p.id)}`, undefined, "DELETE"
      );
      notify(t(result === "hidden" ? "admHiddenInstead" : "admDeleted"));
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <AdminHead
        title={t("admProducts")}
        sub={`${products.length.toLocaleString("en-US")} ${t("categoryCount")}`}
        action={<LinkButton href="/admin/products/new" size="small"><Plus size={16} /> {t("admNewProduct")}</LinkButton>}
      />

      <div className="toolbar">
        <label className="search">
          <Search size={18} />
          <span className="sr-only">{t("navSearch")}</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("admSearchProducts")} />
        </label>
        <div className="sortbox">
          <label htmlFor="adm-cat">{t("admCategory")}</label>
          <select id="adm-cat" className="select" value={cat} onChange={(e) => setCat(e.target.value as Category | "")}>
            <option value="">{t("admAllCategories")}</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{t(`cat_${c}`)}</option>)}
          </select>
        </div>
      </div>

      {error && <div className="adm-gap"><Notice tone="error">{t("genericError")}</Notice></div>}

      {shown.length === 0 ? (
        <Empty
          title={t("admNoProducts")}
          action={<LinkButton href="/admin/products/new"><Plus size={18} /> {t("admNewProduct")}</LinkButton>}
        />
      ) : (
        <div className="adm-card flush tscroll">
          <table className="ltable">
            <thead>
              <tr>
                <th scope="col">{t("colProduct")}</th>
                <th scope="col">{t("admCategory")}</th>
                <th scope="col" className="num">{t("admPrice")}</th>
                <th scope="col">{t("admFile")}</th>
                <th scope="col">{t("colStatus")}</th>
                <th scope="col"><span className="sr-only">{t("colActions")}</span></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/admin/products/${p.id}`} className="linkbtn">{pick(p, "title", lang)}</Link>
                    <span className="sub mono">{p.id}</span>
                  </td>
                  <td>{t(`cat_${categoryOf(p)}`)}</td>
                  <td className="num">{money(p.price, lang)}</td>
                  <td className="mono">{p.file_size || "—"}</td>
                  <td>
                    <span className={`tag ${p.published === false ? "neutral" : "blue"}`}>
                      <span className="tag-dot" aria-hidden="true" />
                      {t(p.published === false ? "admHidden" : "admPublished")}
                    </span>
                  </td>
                  <td>
                    <div className="acts">
                      <LinkButton href={`/admin/products/${p.id}`} variant="secondary" size="small">{t("edit")}</LinkButton>
                      <Button
                        variant="danger"
                        size="small"
                        onClick={() => remove(p)}
                        loading={busy === p.id}
                        aria-label={`${t("admDelete")}: ${pick(p, "title", lang)}`}
                      >
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
