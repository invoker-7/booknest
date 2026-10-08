"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent } from "react";
import { useLang } from "@/components/LangProvider";
import { Trash, Upload } from "@/components/Icons";
import { Button, Notice } from "@/components/ui";
import { sendJson } from "@/lib/apiClient";
import { IMAGE_EXTENSIONS, MAX_IMAGE_BYTES } from "@/lib/format";
import type { TKey } from "@/lib/i18n";

const MAX_PREVIEWS = 12;

interface PreviewManagerProps {
  productId: string;
  previews: { name: string; url: string }[];
}

/** ภาพตัวอย่างเนื้อหาของสินค้า (หลังบ้าน): เพิ่มหลายภาพพร้อมกัน และลบทีละภาพ — เปลี่ยนแล้วมีผลทันที ไม่ต้องกดบันทึก */
export default function PreviewManager({ productId, previews }: PreviewManagerProps) {
  const { t } = useLang();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState<TKey | "">("");

  async function add(e: ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])].slice(0, MAX_PREVIEWS - previews.length);
    e.target.value = "";
    if (files.length === 0) return;
    setError("");

    for (const file of files) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!IMAGE_EXTENSIONS.includes(ext)) return setError("admErrImageType");
      if (file.size > MAX_IMAGE_BYTES) return setError("admErrImageSize");
    }

    setBusy("add");
    try {
      for (const file of files) {
        const { url } = await sendJson<{ url: string }>("/api/admin/upload", {
          filename: file.name,
          size: file.size,
          kind: "preview",
          productId,
        });
        const res = await fetch(url, { method: "PUT", headers: { "Content-Type": file.type || "image/jpeg" }, body: file });
        if (!res.ok) throw new Error("upload_failed");
      }
    } catch {
      setError("admErrUpload");
    } finally {
      setBusy("");
      router.refresh();
    }
  }

  async function remove(name: string) {
    setBusy(name);
    setError("");
    try {
      await sendJson(`/api/admin/products/${encodeURIComponent(productId)}/previews`, { name }, "DELETE");
      router.refresh();
    } catch {
      setError("genericError");
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="adm-card" aria-labelledby="adm-previews">
      <header>
        <h2 id="adm-previews">{t("admPreviews")}</h2>
        <span className="mono muted">{previews.length} / {MAX_PREVIEWS}</span>
      </header>
      <p className="muted">{t("admPreviewsHint")}</p>

      {error && <div style={{ marginTop: 12 }}><Notice tone="error">{t(error)}</Notice></div>}

      {previews.length === 0 ? (
        <p className="muted" style={{ margin: "16px 0" }}>{t("admPreviewNone")}</p>
      ) : (
        <ul className="pv-admin">
          {previews.map((p) => (
            <li key={p.name}>
              <Image src={p.url} alt="" width={320} height={240} sizes="200px" />
              <Button
                variant="danger"
                size="small"
                onClick={() => remove(p.name)}
                loading={busy === p.name}
                aria-label={`${t("admPreviewRemove")}: ${p.name}`}
              >
                <Trash size={16} />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={input}
        type="file"
        multiple
        className="sr-only"
        tabIndex={-1}
        accept={IMAGE_EXTENSIONS.map((x) => `.${x}`).join(",")}
        onChange={add}
      />
      <Button
        variant="secondary"
        size="small"
        onClick={() => input.current?.click()}
        loading={busy === "add"}
        loadingText={t("loading")}
        disabled={previews.length >= MAX_PREVIEWS}
      >
        <Upload size={16} /> {t("admPreviewAdd")}
      </Button>
    </section>
  );
}
