"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { DICT } from "@/lib/i18n";

const Ctx = createContext(null);

export function LangProvider({ children }) {
  // เริ่มที่ 'th' เสมอ เพื่อให้ HTML ฝั่ง server กับ client ตรงกัน (กัน hydration error)
  const [lang, setLangState] = useState("th");
  const [theme, setThemeState] = useState("auto");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const l = localStorage.getItem("bn.lang");
      if (l === "th" || l === "en") setLangState(l);
      const th = localStorage.getItem("bn.theme");
      if (th) setThemeState(th);
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    if (theme === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const setLang = useCallback((l) => {
    setLangState(l);
    try { localStorage.setItem("bn.lang", l); } catch {}
  }, []);

  const setTheme = useCallback((v) => {
    setThemeState(v);
    try { localStorage.setItem("bn.theme", v); } catch {}
  }, []);

  const t = useCallback((key) => DICT[lang][key] ?? key, [lang]);

  return (
    <Ctx.Provider value={{ lang, setLang, theme, setTheme, t, ready }}>
      {children}
    </Ctx.Provider>
  );
}

export function useLang() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLang must be used inside <LangProvider>");
  return v;
}
