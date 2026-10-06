import Image from "next/image";
import Plate from "@/components/Plate";
import { imageOf } from "@/lib/catalog";
import type { Category } from "@/lib/types";

interface ProductArtProps {
  /** สินค้า (หรือข้อมูลย่อ) — ใช้รูปที่ร้านอัปโหลดถ้ามี */
  p: { cover?: string | null; category?: Category };
  /** ข้อความสำหรับ screen reader — เว้นว่างเมื่อภาพเป็นแค่ของประดับข้างชื่อสินค้า */
  title?: string;
  no?: string;
  label?: string;
  bare?: boolean;
  /** ความกว้างที่ภาพแสดงจริง ให้เบราว์เซอร์เลือกไฟล์ขนาดพอดี */
  sizes?: string;
  /** ภาพหลักของหน้า (โหลดก่อน ไม่ lazy) */
  priority?: boolean;
}

/**
 * ภาพสินค้า: รูปที่เจ้าของร้านอัปโหลด (ย่อขนาดและแปลงรูปแบบให้อัตโนมัติ)
 * ถ้าสินค้ายังไม่มีรูป ใช้ภาพแบบร่าง SVG ตามหมวดหมู่แทน
 */
export default function ProductArt({ p, title, no, label, bare, sizes = "(max-width: 760px) 100vw, 480px", priority }: ProductArtProps) {
  const src = imageOf(p);
  if (!src) return <Plate category={p.category} no={no} label={label} title={title} bare={bare} />;
  return (
    <Image
      className="plate plate-img"
      src={src}
      alt={title || ""}
      width={800}
      height={600}
      sizes={sizes}
      priority={priority}
    />
  );
}
