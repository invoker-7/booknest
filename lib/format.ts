import type { Lang, OrderStatus } from "@/lib/types";

type DateInput = string | number | Date | null | undefined;

export function money(amount: number | null | undefined, lang: Lang): string {
  const n = Number(amount || 0).toLocaleString("en-US");
  return lang === "th" ? `฿ ${n}` : `THB ${n}`;
}

const TH_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

export function fmtDate(value: DateInput, lang: Lang): string {
  if (!value) return "-";
  const d = new Date(value);
  if (lang === "th") {
    return `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
  }
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function fmtTime(value: DateInput): string {
  if (!value) return "";
  const d = new Date(value);
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

/** somchai@example.com -> so*****@example.com */
export function maskEmail(email: string | null | undefined): string {
  if (!email || !email.includes("@")) return "";
  const [user = "", domain = ""] = email.split("@");
  const head = user.slice(0, 2);
  return `${head}${"*".repeat(Math.max(user.length - 2, 3))}@${domain}`;
}

export const isEmail = (v: unknown): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim());

/** ไฟล์สินค้าที่หลังบ้านอัปโหลดได้ (ตรวจทั้งฟอร์มและ API) */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
/** รูปสินค้าที่หลังบ้านอัปโหลดได้ (ตรวจทั้งฟอร์มและ API) */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

export const UPLOAD_EXTENSIONS = ["pdf", "zip", "epub", "fig", "docx", "xlsx", "pptx", "png", "jpg", "svg", "mp4", "txt", "md", "json"];

/** 4404019 -> "4.2 MB" */
export function fileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** เลือกฟิลด์ตามภาษา: pick(book, 'title', lang) -> book.title_th | book.title_en */
export function pick(row: object | null | undefined, field: string, lang: Lang): string {
  if (!row) return "";
  const r = row as Record<string, unknown>;
  const value = r[`${field}_${lang}`] ?? r[`${field}_th`] ?? "";
  return typeof value === "string" ? value : "";
}

export const STATUS_FLOW: OrderStatus[] = ["PENDING", "PAID", "PROCESSING", "COMPLETED"];
