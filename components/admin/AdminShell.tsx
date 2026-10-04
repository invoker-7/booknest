"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useLang } from "@/components/LangProvider";
import { LangToggle } from "@/components/Shell";
import { useToast } from "@/components/StoreProvider";
import { ArrowLeft, Box, Chart, Check, Mark, Receipt, Swap, Users, type IconProps } from "@/components/Icons";
import type { TKey } from "@/lib/i18n";

const NAV: { href: string; key: TKey; Icon: (p: IconProps) => JSX.Element }[] = [
  { href: "/admin", key: "admDashboard", Icon: Chart },
  { href: "/admin/products", key: "admProducts", Icon: Box },
  { href: "/admin/orders", key: "admOrders", Icon: Receipt },
  { href: "/admin/customers", key: "admCustomers", Icon: Users },
  { href: "/admin/data", key: "admData", Icon: Swap },
];

const isActive = (pathname: string, href: string) =>
  href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

/** โครงหน้าหลังบ้าน: แถบเมนูด้านซ้าย (เดสก์ท็อป) / แถบเลื่อนด้านบน (มือถือ) */
export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/admin";
  const { t } = useLang();
  const toast = useToast();
  const { user } = useAuth();
  const email = user?.email ?? "";

  return (
    <div className="adm">
      <aside className="adm-side">
        <Link href="/admin" className="wordmark" aria-label="VECTOR Admin">
          <Mark />
          <span>VECTOR</span>
        </Link>
        <span className="adm-badge mono">Admin</span>

        <nav className="adm-nav" aria-label="Admin">
          {NAV.map(({ href, key, Icon }) => (
            <Link key={href} href={href} aria-current={isActive(pathname, href) ? "page" : undefined}>
              <Icon size={18} />
              <span>{t(key)}</span>
            </Link>
          ))}
        </nav>

        <div className="adm-side-foot">
          <span className="mono adm-email" title={email}>{email}</span>
          <LangToggle className="on-dark" />
          <Link href="/" className="adm-back"><ArrowLeft size={16} /> {t("admBackToStore")}</Link>
        </div>
      </aside>

      <main id="main" className="adm-main">{children}</main>

      <div className="toast-region" aria-live="polite">
        {toast && (
          <div className="toast">
            <Check size={16} />
            <span>{toast}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/** หัวหน้าแต่ละหน้าในหลังบ้าน */
export function AdminHead({ title, sub, action }: { title: ReactNode; sub?: ReactNode; action?: ReactNode }) {
  return (
    <header className="adm-head">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {action && <div className="adm-head-action">{action}</div>}
    </header>
  );
}
