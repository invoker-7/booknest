"use client";

import Image from "next/image";
import { useCallback, useRef, useState, type ReactNode } from "react";
import { Arrow, ArrowLeft } from "@/components/Icons";
import { useLang } from "@/components/LangProvider";

interface ProductGalleryProps {
  /** ภาพหลักของสินค้า (ปก) — แสดงเป็นภาพแรกเสมอ */
  cover: ReactNode;
  /** URL ของภาพปก ใช้ทำภาพย่อ — null เมื่อสินค้าใช้ภาพแบบร่างแทนรูป */
  coverSrc: string | null;
  /** URL ภาพตัวอย่างเนื้อหา */
  previews: string[];
}

/**
 * แกลเลอรีภาพของหน้าสินค้า: ภาพปกตามด้วยภาพตัวอย่างเนื้อหา
 * เลื่อนด้วยนิ้ว/แทร็กแพดได้เอง (scroll-snap) ปุ่มลูกศรและภาพย่อด้านล่างแค่สั่งเลื่อนไปยังภาพนั้น
 */
export default function ProductGallery({ cover, coverSrc, previews }: ProductGalleryProps) {
  const { t } = useLang();
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const count = previews.length + 1;

  const go = useCallback((to: number) => {
    const el = track.current;
    if (el) el.scrollTo({ left: Math.max(0, Math.min(to, count - 1)) * el.clientWidth, behavior: "smooth" });
  }, [count]);

  // ตำแหน่งปัจจุบันอ่านจากการเลื่อนจริง จึงตรงกันไม่ว่าจะเลื่อนด้วยนิ้ว ปุ่ม หรือภาพย่อ
  const onScroll = () => {
    const el = track.current;
    if (el && el.clientWidth > 0) setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  if (previews.length === 0) return <div className="pd-plate">{cover}</div>;

  return (
    <div className="gallery">
      <div className="gallery-stage">
        <div className="gallery-track" ref={track} onScroll={onScroll}>
          <div className="gallery-slide">{cover}</div>
          {previews.map((src, i) => (
            <div className="gallery-slide" key={src}>
              <Image src={src} alt={`${t("previewTitle")} ${i + 1}`} fill sizes="(max-width: 900px) 100vw, 640px" />
            </div>
          ))}
        </div>
        <button type="button" className="gallery-nav prev" onClick={() => go(index - 1)} disabled={index === 0} aria-label={t("admPrev")}>
          <ArrowLeft size={20} />
        </button>
        <button type="button" className="gallery-nav next" onClick={() => go(index + 1)} disabled={index === count - 1} aria-label={t("admNext")}>
          <Arrow size={20} />
        </button>
        <span className="gallery-count mono" aria-hidden="true">{index + 1} / {count}</span>
      </div>

      <ul className="gallery-thumbs" aria-label={t("previewTitle")}>
        {[coverSrc, ...previews].map((src, i) => (
          <li key={src ?? "cover"}>
            <button type="button" onClick={() => go(i)} aria-current={i === index ? "true" : undefined} aria-label={`${t("previewTitle")} ${i + 1}`}>
              {src ? <Image src={src} alt="" width={160} height={120} sizes="96px" /> : <span className="gallery-thumb-blank" />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
