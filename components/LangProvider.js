"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { DICT } from "@/lib/i18n";

const Ctx = createContext(null);

export function LangProvider({ children }) {
  // เริ่มที่ 'th' เสมอ เพื่อให้ HTML ฝั่ง server กับ client ตรงกัน (กัน hydration error)
  const [lang, setLangState] = useState("th");

  useEffect(() => {
    try {
      const l = localStorage.getItem("bn.lang");
      if (l === "th" || l === "en") setLangState(l);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l) => {
    setLangState(l);
    try { localStorage.setItem("bn.lang", l); } catch {}
  }, []);

  const t = useCallback((key) => DICT[lang][key] ?? DICT.en[key] ?? key, [lang]);

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useLang() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLang must be used inside <LangProvider>");
  return v;
}
