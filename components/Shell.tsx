"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLang } from "./LangProvider";
import { useStore, useToast } from "./StoreProvider";
import { useAuth } from "./AuthProvider";
import { Search, Cart, Menu, Close, Home, Box, Library, Archive, Arrow, Mark, Check, User, type IconProps } from "./Icons";
import type { TKey } from "@/lib/i18n";

interface NavItem {
  href: string;
  key: TKey;
}

interface TabItem extends NavItem {
  Icon: (props: IconProps) => JSX.Element;
}

export function LangToggle({ className = "" }: { className?: string }) {
  const { lang, setLang, t } = useLang();
  return (
    <div className={`langtoggle mono ${className}`} role="group" aria-label={t("language")}>
      <button type="button" onClick={() => setLang("th")} aria-pressed={lang === "th"}>TH</button>
      <span aria-hidden="true">/</span>
      <button type="button" onClick={() => setLang("en")} aria-pressed={lang === "en"}>EN</button>
    </div>
  );
}

const NAV: NavItem[] = [
  { href: "/products", key: "navProducts" },
  { href: "/creators", key: "navCreators" },
  { href: "/archive", key: "navArchive" },
];

const TABS: TabItem[] = [
  { href: "/", key: "navHome", Icon: Home },
  { href: "/products", key: "navProducts", Icon: Box },
  { href: "/archive", key: "navArchive", Icon: Archive },
  { href: "/library", key: "navLibrary", Icon: Library },
];

// หน้าที่มีแถบปุ่มหลักติดล่างจอของตัวเอง ไม่ต้องแสดงแท็บบาร์มือถือ
const NO_TABBAR = ["/product/", "/cart", "/checkout", "/pay/", "/receipt", "/login", "/signup"];

const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

function Wordmark() {
  return (
    <Link href="/" className="wordmark" aria-label="VECTOR — home">
      <Mark />
      <span>VECTOR</span>
    </Link>
  );
}

function CartLink({ withLabel }: { withLabel?: boolean }) {
  const { t } = useLang();
  const { cart, ready } = useStore();
  const n = ready ? cart.length : 0;
  return (
    <Link href="/cart" className="hdr-action" aria-label={`${t("navCart")} (${n})`}>
      <Cart />
      {withLabel && <span className="hdr-label">{t("navCart")}</span>}
      <span className={`count mono${n ? "" : " zero"}`}>{n}</span>
    </Link>
  );
}

/** ลิงก์บัญชี: ยังไม่ล็อกอิน -> เข้าสู่ระบบ, ล็อกอินแล้ว -> บัญชีของฉัน */
function AccountLink({ pathname }: { pathname: string }) {
  const { t } = useLang();
  const { user } = useAuth();
  const href = user ? "/account" : "/login";
  return (
    <Link href={href} className="hdr-action hide-sm" aria-current={isActive(pathname, href) ? "page" : undefined}>
      <User />
      <span className="hdr-label">{user ? t("navAccount") : t("loginBtn")}</span>
    </Link>
  );
}

function SearchPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLang();
  const router = useRouter();
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="searchpanel" role="dialog" aria-modal="false" aria-label={t("navSearch")}>
      <form
        className="wrap searchpanel-form"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          onClose();
          router.push(q.trim() ? `/products?q=${encodeURIComponent(q.trim())}` : "/products");
        }}
      >
        <Search size={24} />
        <label htmlFor="global-search" className="sr-only">{t("searchLabel")}</label>
        <input
          id="global-search"
          ref={input}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("searchPh")}
          autoComplete="off"
        />
        <button type="submit" className="btn primary">{t("navSearch")}</button>
        <button type="button" className="iconbtn" onClick={onClose} aria-label={t("navClose")}>
          <Close />
        </button>
      </form>
    </div>
  );
}

function MobileMenu({ open, onClose, pathname }: { open: boolean; onClose: () => void; pathname: string }) {
  const { t } = useLang();
  const { user } = useAuth();
  useEffect(() => {
    if (!open) return;
    document.body.classList.add("lock");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("lock");
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  const links: NavItem[] = [
    ...NAV,
    { href: "/library", key: "navLibrary" },
    { href: "/cart", key: "navCart" },
    user ? { href: "/account", key: "navAccount" } : { href: "/login", key: "loginBtn" },
    { href: "/about", key: "about" },
  ];
  return (
    <div className="mmenu" role="dialog" aria-modal="true" aria-label={t("navMenu")} id="mobile-menu">
      <nav aria-label="Mobile">
        <ol>
          {links.map(({ href, key }, i) => (
            <li key={href}>
              <Link href={href} onClick={onClose} aria-current={isActive(pathname, href) ? "page" : undefined}>
                <span className="mono">{String(i + 1).padStart(2, "0")}</span>
                <span>{t(key)}</span>
                <Arrow />
              </Link>
            </li>
          ))}
        </ol>
      </nav>
      <div className="mmenu-foot">
        <span className="mono">{t("language")}</span>
        <LangToggle />
      </div>
    </div>
  );
}

function Toast() {
  const toast = useToast();
  const { t } = useLang();
  return (
    <div className="toast-region" aria-live="polite">
      {toast && (
        <div className="toast">
          <Check size={16} />
          <span>{toast}</span>
          <Link href="/cart" className="toast-link">{t("viewCart")}</Link>
        </div>
      )}
    </div>
  );
}

function Footer() {
  const { t } = useLang();
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-top">
          <div className="footer-brand">
            <Wordmark />
            <p>{t("tagline")}</p>
          </div>
          <nav aria-label={t("footerShop")}>
            <h2 className="mono">{t("footerShop")}</h2>
            <ul>
              <li><Link href="/products">{t("navProducts")}</Link></li>
              <li><Link href="/creators">{t("navCreators")}</Link></li>
              <li><Link href="/archive">{t("navArchive")}</Link></li>
            </ul>
          </nav>
          <nav aria-label={t("footerHelp")}>
            <h2 className="mono">{t("footerHelp")}</h2>
            <ul>
              <li><Link href="/library">{t("navLibrary")}</Link></li>
              <li><Link href="/cart">{t("navCart")}</Link></li>
              <li><Link href="/about">{t("about")}</Link></li>
            </ul>
          </nav>
          <div>
            <h2 className="mono">{t("language")}</h2>
            <LangToggle className="on-dark" />
          </div>
        </div>
        <div className="footer-bottom mono">
          <span>© 2026 VECTOR</span>
          <span>{t("footerNote")}</span>
        </div>
      </div>
    </footer>
  );
}

export default function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const { t } = useLang();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // ปิดเมนูเมื่อเปลี่ยนหน้า
  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  const showTabbar = !NO_TABBAR.some((p) => pathname.startsWith(p));

  // หลังบ้านมีโครงหน้าของตัวเอง (app/admin/layout.tsx)
  if (pathname.startsWith("/admin")) return <>{children}</>;

  return (
    <>
      <a href="#main" className="skip">{t("skip")}</a>

      <div className="utility mono">
        <div className="wrap utility-row">
          <span><span className="utility-dot" aria-hidden="true" /> {t("demoBar")}</span>
          <LangToggle className="on-dark hide-sm" />
        </div>
      </div>

      <header className="hdr">
        <div className="wrap hdr-row">
          <Wordmark />

          <nav className="hdr-nav" aria-label="Primary">
            {NAV.map(({ href, key }) => (
              <Link key={href} href={href} aria-current={isActive(pathname, href) ? "page" : undefined}>
                {t(key)}
              </Link>
            ))}
          </nav>

          <div className="hdr-actions">
            <button
              type="button"
              className="hdr-action"
              onClick={() => setSearchOpen((v) => !v)}
              aria-expanded={searchOpen}
              aria-label={t("navSearch")}
            >
              <Search />
              <span className="hdr-label">{t("navSearch")}</span>
            </button>
            <Link
              href="/library"
              className="hdr-action hide-sm"
              aria-current={isActive(pathname, "/library") ? "page" : undefined}
            >
              <Library />
              <span className="hdr-label">{t("navLibrary")}</span>
            </Link>
            <AccountLink pathname={pathname} />
            <CartLink withLabel />
            <button
              type="button"
              className="hdr-action show-sm"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? t("navClose") : t("navMenu")}
            >
              {menuOpen ? <Close /> : <Menu />}
            </button>
          </div>
        </div>
        <SearchPanel open={searchOpen} onClose={() => setSearchOpen(false)} />
      </header>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} pathname={pathname} />

      <main id="main" className={showTabbar ? "has-tabbar" : ""}>{children}</main>

      <Footer />

      {showTabbar && (
        <nav className="tabbar" aria-label="App">
          {TABS.map(({ href, key, Icon }) => (
            <Link key={href} href={href} aria-current={isActive(pathname, href) ? "page" : undefined}>
              <Icon />
              <span>{t(key)}</span>
            </Link>
          ))}
        </nav>
      )}

      <Toast />
    </>
  );
}
