import { redirect } from "next/navigation";

// ลิงก์เดิมจากยุค BookNest ยังใช้ได้
export default function LegacyBookPage({ params }) {
  redirect(`/product/${params.id}`);
}
