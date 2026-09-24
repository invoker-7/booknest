"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLang } from "./LangProvider";
import { Back, Home, Orders, Track, Info, Logo } from "./Icons";

export function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="langtoggle" role="group" aria-label="Language">
      <button onClick={() => setLang("th")} aria-pressed={lang === "th"}>ไทย</button>
      <button onClick={() => setLang("en")} aria-pressed={lang === "en"}>EN</button>
    </div>
  );
}

const TABS = [
  { href: "/", key: "tabHome", Icon: Home },
  { href: "/orders", key: "tabOrders", Icon: Orders },
  { href: "/track", key: "tabTrack", Icon: Track },
  { href: "/about", key: "tabAbout", Icon: Info },
];

function titleFor(pathname, t) {
  if (pathname.startsWith("/checkout")) return t("checkout");
  if (pathname.startsWith("/pay")) return t("confirmTitle");
  if (pathname.startsWith("/orders")) return t("myOrders");
  if (pathname.startsWith("/track")) return t("track");
  if (pathname.startsWith("/about")) return t("about");
  return "";
}

export default function Shell({ children }) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const { t } = useLang();

  const isTab = TABS.some((x) => x.href === pathname);
  const isHome = pathname === "/";
  const isResult = pathname.startsWith("/success");

  return (
    <>
      <Splash />
      <div className="shell">
        <div
          className="ribbon"
          dangerouslySetInnerHTML={{ __html: t("ribbon") }}
        />

        <aside className="sidebar">
          <div className="sidebar-brand">
            <span className="brand-mark"><Logo /></span>
            <span>Digital Finder</span>
          </div>
          <div className="sidebar-label">{t("ribbon").replace(/<[^>]+>/g, "")}</div>
          <nav className="side-nav" aria-label="Primary navigation">
            {TABS.map(({ href, key, Icon }) => (
              <Link
                key={href}
                href={href}
                className={pathname === href ? "active" : undefined}
                aria-current={pathname === href ? "page" : undefined}
              >
                <Icon />
                <span>{t(key)}</span>
              </Link>
            ))}
          </nav>
          <div className="sidebar-footer">
            <div className="sidebar-tip">{t("heroSub")}</div>
            <LangToggle />
          </div>
        </aside>

        <div className="app-content">
        <div className="topbar">
          {!isTab && !isResult && (
            <button className="iconbtn" onClick={() => router.back()} aria-label="Back">
              <Back />
            </button>
          )}

          {isHome ? (
            <div className="brand">
              <Logo />
              <span>Digital Finder</span>
            </div>
          ) : (
            <h1>{titleFor(pathname, t)}</h1>
          )}

          <LangToggle />
        </div>

        <main>{children}</main>

        {isTab && (
          <nav className="tabbar">
            {TABS.map(({ href, key, Icon }) => (
              <Link
                key={href}
                href={href}
                aria-current={pathname === href ? "page" : undefined}
              >
                <Icon />
                <span>{t(key)}</span>
              </Link>
            ))}
          </nav>
        )}
        </div>
      </div>
    </>
  );
}

/** หน้าเปิดแอป แสดงครั้งเดียวต่อการเปิดเว็บหนึ่งรอบ (เหมาะกับ WebView ในมือถือ) */
function Splash() {
  const [phase, setPhase] = useState("idle"); // idle | show | hide | gone

  useEffect(() => {
    let seen = true;
    try {
      seen = sessionStorage.getItem("bn.splash") === "1";
    } catch {}
    if (seen) return;
    setPhase("show");
    const a = setTimeout(() => setPhase("hide"), 450);
    // จดว่าเห็นแล้วตอนจบเท่านั้น — ถ้าจดตั้งแต่ต้น StrictMode (dev) จะรัน effect ซ้ำ
    // แล้วรอบที่สองออกก่อนตั้ง timer ทำให้ splash ค้างบังทั้งหน้า
    const b = setTimeout(() => {
      setPhase("gone");
      try { sessionStorage.setItem("bn.splash", "1"); } catch {}
    }, 700);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);

  if (phase === "idle" || phase === "gone") return null;

  return (
    <div className={`splash${phase === "hide" ? " hide" : ""}`}>
      <div className="rise"><Logo size={54} /></div>
      <h1 className="rise d1">Digital Finder</h1>
      <p className="rise d2">Digital tools, better work.</p>
      <div className="rise d3" style={{ marginTop: 30 }}>
        <svg width="200" height="120" viewBox="0 0 200 120" fill="none" aria-hidden="true">
          <ellipse cx="100" cy="108" rx="86" ry="9" fill="#F8DCC2" opacity=".6" />
          <rect x="42" y="82" width="116" height="16" rx="4" fill="#6E8F76" opacity=".85" />
          <rect x="50" y="66" width="100" height="16" rx="4" fill="#E4703B" opacity=".8" />
          <rect x="58" y="50" width="84" height="16" rx="4" fill="#F8DCC2" />
          <path d="M100 50c0-14 8-24 20-28-4 13-9 21-20 28z" fill="#6E8F76" opacity=".7" />
          <circle cx="128" cy="19" r="6" fill="#E4703B" opacity=".7" />
          <path d="M100 50c0-10-6-18-15-21 3 9 7 15 15 21z" fill="#6E8F76" opacity=".5" />
          <circle cx="82" cy="28" r="4.5" fill="#E4703B" opacity=".45" />
        </svg>
      </div>
    </div>
  );
}
