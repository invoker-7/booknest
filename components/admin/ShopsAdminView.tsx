"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useLang } from "@/components/LangProvider";
import { useStore } from "@/components/StoreProvider";
import { AdminHead } from "@/components/admin/AdminShell";
import { Check, Plus, Trash } from "@/components/Icons";
import { Button, Empty, Notice } from "@/components/ui";
import { sendJson } from "@/lib/apiClient";
import type { AdminShop } from "@/lib/admin";
import type { TKey } from "@/lib/i18n";

const EMPTY = { id: "", name: "", bio_th: "", bio_en: "" };
const ERRORS: Record<string, TKey> = { name_required: "admErrShopName", id_required: "admErrShopName", has_products: "admErrShopHasProducts" };

/** หลังบ้าน: ร้าน/ครีเอเตอร์ที่เป็นเจ้าของสินค้า — เพิ่ม แก้ และลบ (ร้านที่ยังมีสินค้าลบไม่ได้) */
export default function ShopsAdminView({ shops }: { shops: AdminShop[] }) {
  const { t } = useLang();
  const { notify } = useStore();
  const router = useRouter();
  const [f, setF] = useState(EMPTY);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState<TKey | "">("");

  const fail = (err: unknown) => setError(ERRORS[err instanceof Error ? err.message : ""] || "genericError");

  function edit(shop: AdminShop) {
    setF({ id: shop.id, name: shop.name, bio_th: shop.bio_th, bio_en: shop.bio_en });
    setEditing(true);
    setError("");
    document.getElementById("sf-name")?.focus();
  }

  function reset() {
    setF(EMPTY);
    setEditing(false);
    setError("");
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!f.name.trim()) return setError("admErrShopName");
    setBusy("save");
    try {
      await sendJson("/api/admin/shops", f);
      notify(t("admShopSaved"));
      reset();
      router.refresh();
    } catch (err) {
      fail(err);
    } finally {
      setBusy("");
    }
  }

  async function remove(shop: AdminShop) {
    if (!window.confirm(`${t("admShopDeleteAsk")}\n\n${shop.name}`)) return;
    setBusy(shop.id);
    setError("");
    try {
      await sendJson(`/api/admin/shops/${encodeURIComponent(shop.id)}`, undefined, "DELETE");
      notify(t("admShopDeleted"));
      if (f.id === shop.id) reset();
      router.refresh();
    } catch (err) {
      fail(err);
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <AdminHead title={t("admShops")} sub={t("admShopsSub")} />

      {error && <div className="adm-gap"><Notice tone="error">{t(error)}</Notice></div>}

      <div className="adm-grid">
        <div>
          {shops.length === 0 ? (
            <Empty title={t("admNoShops")} body={t("admShopsSub")} />
          ) : (
            <div className="adm-card flush tscroll">
              <table className="ltable">
                <thead>
                  <tr>
                    <th scope="col">{t("admShopName")}</th>
                    <th scope="col" className="num">{t("admProducts")}</th>
                    <th scope="col"><span className="sr-only">{t("colActions")}</span></th>
                  </tr>
                </thead>
                <tbody>
                  {shops.map((shop) => (
                    <tr key={shop.id}>
                      <td>
                        <strong>{shop.name}</strong>
                        <span className="sub mono">{shop.id}</span>
                        {shop.bio_th && <span className="sub">{shop.bio_th}</span>}
                      </td>
                      <td className="num">{shop.products}</td>
                      <td>
                        <div className="acts">
                          <Button variant="secondary" size="small" onClick={() => edit(shop)}>{t("edit")}</Button>
                          <Button variant="danger" size="small" onClick={() => remove(shop)} loading={busy === shop.id} aria-label={`${t("admDelete")}: ${shop.name}`}>
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
        </div>

        <form className="adm-card" onSubmit={save} noValidate>
          <header><h2>{t(editing ? "admShopEdit" : "admShopNew")}</h2></header>
          <div className="field">
            <label htmlFor="sf-name">{t("admShopName")}</label>
            <input id="sf-name" type="text" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={120} />
          </div>
          <div className="field">
            <label htmlFor="sf-bio-th">{t("admShopBioTh")}</label>
            <textarea id="sf-bio-th" rows={3} value={f.bio_th} onChange={(e) => setF({ ...f, bio_th: e.target.value })} maxLength={600} />
          </div>
          <div className="field">
            <label htmlFor="sf-bio-en">{t("admShopBioEn")}</label>
            <textarea id="sf-bio-en" rows={3} value={f.bio_en} onChange={(e) => setF({ ...f, bio_en: e.target.value })} maxLength={600} />
          </div>
          {editing && <p className="hint muted mono" style={{ fontSize: 12, marginBottom: 16 }}>{f.id}</p>}
          <div className="acts" style={{ justifyContent: "flex-start" }}>
            <Button type="submit" size="small" loading={busy === "save"} loadingText={t("loading")}>
              {editing ? <Check size={16} /> : <Plus size={16} />} {t(editing ? "admSave" : "admShopAdd")}
            </Button>
            {editing && <Button variant="ghost" size="small" onClick={reset}>{t("cancel")}</Button>}
          </div>
        </form>
      </div>
    </>
  );
}
