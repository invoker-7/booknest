"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from "react";
import { TH, type TKey, type Translate } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

interface LangContext {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Translate;
}

const STORAGE_KEY = "bn.lang";

const Ctx = createContext<LangContext | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  // เริ่มที่ 'th' เสมอ เพื่อให้ HTML ฝั่ง server กับ client ตรงกัน (กัน hydration error)
  const [lang, setLangState] = useState<Lang>("th");

  useEffect(() => {
    try {
      const l = localStorage.getItem(STORAGE_KEY);
      if (l === "th" || l === "en") setLangState(l);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch {}
  }, []);

  // ภาษาอังกฤษถูกโหลดเมื่อจำเป็นเท่านั้น ระหว่างรอ (เสี้ยววินาที) ใช้ข้อความภาษาไทยไปก่อน
  const [en, setEn] = useState<Record<TKey, string> | null>(null);
  useEffect(() => {
    if (lang !== "en" || en) return;
    let alive = true;
    void import("@/lib/i18n-en").then((m) => alive && setEn(m.EN));
    return () => {
      alive = false;
    };
  }, [lang, en]);

  const t = useCallback<Translate>((key) => (lang === "en" ? en?.[key] : undefined) ?? TH[key] ?? key, [lang, en]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang(): LangContext {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLang must be used inside <LangProvider>");
  return v;
}
