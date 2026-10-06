"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useLang } from "@/components/LangProvider";
import { LangToggle } from "@/components/Shell";
import { useToast } from "@/components/StoreProvider";
import { Archive, ArrowLeft, Box, Chart, Check, List, Mark, Receipt, Swap, User, Users, type IconProps } from "@/components/Icons";
import type { TKey } from "@/lib/i18n";
import type { AdminTodo } from "@/lib/types";

const NAV: { href: string; key: TKey; Icon: (p: IconProps) => JSX.Element }[] = [
  { href: "/admin", key: "admDashboard", Icon: Chart },
  { href: "/admin/products", key: "admProducts", Icon: Box },
  { href: "/admin/orders", key: "admOrders", Icon: Receipt },
  { href: "/admin/customers", key: "admCustomers", Icon: Users },
  { href: "/admin/users", key: "admUsers", Icon: User },
  { href: "/admin/reports", key: "admReports", Icon: Archive },
  { href: "/admin/data", key: "admData", Icon: Swap },
  { href: "/admin/raw", key: "admRaw", Icon: List },
];

// ถามซ้ำว่ามีงานรอจัดการไหม (สลิปรอตรวจ ฯลฯ) — หยุดเมื่อแท็บไม่ได้เปิดดูอยู่
const TODO_REFRESH_MS = 30_000;

interface TodoContext {
  /** null = ยังไม่ได้โหลด */
  todo: AdminTodo | null;
  /** เรียกหลังจัดการงานเสร็จ (เช่น ยืนยันรับเงิน) ให้ตัวเลขแจ้งเตือนอัปเดตทันที */
  refreshTodo: () => void;
}

const TodoCtx = createContext<TodoContext>({ todo: null, refreshTodo: () => {} });

/** งานที่รอผู้ดูแลจัดการ — ใช้ได้ในทุกหน้าของหลังบ้าน */
export const useAdminTodo = (): TodoContext => useContext(TodoCtx);

const isActive = (pathname: string, href: string) =>
  href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

/** โครงหน้าหลังบ้าน: แถบเมนูด้านซ้าย (เดสก์ท็อป) / แถบเลื่อนด้านบน (มือถือ) */
export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/admin";
  const { t } = useLang();
  const toast = useToast();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [leaving, setLeaving] = useState(false);
  const email = user?.email ?? "";
  const [todo, setTodo] = useState<AdminTodo | null>(null);

  const refreshTodo = useCallback(() => {
    if (document.visibilityState !== "visible") return;
    fetch("/api/admin/todo", { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<AdminTodo>) : null))
      .then((next) => next && setTodo(next))
      .catch(() => {}); // พลาดรอบนี้ รอบหน้าลองใหม่
  }, []);

  useEffect(() => {
    refreshTodo();
    const timer = setInterval(refreshTodo, TODO_REFRESH_MS);
    document.addEventListener("visibilitychange", refreshTodo);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshTodo);
    };
  }, [refreshTodo]);

  // สลิปรอตรวจ + ไฟล์ที่ส่งไม่ถึง = งานที่ต้องลงมือทำที่หน้าคำสั่งซื้อ
  const actions = todo ? todo.review + todo.undelivered : 0;

  // ให้เห็นจากแท็บเบราว์เซอร์ด้วยว่ามีงานรอ แม้กำลังเปิดหน้าอื่นอยู่
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\) /, "");
    document.title = actions > 0 ? `(${actions}) ${base}` : base;
  }, [actions, pathname]);

  async function leave() {
    setLeaving(true);
    await signOut();
    router.replace("/");
  }

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
              {href === "/admin/orders" && actions > 0 && (
                <span className="adm-count" aria-label={`${actions} ${t("admTodoWaiting")}`}>{actions}</span>
              )}
            </Link>
          ))}
        </nav>

        <div className="adm-side-foot">
          <span className="mono adm-email" title={email}>{email}</span>
          <LangToggle className="on-dark" />
          <Link href="/" className="adm-back"><ArrowLeft size={16} /> {t("admBackToStore")}</Link>
          <button type="button" className="adm-back adm-logout" onClick={leave} disabled={leaving}>{t("logout")}</button>
        </div>
      </aside>

      <main id="main" className="adm-main">
        <TodoCtx.Provider value={{ todo, refreshTodo }}>{children}</TodoCtx.Provider>
      </main>

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
