export function money(amount, lang) {
  const n = Number(amount || 0).toLocaleString("en-US");
  return lang === "th" ? `฿ ${n}` : `THB ${n}`;
}

const TH_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

export function fmtDate(value, lang) {
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

export function fmtTime(value) {
  if (!value) return "";
  const d = new Date(value);
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

/** somchai@example.com -> so*****@example.com */
export function maskEmail(email) {
  if (!email || !email.includes("@")) return "";
  const [user, domain] = email.split("@");
  const head = user.slice(0, 2);
  return `${head}${"*".repeat(Math.max(user.length - 2, 3))}@${domain}`;
}

export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim());

/** เลือกฟิลด์ตามภาษา: pick(book, 'title', lang) -> book.title_th | book.title_en */
export function pick(row, field, lang) {
  if (!row) return "";
  return row[`${field}_${lang}`] ?? row[`${field}_th`] ?? "";
}

export const STATUS_FLOW = ["PENDING", "PAID", "PROCESSING", "COMPLETED"];
