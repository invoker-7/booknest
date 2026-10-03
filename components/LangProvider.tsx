"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { DICT, type Translate } from "@/lib/i18n";
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

  const t = useCallback<Translate>((key) => DICT[lang][key] ?? DICT.en[key] ?? key, [lang]);

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useLang(): LangContext {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLang must be used inside <LangProvider>");
  return v;
}
